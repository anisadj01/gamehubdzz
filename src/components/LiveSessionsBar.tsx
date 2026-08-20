import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Timer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type LiveSession = {
  id: string;
  station_name: string;
  customer_name: string | null;
  started_at: string;
  planned_minutes: number | null;
  mode: string;
};

function useTick() {
  const [, setNow] = useState(Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);
}

function clock(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

/** Bandeau de chronos en direct pour toutes les locations en cours de la salle. */
export function LiveSessionsBar() {
  useTick();
  const { data: sessions = [] } = useQuery({
    queryKey: ["live-sessions"],
    queryFn: async (): Promise<LiveSession[]> => {
      const { data, error } = await supabase
        .from("sessions")
        .select("id, station_name, customer_name, started_at, planned_minutes, mode")
        .eq("status", "active")
        .order("started_at");
      if (error) throw error;
      return (data ?? []) as LiveSession[];
    },
    refetchInterval: 15_000,
  });

  if (sessions.length === 0) return null;

  return (
    <div className="flex items-center gap-2 overflow-x-auto">
      <Timer className="size-4 shrink-0 text-primary" />
      <div className="flex items-center gap-2">
        {sessions.map((s) => {
          const elapsed = (Date.now() - new Date(s.started_at).getTime()) / 1000;
          const planned = s.planned_minutes ? s.planned_minutes * 60 : null;
          const over = planned !== null && elapsed >= planned;
          const value = planned !== null ? clock(planned - elapsed) : clock(elapsed);
          return (
            <div
              key={s.id}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-full border px-3 py-1 text-xs",
                over
                  ? "border-destructive/50 bg-destructive/10 text-destructive"
                  : "border-primary/30 bg-primary/10 text-primary",
              )}
              title={s.customer_name ?? s.station_name}
            >
              <span className="max-w-24 truncate font-medium">{s.station_name}</span>
              <span className="font-mono tabular-nums">
                {over ? "Temps écoulé" : value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}