

# Fix: Enquiry Form Submission Failing with Images

## Root Cause

The enquiry submission fails when images are attached because after uploading images to storage, the code attempts to **UPDATE** the `enquiries` table with image URLs. However, the `enquiries` table only has INSERT and SELECT RLS policies -- there is **no UPDATE policy**, so the update is silently rejected, and subsequent steps may fail.

Additionally, the current flow is fragile: if any single image upload fails, the entire submission errors out.

## Fix

### 1. Add UPDATE RLS policy for enquiries table

Allow anyone to update their own enquiry (limited to `image_urls` column isn't possible via RLS, but we can allow general updates since the form needs it).

Alternatively, a simpler approach: **include `image_urls` in the initial INSERT** instead of updating afterward. This removes the need for an UPDATE policy entirely.

### 2. Restructure the submission flow

Change the order so images are uploaded **before** the enquiry is inserted, then include the image URLs directly in the INSERT statement. This eliminates the need for an UPDATE call entirely.

**New flow:**
1. Upload images to storage (using a temporary UUID as folder name)
2. Collect all image URLs  
3. INSERT enquiry with all data including image URLs in one call
4. Call generate-pdf edge function
5. Call send-whatsapp edge function

### 3. Add error resilience for image uploads

Use `Promise.allSettled` instead of `Promise.all` so that if one image fails to upload, the others still succeed and the form still submits.

---

## Technical Details

### File: `src/pages/Index.tsx` (modify `onSubmit` function)

**Before:**
- Insert enquiry -> Upload images -> Update enquiry with URLs -> Generate PDF -> Send WhatsApp

**After:**
- Generate a temporary ID (UUID) for image folder
- Upload all images using `Promise.allSettled` (collect successful URLs)
- Insert enquiry with all fields including `image_urls` in one call
- Call generate-pdf (wrapped in try/catch, non-blocking)
- Call send-whatsapp (wrapped in try/catch, non-blocking)

Key changes:
- Use `crypto.randomUUID()` to generate a folder ID before insert
- Upload images first, collect URLs from successful uploads
- Single INSERT with all data including `image_urls`
- Remove the separate UPDATE call entirely
- Use `Promise.allSettled` for resilient image uploading

