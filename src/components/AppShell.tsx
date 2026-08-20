import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Gamepad2,
  ShoppingBasket,
  CalendarClock,
  Receipt,
  BarChart3,
  ScrollText,
  Settings,
  LogOut,
  Sun,
  Moon,
  Languages,
  Bell,
  Menu,
  ShieldCheck,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser, useSignOut } from "@/lib/auth";
import { useI18n, type TKey } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { LiveSessionsBar } from "@/components/LiveSessionsBar";

type NavItem = {
  to: string;
  key: TKey;
  label?: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
};

const NAV: NavItem[] = [
  { to: "/dashboard", key: "dashboard", icon: LayoutDashboard },
  { to: "/postes", key: "stations", icon: Gamepad2 },
  { to: "/boutique", key: "shop", icon: ShoppingBasket },
  { to: "/reservations", key: "reservations", icon: CalendarClock },
  { to: "/depenses", key: "expenses", icon: Receipt, adminOnly: true },
  { to: "/statistiques", key: "stats", icon: BarChart3, adminOnly: true },
  { to: "/historique", key: "history", icon: ScrollText, adminOnly: true },
  { to: "/parametres", key: "settings", icon: Settings, adminOnly: true },
];

const DEV_NAV: NavItem[] = [
  { to: "/developer", key: "dashboard", label: "Console développeur", icon: ShieldCheck },
];

function useAlerts() {
  return useQuery({
    queryKey: ["alerts"],
    queryFn: async () => {
      const [{ data: products }, { data: stations }, { data: reservations }] = await Promise.all([
        supabase.from("products").select("name, stock, low_stock_threshold"),
        supabase.from("stations").select("name, status").eq("status", "maintenance"),
        supabase
          .from("reservations")
          .select("customer_name, start_at")
          .eq("status", "pending")
          .gte("start_at", new Date().toISOString())
          .lte("start_at", new Date(Date.now() + 3 * 3600_000).toISOString()),
      ]);
      const list: string[] = [];
      (products ?? [])
        .filter((p) => p.stock <= p.low_stock_threshold)
        .forEach((p) => list.push(`Stock faible : ${p.name} (${p.stock})`));
      (stations ?? []).forEach((s) => list.push(`Maintenance : ${s.name}`));
      (reservations ?? []).forEach((r) =>
        list.push(
          `Réservation imminente : ${r.customer_name} à ${new Date(r.start_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`,
        ),
      );
      return list;
    },
    refetchInterval: 60_000,
  });
}

export function AppShell({ children }: { children: ReactNode }) {
  const { t, lang, setLang } = useI18n();
  const { mode, toggle } = useTheme();
  const { data: user } = useCurrentUser();
  const signOut = useSignOut();
  const [open, setOpen] = useState(false);
  const { data: alerts = [] } = useAlerts();
  const path = useRouterState({ select: (s) => s.location.pathname });

  const isDeveloper = user?.role === "developer";
  const isAdmin = user?.role === "admin";
  const items = isDeveloper ? DEV_NAV : NAV.filter((n) => !n.adminOnly || isAdmin);
  const appName = isDeveloper ? "CONSOLE DEV" : (user?.venueName ?? t("app_name"));
  const roleLabel =
    user?.role === "developer" ? "Développeur" : user?.role === "admin" ? t("admin") : t("employee");

  return (
    <div className="min-h-screen">
      <aside
        className={cn(
          "fixed inset-y-0 z-40 flex w-64 flex-col border-e border-sidebar-border bg-sidebar/95 backdrop-blur transition-transform lg:translate-x-0",
          "start-0",
          open ? "translate-x-0" : "-translate-x-full rtl:translate-x-full lg:rtl:translate-x-0",
        )}
      >
        <div className="flex items-center gap-3 px-5 py-6">
          <div className="grid size-10 place-items-center rounded-xl bg-primary/15 glow-ring">
            <Gamepad2 className="size-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-bold uppercase tracking-widest neon-text">
              {appName}
            </p>
            <p className="text-[11px] text-muted-foreground">ERP</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {items.map((item) => {
            const active = path.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                  active
                    ? "bg-primary/12 text-primary glow-ring"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                {item.label ?? t(item.key)}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center justify-between rounded-lg bg-sidebar-accent/60 px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{user?.fullName}</p>
              <Badge variant="outline" className="mt-1 border-primary/40 text-[10px] text-primary">
                {roleLabel}
              </Badge>
            </div>
            <Button size="icon" variant="ghost" onClick={signOut} aria-label={t("signout")}>
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </aside>

      <div className="lg:ps-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur">
          <Button
            size="icon"
            variant="ghost"
            className="lg:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-label="Menu"
          >
            <Menu className="size-5" />
          </Button>

          <div className="min-w-0 flex-1">{!isDeveloper && <LiveSessionsBar />}</div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="relative" aria-label={t("notifications")}>
                <Bell className="size-4" />
                {alerts.length > 0 && (
                  <span className="absolute end-1.5 top-1.5 size-2 rounded-full bg-destructive" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>{t("notifications")}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {alerts.length === 0 ? (
                <DropdownMenuItem disabled>{t("no_data")}</DropdownMenuItem>
              ) : (
                alerts.slice(0, 10).map((a, i) => (
                  <DropdownMenuItem key={i} className="text-xs">
                    {a}
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            size="icon"
            variant="ghost"
            onClick={() => setLang(lang === "fr" ? "ar" : "fr")}
            aria-label={t("language")}
          >
            <Languages className="size-4" />
          </Button>

          <Button size="icon" variant="ghost" onClick={toggle} aria-label={t("theme")}>
            {mode === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>
        </header>

        <main className="p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
