"use client";

import { useMemo } from "react";
import { Table, Order, MenuItem, MenuCategory, AddonItem } from "@/types";
import { formatETB } from "@/lib/currency";
import { addonNames, groupItemsByRound, roundStatus, roundTotal, roundCount, itemStatus, hasItemStatuses, statusChipClass, statusLabel, statusDotClass, formatElapsed } from "@/lib/kitchen";
import { ArrowLeft, Plus, Eye, CreditCard, AlertTriangle, Clock, Check, CheckCircle2, X } from "lucide-react";
import { TableAddItemsPanel } from "@/components/waiter/TableAddItemsPanel";
import type { CartItem } from "@/components/waiter/CafeOrderBuilder";

interface TableDetailViewProps {
  table: Table;
  activeOrder?: Order;
  menu: MenuItem[];
  categories: MenuCategory[];
  allAddons: AddonItem[];
  isAppending: boolean;
  onBack: () => void;
  onCreateOrder: (table: Table) => void;
  onAppendItems: (order: Order, items: CartItem[]) => void;
  onViewOrder: (order: Order) => void;
  onSettleOrder: (order: Order) => void;
  onAcceptOrder?: (order: Order) => void;
  onRejectOrder?: (order: Order) => void;
}

export function TableDetailView({
  table, activeOrder, menu, categories, allAddons, isAppending,
  onBack, onCreateOrder, onAppendItems, onViewOrder, onSettleOrder,
  onAcceptOrder, onRejectOrder,
}: TableDetailViewProps) {
  const addonMap = useMemo(() => Object.fromEntries(allAddons.map((a) => [a.id, a.name])), [allAddons]);

  const elapsed = activeOrder
    ? Math.max(0, Math.floor((Date.now() - new Date(activeOrder.createdAt).getTime()) / 1000))
    : 0;

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-200">
      {/* Header */}
      <div className="px-4 sm:px-6 pt-4 pb-3 border-b bg-card shrink-0">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </button>

          {activeOrder && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onViewOrder(activeOrder)}
                className="h-8 px-3 rounded-lg border text-xs font-bold text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
              >
                <Eye className="h-3.5 w-3.5" />
                Ticket
              </button>
              <button
                onClick={() => onSettleOrder(activeOrder)}
                className="h-8 px-3 rounded-lg bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all"
              >
                <CreditCard className="h-3.5 w-3.5" />
                Settle
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black leading-none">
              {table.name || `Table ${table.id.replace(/^t/i, "")}`}
            </h1>
            <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
              {table.capacity} seats
              {activeOrder && (
                <>
                  <span className="mx-1">·</span>
                  <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                    #{activeOrder.id.slice(-6).toUpperCase()}
                  </span>
                  <span className="mx-1">·</span>
                  <span className="flex items-center gap-1 inline-flex">
                    <Clock className="h-2.5 w-2.5" />
                    {formatElapsed(elapsed)}
                  </span>
                </>
              )}
            </p>
          </div>
          {activeOrder && (
            <div className="text-right">
              <p className="text-lg font-black leading-none">{formatETB(activeOrder.total)}</p>
              <p className={`text-[10px] font-black uppercase mt-0.5 ${
                activeOrder.paymentStatus === "PAID"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-500"
              }`}>
                {activeOrder.paymentStatus === "PAID" ? "Paid" : "Unpaid"}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 overflow-hidden">
        {activeOrder ? (
          <div className="flex flex-col lg:flex-row h-full">
            {/* LEFT — Current order ticket */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 min-h-0">
              {/* Waiter Approval Banner if order is PENDING or DRAFT */}
              {(activeOrder.status === "PENDING" || activeOrder.status === "DRAFT") && (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold">
                    <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                    <span>Order Submitted — Pending Staff Review</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {onAcceptOrder && (
                      <button
                        onClick={() => onAcceptOrder(activeOrder)}
                        className="h-8 px-3 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center gap-1 shadow-sm active:scale-95 transition-all"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Accept Order
                      </button>
                    )}
                    {onRejectOrder && (
                      <button
                        onClick={() => onRejectOrder(activeOrder)}
                        className="h-8 px-3 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 font-bold text-xs border border-red-500/30 flex items-center gap-1 active:scale-95 transition-all"
                      >
                        <X className="h-3.5 w-3.5" />
                        Reject
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Round status badges */}
              <div className="flex flex-wrap gap-1.5">
                {groupItemsByRound(activeOrder.items).map(({ round, items }) => {
                  const fallback = hasItemStatuses(activeOrder.items) ? undefined : activeOrder.status;
                  const rStatus = roundStatus(items, fallback);
                  const extended = round > 1;
                  return (
                    <span
                      key={round}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-wide ${
                        extended
                          ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                          : "border-border bg-muted/50 text-muted-foreground"
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${statusDotClass(rStatus)}`} />
                      R{round} · {statusLabel(rStatus)}
                    </span>
                  );
                })}
              </div>

              {/* Items grouped by round */}
              {groupItemsByRound(activeOrder.items).map(({ round, items }) => {
                const fallback = hasItemStatuses(activeOrder.items) ? undefined : activeOrder.status;
                const rStatus = roundStatus(items, fallback);
                const extended = round > 1;

                return (
                  <div key={round} className="border rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2 bg-muted/40 border-b">
                      <span className={`text-[10px] font-black uppercase tracking-wider ${
                        extended ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
                      }`}>
                        {extended ? `Round ${round} · Added later` : "Round 1"}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${statusChipClass(rStatus)}`}>
                          {statusLabel(rStatus)}
                        </span>
                        <span className="font-mono text-[11px] font-bold text-muted-foreground">
                          {formatETB(roundTotal(items))}
                        </span>
                      </div>
                    </div>

                    <div className="p-2.5 space-y-1.5">
                      {items.map((item, i) => {
                        const aNames = addonNames(item.selectedAddons, addonMap);
                        return (
                          <div key={item.id || i} className="flex items-start justify-between gap-2 py-1.5 border-b border-border/30 last:border-0">
                            <div className="min-w-0">
                              <div className="text-sm font-bold">
                                <span className="text-amber-500 font-extrabold mr-1">{item.quantity}×</span>
                                {item.name}
                              </div>
                              {aNames.length > 0 && (
                                <div className="text-[10px] text-muted-foreground pl-3 mt-0.5">
                                  + {aNames.join(", ")}
                                </div>
                              )}
                              {item.specialInstructions && (
                                <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400 pl-3 mt-0.5 flex items-center gap-1">
                                  <AlertTriangle className="h-2.5 w-2.5 shrink-0" />
                                  {item.specialInstructions}
                                </div>
                              )}
                            </div>
                            <span className="font-mono text-xs text-muted-foreground shrink-0">
                              {formatETB(item.price * item.quantity)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Total */}
              <div className="pt-2 border-t flex justify-between items-center">
                <span className="text-sm font-black">Total</span>
                <span className="text-lg font-black text-amber-600 dark:text-amber-400">
                  {formatETB(activeOrder.total)}
                </span>
              </div>
            </div>

            {/* RIGHT — Add items panel (persistent on desktop, slide-up on mobile) */}
            <div className="lg:w-[380px] lg:border-l border-t lg:border-t-0 bg-muted/20 shrink-0 overflow-y-auto h-full">
              <TableAddItemsPanel
                order={activeOrder}
                menu={menu}
                categories={categories}
                allAddons={allAddons}
                isSubmitting={isAppending}
                onAppend={(items) => onAppendItems(activeOrder, items)}
                onCollapse={onBack}
              />
            </div>
          </div>
        ) : (
          /* Empty table state */
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <div className="h-16 w-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-4">
              <Check className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-sm font-bold text-foreground mb-1">Table is available</p>
            <p className="text-xs text-muted-foreground mb-6">No open order for this table.</p>
            <button
              onClick={() => onCreateOrder(table)}
              className="h-14 px-8 rounded-2xl bg-amber-500 text-amber-950 font-black text-sm flex items-center gap-2 active:scale-95 transition-all shadow-lg shadow-amber-500/20"
            >
              <Plus className="h-5 w-5" />
              New Café Order
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
