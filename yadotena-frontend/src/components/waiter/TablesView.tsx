"use client";

import { useState } from "react";
import { Table, Order } from "@/types";
import { formatETB } from "@/lib/currency";
import { findActiveOrderForTable } from "@/lib/tableUtils";
import { ArrowLeft, Users, Plus } from "lucide-react";

interface TablesViewProps {
  tables: Table[];
  orders: Order[];
  onBack: () => void;
  onSelectTable: (table: Table) => void;
  onNewOrder: () => void;
}

type TabFilter = "ALL" | "AVAILABLE" | "OCCUPIED";

export function TablesView({
  tables, orders, onBack, onSelectTable, onNewOrder,
}: TablesViewProps) {
  const [filter, setFilter] = useState<TabFilter>("ALL");

  // Live truth comes from the open orders, not the stored table.status field
  // (which goes stale when sessions end without clearing it).
  const isBusy = (table: Table) => !!findActiveOrderForTable(table, orders);

  const filtered = tables.filter((t) => {
    if (filter === "AVAILABLE") return !isBusy(t);
    if (filter === "OCCUPIED") return isBusy(t);
    return true;
  });

  const cardStyle = (table: Table) => {
    const o = findActiveOrderForTable(table, orders);
    if (o && o.paymentStatus !== "PAID") return "border-red-500/40 bg-red-50/50 dark:bg-red-950/20";
    if (o) return "border-amber-500/40 bg-amber-50/50 dark:bg-amber-950/20";
    return "border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-950/20";
  };

  const counts = {
    busy: tables.filter(isBusy).length,
    open: tables.filter((t) => !isBusy(t)).length,
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto animate-in fade-in duration-200">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground mb-4 active:scale-95 transition-all"
      >
        <ArrowLeft className="h-4 w-4" /> Home
      </button>

      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold">Tables</h1>
          <p className="text-xs text-muted-foreground font-medium mt-0.5">
            {counts.busy} busy · {counts.open} open — tap a table to see its order and add items.
          </p>
        </div>
        <button
          onClick={onNewOrder}
          className="h-10 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-black text-sm flex items-center gap-1.5 active:scale-95 transition-all shadow-md shadow-amber-600/20"
        >
          <Plus className="h-4 w-4" /> New Café Order
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5">
        {(["ALL", "AVAILABLE", "OCCUPIED"] as TabFilter[]).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
              filter === f ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {f === "ALL" ? "All" : f === "AVAILABLE" ? "Available" : "Occupied"}
          </button>
        ))}
      </div>

      {/* Table grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {filtered.map((table) => {
          const active = findActiveOrderForTable(table, orders);
          return (
            <button
              key={table.id}
              onClick={() => onSelectTable(table)}
              className={`p-4 rounded-2xl border-2 text-left transition-all hover:shadow-md active:scale-[0.97] ${cardStyle(table)}`}
            >
              <div className="font-bold text-base">{table.name || `Table ${table.id}`}</div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                <Users className="h-3 w-3" /> {table.capacity}
              </div>
              {active ? (
                <div className="mt-2 pt-2 border-t border-border/50">
                  <span className="inline-block px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-400 font-mono font-black text-[10px]">
                    #{active.id.slice(-6).toUpperCase()}
                  </span>
                  <span className="block text-sm font-bold mt-1">{formatETB(active.total)}</span>
                  {active.paymentStatus !== "PAID" && (
                    <span className="block text-[10px] font-black text-red-500 uppercase tracking-wide mt-0.5">Unpaid</span>
                  )}
                </div>
              ) : (
                <div className="mt-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">Open</div>
              )}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p className="font-medium">No tables match this filter.</p>
        </div>
      )}
    </div>
  );
}
