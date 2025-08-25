-- Fix the final function search path security issue with CASCADE
-- This will recreate all dependent policies

-- Drop the function with CASCADE to remove dependent policies
DROP FUNCTION IF EXISTS public.is_admin(UUID) CASCADE;

-- Recreate is_admin function with secure search path
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT is_admin FROM public.profiles WHERE profiles.user_id = $1;
$$;

-- Recreate all the admin policies that were dropped
CREATE POLICY "Admins can manage tournaments" 
ON public.tournaments 
FOR ALL 
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage participants" 
ON public.tournament_participants 
FOR ALL 
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage scores" 
ON public.scores 
FOR ALL 
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage prizes" 
ON public.prizes 
FOR ALL 
USING (is_admin(auth.uid()));