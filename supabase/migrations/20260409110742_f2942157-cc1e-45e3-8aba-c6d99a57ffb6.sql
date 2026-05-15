
-- Drop the restrictive SELECT policy on votes
DROP POLICY "Users can view their own votes" ON public.votes;

-- Create a broader SELECT policy for all authenticated users
CREATE POLICY "Authenticated users can view all votes"
ON public.votes
FOR SELECT
TO authenticated
USING (true);
