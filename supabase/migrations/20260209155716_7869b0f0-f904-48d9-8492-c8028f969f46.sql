CREATE POLICY "Service role can update enquiries"
ON public.enquiries
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);