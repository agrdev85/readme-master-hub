-- Create function to check if user is admin (avoiding RLS recursion)
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT is_admin FROM public.profiles WHERE profiles.user_id = $1;
$$;

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

-- Add trigger for participant count updates if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_participant_count') THEN
    CREATE TRIGGER update_participant_count
      AFTER INSERT OR DELETE ON tournament_participants
      FOR EACH ROW EXECUTE FUNCTION update_tournament_participants();
  END IF;
END
$$;