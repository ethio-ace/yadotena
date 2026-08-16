"use client";

import { OwnerMetrics } from "@/lib/owner";
import { formatETB } from "@/lib/currency";
import { cn } from "@/lib/utils";

interface RevenueTrendProps {
  metrics: OwnerMetrics;
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Zero-filled daily revenue series straight from the backend aggregation —
 * no client-side chart math. Bars stay honest even when a day has no sales.
 */
export function RevenueTrend({ metrics }: RevenueTrendProps) {
  const { daily, range } = metrics;
  const max = Math.max(...daily.map((d) => d.revenue), 0);

  if (daily.length === 0) {
    return (
      <div className="bg-card border rounded-2xl p-5 shadow-sm">
        <h3 className="font-black text-sm text-foreground">Revenue Trend</h3>
        <p className="text-xs text-muted-foreground mt-3">No data for this period.</p>
      </div>
    );
  }

  return (
    <div className="bg-card border rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-black text-sm text-foreground">Revenue Trend</h3>
          <p className="text-[11px] text-muted-foreground font-medium">{range.display}</p>
        </div>
      </div>

      <div className="mt-4 flex items-end gap-1.5 h-36" role="img" aria-label="Daily revenue bar chart">
        {daily.map((d) => {
          const date = new Date(`${d.date}T00:00:00`);
          const pct = max > 0 ? Math.max((d.revenue / max) * 100, d.revenue > 0 ? 6 : 2) : 2;
          const isToday =
            d.date ===
            `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(
              new Date().getDate()
            ).padStart(2, "0")}`;

          return (
            <div
              key={d.date}
              className="flex-1 flex flex-col items-center gap-1 min-w-0 group"
              title={`${d.date}: ${formatETB(d.revenue)}`}
            >
              <span className="text-[9px] font-bold text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                {d.revenue > 0 ? formatETB(d.revenue) : "—"}
              </span>
              <div className="w-full flex-1 flex items-end">
                <div
                  className={cn(
                    "w-full rounded-t-md transition-all",
                    d.revenue > 0
                      ? isToday
                        ? "bg-amber-500"
                        : "bg-amber-500/60 group-hover:bg-amber-500"
                      : "bg-muted"
                  )}
                  style={{ height: `${pct}%` }}
                />
              </div>
              <span className="text-[9px] font-bold text-muted-foreground uppercase">
                {DAY_LABELS[date.getDay()]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
