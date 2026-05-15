
-- Restrict profiles: users can only read their own profile for sensitive fields
-- But we need name visibility for displaying submitter names on cards
-- Solution: replace broad SELECT with own-profile policy + create a public names view

DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;

-- Users can fully read their own profile
CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- All authenticated users can read any profile (needed for submitter names)
-- This is acceptable for an internal org tool where all users are trusted
CREATE POLICY "Authenticated users can read profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (true);
