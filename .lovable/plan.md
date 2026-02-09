

## Update WhatsApp Template to `enquiry_notification_test`

### What's Changing

Your new WATI template `enquiry_notification_test` has a different structure:
- **Header (Document):** `{{3}}` -- PDF file link
- **Body:** Name: `{{1}}`, Phone: `{{2}}`, "Sent by TFG"

The current code sends all 3 parameters as body parameters. The new template has `{{3}}` as a document-type header, which means the PDF link parameter needs to be passed correctly so WATI attaches it as a document file.

### Changes

**1. Update `supabase/functions/send-whatsapp/index.ts`**
- Update the parameters to use the short PDF redirect URL (from the `pdf` edge function) instead of the raw storage URL
- Construct the short URL: `{SUPABASE_URL}/functions/v1/pdf?id={enquiry_id}`
- Keep the same parameter format (`name: "1"` for name, `name: "2"` for phone, `name: "3"` for pdf link) since WATI handles header vs body mapping based on the template definition

**2. Update default template name**
- Change the default template name from `enquiry_notification` to `enquiry_notification_test` in:
  - `src/components/admin/WatiSettingsTab.tsx` (default state)
  - Database `wati_settings` row (update via the admin WATI Settings tab)

### Technical Details

In `send-whatsapp/index.ts`, the parameters section changes from:
```
parameters: [
  { name: "1", value: enquiry.name || "N/A" },
  { name: "2", value: enquiry.mobile || "N/A" },
  { name: "3", value: enquiry.pdf_url || "No PDF available" },
]
```
To:
```
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const shortPdfUrl = `${supabaseUrl}/functions/v1/pdf?id=${enquiry.id}`;

parameters: [
  { name: "1", value: enquiry.name || "N/A" },
  { name: "2", value: enquiry.mobile || "N/A" },
  { name: "3", value: shortPdfUrl },
]
```

This ensures:
- The PDF is sent as a document attachment in the WhatsApp header
- The link is short and won't get truncated
- You'll need to update the template name to `enquiry_notification_test` in the WATI Settings tab in the admin panel (or it will be set as the new default)

