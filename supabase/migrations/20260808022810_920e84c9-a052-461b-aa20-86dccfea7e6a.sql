ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS shift_minutes integer NOT NULL DEFAULT 360;

CREATE TABLE IF NOT EXISTS public.work_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  venue_id uuid REFERENCES public.venues(id),
  user_name text NOT NULL DEFAULT '',
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  planned_minutes integer NOT NULL DEFAULT 360,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.work_shifts TO authenticated;
GRANT ALL ON public.work_shifts TO service_role;

ALTER TABLE public.work_shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY work_shifts_select ON public.work_shifts FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.same_venue(venue_id));

CREATE POLICY work_shifts_insert_own ON public.work_shifts FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY work_shifts_update_own_or_admin ON public.work_shifts FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR public.owns_venue(venue_id))
WITH CHECK (user_id = auth.uid() OR public.owns_venue(venue_id));

CREATE INDEX IF NOT EXISTS work_shifts_venue_open_idx ON public.work_shifts (venue_id, ended_at);
CREATE INDEX IF NOT EXISTS work_shifts_user_idx ON public.work_shifts (user_id, started_at DESC);