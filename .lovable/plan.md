
## Fix PDF Access with Short URL Redirect

### Problem
The full Supabase storage URLs are very long and may be getting truncated or blocked when shared. The URL format is:
`https://qsqafptuqpwuzyhhsdxv.supabase.co/storage/v1/object/public/enquiry-pdfs/{id}/order-form.pdf`

### Solution
Create a backend function that serves as a short URL redirector, so PDFs can be accessed via a much shorter, cleaner URL like:
`https://{project}.supabase.co/functions/v1/pdf/{enquiry_id}`

### Changes

**1. New Edge Function: `supabase/functions/pdf/index.ts`**
- Accepts a GET request with `id` query parameter
- Looks up the `pdf_url` from the `enquiries` table
- Returns a 302 redirect to the actual storage URL
- No authentication required (public access like the storage bucket)

**2. Update `src/components/admin/EnquiriesTab.tsx`**
- Update the PDF link and copy button to use the short URL format instead of the raw storage URL
- Short URL format: `https://qsqafptuqpwuzyhhsdxv.supabase.co/functions/v1/pdf?id={enquiry_id}`

**3. Update `supabase/functions/generate-pdf/index.ts`**
- After generating the PDF, store the short URL in the `pdf_url` column instead of the full storage URL
- Or keep the full URL but the UI will construct the short URL from the enquiry ID

### Technical Details

The edge function will be minimal:
```
GET /pdf?id={enquiry_id}
  -> Query enquiries table for pdf_url
  -> 302 Redirect to the full storage URL
```

This ensures:
- Short, shareable links that won't get truncated
- Links still point to the actual PDF in storage
- No changes to PDF generation logic
- Works in WhatsApp, browsers, and any other context
