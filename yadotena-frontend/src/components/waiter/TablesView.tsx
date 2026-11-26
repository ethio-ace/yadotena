"use client";

import { useEffect, useMemo, useState } from "react";
import { Table, Order } from "@/types";
import { formatETB } from "@/lib/currency";
import { findActiveOrdersForTable } from "@/lib/tableUtils";
import { formatWait, orderProgress, orderTicketNumber } from "@/lib/kitchen";
import { OrderProgressLine } from "@/components/waiter/OrderProgressLine";
import { BellRing, CheckCircle2, LayoutGrid, Smartphone, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface TablesViewProps {
  tables: Table[];
  orders: Order[];
  readyCount: number;
  approvalCount: number;
  pendingCalls: number;
  /** tableId → pending call count, so a calling table lights up on the floor. */
  callsByTable: Record<string, number>;
  onSelectTable: (table: Table) => void;
  onViewReady: () => void;
  onViewApprovals: () => void;
  onViewCalls: () => void;
}

type Filter = "ALL" | "OPEN" | "BUSY";


/**
 * The waiter's home: the floor. Tap a free table to start an order, tap a busy
 * one to track it / add items / settle. Busy-ness is always derived from the
 * live active order, never the stored table.status.
 */
export function TablesView({
  tables, orders, readyCount, approvalCount, pendingCalls, callsByTable, onSelectTable, onViewReady, onViewApprovals, onViewCalls,
}: TablesViewProps) {
  const [filter, setFilter] = useState<Filter>("ALL");
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const rows = useMemo(
    () =>
      tables
        .map((table) => {
          const open = findActiveOrdersForTable(table, orders);
          return { table, order: open[0], open };
        })
        .sort((a, b) => a.table.name.localeCompare(b.table.name, undefined, { numeric: true })),
    [tables, orders]
  );
  const busyCount = rows.filter((r) => r.order).length;
  const visible = rows.filter((r) => (filter === "OPEN" ? !r.order : filter === "BUSY" ? !!r.order : true));

  const filters: { key: Filter; label: string; count: number }[] = [
    { key: "ALL", label: "All", count: rows.length },
    { key: "OPEN", label: "Open", count: rows.length - busyCount },
    { key: "BUSY", label: "Busy", count: busyCount },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 sm:px-6 pt-4 pb-3 border-b bg-card shrink-0 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-black">Tables</h1>
          <div className="flex gap-1 p-1 rounded-xl bg-muted">
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  "h-8 px-3 rounded-lg text-xs font-bold transition-colors tabular-nums",
                  filter === f.key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {f.label} <span className="opacity-60">{f.count}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Only what needs the waiter right now — hidden when nothing does. */}
        {(readyCount > 0 || pendingCalls > 0 || approvalCount > 0) && (
          <div className="flex flex-wrap gap-2">
            {approvalCount > 0 && (
              <button
                onClick={onViewApprovals}
                className="h-10 px-4 rounded-xl bg-orange-500 text-white text-sm font-black flex items-center gap-2 active:scale-[0.97] transition-transform"
              >
                <Smartphone className="h-4 w-4" />
                {approvalCount} guest order{approvalCount === 1 ? "" : "s"} to approve
              </button>
            )}
            {readyCount > 0 && (
              <button
                onClick={onViewReady}
                className="h-10 px-4 rounded-xl bg-emerald-600 text-white text-sm font-black flex items-center gap-2 active:scale-[0.97] transition-transform"
              >
                <CheckCircle2 className="h-4 w-4" />
                {readyCount} order{readyCount === 1 ? "" : "s"} ready to serve
              </button>
            )}
            {pendingCalls > 0 && (
              <button
                onClick={onViewCalls}
                className="h-10 px-4 rounded-xl bg-red-500 text-white text-sm font-black flex items-center gap-2 active:scale-[0.97] transition-transform"
              >
                <BellRing className="h-4 w-4" />
                {pendingCalls} table call{pendingCalls === 1 ? "" : "s"}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-24 md:pb-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {visible.map(({ table, order, open }) => {
            const calls = callsByTable[table.id] || 0;
            // A table can hold several tickets: alert on work from any of them.
            const ready = open.reduce((n, o) => n + orderProgress(o).ready, 0);
            const toApprove = open.reduce((n, o) => n + orderProgress(o).approval, 0);
            return (
              <button
                key={table.id}
                onClick={() => onSelectTable(table)}
                className={cn(
                  "relative min-h-[112px] p-3.5 rounded-2xl border-2 text-left flex flex-col transition-all active:scale-[0.97]",
                  !order && "border-dashed border-border bg-card hover:border-amber-500/60",
                  order && toApprove > 0 && "border-orange-500 bg-orange-50/70 dark:bg-orange-950/20",
                  order && !toApprove && ready > 0 && "border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/20",
                  order && !toApprove && ready === 0 && "border-amber-500/50 bg-amber-50/40 dark:bg-amber-950/10",
                  calls > 0 && "ring-2 ring-red-500 ring-offset-2 ring-offset-background"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-black text-base leading-tight truncate">{table.name}</span>
                  {calls > 0 ? (
                    <span className="shrink-0 h-6 px-2 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center gap-1">
                      <BellRing className="h-3 w-3" /> Call
                    </span>
                  ) : toApprove > 0 ? (
                    <span className="shrink-0 h-6 px-2 rounded-full bg-orange-500 text-white text-[10px] font-black flex items-center gap-1">
                      <Smartphone className="h-3 w-3" /> New
                    </span>
                  ) : order ? (
                    <span className="shrink-0 font-mono text-[11px] font-black text-muted-foreground">
                      #{orderTicketNumber(order)}{open.length > 1 ? ` +${open.length - 1}` : ""}
                    </span>
                  ) : null}
                </div>

                {order ? (
                  <div className="mt-auto pt-3 space-y-1">
                    <OrderProgressLine order={order} className="block truncate" />
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-black tabular-nums">{formatETB(order.total)}</span>
                      <span className="text-[11px] font-bold text-muted-foreground tabular-nums">{formatWait(order.createdAt, now)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="mt-auto pt-3 flex items-center justify-between text-xs font-bold text-muted-foreground">
                    <span className="text-emerald-600 dark:text-emerald-400">Open · tap to order</span>
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" />{table.capacity}</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {visible.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <LayoutGrid className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-medium">{tables.length === 0 ? "No tables set up yet." : "No tables match this filter."}</p>
          </div>
        )}
      </div>
    </div>
  );
}
