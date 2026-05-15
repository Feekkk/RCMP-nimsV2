
-- Drop the security definer view
DROP VIEW IF EXISTS public.vote_counts;

-- Create a security definer function to get vote counts
CREATE OR REPLACE FUNCTION public.get_vote_counts()
RETURNS TABLE (request_id uuid, up_count bigint, down_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    v.request_id,
    COUNT(*) FILTER (WHERE v.vote_type = 1) AS up_count,
    COUNT(*) FILTER (WHERE v.vote_type = -1) AS down_count
  FROM public.votes v
  GROUP BY v.request_id;
$$;
