DROP POLICY "public read active zones" ON public.delivery_zones;
CREATE POLICY "public read active zones" ON public.delivery_zones FOR SELECT TO anon, authenticated USING (active = true);
CREATE POLICY "admin read all zones" ON public.delivery_zones FOR SELECT TO authenticated USING (private.is_admin());