

## Fix WATI Template Parameter Names

### Problem
WATI is rejecting the WhatsApp messages with "Check your template, it cannot have typos or blank text". The template uses numbered placeholders (`{{1}}`, `{{2}}`, `{{3}}`), but the edge function sends parameters with string names (`name`, `phone`, `images`). WATI cannot match them.

### Solution
Update the `send-whatsapp` edge function to use numbered parameter names that match the template placeholders.

### Changes

**File: `supabase/functions/send-whatsapp/index.ts`** (lines 59-63)

Change the parameters array from:
```typescript
const parameters = [
  { name: "name", value: enquiry.name || "N/A" },
  { name: "phone", value: enquiry.mobile || "N/A" },
  { name: "images", value: enquiry.pdf_url || "No PDF available" },
];
```

To:
```typescript
const parameters = [
  { name: "1", value: enquiry.name || "N/A" },
  { name: "2", value: enquiry.mobile || "N/A" },
  { name: "3", value: enquiry.pdf_url || "No PDF available" },
];
```

### After Deployment
The edge function will be redeployed automatically. Then we can submit another test enquiry to verify the messages go through successfully.
