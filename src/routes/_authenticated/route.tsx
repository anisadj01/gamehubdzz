import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id);
    const isDeveloper = (roles ?? []).some((r) => String(r.role) === "developer");
    const onDevPage = location.pathname.startsWith("/developer");
    if (isDeveloper && !onDevPage) throw redirect({ to: "/developer" });
    if (!isDeveloper && onDevPage) throw redirect({ to: "/dashboard" });

    return { user: data.user };
  },
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});
