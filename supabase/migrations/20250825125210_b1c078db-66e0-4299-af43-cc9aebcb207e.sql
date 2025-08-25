-- Fix all function search path security issues
-- Drop existing functions and recreate with secure search paths

DROP FUNCTION IF EXISTS public.calculate_prize_distribution(UUID);
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Recreate calculate_prize_distribution with secure search path
CREATE OR REPLACE FUNCTION public.calculate_prize_distribution(tournament_id_param UUID)
RETURNS TABLE(rank_position INTEGER, percentage NUMERIC, amount NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Recreate handle_new_user with secure search path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
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

-- Recreate the trigger for new users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Also add missing RLS policies for better security
-- Update profiles policies to be more specific
DROP POLICY IF EXISTS "Users can view and update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

-- Create separate, more specific policies
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Ensure tournament_participants has proper RLS
CREATE POLICY "Users can view own participation" 
ON public.tournament_participants 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own participation" 
ON public.tournament_participants 
FOR UPDATE 
USING (auth.uid() = user_id);