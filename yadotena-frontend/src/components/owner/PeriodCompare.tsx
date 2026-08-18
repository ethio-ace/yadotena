"use client";

import { PeriodComparison } from "@/lib/owner";
import { formatETB } from "@/lib/currency";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * One direction-aware delta chip: ▲ 12.4% (good = up) / ▼ 3.2% (bad = down).
 * `invert` flips the sentiment for metrics where down is good (expenses).
 * A null percentage (zero baseline last period) renders a neutral dash.
 */
export function Delta({
  pct,
  invert = false,
  className,
}: {
  pct: number | null;
  invert?: boolean;
  className?: string;
}) {
  if (pct === null) {
    return (
      <span className={cn("inline-flex items-center gap-0.5 text-[11px] font-bold text-muted-foreground/70", className)}>
        <Minus className="h-3 w-3" /> —
      </span>
    );
  }
  const up = pct >= 0;
  const good = invert ? !up : up;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-[11px] font-black tabular-nums rounded-full px-1.5 py-0.5",
        good ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/10 text-rose-600 dark:text-rose-400",
        className
      )}
      title={invert ? "Lower is better" : undefined}
    >
      {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

interface ComparisonBarProps {
  comparison: PeriodComparison;
  /** When true, the bar collapses to a single line on small screens. */
  compact?: boolean;
}

/**
 * \"vs last period\" strip shown on the owner overview and analytics hub.
 * Every metric compares like-for-like against the equivalent earlier window
 * (yesterday / last week / last month / previous 3 months / last year).
 */
export function ComparisonBar({ comparison, compact = false }: ComparisonBarProps) {
  const items: { label: string; pct: number | null; invert?: boolean; extra?: string }[] = [
    { label: "Revenue", pct: comparison.revenuePct },
    { label: "Paid orders", pct: comparison.paidOrdersPct },
    { label: "Avg ticket", pct: comparison.averageTicketPct },
    { label: "Expenses", pct: comparison.expensesPct, invert: true },
    { label: "Net (rev − exp)", pct: comparison.netPct },
  ];

  return (
    <div className="rounded-2xl border bg-card shadow-sm px-4 py-3 flex flex-wrap items-center gap-x-5 gap-y-2">
      <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        vs {comparison.previousLabel}
        <span className="hidden sm:inline text-[10px] font-semibold normal-case text-muted-foreground/70">
          ({formatETB(comparison.previousRevenue)} revenue)
        </span>
      </span>
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5 text-xs font-bold text-foreground">
          <span className="text-muted-foreground">{item.label}</span>
          <Delta pct={item.pct} invert={item.invert} />
          {item.extra && <span className="text-muted-foreground font-medium">{item.extra}</span>}
        </span>
      ))}
      {compact && (
        <span className="text-[10px] text-muted-foreground/70 ml-auto hidden sm:inline">
          Previous: {formatETB(comparison.previousRevenue)} revenue · {comparison.previousPaidOrders} orders
        </span>
      )}
    </div>
  );
}
