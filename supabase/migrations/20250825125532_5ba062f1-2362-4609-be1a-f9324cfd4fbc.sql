-- Fix the final function search path security issue

-- Drop and recreate is_admin function with secure search path
DROP FUNCTION IF EXISTS public.is_admin(UUID);

CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT is_admin FROM public.profiles WHERE profiles.user_id = $1;
$$;