CREATE TABLE public.licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_key text NOT NULL UNIQUE,
  customer_name text NOT NULL DEFAULT '',
  venue_name text NOT NULL DEFAULT '',
  venue_id uuid REFERENCES public.venues(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active',
  activated_at timestamptz,
  expires_at timestamptz,
  machine_id text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.licenses TO authenticated;
GRANT ALL ON public.licenses TO service_role;
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY lic_dev_all ON public.licenses FOR ALL TO authenticated
  USING (public.is_developer()) WITH CHECK (public.is_developer());
CREATE POLICY lic_venue_select ON public.licenses FOR SELECT TO authenticated
  USING (public.is_developer() OR (venue_id IS NOT NULL AND venue_id = public.current_venue_id()));

CREATE TABLE public.license_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id uuid NOT NULL REFERENCES public.licenses(id) ON DELETE CASCADE,
  event text NOT NULL,
  details text,
  machine_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.license_events TO authenticated;
GRANT ALL ON public.license_events TO service_role;
ALTER TABLE public.license_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY lev_dev_all ON public.license_events FOR ALL TO authenticated
  USING (public.is_developer()) WITH CHECK (public.is_developer());

CREATE TABLE public.login_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL DEFAULT '',
  ip_address text,
  user_agent text,
  device text,
  os text,
  browser text,
  machine_id text,
  venue_id uuid REFERENCES public.venues(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.login_logs TO authenticated;
GRANT ALL ON public.login_logs TO service_role;
ALTER TABLE public.login_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY ll_insert_self ON public.login_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY ll_select ON public.login_logs FOR SELECT TO authenticated
  USING (public.is_developer() OR user_id = auth.uid());

CREATE INDEX login_logs_user_created_idx ON public.login_logs (user_id, created_at DESC);
CREATE INDEX licenses_status_idx ON public.licenses (status);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_licenses_updated_at
  BEFORE UPDATE ON public.licenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();