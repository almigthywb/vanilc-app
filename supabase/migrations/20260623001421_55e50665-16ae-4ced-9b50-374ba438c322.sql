
-- 1. Move SECURITY DEFINER functions out of public schema
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated;

-- Drop policies that reference public.is_admin so we can move the function
DROP POLICY IF EXISTS "admin write categories" ON public.categories;
DROP POLICY IF EXISTS "admin write products" ON public.products;
DROP POLICY IF EXISTS "admin write product_options" ON public.product_options;
DROP POLICY IF EXISTS "admin write product_option_items" ON public.product_option_items;
DROP POLICY IF EXISTS "admin read customers" ON public.customers;
DROP POLICY IF EXISTS "admin write customers" ON public.customers;
DROP POLICY IF EXISTS "admin read orders" ON public.orders;
DROP POLICY IF EXISTS "admin update orders" ON public.orders;
DROP POLICY IF EXISTS "admin delete orders" ON public.orders;
DROP POLICY IF EXISTS "admin read order_items" ON public.order_items;
DROP POLICY IF EXISTS "admin manage order_items" ON public.order_items;
DROP POLICY IF EXISTS "admin write settings" ON public.settings;
DROP POLICY IF EXISTS "admin upload vanilc-media" ON storage.objects;
DROP POLICY IF EXISTS "admin update vanilc-media" ON storage.objects;
DROP POLICY IF EXISTS "admin delete vanilc-media" ON storage.objects;

ALTER FUNCTION public.is_admin() SET SCHEMA private;
ALTER FUNCTION public.has_role(uuid, public.app_role) SET SCHEMA private;

REVOKE ALL ON FUNCTION private.is_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated;

-- Recreate policies pointing at private.is_admin()
CREATE POLICY "admin write categories" ON public.categories FOR ALL TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());
CREATE POLICY "admin write products" ON public.products FOR ALL TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());
CREATE POLICY "admin write product_options" ON public.product_options FOR ALL TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());
CREATE POLICY "admin write product_option_items" ON public.product_option_items FOR ALL TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());
CREATE POLICY "admin read customers" ON public.customers FOR SELECT TO authenticated USING (private.is_admin());
CREATE POLICY "admin write customers" ON public.customers FOR ALL TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());
CREATE POLICY "admin read orders" ON public.orders FOR SELECT TO authenticated USING (private.is_admin());
CREATE POLICY "admin update orders" ON public.orders FOR UPDATE TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());
CREATE POLICY "admin delete orders" ON public.orders FOR DELETE TO authenticated USING (private.is_admin());
CREATE POLICY "admin read order_items" ON public.order_items FOR SELECT TO authenticated USING (private.is_admin());
CREATE POLICY "admin manage order_items" ON public.order_items FOR ALL TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());
CREATE POLICY "admin write settings" ON public.settings FOR ALL TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());
CREATE POLICY "admin upload vanilc-media" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'vanilc-media' AND private.is_admin());
CREATE POLICY "admin update vanilc-media" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'vanilc-media' AND private.is_admin()) WITH CHECK (bucket_id = 'vanilc-media' AND private.is_admin());
CREATE POLICY "admin delete vanilc-media" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'vanilc-media' AND private.is_admin());

-- 2. Remove anonymous insert policies (server function uses service role)
DROP POLICY IF EXISTS "anyone create valid orders" ON public.orders;
DROP POLICY IF EXISTS "anyone create valid order_items" ON public.order_items;

-- 3. Hide whatsapp_number from anonymous visitors
REVOKE SELECT (whatsapp_number) ON public.settings FROM anon;
