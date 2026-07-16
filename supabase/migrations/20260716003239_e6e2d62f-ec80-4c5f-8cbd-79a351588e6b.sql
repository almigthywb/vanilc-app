
-- Phone normalization + unique customers + CRM linkage

-- 1. Normalization helper (E.164 minus '+')
CREATE OR REPLACE FUNCTION public.normalize_phone(p TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  digits TEXT;
BEGIN
  IF p IS NULL THEN RETURN NULL; END IF;
  digits := regexp_replace(p, '[^0-9]', '', 'g');
  IF digits = '' THEN RETURN NULL; END IF;
  -- If starts with a leading 0 and length looks like Angolan local (9 digits), assume country 244
  IF length(digits) = 9 AND left(digits,1) IN ('9') THEN
    digits := '244' || digits;
  END IF;
  RETURN digits;
END;
$$;

-- 2. New columns on customers
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS normalized_phone TEXT,
  ADD COLUMN IF NOT EXISTS customer_number BIGINT,
  ADD COLUMN IF NOT EXISTS first_order_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

-- Sequence for customer_number
CREATE SEQUENCE IF NOT EXISTS public.customers_customer_number_seq;
ALTER TABLE public.customers ALTER COLUMN customer_number SET DEFAULT nextval('public.customers_customer_number_seq');
ALTER SEQUENCE public.customers_customer_number_seq OWNED BY public.customers.customer_number;

-- 3. Backfill normalized_phone
UPDATE public.customers SET normalized_phone = public.normalize_phone(phone) WHERE normalized_phone IS NULL;

-- 4. Dedup: for each normalized_phone group, keep earliest customer, remap orders, delete rest
DO $$
DECLARE
  r RECORD;
  keeper UUID;
BEGIN
  FOR r IN
    SELECT normalized_phone
    FROM public.customers
    WHERE normalized_phone IS NOT NULL
    GROUP BY normalized_phone
    HAVING COUNT(*) > 1
  LOOP
    SELECT id INTO keeper
    FROM public.customers
    WHERE normalized_phone = r.normalized_phone
    ORDER BY created_at ASC
    LIMIT 1;

    UPDATE public.orders
    SET customer_id = keeper
    WHERE customer_id IN (
      SELECT id FROM public.customers
      WHERE normalized_phone = r.normalized_phone AND id <> keeper
    );

    DELETE FROM public.customers
    WHERE normalized_phone = r.normalized_phone AND id <> keeper;
  END LOOP;
END $$;

-- 5. Backfill customer_number for existing rows (deterministic by created_at)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.customers WHERE customer_number IS NULL ORDER BY created_at ASC
  LOOP
    UPDATE public.customers SET customer_number = nextval('public.customers_customer_number_seq') WHERE id = r.id;
  END LOOP;
END $$;

ALTER TABLE public.customers ALTER COLUMN customer_number SET NOT NULL;

-- 6. Unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS customers_normalized_phone_key ON public.customers (normalized_phone);
CREATE UNIQUE INDEX IF NOT EXISTS customers_customer_number_key ON public.customers (customer_number);

-- 7. Trigger to keep normalized_phone in sync
CREATE OR REPLACE FUNCTION public.customers_set_normalized_phone()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.normalized_phone := public.normalize_phone(NEW.phone);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS customers_set_normalized_phone_trg ON public.customers;
CREATE TRIGGER customers_set_normalized_phone_trg
BEFORE INSERT OR UPDATE OF phone ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.customers_set_normalized_phone();

-- 8. Recompute stats from completed orders (single source of truth)
UPDATE public.customers c SET
  total_orders = COALESCE(s.cnt, 0),
  total_spent = COALESCE(s.sum_total, 0),
  last_order_at = s.last_completed,
  first_order_at = fo.first_created
FROM (
  SELECT customer_id,
    COUNT(*) FILTER (WHERE status='completed') AS cnt,
    COALESCE(SUM(total) FILTER (WHERE status='completed'), 0) AS sum_total,
    MAX(completed_at) FILTER (WHERE status='completed') AS last_completed
  FROM public.orders
  WHERE customer_id IS NOT NULL
  GROUP BY customer_id
) s
LEFT JOIN (
  SELECT customer_id, MIN(created_at) AS first_created
  FROM public.orders
  WHERE customer_id IS NOT NULL
  GROUP BY customer_id
) fo ON fo.customer_id = s.customer_id
WHERE c.id = s.customer_id;

-- 9. Also set first_order_at on trigger insert of a new order
CREATE OR REPLACE FUNCTION public.orders_first_order_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.customer_id IS NOT NULL THEN
    UPDATE public.customers
    SET first_order_at = COALESCE(first_order_at, NEW.created_at)
    WHERE id = NEW.customer_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_first_order_at_trg ON public.orders;
CREATE TRIGGER orders_first_order_at_trg
AFTER INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.orders_first_order_at();

-- 10. Handle order DELETE: recompute stats
CREATE OR REPLACE FUNCTION public.orders_stats_on_delete()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.customer_id IS NOT NULL AND OLD.status = 'completed' THEN
    UPDATE public.customers
    SET total_orders = GREATEST(COALESCE(total_orders,0) - 1, 0),
        total_spent = GREATEST(COALESCE(total_spent,0) - OLD.total, 0)
    WHERE id = OLD.customer_id;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS orders_stats_on_delete_trg ON public.orders;
CREATE TRIGGER orders_stats_on_delete_trg
BEFORE DELETE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.orders_stats_on_delete();
