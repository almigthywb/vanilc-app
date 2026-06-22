
CREATE POLICY "anyone read vanilc-media" ON storage.objects FOR SELECT USING (bucket_id = 'vanilc-media');
CREATE POLICY "admin upload vanilc-media" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'vanilc-media' AND public.is_admin());
CREATE POLICY "admin update vanilc-media" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'vanilc-media' AND public.is_admin()) WITH CHECK (bucket_id = 'vanilc-media' AND public.is_admin());
CREATE POLICY "admin delete vanilc-media" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'vanilc-media' AND public.is_admin());
