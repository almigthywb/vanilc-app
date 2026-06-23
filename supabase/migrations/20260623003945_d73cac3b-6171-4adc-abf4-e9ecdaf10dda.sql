CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT private.has_role(auth.uid(), 'admin'::public.app_role)
$$;

REVOKE ALL ON FUNCTION private.is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_admin() FROM anon;
GRANT EXECUTE ON FUNCTION private.is_admin() TO authenticated;