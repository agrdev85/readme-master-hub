-- Drop existing tables if they exist to recreate with proper structure
DROP TABLE IF EXISTS prizes CASCADE;
DROP TABLE IF EXISTS scores CASCADE;  
DROP TABLE IF EXISTS tournament_participants CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS tournaments CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Create enhanced profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  full_name TEXT,
  usdt_wallet TEXT,
  is_admin BOOLEAN DEFAULT false,
  current_tournament_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create tournaments table
CREATE TABLE public.tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  entry_fee NUMERIC DEFAULT 10,
  prize_pool NUMERIC DEFAULT 0,
  max_participants INTEGER,
  current_participants INTEGER DEFAULT 0,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'finished')),
  admin_wallet TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create payments table
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  usdt_wallet TEXT NOT NULL,
  transaction_hash TEXT,
  amount NUMERIC NOT NULL DEFAULT 10,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  verified_at TIMESTAMP WITH TIME ZONE,
  verified_by UUID REFERENCES auth.users(id)
);

-- Create tournament participants table
CREATE TABLE public.tournament_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_verified BOOLEAN DEFAULT false,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(tournament_id, user_id)
);

-- Create scores table
CREATE TABLE public.scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  game_data JSONB,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create prizes table
CREATE TABLE public.prizes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  rank_position INTEGER NOT NULL,
  amount NUMERIC NOT NULL,
  percentage NUMERIC NOT NULL,
  paid BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prizes ENABLE ROW LEVEL SECURITY;

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT is_admin FROM public.profiles WHERE profiles.user_id = $1;
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for tournaments
CREATE POLICY "Anyone can view tournaments" ON public.tournaments FOR SELECT USING (true);
CREATE POLICY "Admins can manage tournaments" ON public.tournaments FOR ALL USING (public.is_admin(auth.uid()));

-- RLS Policies for payments
CREATE POLICY "Users can view own payments" ON public.payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own payments" ON public.payments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all payments" ON public.payments FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can update payments" ON public.payments FOR UPDATE USING (public.is_admin(auth.uid()));

-- RLS Policies for tournament participants
CREATE POLICY "Anyone can view participants" ON public.tournament_participants FOR SELECT USING (true);
CREATE POLICY "Users can join tournaments" ON public.tournament_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage participants" ON public.tournament_participants FOR ALL USING (public.is_admin(auth.uid()));

-- RLS Policies for scores
CREATE POLICY "Anyone can view scores" ON public.scores FOR SELECT USING (true);
CREATE POLICY "Users can submit own scores" ON public.scores FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage scores" ON public.scores FOR ALL USING (public.is_admin(auth.uid()));

-- RLS Policies for prizes
CREATE POLICY "Anyone can view prizes" ON public.prizes FOR SELECT USING (true);
CREATE POLICY "Admins can manage prizes" ON public.prizes FOR ALL USING (public.is_admin(auth.uid()));

-- Functions and Triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updating timestamps
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tournaments_updated_at BEFORE UPDATE ON tournaments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'username', NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update tournament participant count
CREATE OR REPLACE FUNCTION update_tournament_participants()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE tournaments 
    SET current_participants = current_participants + 1 
    WHERE id = NEW.tournament_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE tournaments 
    SET current_participants = current_participants - 1 
    WHERE id = OLD.tournament_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for participant count updates
CREATE TRIGGER update_participant_count
  AFTER INSERT OR DELETE ON tournament_participants
  FOR EACH ROW EXECUTE FUNCTION update_tournament_participants();

-- Function to calculate prize distribution
CREATE OR REPLACE FUNCTION calculate_prize_distribution(tournament_id_param UUID)
RETURNS TABLE(rank_position INTEGER, percentage NUMERIC, amount NUMERIC) AS $$
DECLARE
  total_prize NUMERIC;
  prize_percentages NUMERIC[] := ARRAY[30, 18, 13, 9, 6, 5, 4, 3, 2, 1];
  i INTEGER;
BEGIN
  SELECT prize_pool INTO total_prize FROM tournaments WHERE id = tournament_id_param;
  
  FOR i IN 1..10 LOOP
    IF i <= array_length(prize_percentages, 1) THEN
      rank_position := i;
      percentage := prize_percentages[i];
      amount := (total_prize * prize_percentages[i]) / 100;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;