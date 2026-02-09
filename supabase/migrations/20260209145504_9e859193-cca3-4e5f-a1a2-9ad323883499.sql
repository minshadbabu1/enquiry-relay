
-- Fix INSERT policy: make it permissive so public users can submit
DROP POLICY IF EXISTS "Anyone can submit enquiries" ON public.enquiries;
CREATE POLICY "Anyone can submit enquiries"
  ON public.enquiries FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Fix SELECT policy: make it permissive so admins can view
DROP POLICY IF EXISTS "Admins can view enquiries" ON public.enquiries;
CREATE POLICY "Admins can view enquiries"
  ON public.enquiries FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
