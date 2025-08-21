import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const connectedClients = new Map<WebSocket, string>();

serve(async (req) => {
  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { status: 400 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);
  
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  socket.onopen = () => {
    console.log("WebSocket connection established");
    connectedClients.set(socket, "");
    
    // Send initial data
    sendInitialData(socket, supabaseClient);
  };

  socket.onmessage = async (event) => {
    try {
      const data = JSON.parse(event.data);
      
      if (data.type === "subscribe") {
        connectedClients.set(socket, data.tournament_id || "global");
        console.log(`Client subscribed to: ${data.tournament_id || "global"}`);
      }
      
      if (data.type === "score_update") {
        // Broadcast score update to all connected clients
        broadcastScoreUpdate(data);
      }
      
    } catch (error) {
      console.error("WebSocket message error:", error);
    }
  };

  socket.onclose = () => {
    console.log("WebSocket connection closed");
    connectedClients.delete(socket);
  };

  socket.onerror = (error) => {
    console.error("WebSocket error:", error);
    connectedClients.delete(socket);
  };

  return response;
});

async function sendInitialData(socket: WebSocket, supabaseClient: any) {
  try {
    // Send global leaderboard
    const { data: globalScores } = await supabaseClient
      .from('scores')
      .select(`
        score,
        profiles!inner(username)
      `)
      .is('tournament_id', null)
      .order('score', { ascending: false })
      .limit(10);

    // Send active tournaments
    const { data: tournaments } = await supabaseClient
      .from('tournaments')
      .select('*')
      .eq('status', 'active');

    // Send tournament leaderboards
    const tournamentLeaderboards = [];
    for (const tournament of tournaments || []) {
      const { data: scores } = await supabaseClient
        .from('scores')
        .select(`
          score,
          profiles!inner(username)
        `)
        .eq('tournament_id', tournament.id)
        .order('score', { ascending: false })
        .limit(10);

      tournamentLeaderboards.push({
        tournament_id: tournament.id,
        scores: scores || []
      });
    }

    socket.send(JSON.stringify({
      type: "initial_data",
      global_scores: globalScores || [],
      tournaments: tournaments || [],
      tournament_leaderboards: tournamentLeaderboards
    }));

  } catch (error) {
    console.error("Error sending initial data:", error);
  }
}

function broadcastScoreUpdate(data: any) {
  const message = JSON.stringify({
    type: "score_update",
    tournament_id: data.tournament_id,
    user_id: data.user_id,
    score: data.score,
    username: data.username,
    timestamp: new Date().toISOString()
  });

  connectedClients.forEach((subscription, socket) => {
    if (socket.readyState === WebSocket.OPEN) {
      // Send to all clients or filter by subscription
      if (subscription === "global" || subscription === data.tournament_id) {
        socket.send(message);
      }
    }
  });
}

// Function to broadcast tournament updates
function broadcastTournamentUpdate(data: any) {
  const message = JSON.stringify({
    type: "tournament_update",
    tournament: data,
    timestamp: new Date().toISOString()
  });

  connectedClients.forEach((subscription, socket) => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(message);
    }
  });
}