"use client";

import { useMemo } from "react";
import { Table, Order, MenuItem, MenuCategory, AddonItem } from "@/types";
import { formatETB } from "@/lib/currency";
import { addonNames } from "@/lib/kitchen";
import { ArrowLeft, Plus, Eye, CreditCard, AlertTriangle } from "lucide-react";
import { OrderProgressStepper } from "@/components/dashboard/OrderProgressStepper";
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
}

export function TableDetailView({
  table, activeOrder, menu, categories, allAddons, isAppending,
  onBack, onCreateOrder, onAppendItems, onViewOrder, onSettleOrder,
}: TableDetailViewProps) {
  const addonMap = useMemo(() => Object.fromEntries(allAddons.map((a) => [a.id, a.name])), [allAddons]);

  const statusLabel = (status: string) => {
    switch (status) {
      case "AVAILABLE": return "Open";
      case "OCCUPIED": case "ORDERING": case "PREPARING": return "Occupied";
      case "WAITING_FOR_PAYMENT": return "Bill Due";
      case "CLEANING": return "Cleaning";
      default: return status;
    }
  };

  return (
    <div className="animate-in fade-in duration-200">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground mb-4 active:scale-95 transition-all"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="bg-card border rounded-3xl p-5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black">{table.name || `Table ${table.id}`}</h2>
            <p className="text-xs text-muted-foreground font-medium">
              {table.capacity} seats · {statusLabel(table.status)}
              {activeOrder && (
                <span className="ml-1.5 font-bold text-amber-600 dark:text-amber-400">
                  · #{activeOrder.id.slice(-6).toUpperCase()}
                </span>
              )}
            </p>
          </div>
          <div className={`h-3 w-3 rounded-full ${activeOrder ? "bg-amber-500" : "bg-emerald-500"}`} />
        </div>

        {activeOrder ? (
          <>
            {/* Order Stepper */}
            <div className="border-t pt-4">
              <OrderProgressStepper status={activeOrder.status} />
            </div>

            {/* Items & Resolved Addons */}
            <div className="space-y-2 pt-2">
              <div className="flex justify-between items-center text-xs font-bold uppercase text-muted-foreground">
                <span>Current Order #{activeOrder.id.slice(-6).toUpperCase()}</span>
                <span>{activeOrder.items?.length || 0} items</span>
              </div>

              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {activeOrder.items?.map((item, i) => {
                  const aNames = addonNames(item.selectedAddons, addonMap);
                  return (
                    <div key={item.id || i} className="p-3 rounded-2xl border bg-background/60 space-y-1 text-sm">
                      <div className="flex justify-between font-bold">
                        <span>
                          <span className="text-amber-500 font-extrabold mr-1.5">{item.quantity}×</span>
                          {item.name}
                        </span>
                        <span className="font-mono text-xs text-muted-foreground">{formatETB(item.price * item.quantity)}</span>
                      </div>

                      {aNames.length > 0 && (
                        <div className="pl-4 space-y-0.5 text-xs text-muted-foreground border-l-2 border-amber-500/40">
                          {aNames.map((aName, aIdx) => (
                            <div key={aIdx} className="flex items-center gap-1 text-foreground">
                              <span className="text-amber-500 font-bold">+</span>
                              <span>{aName}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {item.specialInstructions && (
                        <div className="mt-1 bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3 shrink-0 text-amber-500" />
                          <span>⚠ {item.specialInstructions}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between font-black text-base pt-3 border-t">
                <span>Total Amount</span>
                <span className="text-amber-600 dark:text-amber-400">{formatETB(activeOrder.total)}</span>
              </div>
            </div>

            {/* Inline add-items panel — menu + add-ons for this open order */}
            <TableAddItemsPanel
              order={activeOrder}
              menu={menu}
              categories={categories}
              allAddons={allAddons}
              isSubmitting={isAppending}
              onAppend={(items) => onAppendItems(activeOrder, items)}
              onCollapse={onBack}
            />

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => onSettleOrder(activeOrder)}
                className="h-13 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md shadow-emerald-600/20"
              >
                <CreditCard className="h-5 w-5" /> Settle Bill
              </button>
              <button
                onClick={() => onViewOrder(activeOrder)}
                className="h-13 rounded-2xl border text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-accent/50 flex items-center justify-center gap-2 transition-colors"
              >
                <Eye className="h-4 w-4" /> View Full Ticket
              </button>
            </div>
          </>
        ) : (
          <div className="border-t pt-4 text-center space-y-3">
            <p className="text-sm text-muted-foreground">No active order on this table.</p>
            <button
              onClick={() => onCreateOrder(table)}
              className="w-full h-13 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-black text-sm flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md shadow-amber-600/20"
            >
              <Plus className="h-5 w-5" /> New Café Order
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
