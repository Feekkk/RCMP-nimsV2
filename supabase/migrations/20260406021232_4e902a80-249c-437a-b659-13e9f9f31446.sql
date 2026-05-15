
-- Create a security definer view for aggregated vote counts
CREATE OR REPLACE VIEW public.vote_counts
WITH (security_invoker = false)
AS
SELECT
  request_id,
  COUNT(*) FILTER (WHERE vote_type = 1) AS up_count,
  COUNT(*) FILTER (WHERE vote_type = -1) AS down_count
FROM public.votes
GROUP BY request_id;

-- Grant access to authenticated users
GRANT SELECT ON public.vote_counts TO authenticated;

-- Restrict votes SELECT policy to own votes only
DROP POLICY IF EXISTS "Votes are viewable by authenticated users" ON public.votes;
CREATE POLICY "Users can view their own votes"
  ON public.votes
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
