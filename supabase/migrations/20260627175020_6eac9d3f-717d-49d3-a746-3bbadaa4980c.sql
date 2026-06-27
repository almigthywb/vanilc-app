ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS banner_url_desktop text,
  ADD COLUMN IF NOT EXISTS banner_url_mobile text;