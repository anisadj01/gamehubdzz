import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { endShift } from "@/lib/shifts";

export type AppRole = "admin" | "employee" | "developer";

export type CurrentUser = {
  id: string;
  email: string;
  fullName: string;
  role: AppRole;
  venueId: string | null;
  venueName: string;
};

async function fetchCurrentUser(): Promise<CurrentUser | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  const user = data.user;

  const [{ data: profile }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("full_name, email, venue_id").eq("id", user.id).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", user.id),
  ]);

  const list = (roles ?? []).map((r) => String(r.role));
  const role: AppRole = list.includes("developer")
    ? "developer"
    : list.includes("admin")
      ? "admin"
      : "employee";

  const venueId = (profile as { venue_id?: string | null } | null)?.venue_id ?? null;
  let venueName = "GAMEHUB ERP";
  if (venueId) {
    const { data: venue } = await supabase.from("venues").select("name").eq("id", venueId).maybeSingle();
    if (venue?.name) venueName = venue.name;
  }

  return {
    id: user.id,
    email: profile?.email || user.email || "",
    fullName: profile?.full_name || user.email?.split("@")[0] || "",
    role,
    venueId,
    venueName,
  };
}

export function useCurrentUser() {
  return useQuery({
    queryKey: ["current-user"],
    queryFn: fetchCurrentUser,
    staleTime: 60_000,
  });
}

export function useIsAdmin() {
  const { data } = useCurrentUser();
  return data?.role === "admin";
}

export function useIsDeveloper() {
  const { data } = useCurrentUser();
  return data?.role === "developer";
}

export function useSignOut() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useCallback(async () => {
    try {
      const { data } = await supabase.auth.getUser();
      if (data.user) await endShift(data.user.id);
    } catch {
      /* la clôture du pointage ne doit pas bloquer la déconnexion */
    }
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }, [queryClient, navigate]);
}

export async function logActivity(action: string, entity: string, details?: string) {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return;
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", data.user.id)
    .maybeSingle();
  await supabase.from("activity_logs").insert({
    user_id: data.user.id,
    user_name: profile?.full_name || profile?.email || "",
    action,
    entity,
    details: details ?? null,
  });
}
