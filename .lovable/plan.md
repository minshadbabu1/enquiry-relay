

# Fix: Make Enquiry Form Submission Robust

## Problem Summary

The RLS policy fix was applied successfully (confirmed by automated test and database verification). However, the form submission can still fail because:

1. **`.select().single()` after INSERT** -- The code needs the returned `enquiry.id` for PDF generation and WhatsApp calls. PostgREST's behavior with RETURNING when there's no matching SELECT policy can be inconsistent.
2. **The published URL may still serve old code** that uses a different submission flow.

## Solution

### 1. Generate enquiry ID client-side (src/pages/Index.tsx)

Instead of relying on `.select().single()` to get the inserted row's ID back, generate the UUID on the client and include it in the INSERT. Then remove `.select().single()` entirely.

**Changes to `onSubmit` function:**
- Generate `enquiryId = crypto.randomUUID()` before the INSERT
- Include `id: enquiryId` in the insert payload
- Replace `.select().single()` with just the insert call and check `error`
- Use `enquiryId` directly for the PDF and WhatsApp edge function calls

### 2. Add an UPDATE RLS policy for enquiries (Database Migration)

The `send-whatsapp` edge function uses the service role key (bypasses RLS), but adding an UPDATE policy for the service role is good practice. More importantly, if anyone accidentally uses the anon client, it won't silently fail.

```sql
CREATE POLICY "Service role can update enquiries"
ON public.enquiries
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);
```

### 3. Better error logging (src/pages/Index.tsx)

Add `console.error` with the actual error object before showing the toast, so the user can share the browser console output for debugging.

## Technical Details

### File: src/pages/Index.tsx

Replace lines 94-110 (the INSERT + select + error check):

```typescript
// Generate ID client-side so we don't need .select().single()
const enquiryId = crypto.randomUUID();

const { error } = await supabase
  .from("enquiries")
  .insert({
    id: enquiryId,
    name: data.name,
    mobile: data.mobile,
    place: data.district,
    sq_feet_area: data.sq_feet_area ? parseFloat(data.sq_feet_area) : 0,
    district: data.district,
    service: data.service,
    requirements: data.requirements || null,
    image_urls: imageUrls.length > 0 ? imageUrls : null,
  });

if (error) throw error;
```

Replace edge function calls to use `enquiryId` instead of `enquiry.id`:

```typescript
// 3. Generate PDF (non-blocking)
try {
  await supabase.functions.invoke("generate-pdf", {
    body: { enquiry_id: enquiryId },
  });
} catch {
  console.error("PDF generation failed");
}

// 4. Send WhatsApp (non-blocking)
try {
  await supabase.functions.invoke("send-whatsapp", {
    body: { enquiry_id: enquiryId },
  });
} catch {
  console.error("WhatsApp notification failed");
}
```

Update catch block to log detailed errors:

```typescript
} catch (err) {
  console.error("Enquiry submission error:", err);
  toast.error("Failed to submit enquiry. Please try again.");
}
```

### Database Migration

```sql
-- Add UPDATE policy for service_role (used by edge functions)
CREATE POLICY "Service role can update enquiries"
ON public.enquiries
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);
```

## Expected Outcome

- Form submissions will work reliably with or without images
- No dependency on SELECT policy for reading back inserted data
- Edge functions can still update enquiry records via service role
- Better error logging for any future debugging

