

# Redesign Enquiry Form + Image Upload + PDF Generation

## Overview
Redesign the home page enquiry form to match the reference screenshot, add image upload capability (max 5), store images in cloud storage, and generate a PDF order form with the enquiry details and uploaded images.

## Form Redesign

The form will be updated to match the reference design:
- **Header**: "START YOUR PROJECT" with gradient/accent styling
- **Row 1**: Name (required) | Phone Number (required) -- side by side
- **Row 2**: Select District dropdown (Kerala districts) | Square Feet (optional) -- side by side
- **Row 3**: Service Required dropdown (full width) -- Interior Design, Renovation, Modular Kitchen, Painting
- **Row 4**: Project requirements textarea (optional, full width)
- **Row 5**: Image upload area (dashed border, max 5 images)
- **Submit button**: "GET QUOTE" with gradient purple styling

### Kerala Districts for Dropdown
Thiruvananthapuram, Kollam, Pathanamthitta, Alappuzha, Kottayam, Idukki, Ernakulam, Thrissur, Palakkad, Malappuram, Kozhikode, Wayanad, Kannur, Kasaragod

## Image Upload

- Users can upload up to 5 images via a drag-and-drop or click-to-upload area
- Images are uploaded to a storage bucket called `enquiry-images`
- Image previews shown with remove button
- Images stored with path: `{enquiry_id}/{filename}`

## PDF Generation

- A new edge function `generate-pdf` will create a PDF order form
- The PDF includes: enquiry details (name, phone, district, service, area, requirements) and all uploaded images
- PDF is generated after form submission and stored in a `enquiry-pdfs` storage bucket
- The PDF URL is saved on the enquiry record for admin access

## Database Changes

1. **Update `enquiries` table** -- add new columns:
   - `district` (text, nullable) -- selected district
   - `service` (text) -- replaces the current `place` column usage  
   - `requirements` (text, nullable) -- project requirements
   - `image_urls` (text array, nullable) -- URLs of uploaded images
   - `pdf_url` (text, nullable) -- URL of generated PDF

2. **Create storage bucket** `enquiry-images` (public, with RLS for uploads)
3. **Create storage bucket** `enquiry-pdfs` (public, with RLS)

## Admin Panel Update

- EnquiriesTab will show the new fields (district, service, requirements)
- Add a "View PDF" link and image thumbnails for each enquiry

---

## Technical Details

### Files to Create
- `supabase/functions/generate-pdf/index.ts` -- Edge function to generate PDF from enquiry data and images

### Files to Modify
- `src/pages/Index.tsx` -- Complete form redesign with new layout, dropdowns, textarea, image upload
- `src/components/admin/EnquiriesTab.tsx` -- Show new columns and PDF/image links
- `supabase/functions/send-whatsapp/index.ts` -- Include new fields in WhatsApp template parameters

### Database Migration
```sql
-- Add new columns to enquiries
ALTER TABLE public.enquiries 
  ADD COLUMN district text,
  ADD COLUMN service text,
  ADD COLUMN requirements text,
  ADD COLUMN image_urls text[],
  ADD COLUMN pdf_url text;

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('enquiry-images', 'enquiry-images', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('enquiry-pdfs', 'enquiry-pdfs', true);

-- Allow anyone to upload to enquiry-images
CREATE POLICY "Anyone can upload enquiry images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'enquiry-images');

-- Allow public read on enquiry-images  
CREATE POLICY "Public read enquiry images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'enquiry-images');

-- Allow public read on enquiry-pdfs
CREATE POLICY "Public read enquiry pdfs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'enquiry-pdfs');

-- Allow service role to insert PDFs (edge function uses service role)
CREATE POLICY "Service can upload enquiry pdfs"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'enquiry-pdfs');
```

### PDF Generation Edge Function
- Uses a lightweight approach to build PDF content (using a Deno-compatible PDF library or raw PDF generation)
- Fetches enquiry data and images from storage
- Composes a formatted order form with company header, enquiry details table, and embedded images
- Uploads the PDF to `enquiry-pdfs` bucket and updates the enquiry record with the URL

### Form Submission Flow
1. User fills form and selects images
2. On submit: insert enquiry record into database
3. Upload images to `enquiry-images/{enquiry_id}/`
4. Update enquiry with image URLs
5. Call `generate-pdf` edge function to create PDF
6. Call `send-whatsapp` edge function for notification
7. Show success screen

