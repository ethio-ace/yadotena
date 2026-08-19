"use client";

import { useMemo } from "react";
import { Order, ServiceRequest, Table } from "@/types";
import { formatETB } from "@/lib/currency";
import { findActiveOrderForTable } from "@/lib/tableUtils";
import { formatElapsed } from "@/lib/kitchen";
import { Table2, ClipboardList, Bell, CreditCard, UtensilsCrossed, Clock } from "lucide-react";

interface WaiterHomeProps {
  orders: Order[];
  serviceRequests: ServiceRequest[];
  tables: Table[];
  onCafeOrder: () => void;
  onShopSale: () => void;
  onViewReady: () => void;
  onViewUnpaid: () => void;
  onViewAlerts: () => void;
  onOpenTable: (table: Table) => void;
}

export function WaiterHome({
  orders, serviceRequests, tables, onCafeOrder, onShopSale,
  onViewReady, onViewUnpaid, onViewAlerts, onOpenTable,
}: WaiterHomeProps) {
  const activeOrders = useMemo(() => orders.filter((o) => !["COMPLETED", "CANCELLED"].includes(o.status)), [orders]);
  const readyOrders = useMemo(() => orders.filter((o) => o.status === "READY"), [orders]);
  const unpaidOrders = useMemo(() =>
    orders.filter((o) => o.paymentStatus !== "PAID" && o.status !== "CANCELLED" && o.status !== "DRAFT"),
    [orders]
  );
  const pendingRequests = useMemo(() => serviceRequests.filter((r) => r.status === "PENDING"), [serviceRequests]);

  const sortedTables = useMemo(() => {
    return [...tables].sort((a, b) => {
      const aHas = findActiveOrderForTable(a, orders) ? 1 : 0;
      const bHas = findActiveOrderForTable(b, orders) ? 1 : 0;
      return bHas - aHas;
    });
  }, [tables, orders]);

  const occupiedCount = sortedTables.filter((t) => findActiveOrderForTable(t, orders)).length;
  const openCount = sortedTables.length - occupiedCount;

  return (
    <div className="flex flex-col h-full">
      {/* Attention Metrics — compact single strip */}
      <div className="px-4 sm:px-6 pt-4 pb-3 border-b bg-card shrink-0">
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={() => {}}
            className="p-3 rounded-xl border bg-background text-left"
          >
            <div className="flex items-center gap-1.5 mb-1">
              <ClipboardList className="h-3 w-3 text-muted-foreground" />
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Active</span>
            </div>
            <span className="text-xl font-black leading-none">{activeOrders.length}</span>
          </button>

          <button
            onClick={onViewReady}
            className="p-3 rounded-xl border bg-background text-left"
          >
            <div className="flex items-center gap-1.5 mb-1">
              <UtensilsCrossed className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Ready</span>
            </div>
            <span className="text-xl font-black leading-none text-emerald-600 dark:text-emerald-400">{readyOrders.length}</span>
          </button>

          <button
            onClick={onViewUnpaid}
            className="p-3 rounded-xl border bg-background text-left"
          >
            <div className="flex items-center gap-1.5 mb-1">
              <CreditCard className="h-3 w-3 text-amber-600 dark:text-amber-400" />
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Unpaid</span>
            </div>
            <span className="text-xl font-black leading-none text-amber-600 dark:text-amber-400">{unpaidOrders.length}</span>
          </button>

          <button
            onClick={onViewAlerts}
            className="p-3 rounded-xl border bg-background text-left"
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Bell className="h-3 w-3 text-red-600 dark:text-red-400" />
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Alerts</span>
            </div>
            <span className="text-xl font-black leading-none text-red-600 dark:text-red-400">{pendingRequests.length}</span>
          </button>
        </div>
      </div>

      {/* Table Floor — the main workspace */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-black uppercase tracking-wider text-muted-foreground">
            Floor · {occupiedCount} busy · {openCount} open
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5">
          {sortedTables.map((table) => {
            const active = findActiveOrderForTable(table, orders);
            const elapsed = active
              ? Math.max(0, Math.floor((Date.now() - new Date(active.createdAt).getTime()) / 1000))
              : 0;

            return (
              <button
                key={table.id}
                onClick={() => onOpenTable(table)}
                className={`p-3.5 rounded-xl border text-left transition-all active:scale-[0.97] ${
                  active
                    ? active.paymentStatus !== "PAID"
                      ? "border-red-300 dark:border-red-500/40 bg-red-50/50 dark:bg-red-950/15"
                      : "border-amber-300 dark:border-amber-500/40 bg-amber-50/50 dark:bg-amber-950/15"
                    : "border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/30 dark:bg-emerald-950/10"
                }`}
              >
                <div className="flex items-start justify-between gap-1">
                  <span className="font-black text-sm leading-none truncate">
                    {table.name || `Table ${table.id.replace(/^t/i, "")}`}
                  </span>
                  {active ? (
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-black shrink-0 ${
                      active.paymentStatus !== "PAID"
                        ? "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400"
                        : "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400"
                    }`}>
                      #{active.id.slice(-4).toUpperCase()}
                    </span>
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0 mt-0.5" />
                  )}
                </div>

                {active ? (
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-muted-foreground">
                        {active.items?.length || 0} items
                      </span>
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
                  <div className="mt-2 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                    Open · {table.capacity}p
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {sortedTables.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Table2 className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-medium">No tables configured.</p>
          </div>
        )}
      </div>
    </div>
  );
}
