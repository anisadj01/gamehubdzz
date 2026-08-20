GRANT SELECT ON public.settings TO anon;

CREATE POLICY "settings_public_config_anon" ON public.settings
FOR SELECT TO anon
USING (key = 'public_config');

CREATE POLICY "settings_dev_all" ON public.settings
FOR ALL TO authenticated
USING (public.is_developer())
WITH CHECK (public.is_developer());

INSERT INTO public.settings (key, value)
VALUES ('public_config', '{"downloadWindowsUrl":"","downloadAndroidUrl":"","whatsapp":"","facebook":"","phone":"","requireLicense":true}'::jsonb)
ON CONFLICT (key) DO NOTHING;