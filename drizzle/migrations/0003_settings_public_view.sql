REVOKE SELECT ON public.settings FROM anon;

CREATE OR REPLACE VIEW public.settings_public AS
SELECT id, store_open, delivery_fee_city, delivery_fee_outside, prep_time_min, prep_time_max,
       address, business_hours, logo_url, banner_url, banner_url_desktop, banner_url_mobile
FROM public.settings;

GRANT SELECT ON public.settings_public TO anon, authenticated;