import type { TKey } from "@/lib/i18n";

export const PERIOD_OPTIONS: { value: string; key: TKey }[] = [
  { value: "today", key: "period_today" },
  { value: "yesterday", key: "period_yesterday" },
  { value: "7", key: "period_7" },
  { value: "30", key: "period_30" },
  { value: "month", key: "period_month" },
  { value: "last-month", key: "period_last_month" },
  { value: "90", key: "period_90" },
  { value: "year", key: "period_year" },
  { value: "custom", key: "period_custom" },
];

export function toDateInput(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Convertit un choix de période (+ dates libres) en intervalle de dates. */
export function resolvePeriodRange(period: string, from: string, to: string) {
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
