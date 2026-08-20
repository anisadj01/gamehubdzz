import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { UserCheck } from "lucide-react";
import { fetchStaffShifts } from "@/lib/shifts";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

function useTick() {
  const [, setNow] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setNow((n) => n + 1), 1000);
    return () => clearInterval(i);
  }, []);
}

function clock(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

/** Suivi du temps de service des employés (compte à rebours de la durée de travail). */
export function StaffShiftsCard() {
  useTick();
  const { t } = useI18n();
  const { data: staff = [] } = useQuery({
    queryKey: ["staff-shifts"],
    queryFn: fetchStaffShifts,
    refetchInterval: 30_000,
  });

  return (
    <div className="glow-card space-y-3 rounded-2xl p-5">
      <div className="flex items-center gap-2">
        <UserCheck className="size-4 text-primary" />
        <h2 className="font-display text-base font-semibold">{t("staff_presence")}</h2>
      </div>
      {staff.length === 0 && <p className="text-sm text-muted-foreground">{t("no_account")}</p>}
      {staff.map((s) => {
        const online = s.startedAt !== null;
        const remaining = online
          ? s.plannedMinutes * 60 - (Date.now() - new Date(s.startedAt!).getTime()) / 1000
          : 0;
        const over = online && remaining <= 0;
        return (
          <div
            key={s.userId}
            className="flex items-center justify-between gap-3 rounded-xl bg-surface-2/60 px-4 py-2.5"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{s.name}</p>
              <p className="text-[11px] text-muted-foreground">
                {s.role === "admin" ? t("admin") : t("employee")} · {Math.round(s.shiftMinutes / 60)}h
              </p>
            </div>
            <div className="text-end">
              <span
                className={cn(
                  "font-mono text-sm tabular-nums",
                  !online
                    ? "text-muted-foreground"
                    : over
                      ? "text-destructive"
                      : "text-primary",
                )}
              >
                {online ? clock(remaining) : t("off_duty")}
              </span>
              {online && (
                <p className={cn("text-[11px]", over ? "text-destructive" : "text-muted-foreground")}>
                  {over ? t("shift_over") : t("on_duty")}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
