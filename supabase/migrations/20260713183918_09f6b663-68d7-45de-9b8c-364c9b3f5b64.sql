
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'confirmed' BEFORE 'preparing';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'ready' AFTER 'preparing';

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;

UPDATE public.orders SET completed_at = created_at WHERE status = 'completed' AND completed_at IS NULL;
UPDATE public.orders SET cancelled_at = created_at WHERE status = 'cancelled' AND cancelled_at IS NULL;

CREATE OR REPLACE FUNCTION public.orders_status_timestamps()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status = 'completed' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'completed') THEN
    NEW.completed_at := COALESCE(NEW.completed_at, now());
  ELSIF NEW.status <> 'completed' THEN
    NEW.completed_at := NULL;
  END IF;
  IF NEW.status = 'cancelled' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'cancelled') THEN
    NEW.cancelled_at := COALESCE(NEW.cancelled_at, now());
  ELSIF NEW.status <> 'cancelled' THEN
    NEW.cancelled_at := NULL;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS orders_status_timestamps ON public.orders;
CREATE TRIGGER orders_status_timestamps
BEFORE INSERT OR UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.orders_status_timestamps();

CREATE OR REPLACE FUNCTION public.orders_customer_stats()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' AND NEW.customer_id IS NOT NULL THEN
    UPDATE public.customers
      SET total_orders = COALESCE(total_orders,0) + 1,
          total_spent = COALESCE(total_spent,0) + NEW.total,
          last_order_at = COALESCE(NEW.completed_at, now())
      WHERE id = NEW.customer_id;
  ELSIF OLD.status = 'completed' AND NEW.status IS DISTINCT FROM 'completed' AND OLD.customer_id IS NOT NULL THEN
    UPDATE public.customers
      SET total_orders = GREATEST(COALESCE(total_orders,0) - 1, 0),
          total_spent = GREATEST(COALESCE(total_spent,0) - OLD.total, 0)
      WHERE id = OLD.customer_id;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS orders_customer_stats ON public.orders;
CREATE TRIGGER orders_customer_stats
AFTER UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.orders_customer_stats();

UPDATE public.customers SET total_orders = 0, total_spent = 0, last_order_at = NULL;

UPDATE public.customers c
SET total_orders = sub.cnt,
    total_spent = sub.sum,
    last_order_at = sub.last_at
FROM (
  SELECT customer_id,
         COUNT(*)::int AS cnt,
         SUM(total) AS sum,
         MAX(COALESCE(completed_at, created_at)) AS last_at
  FROM public.orders
  WHERE status = 'completed' AND customer_id IS NOT NULL
  GROUP BY customer_id
) sub
WHERE c.id = sub.customer_id;
