import { supabase } from "@/integrations/supabase/client";

export type StaffShift = {
  userId: string;
  name: string;
  email: string;
  role: string;
  shiftMinutes: number;
  startedAt: string | null;
  plannedMinutes: number;
};

/** Ouvre un service pour l'utilisateur connecté (si aucun n'est déjà ouvert). */
export async function startShift(userId: string) {
  const { data: open } = await supabase
    .from("work_shifts")
    .select("id")
    .eq("user_id", userId)
    .is("ended_at", null)
    .limit(1);
  if (open && open.length > 0) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, venue_id, shift_minutes")
    .eq("id", userId)
    .maybeSingle();

  await supabase.from("work_shifts").insert({
    user_id: userId,
    venue_id: profile?.venue_id ?? null,
    user_name: profile?.full_name || profile?.email || "",
    planned_minutes: profile?.shift_minutes ?? 360,
  });
}

/** Clôture tous les services ouverts de l'utilisateur connecté. */
export async function endShift(userId: string) {
  await supabase
    .from("work_shifts")
    .update({ ended_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("ended_at", null);
}

/** Liste du personnel de la salle avec l'état de service en cours. */
export async function fetchStaffShifts(): Promise<StaffShift[]> {
  const [{ data: profiles }, { data: roles }, { data: shifts }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email, shift_minutes").order("full_name"),
    supabase.from("user_roles").select("user_id, role"),
    supabase.from("work_shifts").select("user_id, started_at, planned_minutes").is("ended_at", null),
  ]);

  return (profiles ?? []).map((p) => {
    const open = (shifts ?? []).find((s) => s.user_id === p.id);
    return {
      userId: p.id,
      name: p.full_name || p.email,
      email: p.email,
      role: String((roles ?? []).find((r) => r.user_id === p.id)?.role ?? "employee"),
      shiftMinutes: (p as { shift_minutes?: number }).shift_minutes ?? 360,
      startedAt: open?.started_at ?? null,
      plannedMinutes: open?.planned_minutes ?? (p as { shift_minutes?: number }).shift_minutes ?? 360,
    };
  });
}
