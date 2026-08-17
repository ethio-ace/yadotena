"use client";

import { Order, ServiceRequest, Table } from "@/types";
import { formatETB } from "@/lib/currency";
import { findActiveOrderForTable } from "@/lib/tableUtils";
import { Coffee, ShoppingBag, ChevronRight, Bell, CreditCard, UtensilsCrossed, Users, Plus, Flame } from "lucide-react";

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
  const activeOrders = orders.filter((o) => !["COMPLETED", "CANCELLED"].includes(o.status));
  const readyOrders = orders.filter((o) => o.status === "READY");
  const unpaidOrders = orders.filter((o) =>
    o.paymentStatus !== "PAID" && o.status !== "CANCELLED" && o.status !== "DRAFT"
  );
  const pendingRequests = serviceRequests.filter((r) => r.status === "PENDING");

  const floorTables = [...tables].sort((a, b) => {
    const aHas = findActiveOrderForTable(a, orders) ? 1 : 0;
    const bHas = findActiveOrderForTable(b, orders) ? 1 : 0;
    return bHas - aHas;
  });
  const occupiedCount = floorTables.filter((t) => findActiveOrderForTable(t, orders)).length;
  const openCount = floorTables.length - occupiedCount;

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 max-w-5xl mx-auto animate-in fade-in duration-300">
      {/* Greeting + stat strip */}
      <div>
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-black text-foreground tracking-tight">Good day, Tigist 👋</h1>
            <p className="text-sm text-muted-foreground mt-1">The floor is yours — jump into an order or check a table.</p>
          </div>
          {pendingRequests.length > 0 && (
            <button
              onClick={onViewAlerts}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 font-bold text-xs animate-pulse"
            >
              <Bell className="h-3.5 w-3.5" /> {pendingRequests.length} table call{pendingRequests.length !== 1 ? "s" : ""}
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2.5 mt-4">
          <div className="rounded-2xl border bg-card px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Active Orders</p>
            <p className="text-xl font-black mt-0.5">{activeOrders.length}</p>
          </div>
          <div className="rounded-2xl border bg-card px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Tables Busy</p>
            <p className="text-xl font-black mt-0.5 text-amber-600 dark:text-amber-400">{occupiedCount}</p>
          </div>
          <div className="rounded-2xl border bg-card px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Unpaid Bills</p>
            <p className="text-xl font-black mt-0.5 text-rose-600 dark:text-rose-400">{unpaidOrders.length}</p>
          </div>
        </div>
      </div>

      {/* Primary CTAs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={onCafeOrder}
          className="group relative flex flex-col items-start gap-3 p-6 rounded-3xl border-2 border-amber-600/30 bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/30 dark:to-card hover:border-amber-600 hover:shadow-lg transition-all text-left active:scale-[0.98]"
        >
          <div className="h-12 w-12 rounded-2xl bg-amber-600 text-white flex items-center justify-center shadow-lg shadow-amber-600/25">
            <Coffee className="h-6 w-6" />
          </div>
          <div>
            <span className="text-lg font-black text-foreground block">+ Café Order</span>
            <span className="text-sm text-muted-foreground">Food & drinks · Dine-in / Takeaway</span>
          </div>
          <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-hover:text-amber-600 group-hover:translate-x-1 transition-all" />
        </button>

        <button
          onClick={onShopSale}
          className="group relative flex flex-col items-start gap-3 p-6 rounded-3xl border-2 border-emerald-600/30 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-card hover:border-emerald-600 hover:shadow-lg transition-all text-left active:scale-[0.98]"
        >
          <div className="h-12 w-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/25">
            <ShoppingBag className="h-6 w-6" />
          </div>
          <div>
            <span className="text-lg font-black text-foreground block">+ Shop Sale</span>
            <span className="text-sm text-muted-foreground">Beans, powder & packaged goods</span>
          </div>
          <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
        </button>
      </div>

      {/* Live floor */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Flame className="h-3.5 w-3.5 text-amber-500" /> Tables on the Floor
            <span className="text-muted-foreground/60 normal-case font-bold">({occupiedCount} busy · {openCount} open)</span>
          </h2>
          <button
            onClick={onCafeOrder}
            className="inline-flex items-center gap-1 text-xs font-black text-primary hover:underline"
          >
            <Plus className="h-3 w-3" /> New Order
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {floorTables.map((table) => {
            const active = findActiveOrderForTable(table, orders);
            return (
              <button
                key={table.id}
                onClick={() => onOpenTable(table)}
                className={`group relative p-4 rounded-2xl border-2 text-left transition-all hover:shadow-md active:scale-[0.97] ${
                  active
                    ? "border-amber-500/40 bg-amber-50/60 dark:bg-amber-950/20 hover:border-amber-600"
                    : table.status === "AVAILABLE"
                      ? "border-emerald-400/40 bg-card hover:border-emerald-500"
                      : "border-border bg-card hover:border-foreground/30"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-bold text-sm truncate">{table.name || `Table ${table.id}`}</div>
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                      <Users className="h-3 w-3" /> {table.capacity}p
                    </div>
                  </div>
                  {active ? (
                    <span className="px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-400 font-mono font-black text-[10px] shrink-0">
                      #{active.id.slice(-6).toUpperCase()}
                    </span>
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  )}
                </div>
                {active && (
                  <div className="mt-2 pt-2 border-t border-border/50 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400">
                      {active.items?.length || 0} items
                    </span>
                    <span className="text-sm font-black text-foreground">{formatETB(active.total)}</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
        {floorTables.length === 0 && (
          <div className="text-center py-10 text-muted-foreground rounded-2xl border border-dashed">
            <p className="font-medium">No tables yet.</p>
          </div>
        )}
      </div>

      {/* Service Snapshot */}
      <div>
        <h2 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-3">Needs Attention</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Ready */}
          <button
            onClick={onViewReady}
            className="flex items-center gap-3 p-4 rounded-2xl border bg-card hover:bg-accent/50 transition-colors text-left active:scale-[0.98]"
          >
            <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${
              readyOrders.length > 0 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" : "bg-muted text-muted-foreground"
            }`}>
              <UtensilsCrossed className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-bold text-foreground block">Ready to Serve</span>
              <span className="text-xs text-muted-foreground">{readyOrders.length} order{readyOrders.length !== 1 ? "s" : ""}</span>
            </div>
            {readyOrders.length > 0 && (
              <span className="h-7 w-7 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center animate-pulse">
                {readyOrders.length}
              </span>
            )}
          </button>

          {/* Unpaid */}
          <button
            onClick={onViewUnpaid}
            className="flex items-center gap-3 p-4 rounded-2xl border bg-card hover:bg-accent/50 transition-colors text-left active:scale-[0.98]"
          >
            <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${
              unpaidOrders.length > 0 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400" : "bg-muted text-muted-foreground"
            }`}>
              <CreditCard className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-bold text-foreground block">Unpaid</span>
              <span className="text-xs text-muted-foreground">{unpaidOrders.length} bill{unpaidOrders.length !== 1 ? "s" : ""}</span>
            </div>
            {unpaidOrders.length > 0 && (
              <span className="h-7 w-7 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center">
                {unpaidOrders.length}
              </span>
            )}
          </button>

          {/* Requests */}
          <button
            onClick={onViewAlerts}
            className="flex items-center gap-3 p-4 rounded-2xl border bg-card hover:bg-accent/50 transition-colors text-left active:scale-[0.98]"
          >
            <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${
              pendingRequests.length > 0 ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400" : "bg-muted text-muted-foreground"
            }`}>
              <Bell className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-bold text-foreground block">Requests</span>
              <span className="text-xs text-muted-foreground">{pendingRequests.length} table{pendingRequests.length !== 1 ? "s" : ""}</span>
            </div>
            {pendingRequests.length > 0 && (
              <span className="h-7 w-7 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center animate-pulse">
                {pendingRequests.length}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
