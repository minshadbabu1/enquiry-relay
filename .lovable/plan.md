

# Fix Enquiry Submission - RLS Policy Issue

## Problem
The "Anyone can submit enquiries" INSERT policy on the `enquiries` table is created as **RESTRICTIVE** (not permissive). PostgreSQL requires at least one **PERMISSIVE** policy to grant access -- restrictive policies can only further limit access. Since there are no permissive policies for INSERT, all submissions are blocked.

## Fix
Run a database migration to:
1. Drop the current restrictive INSERT policy
2. Re-create it as a **PERMISSIVE** policy so anyone (even unauthenticated users) can submit enquiries

Additionally, the admin SELECT policy also needs to be permissive for admins to view enquiries.

## Technical Details

**SQL Migration:**
```sql
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
```

No frontend code changes needed -- this is purely a database policy fix.
