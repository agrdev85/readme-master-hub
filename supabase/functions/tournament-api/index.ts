import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const url = new URL(req.url);
  const path = url.pathname.replace("/functions/v1/tournament-api", "");

  try {
    // Auth middleware for Unity-compatible endpoints
    const authHeader = req.headers.get("Authorization");
    let user = null;
    
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const { data } = await supabaseClient.auth.getUser(token);
      user = data.user;
    }

    // Unity Login endpoint (compatible with existing Server.cs)
    if (path === "/login" && req.method === "POST") {
      const formData = await req.formData();
      const name = formData.get("name") || formData.get("username");
      const password = formData.get("password");

      if (!name || !password) {
        return new Response("error:Missing credentials", {
          headers: { ...corsHeaders, "Content-Type": "text/plain" },
        });
      }

      const { data: profiles, error } = await supabaseClient
        .from('profiles')
        .select('*, user_id')
        .eq('username', name)
        .single();

      if (error || !profiles) {
        return new Response("error:User not found", {
          headers: { ...corsHeaders, "Content-Type": "text/plain" },
        });
      }

      // Sign in with Supabase Auth
      const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
        email: profiles.user_id, // This needs to be adjusted based on your auth setup
        password: password
      });

      if (authError) {
        return new Response("error:Invalid credentials", {
          headers: { ...corsHeaders, "Content-Type": "text/plain" },
        });
      }

      return new Response(authData.session?.access_token || "success", {
        headers: { ...corsHeaders, "Content-Type": "text/plain" },
      });
    }

    // Unity Register endpoint
    if (path === "/register" && req.method === "POST") {
      const { username, email, password, usdt_wallet } = await req.json();

      const { data: authData, error: authError } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            full_name: username
          }
        }
      });

      if (authError) {
        return new Response(JSON.stringify({ error: authError.message }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      // Update profile with wallet
      if (authData.user) {
        await supabaseClient
          .from('profiles')
          .update({ usdt_wallet })
          .eq('user_id', authData.user.id);
      }

      return new Response(JSON.stringify({ 
        message: "User registered successfully",
        token: authData.session?.access_token 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Unity Global Scores endpoint (compatible with web.cs)
    if (path === "/scores/global" && req.method === "GET") {
      const { data: scores } = await supabaseClient
        .from('scores')
        .select(`
          score,
          profiles!inner(username)
        `)
        .is('tournament_id', null)
        .order('score', { ascending: false })
        .limit(10);

      // Format for Unity: "username|score;username|score;"
      const formatted = scores?.map(s => `${s.profiles.username}|${s.score}`).join(';') || '';
      
      return new Response(formatted, {
        headers: { ...corsHeaders, "Content-Type": "text/plain" },
      });
    }

    // Unity Tournament Scores endpoint
    if (path.startsWith("/scores/tournament/") && req.method === "GET") {
      const tournamentId = path.split("/")[3];
      
      const { data: scores } = await supabaseClient
        .from('scores')
        .select(`
          score,
          profiles!inner(username)
        `)
        .eq('tournament_id', tournamentId)
        .order('score', { ascending: false })
        .limit(10);

      const formatted = scores?.map(s => `${s.profiles.username}|${s.score}`).join(';') || '';
      
      return new Response(formatted, {
        headers: { ...corsHeaders, "Content-Type": "text/plain" },
      });
    }

    // Unity Score Submit endpoint
    if (path === "/scores/submit" && req.method === "POST") {
      if (!user) {
        return new Response("error:Not authenticated", {
          headers: { ...corsHeaders, "Content-Type": "text/plain" },
        });
      }

      const { score, game_data } = await req.json();

      // Check if user is in an active tournament
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('current_tournament_id')
        .eq('user_id', user.id)
        .single();

      let tournamentId = null;
      if (profile?.current_tournament_id) {
        // Verify tournament is active
        const { data: tournament } = await supabaseClient
          .from('tournaments')
          .select('status')
          .eq('id', profile.current_tournament_id)
          .eq('status', 'active')
          .single();
        
        if (tournament) {
          tournamentId = profile.current_tournament_id;
        }
      }

      // Insert or update score
      const { error } = await supabaseClient
        .from('scores')
        .upsert({
          user_id: user.id,
          tournament_id: tournamentId,
          score,
          game_data
        }, {
          onConflict: 'user_id,tournament_id'
        });

      if (error) {
        return new Response("error:Failed to submit score", {
          headers: { ...corsHeaders, "Content-Type": "text/plain" },
        });
      }

      return new Response("success", {
        headers: { ...corsHeaders, "Content-Type": "text/plain" },
      });
    }

    // Unity Current Tournament endpoint
    if (path === "/user/current-tournament" && req.method === "GET") {
      if (!user) {
        return new Response("0", {
          headers: { ...corsHeaders, "Content-Type": "text/plain" },
        });
      }

      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('current_tournament_id')
        .eq('user_id', user.id)
        .single();

      return new Response(profile?.current_tournament_id || "0", {
        headers: { ...corsHeaders, "Content-Type": "text/plain" },
      });
    }

    // Frontend API endpoints

    // Join Tournament
    if (path.startsWith("/tournaments/") && path.endsWith("/join") && req.method === "POST") {
      if (!user) {
        return new Response(JSON.stringify({ error: "Not authenticated" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        });
      }

      const tournamentId = path.split("/")[2];
      const { transaction_hash, usdt_wallet } = await req.json();

      // Create payment record
      const { error } = await supabaseClient
        .from('payments')
        .insert({
          user_id: user.id,
          tournament_id: tournamentId,
          transaction_hash,
          usdt_wallet,
          status: 'pending'
        });

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      return new Response(JSON.stringify({ 
        message: "Payment submitted for verification" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify Payment (Admin)
    if (path.startsWith("/payments/") && path.endsWith("/verify") && req.method === "PUT") {
      if (!user) {
        return new Response(JSON.stringify({ error: "Not authenticated" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        });
      }

      // Check admin status
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('is_admin')
        .eq('user_id', user.id)
        .single();

      if (!profile?.is_admin) {
        return new Response(JSON.stringify({ error: "Admin access required" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 403,
        });
      }

      const paymentId = path.split("/")[2];

      // Update payment status
      const { data: payment, error } = await supabaseClient
        .from('payments')
        .update({
          status: 'verified',
          verified_at: new Date().toISOString(),
          verified_by: user.id
        })
        .eq('id', paymentId)
        .select('tournament_id, user_id, amount')
        .single();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      // Add user to tournament participants
      await supabaseClient
        .from('tournament_participants')
        .upsert({
          tournament_id: payment.tournament_id,
          user_id: payment.user_id,
          payment_verified: true
        }, {
          onConflict: 'tournament_id,user_id'
        });

      // Update tournament prize pool
      await supabaseClient
        .from('tournaments')
        .update({
          prize_pool: supabaseClient.sql`prize_pool + ${payment.amount}`
        })
        .eq('id', payment.tournament_id);

      // Update user's current tournament
      await supabaseClient
        .from('profiles')
        .update({ current_tournament_id: payment.tournament_id })
        .eq('user_id', payment.user_id);

      return new Response(JSON.stringify({ 
        message: "Payment verified successfully" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Distribute Prizes (Admin)
    if (path.startsWith("/tournaments/") && path.endsWith("/distribute") && req.method === "POST") {
      if (!user) {
        return new Response(JSON.stringify({ error: "Not authenticated" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        });
      }

      // Check admin status
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('is_admin')
        .eq('user_id', user.id)
        .single();

      if (!profile?.is_admin) {
        return new Response(JSON.stringify({ error: "Admin access required" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 403,
        });
      }

      const tournamentId = path.split("/")[2];

      // Get top 10 scores
      const { data: topScores } = await supabaseClient
        .from('scores')
        .select(`
          user_id,
          score,
          profiles!inner(username)
        `)
        .eq('tournament_id', tournamentId)
        .order('score', { ascending: false })
        .limit(10);

      if (!topScores || topScores.length === 0) {
        return new Response(JSON.stringify({ error: "No scores found" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      // Get prize distribution
      const { data: prizeData } = await supabaseClient
        .rpc('calculate_prize_distribution', { tournament_id_param: tournamentId });

      const prizeResults = [];
      
      for (let i = 0; i < Math.min(topScores.length, prizeData.length); i++) {
        const score = topScores[i];
        const prize = prizeData[i];

        // Insert prize record
        await supabaseClient
          .from('prizes')
          .insert({
            tournament_id: tournamentId,
            user_id: score.user_id,
            rank_position: prize.rank_position,
            amount: prize.amount,
            percentage: prize.percentage
          });

        prizeResults.push({
          position: prize.rank_position,
          username: score.profiles.username,
          score: score.score,
          amount: prize.amount,
          percentage: prize.percentage
        });
      }

      // Update tournament status to finished
      await supabaseClient
        .from('tournaments')
        .update({ status: 'finished' })
        .eq('id', tournamentId);

      return new Response(JSON.stringify({ 
        message: "Prizes distributed successfully",
        results: prizeResults
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Endpoint not found" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 404,
    });

  } catch (error) {
    console.error('Tournament API Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});