"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OrdersFilterBar, OrderFilters } from "@/components/dashboard/orders/OrdersFilterBar";
import { formatETB } from "@/lib/currency";
import { formatTableRef } from "@/hooks/useTableLabels";
import { ShoppingBag, Clock, CheckCircle2, AlertCircle, Plus, Sparkles, ChefHat, Truck, X } from "lucide-react";

// Heavy tab surfaces are code-split so the initial load stays light and each
// tab's data fetch only starts when the tab is actually opened.
const ActiveOrdersTab = dynamic(() =>
  import("@/components/dashboard/orders/ActiveOrdersTab").then((m) => m.ActiveOrdersTab),
  { ssr: false, loading: () => <OrderTabSkeleton /> }
);
const OrderHistoryTab = dynamic(() =>
  import("@/components/dashboard/orders/OrderHistoryTab").then((m) => m.OrderHistoryTab),
  { ssr: false, loading: () => <OrderTabSkeleton /> }
);
const PlaceOrderTab = dynamic(() =>
  import("@/components/dashboard/orders/PlaceOrderTab").then((m) => m.PlaceOrderTab),
  { ssr: false, loading: () => <OrderTabSkeleton /> }
);
const ReadyDeliveryPane = dynamic(() =>
  import("@/components/dashboard/ReadyDeliveryPane").then((m) => m.ReadyDeliveryPane),
  { ssr: false, loading: () => <OrderTabSkeleton /> }
);

function OrderTabSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-10 w-64 bg-muted/40 border rounded-xl animate-pulse" />
      <div className="grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-56 bg-muted/40 border rounded-2xl animate-pulse" />
        ))}
      </div>
    </div>
  );
}

export default function OrdersPage() {
  const [activeTab, setActiveTab] = useState<"ACTIVE" | "HISTORY" | "NEW" | "DISPATCH">("ACTIVE");
  const [filters, setFilters] = useState<OrderFilters>({ type: "ALL", tableId: "", payment: "ALL" });

  const { data: orders = [] } = useQuery({
    queryKey: ["orders"],
    queryFn: api.orders.getAll,
    refetchInterval: 10000,
  });
  const { data: tables = [] } = useQuery({
    queryKey: ["tables"],
    queryFn: api.tables.getAll,
  });

  // Apply the shared page filters (type / table / payment) to every tab.
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (filters.type !== "ALL" && o.type !== filters.type) return false;
      if (filters.tableId !== "" && o.tableId !== filters.tableId) return false;
      if (filters.payment === "PAID" && o.paymentStatus !== "PAID") return false;
      if (filters.payment === "UNPAID" && o.paymentStatus === "PAID") return false;
      return true;
    });
  }, [orders, filters]);

  const selectedTable = tables.find((t) => t.id === filters.tableId);
  const tableOrders = filters.tableId ? filteredOrders : [];
  const tableRevenue = tableOrders
    .filter((o) => o.paymentStatus === "PAID")
    .reduce((sum, o) => sum + (o.total || 0), 0);
  const tableUnpaid = tableOrders.filter((o) => o.paymentStatus !== "PAID").length;
  const tableActive = tableOrders.filter((o) => !["COMPLETED", "CANCELLED"].includes(o.status)).length;

  const pendingCount = orders.filter((o) => o.status === "PENDING").length;
  const preparingCount = orders.filter((o) => o.status === "PREPARING").length;
  const readyCount = orders.filter((o) => o.status === "READY").length;
  const completedCount = orders.filter((o) => o.status === "COMPLETED").length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-foreground">Live Orders Management</h1>
            <Badge variant="outline" className="font-bold text-xs bg-primary/10 text-primary border-primary/30">
              POS & KDS Feed
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground font-medium mt-1">
            Track live kitchen tickets, manage table orders, dispatch ready dishes, and audit history.
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground gap-1.5 shadow-md hover:scale-105 transition-all"
            onClick={() => setActiveTab("NEW")}
          >
            <Plus className="h-4 w-4" /> Place New Order
          </Button>
        </div>
      </div>

      {/* Real-time Order Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card 
          className={`p-4 rounded-3xl border-none shadow-sm cursor-pointer transition-all ${
            activeTab === "ACTIVE" ? "bg-amber-500/10 border-amber-500/40 ring-2 ring-amber-500/30" : "bg-card hover:bg-muted/50"
          }`}
          onClick={() => setActiveTab("ACTIVE")}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Pending</span>
            <div className="h-8 w-8 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center">
              <AlertCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-600">{pendingCount}</span>
            <span className="text-[10px] text-muted-foreground font-bold">Needs Kitchen Action</span>
          </div>
        </Card>

        <Card 
          className={`p-4 rounded-3xl border-none shadow-sm cursor-pointer transition-all ${
            activeTab === "ACTIVE" ? "bg-blue-500/10 border-blue-500/40 ring-2 ring-blue-500/30" : "bg-card hover:bg-muted/50"
          }`}
          onClick={() => setActiveTab("ACTIVE")}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Preparing</span>
            <div className="h-8 w-8 rounded-xl bg-blue-500/15 text-blue-600 flex items-center justify-center">
              <ChefHat className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-blue-600">{preparingCount}</span>
            <span className="text-[10px] text-muted-foreground font-bold">Cooking Now</span>
          </div>
        </Card>

        <Card 
          className={`p-4 rounded-3xl border-none shadow-sm cursor-pointer transition-all ${
            activeTab === "DISPATCH" ? "bg-emerald-500/10 border-emerald-500/40 ring-2 ring-emerald-500/30" : "bg-card hover:bg-muted/50"
          }`}
          onClick={() => setActiveTab("DISPATCH")}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Ready Dishes</span>
            <div className="h-8 w-8 rounded-xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center">
              <Truck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-600">{readyCount}</span>
            <span className="text-[10px] text-muted-foreground font-bold">Ready to Dispatch</span>
          </div>
        </Card>

        <Card 
          className={`p-4 rounded-3xl border-none shadow-sm cursor-pointer transition-all ${
            activeTab === "HISTORY" ? "bg-primary/10 border-primary/40 ring-2 ring-primary/30" : "bg-card hover:bg-muted/50"
          }`}
          onClick={() => setActiveTab("HISTORY")}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Completed</span>
            <div className="h-8 w-8 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-primary">{completedCount}</span>
            <span className="text-[10px] text-muted-foreground font-bold">Served & Closed</span>
          </div>
        </Card>
      </div>

      {/* Filters (type / table / payment) applied across all tabs */}
      <OrdersFilterBar tables={tables} filters={filters} onChange={setFilters} />

      {/* Per-table summary when a table is selected */}
      {selectedTable && (
        <div className="rounded-2xl border-2 border-primary/20 bg-primary/5 p-4 animate-in fade-in duration-200">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center font-black">
                {selectedTable.name?.replace(/^Table\s*/i, "").replace(/\s*\(.*\)$/, "") || "T"}
              </div>
              <div>
                <h3 className="font-black text-sm">{formatTableRef(selectedTable.id, Object.fromEntries(tables.map((t) => [t.id, t.name])))}</h3>
                <p className="text-[11px] text-muted-foreground font-medium">
                  {tableOrders.length} order{tableOrders.length !== 1 ? "s" : ""} · {formatETB(tableRevenue)} collected
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${tableActive > 0 ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25" : "bg-muted text-muted-foreground border"}`}>
                {tableActive} active
              </span>
              <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${tableUnpaid > 0 ? "bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/25" : "bg-muted text-muted-foreground border"}`}>
                {tableUnpaid} unpaid
              </span>
              <button
                onClick={() => setFilters({ ...filters, tableId: "" })}
                className="h-8 w-8 rounded-lg border flex items-center justify-center text-muted-foreground hover:text-foreground active:scale-95 transition-all"
                aria-label="Clear table filter"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex overflow-x-auto gap-2 p-1.5 bg-card rounded-2xl border shadow-sm scrollbar-hide">
        <Button
          variant={activeTab === "ACTIVE" ? "default" : "ghost"}
          className={`rounded-xl h-10 px-5 font-bold text-xs transition-all gap-2 ${
            activeTab === "ACTIVE" ? "shadow-sm" : "text-muted-foreground hover:bg-muted"
          }`}
          onClick={() => setActiveTab("ACTIVE")}
        >
          <Clock className="h-4 w-4" />
          <span>Active Tickets ({pendingCount + preparingCount})</span>
        </Button>

        <Button
          variant={activeTab === "DISPATCH" ? "default" : "ghost"}
          className={`rounded-xl h-10 px-5 font-bold text-xs transition-all gap-2 ${
            activeTab === "DISPATCH" ? "shadow-sm" : "text-muted-foreground hover:bg-muted"
          }`}
          onClick={() => setActiveTab("DISPATCH")}
        >
          <Truck className="h-4 w-4 text-emerald-500" />
          <span>Ready & Dispatch ({readyCount})</span>
        </Button>

        <Button
          variant={activeTab === "NEW" ? "default" : "ghost"}
          className={`rounded-xl h-10 px-5 font-bold text-xs transition-all gap-2 ${
            activeTab === "NEW" ? "shadow-sm" : "text-muted-foreground hover:bg-muted"
          }`}
          onClick={() => setActiveTab("NEW")}
        >
          <Sparkles className="h-4 w-4 text-amber-500" />
          <span>+ Place Order POS</span>
        </Button>

        <Button
          variant={activeTab === "HISTORY" ? "default" : "ghost"}
          className={`rounded-xl h-10 px-5 font-bold text-xs transition-all gap-2 ${
            activeTab === "HISTORY" ? "shadow-sm" : "text-muted-foreground hover:bg-muted"
          }`}
          onClick={() => setActiveTab("HISTORY")}
        >
          <ShoppingBag className="h-4 w-4" />
          <span>Order History Log</span>
        </Button>
      </div>

      {/* Tab Contents */}
      {activeTab === "ACTIVE" && <ActiveOrdersTab ordersOverride={filteredOrders} />}
      {activeTab === "DISPATCH" && <ReadyDeliveryPane />}
      {activeTab === "NEW" && <PlaceOrderTab />}
      {activeTab === "HISTORY" && <OrderHistoryTab ordersOverride={filteredOrders} />}
    </div>
  );
}
