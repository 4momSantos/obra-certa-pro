
-- Fix overly permissive INSERT policy on profiles
DROP POLICY "System can insert profiles" ON public.profiles;

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);
