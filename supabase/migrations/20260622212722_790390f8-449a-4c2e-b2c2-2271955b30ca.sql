
-- Set search_path on trigger fn
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- Revoke EXECUTE on security-definer helpers from public roles
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon, authenticated;
-- Re-grant to authenticated only (RLS policies need authenticated callers to evaluate is_admin())
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;

-- Tighten INSERT policies on orders/order_items with sane validation
DROP POLICY IF EXISTS "anyone create orders" ON public.orders;
CREATE POLICY "anyone create valid orders" ON public.orders
  FOR INSERT WITH CHECK (
    length(trim(customer_first_name)) > 0
    AND length(trim(customer_phone)) >= 6
    AND subtotal >= 0
    AND total >= 0
    AND delivery_fee >= 0
  );

DROP POLICY IF EXISTS "anyone create order_items" ON public.order_items;
CREATE POLICY "anyone create valid order_items" ON public.order_items
  FOR INSERT WITH CHECK (
    qty > 0
    AND unit_price >= 0
    AND length(trim(name_snapshot)) > 0
    AND EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.created_at > now() - interval '1 hour')
  );
