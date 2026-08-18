"use client";

import { OwnerMetrics, PeriodComparison } from "@/lib/owner";
import { formatETB } from "@/lib/currency";
import { Wallet, Receipt, TrendingUp, Banknote, Scale } from "lucide-react";
import { Delta } from "@/components/owner/PeriodCompare";

interface BusinessSnapshotProps {
  metrics: OwnerMetrics;
  /** Deltas vs the previous equivalent period, shown as chips on each KPI. */
  comparison?: PeriodComparison;
}

/**
 * The 5-second business answer. Revenue leads; expenses and the difference
 * are honest — the difference is labeled "Revenue − Recorded Expenses",
 * never "profit", because the system has no cost-of-goods data.
 */
export function BusinessSnapshot({ metrics, comparison }: BusinessSnapshotProps) {
  const { revenue, paidOrders, averageTicket, expenses, revenueMinusExpenses } = metrics;
  const diffIsPositive = revenueMinusExpenses >= 0;

  return (
    <section aria-label="Business snapshot">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {/* Revenue — the lead number */}
        <div className="col-span-2 lg:col-span-2 bg-card border rounded-2xl p-5 shadow-sm relative overflow-hidden">
          <div className="absolute inset-y-0 left-0 w-1 bg-amber-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Revenue
            </span>
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Wallet className="h-5 w-5" />
            </div>
          </div>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-foreground">
            {formatETB(revenue)}
          </h2>
          <p className="mt-1 text-[11px] text-muted-foreground font-semibold">
            Paid orders in period · {metrics.range.display}
          </p>
          {comparison && (
            <div className="mt-2 flex items-center gap-1.5">
              <Delta pct={comparison.revenuePct} />
              <span className="text-[10px] font-semibold text-muted-foreground">
                vs {comparison.previousLabel} · {formatETB(comparison.previousRevenue)}
              </span>
            </div>
          )}
        </div>

        {/* Paid orders + average ticket */}
        <div className="bg-card border rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Paid Orders
            </span>
            <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Receipt className="h-5 w-5" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-foreground">{paidOrders}</h3>
          <p className="text-[11px] text-muted-foreground font-semibold flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            Avg {formatETB(averageTicket)} / order
          </p>
          {comparison && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t">
              <Delta pct={comparison.paidOrdersPct} />
              <Delta pct={comparison.averageTicketPct} />
              <span className="text-[10px] font-semibold text-muted-foreground">orders · ticket vs {comparison.previousLabel}</span>
            </div>
          )}
        </div>

        {/* Recorded expenses */}
        <div className="bg-card border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Recorded Expenses
            </span>
            <div className="h-9 w-9 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <Banknote className="h-5 w-5" />
            </div>
          </div>
          <h3 className="mt-2 text-2xl font-black text-foreground">{formatETB(expenses)}</h3>
          <p className="mt-1 text-[11px] text-muted-foreground font-semibold">
            {metrics.range.label.toLowerCase()} recorded costs
          </p>
          {comparison && (
            <div className="mt-2 flex items-center gap-1.5">
              <Delta pct={comparison.expensesPct} invert />
              <span className="text-[10px] font-semibold text-muted-foreground">
                vs {comparison.previousLabel} · {formatETB(comparison.previousExpenses)}
              </span>
            </div>
          )}
        </div>

        {/* Revenue minus recorded expenses — honest difference, not profit */}
        <div className="col-span-2 lg:col-span-4 bg-card border rounded-2xl p-5 shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`h-9 w-9 rounded-xl flex items-center justify-center ${
                diffIsPositive
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
              }`}
            >
              <Scale className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-foreground">
                Revenue − Recorded Expenses
              </h3>
              <p className="text-[11px] text-muted-foreground font-semibold">
                Not labeled profit — the café does not track cost of goods for this period.
              </p>
            </div>
          </div>
          <div
            className={`text-2xl font-black ${
              diffIsPositive
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400"
            }`}
          >
            {formatETB(revenueMinusExpenses)}
          </div>
          {comparison && (
            <div className="flex items-center gap-1.5">
              <Delta pct={comparison.netPct} />
              <span className="text-[10px] font-semibold text-muted-foreground">
                vs {comparison.previousLabel} · {formatETB(comparison.previousNet)}
              </span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
