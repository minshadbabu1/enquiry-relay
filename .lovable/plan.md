
# Fix WhatsApp (WATI) Integration

## Problems Found

1. **Double "Bearer" prefix in Authorization header**
   The API key stored in the database already contains the full value `"Bearer eyJ..."`. However, the edge function code prepends another `"Bearer "` prefix, resulting in `"Bearer Bearer eyJ..."` -- which WATI rejects as unauthorized.

2. **Template parameter name mismatch**
   The parameter `"Source"` has a capital "S" which may not match the exact parameter names defined in your WATI template `admin_new_enquiry`. Parameter names must match exactly.

## Fix

Update the `send-whatsapp` edge function:

1. **Remove the extra "Bearer" prefix** -- use the `api_key` value directly since it already includes "Bearer".
2. **Add logging** for the WATI API response to help debug any template parameter issues.
3. **Lowercase the "Source" parameter** to "source" for consistency (you may need to confirm the exact names in your WATI template).

### Technical Details

**File:** `supabase/functions/send-whatsapp/index.ts`

Change line 66 from:
```typescript
Authorization: `Bearer ${settings.api_key}`,
```
To:
```typescript
Authorization: settings.api_key,
```

Add response body logging after the WATI API call to capture any error messages from WATI for debugging.
