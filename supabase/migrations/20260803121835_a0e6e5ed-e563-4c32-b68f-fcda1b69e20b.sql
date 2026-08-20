
-- ROLES
CREATE TYPE public.app_role AS ENUM ('admin','employee');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin');
$$;

CREATE POLICY "profiles_select_auth" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_self_or_admin" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_admin()) WITH CHECK (id = auth.uid() OR public.is_admin());
CREATE POLICY "profiles_delete_admin" ON public.profiles FOR DELETE TO authenticated USING (public.is_admin());

CREATE POLICY "user_roles_select_auth" ON public.user_roles FOR SELECT TO authenticated USING (true);

-- new user trigger: first user = admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE has_admin boolean;
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name',''), COALESCE(NEW.email,''))
  ON CONFLICT (id) DO NOTHING;

  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE role = 'admin') INTO has_admin;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN has_admin THEN 'employee'::public.app_role ELSE 'admin'::public.app_role END)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- CATEGORIES + STATIONS
CREATE TABLE public.game_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  color text NOT NULL DEFAULT '#00E28A',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_categories TO authenticated;
GRANT ALL ON public.game_categories TO service_role;
ALTER TABLE public.game_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gc_select" ON public.game_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "gc_admin" ON public.game_categories FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE public.stations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category_id uuid REFERENCES public.game_categories(id) ON DELETE SET NULL,
  hourly_rate numeric NOT NULL DEFAULT 0,
  game_rate numeric,
  status text NOT NULL DEFAULT 'available',
  color text NOT NULL DEFAULT '#00E28A',
  image_url text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stations TO authenticated;
GRANT ALL ON public.stations TO service_role;
ALTER TABLE public.stations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "st_select" ON public.stations FOR SELECT TO authenticated USING (true);
CREATE POLICY "st_update_status" ON public.stations FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "st_insert_admin" ON public.stations FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "st_delete_admin" ON public.stations FOR DELETE TO authenticated USING (public.is_admin());

-- PRODUCTS
CREATE TABLE public.product_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_categories TO authenticated;
GRANT ALL ON public.product_categories TO service_role;
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pc_select" ON public.product_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "pc_admin" ON public.product_categories FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category_id uuid REFERENCES public.product_categories(id) ON DELETE SET NULL,
  price numeric NOT NULL DEFAULT 0,
  stock int NOT NULL DEFAULT 0,
  low_stock_threshold int NOT NULL DEFAULT 5,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pr_select" ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "pr_update" ON public.products FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "pr_insert_admin" ON public.products FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "pr_delete_admin" ON public.products FOR DELETE TO authenticated USING (public.is_admin());

-- SESSIONS
CREATE SEQUENCE public.ticket_seq START 1000;
GRANT USAGE, SELECT ON SEQUENCE public.ticket_seq TO authenticated, service_role;

CREATE TABLE public.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_no bigint NOT NULL DEFAULT nextval('public.ticket_seq'),
  station_id uuid REFERENCES public.stations(id) ON DELETE SET NULL,
  station_name text NOT NULL DEFAULT '',
  category_name text,
  mode text NOT NULL DEFAULT 'timer',
  status text NOT NULL DEFAULT 'active',
  customer_name text,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  duration_minutes numeric NOT NULL DEFAULT 0,
  games_count int NOT NULL DEFAULT 0,
  hourly_rate numeric NOT NULL DEFAULT 0,
  game_rate numeric NOT NULL DEFAULT 0,
  game_amount numeric NOT NULL DEFAULT 0,
  products_amount numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  employee_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  employee_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sessions TO authenticated;
GRANT ALL ON public.sessions TO service_role;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "se_select" ON public.sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "se_insert" ON public.sessions FOR INSERT TO authenticated WITH CHECK (employee_id = auth.uid());
CREATE POLICY "se_update" ON public.sessions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "se_delete_admin" ON public.sessions FOR DELETE TO authenticated USING (public.is_admin());

CREATE TABLE public.session_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  quantity int NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_items TO authenticated;
GRANT ALL ON public.session_items TO service_role;
ALTER TABLE public.session_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "si_select" ON public.session_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "si_write" ON public.session_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- RESERVATIONS
CREATE TABLE public.reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id uuid REFERENCES public.stations(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  phone text,
  start_at timestamptz NOT NULL,
  duration_minutes int NOT NULL DEFAULT 60,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reservations TO authenticated;
GRANT ALL ON public.reservations TO service_role;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rs_select" ON public.reservations FOR SELECT TO authenticated USING (true);
CREATE POLICY "rs_write" ON public.reservations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "rs_update" ON public.reservations FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "rs_delete_admin" ON public.reservations FOR DELETE TO authenticated USING (public.is_admin());

-- EXPENSES
CREATE TABLE public.expense_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expense_categories TO authenticated;
GRANT ALL ON public.expense_categories TO service_role;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ec_select_admin" ON public.expense_categories FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "ec_admin" ON public.expense_categories FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES public.expense_categories(id) ON DELETE SET NULL,
  category_name text NOT NULL DEFAULT '',
  amount numeric NOT NULL DEFAULT 0,
  spent_on date NOT NULL DEFAULT current_date,
  description text,
  receipt_url text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ex_admin" ON public.expenses FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- INVENTORY MOVEMENTS
CREATE TABLE public.inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  product_name text NOT NULL DEFAULT '',
  delta int NOT NULL,
  reason text NOT NULL DEFAULT 'sale',
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.inventory_movements TO authenticated;
GRANT ALL ON public.inventory_movements TO service_role;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "im_select" ON public.inventory_movements FOR SELECT TO authenticated USING (true);
CREATE POLICY "im_insert" ON public.inventory_movements FOR INSERT TO authenticated WITH CHECK (true);

-- ACTIVITY LOGS
CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name text NOT NULL DEFAULT '',
  action text NOT NULL,
  entity text NOT NULL DEFAULT '',
  details text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.activity_logs TO authenticated;
GRANT ALL ON public.activity_logs TO service_role;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "al_select_admin" ON public.activity_logs FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "al_insert" ON public.activity_logs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- SETTINGS
CREATE TABLE public.settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.settings TO authenticated;
GRANT ALL ON public.settings TO service_role;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sg_select" ON public.settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "sg_admin" ON public.settings FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- SEED
INSERT INTO public.game_categories (name, color) VALUES
 ('PS5','#00E28A'),('PS4','#00C2FF'),('Xbox','#7CFF6B'),('Nintendo Switch','#FF4D6D'),
 ('Billard','#FFB020'),('Baby-foot','#B36BFF'),('VR','#00F0FF');

INSERT INTO public.stations (name, category_id, hourly_rate, game_rate, color, sort_order)
SELECT 'PS5 1', id, 300, NULL, '#00E28A', 1 FROM public.game_categories WHERE name='PS5';
INSERT INTO public.stations (name, category_id, hourly_rate, game_rate, color, sort_order)
SELECT 'PS5 2', id, 300, NULL, '#00E28A', 2 FROM public.game_categories WHERE name='PS5';
INSERT INTO public.stations (name, category_id, hourly_rate, game_rate, color, sort_order)
SELECT 'PS5 3', id, 300, NULL, '#00E28A', 3 FROM public.game_categories WHERE name='PS5';
INSERT INTO public.stations (name, category_id, hourly_rate, game_rate, color, sort_order)
SELECT 'PS4 1', id, 200, NULL, '#00C2FF', 4 FROM public.game_categories WHERE name='PS4';
INSERT INTO public.stations (name, category_id, hourly_rate, game_rate, color, sort_order)
SELECT 'Xbox Series X', id, 250, NULL, '#7CFF6B', 5 FROM public.game_categories WHERE name='Xbox';
INSERT INTO public.stations (name, category_id, hourly_rate, game_rate, color, sort_order)
SELECT 'Billard 1', id, 0, 150, '#FFB020', 6 FROM public.game_categories WHERE name='Billard';
INSERT INTO public.stations (name, category_id, hourly_rate, game_rate, color, sort_order)
SELECT 'Baby-foot 1', id, 0, 100, '#B36BFF', 7 FROM public.game_categories WHERE name='Baby-foot';
INSERT INTO public.stations (name, category_id, hourly_rate, game_rate, color, sort_order)
SELECT 'VR Station', id, 500, NULL, '#00F0FF', 8 FROM public.game_categories WHERE name='VR';

INSERT INTO public.product_categories (name) VALUES ('Boissons'),('Snacks'),('Énergisants');

INSERT INTO public.products (name, category_id, price, stock, low_stock_threshold)
SELECT 'Coca', id, 80, 40, 10 FROM public.product_categories WHERE name='Boissons';
INSERT INTO public.products (name, category_id, price, stock, low_stock_threshold)
SELECT 'Eau', id, 40, 60, 10 FROM public.product_categories WHERE name='Boissons';
INSERT INTO public.products (name, category_id, price, stock, low_stock_threshold)
SELECT 'Jus', id, 70, 30, 10 FROM public.product_categories WHERE name='Boissons';
INSERT INTO public.products (name, category_id, price, stock, low_stock_threshold)
SELECT 'Chips', id, 60, 25, 8 FROM public.product_categories WHERE name='Snacks';
INSERT INTO public.products (name, category_id, price, stock, low_stock_threshold)
SELECT 'Chocolat', id, 50, 20, 8 FROM public.product_categories WHERE name='Snacks';
INSERT INTO public.products (name, category_id, price, stock, low_stock_threshold)
SELECT 'Red Bull', id, 250, 15, 5 FROM public.product_categories WHERE name='Énergisants';

INSERT INTO public.expense_categories (name) VALUES
 ('Loyer'),('Électricité'),('Internet'),('Salaire'),('Maintenance'),('Achats boissons'),('Nettoyage'),('Impôts'),('Autres');

INSERT INTO public.settings (key, value) VALUES ('general', '{"lounge_name":"NEON ARCADE","currency":"DA","address":"","phone":""}'::jsonb);
