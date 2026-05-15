
-- Drop old restrictive update policies
DROP POLICY IF EXISTS "Users can update their own requests" ON public.feature_requests;
DROP POLICY IF EXISTS "Admins can update any request" ON public.feature_requests;

-- All authenticated users can update any request
CREATE POLICY "Authenticated users can update requests"
  ON public.feature_requests FOR UPDATE TO authenticated
  USING (true);

-- All authenticated users can delete any request
CREATE POLICY "Authenticated users can delete requests"
  ON public.feature_requests FOR DELETE TO authenticated
  USING (true);
