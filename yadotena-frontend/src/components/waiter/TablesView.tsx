"use client";

import { useState, useMemo } from "react";
import { Table, Order } from "@/types";
import { formatETB } from "@/lib/currency";
import { findActiveOrderForTable } from "@/lib/tableUtils";
import { formatElapsed } from "@/lib/kitchen";
import { Table2, Clock, Users, ArrowLeft } from "lucide-react";

interface TablesViewProps {
  tables: Table[];
  orders: Order[];
  onBack: () => void;
  onSelectTable: (table: Table) => void;
  onNewOrder: () => void;
}

type TabFilter = "ALL" | "AVAILABLE" | "OCCUPIED";

export function TablesView({ tables, orders, onBack, onSelectTable, onNewOrder }: TablesViewProps) {
  const [filter, setFilter] = useState<TabFilter>("ALL");

  const isBusy = (table: Table) => !!findActiveOrderForTable(table, orders);

  const filtered = useMemo(() =>
    tables.filter((t) => {
      if (filter === "AVAILABLE") return !isBusy(t);
      if (filter === "OCCUPIED") return isBusy(t);
      return true;
    }),
    [tables, orders, filter]
  );

  const busyCount = useMemo(() => tables.filter(isBusy).length, [tables, orders]);
  const openCount = tables.length - busyCount;

  const tabs: { key: TabFilter; label: string; count: number }[] = [
    { key: "ALL", label: "All", count: tables.length },
    { key: "AVAILABLE", label: "Open", count: openCount },
    { key: "OCCUPIED", label: "Busy", count: busyCount },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 sm:px-6 pt-4 pb-3 border-b bg-card shrink-0">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Home
          </button>
        </div>

        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-black">Tables</h1>
          <button
            onClick={onNewOrder}
            className="h-9 px-4 rounded-xl bg-amber-500 text-amber-950 font-black text-xs flex items-center gap-1.5 active:scale-95 transition-all"
          >
            + New Order
          </button>
        </div>

        <div className="flex gap-1.5">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                filter === t.key
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
              <span className="ml-1 text-[10px] opacity-60">{t.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Table grid */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5">
          {filtered.map((table) => {
            const active = findActiveOrderForTable(table, orders);
            const elapsed = active
              ? Math.max(0, Math.floor((Date.now() - new Date(active.createdAt).getTime()) / 1000))
              : 0;

            return (
              <button
                key={table.id}
                onClick={() => onSelectTable(table)}
                className={`p-3.5 rounded-xl border text-left transition-all active:scale-[0.97] ${
                  active
                    ? active.paymentStatus !== "PAID"
                      ? "border-red-300 dark:border-red-500/40 bg-red-50/50 dark:bg-red-950/15"
                      : "border-amber-300 dark:border-amber-500/40 bg-amber-50/50 dark:bg-amber-950/15"
                    : "border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/30 dark:bg-emerald-950/10"
                }`}
              >
                <div className="flex items-start justify-between gap-1">
                  <span className="font-black text-sm leading-none">
                    {table.name || `Table ${table.id.replace(/^t/i, "")}`}
                  </span>
                  {active ? (
                    <span className="text-[10px] font-mono font-black text-muted-foreground">
                      #{active.id.slice(-4).toUpperCase()}
                    </span>
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0 mt-0.5" />
                  )}
                </div>

                <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-1">
                  <Users className="h-2.5 w-2.5" />
                  <span>{table.capacity}p</span>
                </div>

                {active ? (
                  <div className="mt-2 pt-2 border-t border-border/50 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold">{active.items?.length || 0} items</span>
                      <span className="text-xs font-black">{formatETB(active.total)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" />
                        {formatElapsed(elapsed)}
                      </span>
                      {active.paymentStatus !== "PAID" && (
                        <span className="text-[9px] font-black uppercase text-red-500">Unpaid</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                    Available
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Table2 className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-medium">No tables match this filter.</p>
          </div>
        )}
      </div>
    </div>
  );
}
