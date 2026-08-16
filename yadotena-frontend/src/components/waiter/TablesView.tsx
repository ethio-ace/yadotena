"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { Table, Order, AddonItem } from "@/types";
import { formatETB } from "@/lib/currency";
import { addonNames } from "@/lib/kitchen";
import { findActiveOrderForTable } from "@/lib/tableUtils";
import { ArrowLeft, Plus, Users, Eye, CreditCard, AlertTriangle } from "lucide-react";
import { OrderProgressStepper } from "@/components/dashboard/OrderProgressStepper";

interface TablesViewProps {
  tables: Table[];
  orders: Order[];
  onBack: () => void;
  onNewOrderForTable: (table: Table) => void;
  onAddItemsToOrder: (order: Order, table: Table) => void;
  onViewOrder: (order: Order) => void;
  onSettleOrder: (order: Order) => void;
}

type TabFilter = "ALL" | "AVAILABLE" | "OCCUPIED";

export function TablesView({
  tables, orders, onBack, onNewOrderForTable,
  onAddItemsToOrder, onViewOrder, onSettleOrder,
}: TablesViewProps) {
  const [filter, setFilter] = useState<TabFilter>("ALL");
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);

  // Addon name mapper
  const { data: addons = [] } = useQuery<AddonItem[]>({
    queryKey: ["addons"],
    queryFn: () => api.addons.getAll(),
  });
  const addonMap = useMemo(() => Object.fromEntries(addons.map(a => [a.id, a.name])), [addons]);

  const filtered = tables.filter(t => {
    if (filter === "AVAILABLE") return t.status === "AVAILABLE";
    if (filter === "OCCUPIED") return t.status !== "AVAILABLE";
    return true;
  });

  const getActiveOrder = (table: Table) => findActiveOrderForTable(table, orders);

  const statusColor = (status: string) => {
    switch (status) {
      case "AVAILABLE": return "border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-950/20";
      case "OCCUPIED": case "ORDERING": case "PREPARING": return "border-amber-500/40 bg-amber-50/50 dark:bg-amber-950/20";
      case "WAITING_FOR_PAYMENT": return "border-red-500/40 bg-red-50/50 dark:bg-red-950/20";
      default: return "border-border bg-card";
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case "AVAILABLE": return "Open";
      case "OCCUPIED": case "ORDERING": case "PREPARING": return "Occupied";
      case "WAITING_FOR_PAYMENT": return "Bill Due";
      case "CLEANING": return "Cleaning";
      default: return status;
    }
  };

  // Table detail inline view
  if (selectedTable) {
    const activeOrder = getActiveOrder(selectedTable);
    return (
      <div className="p-4 sm:p-6 max-w-lg mx-auto animate-in fade-in duration-200">
        <button onClick={() => setSelectedTable(null)} className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground mb-4 active:scale-95">
          <ArrowLeft className="h-4 w-4" /> Back to Tables
        </button>

        <div className="bg-card border rounded-3xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black">{selectedTable.name || `Table ${selectedTable.id}`}</h2>
              <p className="text-xs text-muted-foreground font-medium">{selectedTable.capacity} seats · {statusLabel(selectedTable.status)}</p>
            </div>
            <div className={`h-3 w-3 rounded-full ${selectedTable.status === "AVAILABLE" ? "bg-emerald-500" : "bg-amber-500"}`} />
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

                        {/* Resolved Add-ons */}
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

                        {/* Special Instructions */}
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

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button 
                  onClick={() => onAddItemsToOrder(activeOrder, selectedTable)} 
                  className="h-13 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-black text-sm flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md shadow-amber-600/20"
                >
                  <Plus className="h-5 w-5" /> Add Extra Items
                </button>
                <button 
                  onClick={() => onSettleOrder(activeOrder)} 
                  className="h-13 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md shadow-emerald-600/20"
                >
                  <CreditCard className="h-5 w-5" /> Settle Bill
                </button>
              </div>

              <button onClick={() => onViewOrder(activeOrder)} className="w-full h-11 rounded-xl border text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-accent/50 flex items-center justify-center gap-2 transition-colors">
                <Eye className="h-4 w-4" /> View Full Ticket Details
              </button>
            </>
          ) : (
            <div className="border-t pt-4 text-center space-y-3">
              <p className="text-sm text-muted-foreground">No active order on this table.</p>
              <button onClick={() => onNewOrderForTable(selectedTable)} className="w-full h-13 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-black text-sm flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md shadow-amber-600/20">
                <Plus className="h-5 w-5" /> New Café Order
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto animate-in fade-in duration-200">
      <button onClick={onBack} className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground mb-4 active:scale-95">
        <ArrowLeft className="h-4 w-4" /> Home
      </button>

      <h1 className="text-xl font-bold mb-4">Tables</h1>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5">
        {(["ALL", "AVAILABLE", "OCCUPIED"] as TabFilter[]).map(f => (
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
        {filtered.map(table => {
          const active = getActiveOrder(table);
          return (
            <button
              key={table.id}
              onClick={() => setSelectedTable(table)}
              className={`p-4 rounded-2xl border-2 text-left transition-all hover:shadow-md active:scale-[0.97] ${statusColor(table.status)}`}
            >
              <div className="font-bold text-base">{table.name || `Table ${table.id}`}</div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                <Users className="h-3 w-3" /> {table.capacity}
              </div>
              {active ? (
                <div className="mt-2 pt-2 border-t border-border/50">
                  <span className="text-xs font-bold text-amber-700 dark:text-amber-400">{active.items?.length || 0} items</span>
                  <span className="block text-sm font-bold mt-0.5">{formatETB(active.total)}</span>
                </div>
              ) : (
                <div className="mt-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">{statusLabel(table.status)}</div>
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
