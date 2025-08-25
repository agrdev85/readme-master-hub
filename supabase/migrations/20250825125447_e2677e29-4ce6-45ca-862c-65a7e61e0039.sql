-- Fix remaining function search path security issues
-- The update functions need to be recreated with SECURITY DEFINER and proper search path

-- Drop and recreate update_tournament_participants with secure search path
DROP FUNCTION IF EXISTS update_tournament_participants() CASCADE;

CREATE OR REPLACE FUNCTION update_tournament_participants()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Drop and recreate update_updated_at_column with secure search path
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate all triggers that were dropped
CREATE TRIGGER update_participant_count 
AFTER INSERT OR DELETE ON tournament_participants 
FOR EACH ROW EXECUTE FUNCTION update_tournament_participants();

CREATE TRIGGER update_profiles_updated_at 
BEFORE UPDATE ON profiles 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tournaments_updated_at 
BEFORE UPDATE ON tournaments 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();