import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { FileDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { money, num, minutesToHuman } from "@/lib/format";
import { exportCsv, exportExcel, exportPdf } from "@/lib/exports";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/statistiques")({
  head: () => ({
    meta: [
      { title: "Statistiques — GameHub ERP" },
      { name: "description", content: "Analyse des recettes par poste et par période." },
      { property: "og:title", content: "Statistiques — GameHub ERP" },
      { property: "og:description", content: "Rapports détaillés exportables en PDF et Excel." },
    ],
  }),
  component: StatsPage,
});

const PERIODS = [
  { value: "today", label: "Aujourd'hui" },
  { value: "yesterday", label: "Hier" },
  { value: "7", label: "7 derniers jours" },
  { value: "30", label: "30 derniers jours" },
  { value: "month", label: "Ce mois-ci" },
  { value: "last-month", label: "Mois dernier" },
  { value: "90", label: "90 derniers jours" },
  { value: "year", label: "Cette année" },
  { value: "custom", label: "Entre deux dates" },
];

function toInput(d: Date) {
  return d.toISOString().slice(0, 10);
}

function resolveRange(period: string, from: string, to: string) {
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

  switch (period) {
    case "today":
      return { start: startOfDay(now), end: endOfDay(now) };
    case "yesterday": {
      const y = new Date(now.getTime() - 86400000);
      return { start: startOfDay(y), end: endOfDay(y) };
    }
    case "month":
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: endOfDay(now) };
    case "last-month":
      return {
        start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        end: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999),
      };
    case "year":
      return { start: new Date(now.getFullYear(), 0, 1), end: endOfDay(now) };
    case "custom": {
      const start = from ? startOfDay(new Date(from)) : startOfDay(new Date(now.getFullYear(), 0, 1));
      const end = to ? endOfDay(new Date(to)) : endOfDay(now);
      return { start, end };
    }
    default: {
      const days = Number(period) || 30;
      return { start: startOfDay(new Date(now.getTime() - (days - 1) * 86400000)), end: endOfDay(now) };
    }
  }
}

function StatsPage() {
  const [period, setPeriod] = useState("30");
  const [from, setFrom] = useState(toInput(new Date(Date.now() - 6 * 86400000)));
  const [to, setTo] = useState(toInput(new Date()));

  const { data: rows = [] } = useQuery({
    queryKey: ["stats", period, from, to],
    queryFn: async () => {
      const { start, end } = resolveRange(period, from, to);
      const { data, error } = await supabase
        .from("sessions")
        .select("*")
        .eq("status", "paid")
        .gte("ended_at", start.toISOString())
        .lte("ended_at", end.toISOString());
      if (error) throw error;
      const map = new Map<string, { station: string; sessions: number; minutes: number; games: number; revenue: number }>();
      (data ?? []).forEach((s) => {
        const cur = map.get(s.station_name) ?? { station: s.station_name, sessions: 0, minutes: 0, games: 0, revenue: 0 };
        cur.sessions += 1;
        cur.minutes += Number(s.duration_minutes);
        cur.games += s.games_count;
        cur.revenue += Number(s.total_amount);
        map.set(s.station_name, cur);
      });
      return [...map.values()].sort((a, b) => b.revenue - a.revenue);
    },
  });

  const total = rows.reduce((a, r) => a + r.revenue, 0);
  const columns = [
    { header: "Poste", key: "station" },
    { header: "Locations", key: "sessions" },
    { header: "Minutes", key: "minutes" },
    { header: "Parties", key: "games" },
    { header: "Recettes", key: "revenue" },
  ];

  return (
    <div>
      <PageHeader
        title="Statistiques"
        subtitle={`Recettes sur la période : ${money(total)}`}
        actions={
          <>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIODS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
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
                <span className="text-xs text-muted-foreground">au</span>
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
            <Button variant="outline" onClick={() => exportExcel("statistiques", columns, rows)}>
              <FileDown className="size-4" />
              Excel
            </Button>
            <Button variant="outline" onClick={() => exportCsv("statistiques", columns, rows)}>
              <FileDown className="size-4" />
              CSV
            </Button>
            <Button variant="outline" onClick={() => exportPdf("statistiques", "Statistiques par poste", columns, rows, [`Total : ${money(total)}`])}>
              <FileDown className="size-4" />
              PDF
            </Button>
          </>
        }
      />

      <div className="glow-card overflow-x-auto rounded-2xl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Poste</TableHead>
              <TableHead>Locations</TableHead>
              <TableHead>Temps joué</TableHead>
              <TableHead>Parties</TableHead>
              <TableHead>Recettes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.station}>
                <TableCell className="font-medium">{r.station}</TableCell>
                <TableCell>{num(r.sessions)}</TableCell>
                <TableCell>{minutesToHuman(r.minutes)}</TableCell>
                <TableCell>{num(r.games)}</TableCell>
                <TableCell>{money(r.revenue)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
