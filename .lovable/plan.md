

## Add WATI Delivery Status Tracking

### Current State
- The `enquiries` table has a `whatsapp_sent` boolean column -- only tracks "Sent" or "Pending"
- The edge function checks HTTP `res.ok` but WATI returns `200 OK` even on failures (with `result: false` in the body)
- The admin panel shows a simple Sent/Pending badge

### What Changes

**1. Database: Add a `whatsapp_status` column**
- Add a new `text` column `whatsapp_status` to the `enquiries` table (nullable, default `null`)
- This will store detailed status: `"sent"`, `"failed"`, `"not_configured"`, or the actual WATI error message
- Also add `whatsapp_response` as a `jsonb` column to store the full WATI API response for debugging

**2. Edge Function: Fix success detection and store response details**
- The current code uses `res.ok` to determine success, but WATI returns HTTP 200 even on failure -- the actual success indicator is `result: true` in the JSON body
- Parse the WATI response JSON and check `result` field instead of HTTP status
- Save the status and full response to the `whatsapp_status` and `whatsapp_response` columns

**3. Admin Panel: Show detailed delivery status**
- Replace the simple Sent/Pending badge with more detailed status display
- Show "Sent" (green), "Failed" (red with error detail on hover), "Pending" (yellow), or "Not Configured" (gray)
- Add a tooltip or expandable detail showing the WATI response when status is "Failed"
- Add a "Retry" button for failed messages that re-invokes the edge function

### Technical Details

**Migration SQL:**
```sql
ALTER TABLE enquiries 
  ADD COLUMN whatsapp_status text DEFAULT NULL,
  ADD COLUMN whatsapp_response jsonb DEFAULT NULL;
```

**Edge function changes (`supabase/functions/send-whatsapp/index.ts`):**
- Parse each WATI response as JSON and check `result` field
- Determine overall status: `"sent"` if all succeed, `"partial"` if some fail, `"failed"` if all fail
- Update enquiry with both `whatsapp_sent`, `whatsapp_status`, and `whatsapp_response`

**Admin UI changes (`src/components/admin/EnquiriesTab.tsx`):**
- Color-coded badges: green for "sent", red for "failed", yellow for "pending", orange for "partial"
- Tooltip on hover showing WATI error details from `whatsapp_response`
- "Retry" button on failed rows that calls the `send-whatsapp` function again and refreshes the list
