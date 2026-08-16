"use client";

import { useMemo } from "react";
import { DateRange, computeExpenseReport } from "@/lib/owner";
import { Expense } from "@/types";
import { formatETB } from "@/lib/currency";
import { Banknote, Plus, Receipt } from "lucide-react";

export function ExpensesReport({ range, expenses }: { range: DateRange; expenses: Expense[] }) {
  const report = useMemo(
    () => computeExpenseReport({ range, expenses }),
    [range, expenses]
  );
  const maxCat = report.categories.length > 0 ? report.categories[0].total : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card border rounded-2xl p-5 shadow-sm">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Recorded in period</p>
          <p className="mt-1 text-2xl font-black text-rose-600 dark:text-rose-400">{formatETB(report.total)}</p>
          <p className="text-[11px] text-muted-foreground font-semibold">{report.count} expense records</p>
        </div>
        <div className="bg-card border rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Record Expense</p>
            <a
              href="/dashboard/expenses"
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 text-xs font-black text-white hover:bg-amber-600 transition-colors shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Record Expense
            </a>
          </div>
          <p className="text-[11px] text-muted-foreground font-semibold mt-2">
            Recording and managing expenses happens on the Expense Ledger page.
          </p>
        </div>
      </div>

      {report.categories.length === 0 ? (
        <div className="py-14 text-center border border-dashed rounded-2xl">
          <Receipt className="h-6 w-6 mx-auto text-muted-foreground opacity-50" />
          <p className="text-xs font-bold text-muted-foreground mt-2">No expenses recorded in this period.</p>
        </div>
      ) : (
        <>
          {/* Category breakdown */}
          <div className="bg-card border rounded-2xl p-5 shadow-sm">
            <h3 className="font-black text-sm text-foreground flex items-center gap-1.5">
              <Banknote className="h-4 w-4 text-rose-500" /> Expense Categories
            </h3>
            <div className="mt-4 space-y-3">
              {report.categories.map((c) => {
                const pct = maxCat > 0 ? (c.total / maxCat) * 100 : 0;
                return (
                  <div key={c.category}>
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-foreground">{c.category}</span>
                      <span className="text-muted-foreground">
                        {c.count} record{c.count === 1 ? "" : "s"} · {formatETB(c.total)}
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-rose-500/70 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Entries */}
          <div className="bg-card border rounded-2xl p-5 shadow-sm">
            <h3 className="font-black text-sm text-foreground">Expense Entries</h3>
            <div className="mt-3 divide-y">
              {report.entries.map((e) => (
                <div key={e.id} className="py-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-black text-foreground truncate">
                      {e.description || e.category}
                    </p>
                    <p className="text-[11px] text-muted-foreground font-medium">
                      {e.category}
                      {e.paymentMethod ? ` · ${e.paymentMethod}` : ""}
                      {e.recordedByName ? ` · by ${e.recordedByName}` : ""}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="block text-sm font-black text-rose-600 dark:text-rose-400">
                      −{formatETB(e.amount)}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-semibold">
                      {new Date(`${e.date}T12:00:00`).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
