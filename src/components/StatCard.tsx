import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "neon",
}: {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone?: "neon" | "cyan" | "warn" | "muted";
}) {
  const toneClass = {
    neon: "text-primary bg-primary/12",
    cyan: "text-accent bg-accent/12",
    warn: "text-warn bg-warn/12",
    muted: "text-muted-foreground bg-muted",
  }[tone];

  return (
    <div className="glow-card rounded-2xl p-5 transition-transform hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 font-display text-2xl font-bold">{value}</p>
          {hint && <p className="mt-1 truncate text-xs text-muted-foreground">{hint}</p>}
        </div>
        <div className={cn("grid size-10 shrink-0 place-items-center rounded-xl", toneClass)}>
          <Icon className="size-5" />
        </div>
      </div>
    </div>
  );
}
