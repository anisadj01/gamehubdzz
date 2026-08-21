import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type VenueOverview = {
  id: string;
  name: string;
  createdAt: string;
  ownerEmail: string;
  accounts: { id: string; fullName: string; email: string; role: string }[];
  stations: number;
  sessions: number;
  revenue: number;
  gamesRevenue: number;
  drinksRevenue: number;
  expenses: number;
  profit: number;
  lastActivity: string | null;
};

export const getDeveloperOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<VenueOverview[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: role, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .in("role", ["developer", "admin"])
      .limit(1)
      .maybeSingle();
    if (roleError || !role) throw new Error("Forbidden: accès développeur requis");

    const [venues, profiles, roles, sessions, expenses, stations] = await Promise.all([
      supabaseAdmin.from("venues").select("id, name, owner_id, created_at").order("created_at"),
      supabaseAdmin.from("profiles").select("id, full_name, email, venue_id"),
      supabaseAdmin.from("user_roles").select("user_id, role"),
      supabaseAdmin
        .from("sessions")
        .select("venue_id, status, total_amount, game_amount, products_amount, ended_at")
        .eq("status", "paid"),
      supabaseAdmin.from("expenses").select("venue_id, amount"),
      supabaseAdmin.from("stations").select("venue_id"),
    ]);

    const profileRows = profiles.data ?? [];
    const roleRows = roles.data ?? [];
    const sessionRows = sessions.data ?? [];
    const expenseRows = expenses.data ?? [];
    const stationRows = stations.data ?? [];

    return (venues.data ?? []).map((v) => {
      const members = profileRows.filter((p) => p.venue_id === v.id);
      const vSessions = sessionRows.filter((s) => s.venue_id === v.id);
      const gamesRevenue = vSessions.reduce((a, s) => a + Number(s.game_amount ?? 0), 0);
      const drinksRevenue = vSessions.reduce((a, s) => a + Number(s.products_amount ?? 0), 0);
      const revenue = vSessions.reduce((a, s) => a + Number(s.total_amount ?? 0), 0);
      const spent = expenseRows
        .filter((e) => e.venue_id === v.id)
        .reduce((a, e) => a + Number(e.amount ?? 0), 0);
      const last = vSessions
        .map((s) => s.ended_at)
        .filter(Boolean)
        .sort()
        .at(-1) as string | undefined;

      return {
        id: v.id,
        name: v.name,
        createdAt: v.created_at,
        ownerEmail: profileRows.find((p) => p.id === v.owner_id)?.email ?? "—",
        accounts: members.map((m) => ({
          id: m.id,
          fullName: m.full_name ?? "",
          email: m.email ?? "",
          role: String(roleRows.find((r) => r.user_id === m.id)?.role ?? "employee"),
        })),
        stations: stationRows.filter((s) => s.venue_id === v.id).length,
        sessions: vSessions.length,
        revenue,
        gamesRevenue,
        drinksRevenue,
        expenses: spent,
        profit: revenue - spent,
        lastActivity: last ?? null,
      };
    });
  });