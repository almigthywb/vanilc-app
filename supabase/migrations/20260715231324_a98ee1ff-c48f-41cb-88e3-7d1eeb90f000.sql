
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS discount_percent integer;

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_discount_percent_range;
ALTER TABLE public.products
  ADD CONSTRAINT products_discount_percent_range
  CHECK (discount_percent IS NULL OR (discount_percent >= 0 AND discount_percent <= 100));

CREATE OR REPLACE FUNCTION public.products_compute_promo_price()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.is_promo = true AND NEW.discount_percent IS NOT NULL AND NEW.discount_percent > 0 THEN
    NEW.promo_price := round(NEW.price * (1 - NEW.discount_percent::numeric / 100));
  ELSE
    NEW.promo_price := NULL;
    IF NEW.is_promo = false THEN
      NEW.discount_percent := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS products_compute_promo_price_trg ON public.products;
CREATE TRIGGER products_compute_promo_price_trg
BEFORE INSERT OR UPDATE OF price, is_promo, discount_percent
ON public.products
FOR EACH ROW EXECUTE FUNCTION public.products_compute_promo_price();

-- Backfill: for existing promo products with a manual promo_price, derive percent
UPDATE public.products
SET discount_percent = GREATEST(0, LEAST(100, round((1 - promo_price::numeric / NULLIF(price,0)) * 100)::int))
WHERE is_promo = true AND promo_price IS NOT NULL AND price > 0 AND discount_percent IS NULL;
