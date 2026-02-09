

# Update WATI Template Parameters to Match Your Template

## What's Changing

Your WATI template uses these placeholders:
- `{{name}}` -- Customer Name
- `{{phone}}` -- Phone number
- `{{Source}}` -- Service/source (currently mapped to "place" in the form)

The current edge function sends 4 parameters (`name`, `mobile`, `place`, `sq_feet_area`) that don't match your template. We need to update the parameters to match exactly.

## Changes

### 1. Update Edge Function (`supabase/functions/send-whatsapp/index.ts`)
- Change the `parameters` array to send only the 3 values your template expects:
  - `name` -> `enquiry.name`
  - `phone` -> `enquiry.mobile`
  - `Source` -> `enquiry.place` (maps your "Place" form field to the Service/Source template variable)

### Technical Detail
Lines 72-77 of the edge function will change from:
```
parameters: [
  { name: "name", value: enquiry.name },
  { name: "mobile", value: enquiry.mobile },
  { name: "place", value: enquiry.place },
  { name: "sq_feet_area", value: String(enquiry.sq_feet_area) },
]
```
To:
```
parameters: [
  { name: "name", value: enquiry.name },
  { name: "phone", value: enquiry.mobile },
  { name: "Source", value: enquiry.place },
]
```

This is a single file change in the edge function only -- no database or frontend changes needed.
