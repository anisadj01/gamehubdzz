import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Wallet, TrendingUp, Timer, Gamepad2, ShoppingBasket, Trophy, Activity, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { fetchStations } from "@/lib/queries";
import { money, num, minutesToHuman } from "@/lib/format";
import { PERIOD_OPTIONS, resolvePeriodRange, toDateInput } from "@/lib/period";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { StaffShiftsCard } from "@/components/StaffShiftsCard";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Tableau de bord — GameHub ERP" },
      { name: "description", content: "Chiffre d'affaires, bénéfices et activité de la salle en temps réel." },
      { property: "og:title", content: "Tableau de bord — GameHub ERP" },
      { property: "og:description", content: "Vue temps réel des recettes, locations et stock." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { data: user } = useCurrentUser();
  const { t } = useI18n();
  const isAdmin = user?.role === "admin";
  const [period, setPeriod] = useState("month");
  const [from, setFrom] = useState(toDateInput(new Date(Date.now() - 6 * 86400000)));
  const [to, setTo] = useState(toDateInput(new Date()));

  const { data: stations = [] } = useQuery({ queryKey: ["stations"], queryFn: fetchStations });

  const { data } = useQuery({
    queryKey: ["dashboard", period, from, to],
    queryFn: async () => {
      const { start: rangeStart, end: rangeEnd } = resolvePeriodRange(period, from, to);
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const [{ data: sessions }, { data: items }, { data: expenses }, { data: active }] =
        await Promise.all([
          supabase
            .from("sessions")
            .select("*")
            .eq("status", "paid")
            .gte("ended_at", rangeStart.toISOString())
            .lte("ended_at", rangeEnd.toISOString()),
          supabase
            .from("session_items")
            .select("product_name, quantity, total, created_at")
            .gte("created_at", rangeStart.toISOString())
            .lte("created_at", rangeEnd.toISOString()),
          supabase
            .from("expenses")
            .select("amount, spent_on")
            .gte("spent_on", toDateInput(rangeStart))
            .lte("spent_on", toDateInput(rangeEnd)),
          supabase.from("sessions").select("id").eq("status", "active"),
        ]);

      const all = sessions ?? [];
      const todays = all.filter((s) => s.ended_at && new Date(s.ended_at) >= todayStart);

      const sum = (rows: { total_amount: number }[]) => rows.reduce((a, r) => a + Number(r.total_amount), 0);
      const gamesRevenue = all.reduce((a, s) => a + Number(s.game_amount), 0);
      const drinksRevenue = all.reduce((a, s) => a + Number(s.products_amount), 0);
      const expensesTotal = (expenses ?? []).reduce((a, e) => a + Number(e.amount), 0);

      const byStation = new Map<string, number>();
      all.forEach((s) => byStation.set(s.station_name, (byStation.get(s.station_name) ?? 0) + Number(s.total_amount)));
      const byProduct = new Map<string, number>();
      (items ?? []).forEach((i) => byProduct.set(i.product_name, (byProduct.get(i.product_name) ?? 0) + i.quantity));

      const days = new Map<string, number>();
      all.forEach((s) => {
        const key = new Date(s.ended_at!).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
        days.set(key, (days.get(key) ?? 0) + Number(s.total_amount));
      });

      return {
        todayRevenue: sum(todays),
        monthRevenue: sum(all),
        gamesRevenue,
        drinksRevenue,
        expensesTotal,
        profit: gamesRevenue + drinksRevenue - expensesTotal,
        sessionsCount: all.length,
        gamesCount: all.reduce((a, s) => a + s.games_count, 0),
        playMinutes: all.reduce((a, s) => a + Number(s.duration_minutes), 0),
        productsSold: (items ?? []).reduce((a, i) => a + i.quantity, 0),
        customers: new Set(all.map((s) => s.customer_name).filter(Boolean)).size,
        topStation: [...byStation.entries()].sort((a, b) => b[1] - a[1])[0],
        topProduct: [...byProduct.entries()].sort((a, b) => b[1] - a[1])[0],
        activeCount: (active ?? []).length,
        chart: [...days.entries()].map(([day, total]) => ({ day, total })).slice(-14),
      };
    },
    refetchInterval: 30_000,
  });

  const occupancy = stations.length ? Math.round(((data?.activeCount ?? 0) / stations.length) * 100) : 0;

  return (
    <div>
      <PageHeader
        title={t("dashboard")}
        subtitle={`${t(PERIOD_OPTIONS.find((p) => p.value === period)?.key ?? "period_month")} · ${t("auto_refresh")}`}
        actions={
          <>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {t(p.key)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {period === "custom" && (
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={from}
                  max={to}
                  onChange={(e) => setFrom(e.target.value)}
                  className="w-40"
                  aria-label="Date de début"
                />
                <span className="text-xs text-muted-foreground">{t("to_date")}</span>
                <Input
                  type="date"
                  value={to}
                  min={from}
                  onChange={(e) => setTo(e.target.value)}
                  className="w-40"
                  aria-label="Date de fin"
                />
              </div>
            )}
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t("revenue_today")} value={money(data?.todayRevenue ?? 0)} icon={Wallet} />
        <StatCard label={t("revenue_period")} value={money(data?.monthRevenue ?? 0)} icon={TrendingUp} tone="cyan" />
        {isAdmin && (
          <StatCard
            label={t("profit")}
            value={money(data?.profit ?? 0)}
            hint={`${t("total_expenses")} : ${money(data?.expensesTotal ?? 0)}`}
            icon={Trophy}
            tone="warn"
          />
        )}
        <StatCard label={t("occupancy")} value={`${occupancy}%`} hint={`${data?.activeCount ?? 0}/${stations.length}`} icon={Activity} tone="muted" />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t("sessions_count")} value={num(data?.sessionsCount ?? 0)} icon={Gamepad2} tone="muted" />
        <StatCard label={t("games_count")} value={num(data?.gamesCount ?? 0)} icon={Gamepad2} tone="muted" />
        <StatCard label={t("play_time")} value={minutesToHuman(data?.playMinutes ?? 0)} icon={Timer} tone="muted" />
        <StatCard label={t("products_sold")} value={num(data?.productsSold ?? 0)} icon={ShoppingBasket} tone="muted" />
      </div>

      {isAdmin && (
        <div className="mt-4">
          <StaffShiftsCard />
        </div>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="glow-card rounded-2xl p-5 lg:col-span-2">
          <h2 className="mb-4 font-display text-base font-semibold">{t("revenue_period_chart")}</h2>
          <ChartContainer config={{ total: { label: "Recettes", color: "var(--chart-1)" } }} className="h-64 w-full">
            <BarChart data={data?.chart ?? []}>
              <CartesianGrid vertical={false} strokeOpacity={0.15} />
              <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={11} />
              <YAxis tickLine={false} axisLine={false} fontSize={11} width={50} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="total" fill="var(--color-total)" radius={6} />
            </BarChart>
          </ChartContainer>
        </div>

        <div className="glow-card space-y-4 rounded-2xl p-5">
          <h2 className="font-display text-base font-semibold">{t("highlights")}</h2>
          <Highlight icon={Trophy} label={t("top_station_label")} value={data?.topStation ? `${data.topStation[0]} · ${money(data.topStation[1])}` : "—"} />
          <Highlight icon={ShoppingBasket} label={t("top_product_label")} value={data?.topProduct ? `${data.topProduct[0]} · ${data.topProduct[1]}` : "—"} />
          <Highlight icon={Wallet} label={t("games_revenue")} value={money(data?.gamesRevenue ?? 0)} />
          <Highlight icon={ShoppingBasket} label={t("drinks_revenue")} value={money(data?.drinksRevenue ?? 0)} />
          <Highlight icon={Users} label={t("identified_customers")} value={num(data?.customers ?? 0)} />
        </div>
      </div>
    </div>
  );
}

function Highlight({ icon: Icon, label, value }: { icon: typeof Trophy; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/12 text-primary">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}
