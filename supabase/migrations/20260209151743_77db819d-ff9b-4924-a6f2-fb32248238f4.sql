
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
