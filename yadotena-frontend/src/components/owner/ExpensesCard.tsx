"use client";

import { useMemo } from "react";
import { DateRange, computeExpenseReport } from "@/lib/owner";
import { Expense } from "@/types";
import { formatETB } from "@/lib/currency";
import { Banknote, ArrowUpRight } from "lucide-react";

/**
 * Compact expense snapshot for the owner overview — real records only,
 * with the top categories ranked by amount.
 */
export function ExpensesCard({
  range,
  expenses,
}: {
  range: DateRange;
  expenses: Expense[];
}) {
  const report = useMemo(
    () => computeExpenseReport({ range, expenses }),
    [range, expenses]
  );
  const maxCat = report.categories.length > 0 ? report.categories[0].total : 0;
  const top = report.categories.slice(0, 3);

  return (
    <div className="bg-card border rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Banknote className="h-3.5 w-3.5 text-rose-500" /> Expenses This Period
          </p>
          <h2 className="mt-1 text-2xl font-black text-rose-600 dark:text-rose-400">
            {formatETB(report.total)}
          </h2>
          <p className="text-[11px] text-muted-foreground font-semibold">
            {report.count} record{report.count === 1 ? "" : "s"} · {range.label.toLowerCase()}
          </p>
        </div>

        <a
          href="/dashboard/expenses"
          className="inline-flex h-9 items-center gap-1 rounded-xl border px-3 text-[11px] font-black text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors shrink-0"
        >
          Manage
          <ArrowUpRight className="h-3.5 w-3.5" />
        </a>
      </div>

      {top.length === 0 ? (
        <p className="mt-4 text-xs text-muted-foreground">No expenses recorded in this period.</p>
      ) : (
        <div className="mt-4 space-y-2.5">
          {top.map((c) => (
            <div key={c.category}>
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-foreground truncate">{c.category}</span>
                <span className="text-muted-foreground shrink-0">{formatETB(c.total)}</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-rose-500/70 rounded-full transition-all"
                  style={{ width: `${maxCat > 0 ? (c.total / maxCat) * 100 : 0}%` }}
                />
              </div>
            </div>
          ))}
          {report.categories.length > 3 && (
            <p className="text-[10px] font-semibold text-muted-foreground pt-1">
              +{report.categories.length - 3} more categories · full breakdown in Analytics
            </p>
          )}
        </div>
      )}
    </div>
  );
}
