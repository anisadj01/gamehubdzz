export const CURRENCY = "DA";

export function money(value: number | null | undefined): string {
  const n = Number(value ?? 0);
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Math.round(n))} ${CURRENCY}`;
}

export function num(value: number | null | undefined): string {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Number(value ?? 0));
}

/** Minutes -> "1h30" */
export function minutesToHuman(minutes: number | null | undefined): string {
  const total = Math.max(0, Math.round(Number(minutes ?? 0)));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}min`;
  return `${h}h${String(m).padStart(2, "0")}`;
}

/** Seconds -> "01:23:45" */
export function secondsToClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h, m, sec].map((v) => String(v).padStart(2, "0")).join(":");
}

export function fmtDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
}

export function fmtTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export function fmtDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString("fr-FR");
}

export type PeriodKey = "today" | "yesterday" | "last7" | "last30" | "year";

export function periodRange(key: PeriodKey): { from: Date; to: Date } {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (key) {
    case "today":
      return { from: startOfToday, to: now };
    case "yesterday": {
      const from = new Date(startOfToday);
      from.setDate(from.getDate() - 1);
      return { from, to: startOfToday };
    }
    case "last7": {
      const from = new Date(startOfToday);
      from.setDate(from.getDate() - 6);
      return { from, to: now };
    }
    case "last30": {
      const from = new Date(startOfToday);
      from.setDate(from.getDate() - 29);
      return { from, to: now };
    }
    case "year":
    default:
      return { from: new Date(now.getFullYear(), 0, 1), to: now };
  }
}

export function startOfMonth(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
