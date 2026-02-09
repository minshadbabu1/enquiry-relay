-- Drop the restrictive insert policy and recreate as permissive
DROP POLICY IF EXISTS "Anyone can submit enquiries" ON public.enquiries;

CREATE POLICY "Anyone can submit enquiries"
ON public.enquiries
FOR INSERT
TO anon, authenticated
WITH CHECK (true);
