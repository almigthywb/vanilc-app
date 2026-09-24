ALTER TYPE public.delivery_type ADD VALUE IF NOT EXISTS 'delivery';

CREATE TABLE public.delivery_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  fee numeric(10,2) NOT NULL CHECK (fee >= 0),
  display_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.delivery_zones TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.delivery_zones TO authenticated;
GRANT ALL ON public.delivery_zones TO service_role;
ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read active zones" ON public.delivery_zones FOR SELECT USING (active = true OR private.is_admin());
CREATE POLICY "admin write zones" ON public.delivery_zones FOR ALL TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());
CREATE TRIGGER delivery_zones_touch BEFORE UPDATE ON public.delivery_zones FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.orders
  ADD COLUMN delivery_zone_id uuid REFERENCES public.delivery_zones(id) ON DELETE SET NULL,
  ADD COLUMN delivery_zone_name text,
  ADD COLUMN reference_point text;

COMMENT ON COLUMN public.settings.delivery_fee_city IS 'DEPRECATED: replaced by delivery_zones';
COMMENT ON COLUMN public.settings.delivery_fee_outside IS 'DEPRECATED: replaced by delivery_zones';