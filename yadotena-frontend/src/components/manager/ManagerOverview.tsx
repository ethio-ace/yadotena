"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { AttentionCenter } from "./AttentionCenter";
import { QuickActions } from "./QuickActions";
import { TodaySummary } from "./TodaySummary";
import { ActivityLogsViewer } from "@/components/dashboard/ActivityLogsViewer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatETB } from "@/lib/currency";
import { Coffee, ShoppingBag, Clock, CheckCircle2, ChevronRight, Activity, AlertCircle } from "lucide-react";
import Link from "next/link";

export function ManagerOverview() {
  const { data: orders = [], isLoading: isLoadingOrders } = useQuery({
    queryKey: ["orders"],
    queryFn: api.orders.getAll,
    refetchInterval: 5000,
  });

  const { data: menuItems = [] } = useQuery({
    queryKey: ["menu"],
    queryFn: api.menu.getAll,
  });

  const { data: tables = [] } = useQuery({
    queryKey: ["tables"],
    queryFn: api.tables.getAll,
  });

  const { data: serviceRequests = [] } = useQuery({
    queryKey: ["serviceRequests"],
    queryFn: api.serviceRequests.getAll,
    refetchInterval: 5000,
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["payments"],
    queryFn: api.payments.getAll,
  });

  // Calculate Operational Metrics
  const activeOrders = orders.filter((o) => !["COMPLETED", "CANCELLED"].includes(o.status));
  const unpaidOrders = orders.filter((o) => o.paymentStatus === "PENDING" && o.status !== "CANCELLED");
  const pendingPayments = payments.filter((p: any) => p.status === "PENDING_VERIFICATION" || p.status === "PENDING");
  const outOfStockItems = menuItems.filter((i) => i.available === false || (i as any).isAvailable === false);
  const occupiedTables = tables.filter((t) => t.status === "OCCUPIED");
  const activeServiceRequests = serviceRequests.filter((r) => r.status === "PENDING");

  // Calculate Today's Settled Revenue
  const todayRevenue = orders
    .filter((o) => o.paymentStatus === "PAID")
    .reduce((sum, o) => sum + (o.total || 0), 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Shift Greeting & Status */}
      <div className="bg-card border p-5 sm:p-6 rounded-3xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Shift Operational Command
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Café Operational Overview
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5 max-w-xl">
            Realtime operational visibility, catalog availability, digital payment verification, and daily expenses.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="p-3 bg-muted/40 border rounded-2xl text-right">
            <span className="text-[10px] font-black uppercase text-muted-foreground block">
              Floor Status
            </span>
            <span className="text-sm font-black text-amber-600 dark:text-amber-400">
              {occupiedTables.length} of {tables.length} Tables Occupied
            </span>
          </div>
        </div>
      </div>

      {/* 1. ATTENTION CENTER (Answers: "Is everything okay today?") */}
      <AttentionCenter
        unverifiedPaymentsCount={pendingPayments.length}
        unavailableItemsCount={outOfStockItems.length}
        unpaidOrdersCount={unpaidOrders.length}
        activeServiceCallsCount={activeServiceRequests.length}
      />

      {/* 2. TODAY'S SUMMARY METRICS */}
      <TodaySummary
        todayRevenue={todayRevenue}
        totalOrdersCount={orders.length}
        unpaidOrdersCount={unpaidOrders.length}
        pendingVerificationCount={pendingPayments.length}
        outOfStockCount={outOfStockItems.length}
        occupiedTablesCount={occupiedTables.length}
        totalTablesCount={tables.length}
      />

      {/* 3. HIGH-FREQUENCY QUICK ACTIONS */}
      <QuickActions />

      {/* 4. LIVE SHIFT OPERATIONS & ORDERS FEED */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Active Shift Orders List */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-sm uppercase tracking-wider text-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              <span>Active Kitchen & Floor Tickets ({activeOrders.length})</span>
            </h3>
            <Link href="/dashboard/orders">
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1">
                All Orders <ChevronRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          </div>

          <div className="space-y-2.5">
            {activeOrders.slice(0, 5).map((order) => (
              <div
                key={order.id}
                className="p-4 rounded-2xl border bg-card hover:bg-muted/30 transition-colors flex items-center justify-between gap-4 text-xs shadow-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-sm text-foreground">
                      {order.tableId ? `Table ${order.tableId.replace(/^t/i, "")}` : order.type || "Takeaway"}
                    </span>
                    <Badge variant="outline" className="font-mono text-[10px] font-bold">
                      #{order.id.slice(-6).toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground font-medium">
                    {order.items?.map((i) => `${i.quantity}× ${i.name}`).join(", ")}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div className="font-black text-sm text-foreground">
                      {formatETB(order.total || 0)}
                    </div>
                    <Badge
                      className={`text-[9px] font-black uppercase px-2 py-0.5 ${
                        order.paymentStatus === "PAID"
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                          : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20"
                      }`}
                    >
                      {order.paymentStatus === "PAID" ? "PAID" : "UNPAID"}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}

            {activeOrders.length === 0 && (
              <div className="py-12 text-center text-xs text-muted-foreground border border-dashed rounded-2xl space-y-1">
                <CheckCircle2 className="h-6 w-6 mx-auto text-emerald-500 opacity-60 mb-1" />
                <p className="font-bold">No active open orders on the line right now.</p>
              </div>
            )}
          </div>
        </div>

        {/* Audit Feed Sidebar Widget */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-sm uppercase tracking-wider text-foreground flex items-center gap-2">
              <Activity className="h-4 w-4 text-amber-500" />
              <span>Shift Operations Feed</span>
            </h3>
            <Link href="/dashboard/logs">
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline">
                Full Log
              </span>
            </Link>
          </div>

          <ActivityLogsViewer
            title="Live Staff Activity"
            description="Realtime log of waiter order entries, kitchen updates, and payment settlements."
            allowedRoles={["WAITER", "KITCHEN", "MANAGER", "OWNER"]}
          />
        </div>

      </div>

    </div>
  );
}
