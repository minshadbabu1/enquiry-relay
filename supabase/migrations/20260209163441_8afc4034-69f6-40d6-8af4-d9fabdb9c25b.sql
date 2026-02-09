ALTER TABLE public.enquiries 
  ADD COLUMN whatsapp_status text DEFAULT NULL,
  ADD COLUMN whatsapp_response jsonb DEFAULT NULL;