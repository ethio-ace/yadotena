"use client";

import { useState } from "react";
import { Table, Order } from "@/types";
import { formatETB } from "@/lib/currency";
import { ArrowLeft, Plus, Users, Eye, CreditCard } from "lucide-react";

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

  const filtered = tables.filter(t => {
    if (filter === "AVAILABLE") return t.status === "AVAILABLE";
    if (filter === "OCCUPIED") return t.status !== "AVAILABLE";
    return true;
  });

  const getActiveOrder = (tableId: string) =>
    orders.find(o => o.tableId === tableId && o.status !== "COMPLETED" && o.status !== "CANCELLED");

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
    const activeOrder = getActiveOrder(selectedTable.id);
    return (
      <div className="p-4 sm:p-6 max-w-lg mx-auto animate-in fade-in duration-200">
        <button onClick={() => setSelectedTable(null)} className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground mb-4 active:scale-95">
          <ArrowLeft className="h-4 w-4" /> Tables
        </button>

        <div className="bg-card border rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">{selectedTable.name || `Table ${selectedTable.id}`}</h2>
              <p className="text-sm text-muted-foreground">{selectedTable.capacity} seats · {statusLabel(selectedTable.status)}</p>
            </div>
            <div className={`h-3 w-3 rounded-full ${selectedTable.status === "AVAILABLE" ? "bg-emerald-500" : "bg-amber-500"}`} />
          </div>

          {activeOrder ? (
            <>
              <div className="border-t pt-4 space-y-2">
                <p className="text-xs font-bold uppercase text-muted-foreground">Current Order {activeOrder.id.slice(-6).toUpperCase()}</p>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {activeOrder.items?.map((item, i) => (
                    <div key={item.id || i} className="flex justify-between text-sm">
                      <span>{item.quantity}× {item.name}</span>
                      <span className="font-mono text-muted-foreground">{formatETB(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between font-bold text-base pt-2 border-t">
                  <span>Total</span>
                  <span>{formatETB(activeOrder.total)}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button onClick={() => onAddItemsToOrder(activeOrder, selectedTable)} className="h-12 rounded-xl border-2 border-amber-600 text-amber-700 dark:text-amber-400 font-bold text-sm flex items-center justify-center gap-2 hover:bg-amber-50 dark:hover:bg-amber-950/30 active:scale-95 transition-all">
                  <Plus className="h-4 w-4" /> Add Items
                </button>
                <button onClick={() => onSettleOrder(activeOrder)} className="h-12 rounded-xl bg-emerald-600 text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-emerald-700 active:scale-95 transition-all">
                  <CreditCard className="h-4 w-4" /> Settle Bill
                </button>
              </div>
              <button onClick={() => onViewOrder(activeOrder)} className="w-full h-10 rounded-xl border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 flex items-center justify-center gap-2 transition-colors">
                <Eye className="h-4 w-4" /> View Full Order
              </button>
            </>
          ) : (
            <div className="border-t pt-4 text-center space-y-3">
              <p className="text-sm text-muted-foreground">No active order on this table.</p>
              <button onClick={() => onNewOrderForTable(selectedTable)} className="w-full h-12 rounded-xl bg-amber-600 text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-amber-700 active:scale-95 transition-all">
                <Plus className="h-4 w-4" /> New Café Order
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
          const active = getActiveOrder(table.id);
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
