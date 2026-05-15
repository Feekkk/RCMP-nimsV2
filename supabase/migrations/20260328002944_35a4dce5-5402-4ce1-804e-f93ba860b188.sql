
-- Add vote_type column: 1 for upvote, -1 for downvote
ALTER TABLE public.votes ADD COLUMN vote_type smallint NOT NULL DEFAULT 1;

-- Update the unique constraint to allow one vote per user per request (regardless of type)
-- The existing unique constraint on (user_id, request_id) already handles this
