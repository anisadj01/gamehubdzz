-- 1. VENUES
CREATE TABLE public.venues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.venues TO authenticated;
GRANT ALL ON public.venues TO service_role;
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;

-- 2. developer role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'developer';

-- 3. profiles.venue_id
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS venue_id uuid REFERENCES public.venues(id) ON DELETE SET NULL;

-- 4. helpers
CREATE OR REPLACE FUNCTION public.current_venue_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT venue_id FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_developer()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role::text = 'developer');
$$;

CREATE OR REPLACE FUNCTION public.same_venue(_venue uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_developer() OR (_venue IS NOT NULL AND _venue = public.current_venue_id());
$$;

CREATE OR REPLACE FUNCTION public.owns_venue(_venue uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_admin() AND _venue IS NOT NULL AND _venue = public.current_venue_id();
$$;

-- 5. backfill: existing data becomes one venue
DO $$
DECLARE v_owner uuid; v_id uuid;
BEGIN
  SELECT user_id INTO v_owner FROM public.user_roles WHERE role::text = 'admin' LIMIT 1;
  INSERT INTO public.venues (name, owner_id) VALUES ('Neon Arcade', v_owner) RETURNING id INTO v_id;
  UPDATE public.profiles SET venue_id = v_id WHERE venue_id IS NULL;
END $$;

-- 6. venue_id on every data table
ALTER TABLE public.game_categories     ADD COLUMN IF NOT EXISTS venue_id uuid REFERENCES public.venues(id) ON DELETE CASCADE;
ALTER TABLE public.stations            ADD COLUMN IF NOT EXISTS venue_id uuid REFERENCES public.venues(id) ON DELETE CASCADE;
ALTER TABLE public.product_categories  ADD COLUMN IF NOT EXISTS venue_id uuid REFERENCES public.venues(id) ON DELETE CASCADE;
ALTER TABLE public.products            ADD COLUMN IF NOT EXISTS venue_id uuid REFERENCES public.venues(id) ON DELETE CASCADE;
ALTER TABLE public.sessions            ADD COLUMN IF NOT EXISTS venue_id uuid REFERENCES public.venues(id) ON DELETE CASCADE;
ALTER TABLE public.session_items       ADD COLUMN IF NOT EXISTS venue_id uuid REFERENCES public.venues(id) ON DELETE CASCADE;
ALTER TABLE public.reservations        ADD COLUMN IF NOT EXISTS venue_id uuid REFERENCES public.venues(id) ON DELETE CASCADE;
ALTER TABLE public.expense_categories  ADD COLUMN IF NOT EXISTS venue_id uuid REFERENCES public.venues(id) ON DELETE CASCADE;
ALTER TABLE public.expenses            ADD COLUMN IF NOT EXISTS venue_id uuid REFERENCES public.venues(id) ON DELETE CASCADE;
ALTER TABLE public.inventory_movements ADD COLUMN IF NOT EXISTS venue_id uuid REFERENCES public.venues(id) ON DELETE CASCADE;
ALTER TABLE public.activity_logs       ADD COLUMN IF NOT EXISTS venue_id uuid REFERENCES public.venues(id) ON DELETE CASCADE;

DO $$
DECLARE v_id uuid; t text;
BEGIN
  SELECT id INTO v_id FROM public.venues ORDER BY created_at LIMIT 1;
  FOREACH t IN ARRAY ARRAY['game_categories','stations','product_categories','products','sessions','session_items','reservations','expense_categories','expenses','inventory_movements','activity_logs'] LOOP
    EXECUTE format('UPDATE public.%I SET venue_id = %L WHERE venue_id IS NULL', t, v_id);
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN venue_id SET DEFAULT public.current_venue_id()', t);
  END LOOP;
END $$;

-- 7. planned duration for chrono alert
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS planned_minutes integer;

-- 8. policies
DROP POLICY IF EXISTS gc_admin ON public.game_categories;
DROP POLICY IF EXISTS gc_select ON public.game_categories;
CREATE POLICY gc_select ON public.game_categories FOR SELECT TO authenticated USING (public.same_venue(venue_id));
CREATE POLICY gc_admin ON public.game_categories FOR ALL TO authenticated USING (public.owns_venue(venue_id)) WITH CHECK (public.owns_venue(venue_id));

DROP POLICY IF EXISTS st_select ON public.stations;
DROP POLICY IF EXISTS st_insert_admin ON public.stations;
DROP POLICY IF EXISTS st_update_status ON public.stations;
DROP POLICY IF EXISTS st_delete_admin ON public.stations;
CREATE POLICY st_select ON public.stations FOR SELECT TO authenticated USING (public.same_venue(venue_id));
CREATE POLICY st_insert_admin ON public.stations FOR INSERT TO authenticated WITH CHECK (public.owns_venue(venue_id));
CREATE POLICY st_update ON public.stations FOR UPDATE TO authenticated USING (public.same_venue(venue_id)) WITH CHECK (public.same_venue(venue_id));
CREATE POLICY st_delete_admin ON public.stations FOR DELETE TO authenticated USING (public.owns_venue(venue_id));

DROP POLICY IF EXISTS pc_admin ON public.product_categories;
DROP POLICY IF EXISTS pc_select ON public.product_categories;
CREATE POLICY pc_select ON public.product_categories FOR SELECT TO authenticated USING (public.same_venue(venue_id));
CREATE POLICY pc_admin ON public.product_categories FOR ALL TO authenticated USING (public.owns_venue(venue_id)) WITH CHECK (public.owns_venue(venue_id));

DROP POLICY IF EXISTS pr_select ON public.products;
DROP POLICY IF EXISTS pr_insert_admin ON public.products;
DROP POLICY IF EXISTS pr_update ON public.products;
DROP POLICY IF EXISTS pr_delete_admin ON public.products;
CREATE POLICY pr_select ON public.products FOR SELECT TO authenticated USING (public.same_venue(venue_id));
CREATE POLICY pr_insert_admin ON public.products FOR INSERT TO authenticated WITH CHECK (public.owns_venue(venue_id));
CREATE POLICY pr_update ON public.products FOR UPDATE TO authenticated USING (public.same_venue(venue_id)) WITH CHECK (public.same_venue(venue_id));
CREATE POLICY pr_delete_admin ON public.products FOR DELETE TO authenticated USING (public.owns_venue(venue_id));

DROP POLICY IF EXISTS se_select ON public.sessions;
DROP POLICY IF EXISTS se_insert ON public.sessions;
DROP POLICY IF EXISTS se_update ON public.sessions;
DROP POLICY IF EXISTS se_delete_admin ON public.sessions;
CREATE POLICY se_select ON public.sessions FOR SELECT TO authenticated USING (public.same_venue(venue_id));
CREATE POLICY se_insert ON public.sessions FOR INSERT TO authenticated WITH CHECK (employee_id = auth.uid() AND venue_id = public.current_venue_id());
CREATE POLICY se_update ON public.sessions FOR UPDATE TO authenticated USING (venue_id = public.current_venue_id()) WITH CHECK (venue_id = public.current_venue_id());
CREATE POLICY se_delete_admin ON public.sessions FOR DELETE TO authenticated USING (public.owns_venue(venue_id));

DROP POLICY IF EXISTS si_select ON public.session_items;
DROP POLICY IF EXISTS si_write ON public.session_items;
CREATE POLICY si_select ON public.session_items FOR SELECT TO authenticated USING (public.same_venue(venue_id));
CREATE POLICY si_write ON public.session_items FOR ALL TO authenticated USING (venue_id = public.current_venue_id()) WITH CHECK (venue_id = public.current_venue_id());

DROP POLICY IF EXISTS rs_select ON public.reservations;
DROP POLICY IF EXISTS rs_write ON public.reservations;
DROP POLICY IF EXISTS rs_update ON public.reservations;
DROP POLICY IF EXISTS rs_delete_admin ON public.reservations;
CREATE POLICY rs_select ON public.reservations FOR SELECT TO authenticated USING (public.same_venue(venue_id));
CREATE POLICY rs_write ON public.reservations FOR INSERT TO authenticated WITH CHECK (venue_id = public.current_venue_id());
CREATE POLICY rs_update ON public.reservations FOR UPDATE TO authenticated USING (venue_id = public.current_venue_id()) WITH CHECK (venue_id = public.current_venue_id());
CREATE POLICY rs_delete_admin ON public.reservations FOR DELETE TO authenticated USING (public.owns_venue(venue_id));

DROP POLICY IF EXISTS ec_admin ON public.expense_categories;
DROP POLICY IF EXISTS ec_select_admin ON public.expense_categories;
CREATE POLICY ec_select ON public.expense_categories FOR SELECT TO authenticated USING (public.same_venue(venue_id));
CREATE POLICY ec_admin ON public.expense_categories FOR ALL TO authenticated USING (public.owns_venue(venue_id)) WITH CHECK (public.owns_venue(venue_id));

DROP POLICY IF EXISTS ex_admin ON public.expenses;
CREATE POLICY ex_select ON public.expenses FOR SELECT TO authenticated USING (public.same_venue(venue_id) AND (public.is_admin() OR public.is_developer()));
CREATE POLICY ex_admin ON public.expenses FOR ALL TO authenticated USING (public.owns_venue(venue_id)) WITH CHECK (public.owns_venue(venue_id));

DROP POLICY IF EXISTS im_select ON public.inventory_movements;
DROP POLICY IF EXISTS im_insert ON public.inventory_movements;
CREATE POLICY im_select ON public.inventory_movements FOR SELECT TO authenticated USING (public.same_venue(venue_id));
CREATE POLICY im_insert ON public.inventory_movements FOR INSERT TO authenticated WITH CHECK (venue_id = public.current_venue_id());

DROP POLICY IF EXISTS al_select_admin ON public.activity_logs;
DROP POLICY IF EXISTS al_insert ON public.activity_logs;
CREATE POLICY al_select ON public.activity_logs FOR SELECT TO authenticated USING (public.same_venue(venue_id) AND (public.is_admin() OR public.is_developer()));
CREATE POLICY al_insert ON public.activity_logs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND venue_id = public.current_venue_id());

DROP POLICY IF EXISTS profiles_select_auth ON public.profiles;
CREATE POLICY profiles_select_auth ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_developer() OR (venue_id IS NOT NULL AND venue_id = public.current_venue_id()));

DROP POLICY IF EXISTS user_roles_select_auth ON public.user_roles;
CREATE POLICY user_roles_select_auth ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_developer()
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = user_roles.user_id AND p.venue_id = public.current_venue_id()));

CREATE POLICY venues_select ON public.venues FOR SELECT TO authenticated
  USING (public.is_developer() OR id = public.current_venue_id());
CREATE POLICY venues_update ON public.venues FOR UPDATE TO authenticated
  USING (public.owns_venue(id)) WITH CHECK (public.owns_venue(id));

-- 9. signup trigger: venue creation + developer role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE v_name text; v_id uuid;
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name',''), COALESCE(NEW.email,''))
  ON CONFLICT (id) DO NOTHING;

  IF lower(COALESCE(NEW.email,'')) = 'anisadjir01@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'developer'::public.app_role)
    ON CONFLICT DO NOTHING;
    RETURN NEW;
  END IF;

  v_name := nullif(btrim(COALESCE(NEW.raw_user_meta_data->>'venue_name','')), '');

  IF v_name IS NOT NULL THEN
    INSERT INTO public.venues (name, owner_id) VALUES (v_name, NEW.id) RETURNING id INTO v_id;
    UPDATE public.profiles SET venue_id = v_id WHERE id = NEW.id;
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin'::public.app_role) ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'employee'::public.app_role) ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END; $function$;