"use client";

import { Table } from "@/types";
import { ChevronDown, FilterX, LayoutGrid, UtensilsCrossed, ShoppingBag, Truck } from "lucide-react";

export interface OrderFilters {
  type: "ALL" | "DINE_IN" | "TAKEAWAY" | "DELIVERY";
  tableId: string; // "" = all tables
  payment: "ALL" | "PAID" | "UNPAID";
}

interface OrdersFilterBarProps {
  tables: Table[];
  filters: OrderFilters;
  onChange: (filters: OrderFilters) => void;
}

const typeOptions: { key: OrderFilters["type"]; label: string; icon: React.ElementType }[] = [
  { key: "ALL", label: "All Types", icon: LayoutGrid },
  { key: "DINE_IN", label: "Dine-In", icon: UtensilsCrossed },
  { key: "TAKEAWAY", label: "Takeaway", icon: ShoppingBag },
  { key: "DELIVERY", label: "Delivery", icon: Truck },
];

const paymentOptions: { key: OrderFilters["payment"]; label: string }[] = [
  { key: "ALL", label: "Any Payment" },
  { key: "PAID", label: "Paid" },
  { key: "UNPAID", label: "Unpaid" },
];

export function OrdersFilterBar({ tables, filters, onChange }: OrdersFilterBarProps) {
  const hasActiveFilters = filters.type !== "ALL" || filters.tableId !== "" || filters.payment !== "ALL";

  return (
    <div className="rounded-2xl border bg-card shadow-sm p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FilterX className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">Filter Orders</span>
        </div>
        {hasActiveFilters && (
          <button
            onClick={() => onChange({ type: "ALL", tableId: "", payment: "ALL" })}
            className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1"
          >
            <FilterX className="h-3 w-3" /> Clear all
          </button>
        )}
      </div>

      {/* Order type chips */}
      <div className="flex flex-wrap gap-1.5">
        {typeOptions.map((o) => (
          <button
            key={o.key}
            onClick={() => onChange({ ...filters, type: o.key })}
            className={`px-3.5 py-2 rounded-xl border text-xs font-bold inline-flex items-center gap-1.5 transition-all ${
              filters.type === o.key
                ? "border-primary/40 bg-primary/10 text-primary shadow-sm"
                : "border-border text-muted-foreground hover:text-foreground hover:bg-accent/50"
            }`}
          >
            <o.icon className="h-3.5 w-3.5" /> {o.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        {/* Table select */}
        <label className="flex items-center gap-2 rounded-xl border bg-background pl-3 pr-1 h-10 cursor-pointer">
          <LayoutGrid className="h-4 w-4 text-muted-foreground shrink-0" />
          <select
            value={filters.tableId}
            onChange={(e) => onChange({ ...filters, tableId: e.target.value })}
            className="bg-transparent text-sm font-bold text-foreground outline-none cursor-pointer appearance-none pr-1"
          >
            <option value="">All Tables</option>
            {tables.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name || t.id} · {t.capacity}p
              </option>
            ))}
          </select>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        </label>

        {/* Payment chips */}
        <div className="flex gap-1 p-1 bg-muted/70 rounded-xl">
          {paymentOptions.map((o) => (
            <button
              key={o.key}
              onClick={() => onChange({ ...filters, payment: o.key })}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                filters.payment === o.key ? "bg-foreground text-background shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
