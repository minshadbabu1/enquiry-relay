
-- Enquiries table (public insert, admin read)
CREATE TABLE public.enquiries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  place TEXT NOT NULL,
  sq_feet_area NUMERIC NOT NULL,
  whatsapp_sent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.enquiries ENABLE ROW LEVEL SECURITY;

-- Anyone can insert enquiries (public form)
CREATE POLICY "Anyone can submit enquiries"
  ON public.enquiries FOR INSERT
  WITH CHECK (true);

-- Only authenticated users (admins) can view enquiries
CREATE POLICY "Authenticated users can view enquiries"
  ON public.enquiries FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- WhatsApp numbers table (admin managed)
CREATE TABLE public.whatsapp_numbers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number TEXT NOT NULL,
  label TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_numbers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage whatsapp numbers"
  ON public.whatsapp_numbers FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Anyone can read active whatsapp numbers (needed by edge function via service role)
-- But we'll use service role in edge function, so no public read needed

-- WATI settings table (admin managed)
CREATE TABLE public.wati_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  api_endpoint TEXT NOT NULL DEFAULT '',
  api_key TEXT NOT NULL DEFAULT '',
  template_name TEXT NOT NULL DEFAULT 'enquiry_notification',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.wati_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage wati settings"
  ON public.wati_settings FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Insert default row for settings
INSERT INTO public.wati_settings (api_endpoint, api_key, template_name)
VALUES ('', '', 'enquiry_notification');

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_wati_settings_updated_at
  BEFORE UPDATE ON public.wati_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
