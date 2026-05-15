
-- Allow authenticated users to update their own votes (for switching up/down)
CREATE POLICY "Users can update their own votes"
  ON public.votes FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
