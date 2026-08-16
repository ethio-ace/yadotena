"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useManagerOps } from "@/hooks/useManagerOps";
import { greetingForHour } from "@/lib/manager";
import { AttentionCenter } from "./AttentionCenter";
import { QuickActions } from "./QuickActions";
import { TodaySummary } from "./TodaySummary";
import { AlertTriangle, CalendarDays, CheckCircle2, ChevronRight, RefreshCw } from "lucide-react";
import { formatETB } from "@/lib/currency";

export function ManagerOverview() {
  const { data: session } = useSession();
  const { metrics, isLoading, isError, refetchAll } = useManagerOps();

  const firstName = (session?.user?.name || "Manager").trim().split(" ")[0];
  const greeting = greetingForHour(new Date().getHours());
  const todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200 max-w-[1400px] mx-auto">
      {/* GREETING — the manager's first question: "Is everything okay today?" */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            {greeting}, {firstName}
          </h1>
          <p className="text-sm text-muted-foreground mt-1 font-medium">
            Here’s what needs your attention today.
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
          <CalendarDays className="h-4 w-4" />
          {todayLabel}
        </div>
      </div>

      {/* ACTIONABLE ERROR STATE */}
      {isError && (
        <div className="p-4 rounded-2xl border border-destructive/30 bg-destructive/5 text-destructive text-xs font-bold flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Couldn’t load live data. Check your connection and try again.</span>
          </div>
          <button
            onClick={refetchAll}
            className="shrink-0 px-3 py-1.5 rounded-xl bg-destructive/10 hover:bg-destructive/20 border border-destructive/30 flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" /> RETRY
          </button>
        </div>
      )}

      {/* LOADING SKELETON */}
      {isLoading ? (
        <div className="space-y-6" aria-busy="true">
          <div className="h-24 rounded-2xl border bg-muted/30 animate-pulse" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-28 rounded-2xl border bg-muted/30 animate-pulse" />
            ))}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-24 rounded-2xl border bg-muted/30 animate-pulse" />
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* 1. NEEDS ATTENTION */}
          <AttentionCenter
            unverifiedPaymentsCount={metrics.pendingVerification}
            unavailableItemsCount={metrics.outOfStockCount}
            unpaidOrdersCount={metrics.unpaidOrders.length}
            activeServiceCallsCount={metrics.pendingServiceCalls}
          />

          {/* 2. TODAY — operational state & daily metrics */}
          <TodaySummary
            todayRevenue={metrics.todayRevenue}
            totalOrdersCount={metrics.totalOrdersToday}
            unpaidOrdersCount={metrics.unpaidOrders.length}
            pendingVerificationCount={metrics.pendingVerification}
            outOfStockCount={metrics.outOfStockCount}
            occupiedTablesCount={metrics.activeTables}
            totalTablesCount={metrics.totalTables}
          />

          {/* 3. QUICK ACTIONS — high-frequency tasks */}
          <QuickActions />

          {/* 4. LIVE TICKETS — today's active orders */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-black text-sm uppercase tracking-wider text-foreground">
                Live Tickets Today ({metrics.todayOrders.length})
              </h2>
              <Link
                href="/dashboard/orders"
                className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
              >
                All Orders <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="rounded-2xl border bg-card overflow-hidden divide-y divide-border/60 shadow-xs">
              {metrics.todayOrders.slice(0, 8).map((order) => (
                <Link
                  key={order.id}
                  href="/dashboard/orders"
                  className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`h-2 w-2 rounded-full shrink-0 ${
                        order.status === "READY"
                          ? "bg-emerald-500"
                          : order.status === "PREPARING"
                            ? "bg-amber-500"
                            : "bg-blue-500"
                      }`}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-black text-foreground truncate">
                        {order.tableId
                          ? `Table ${order.tableId.replace(/^t/i, "")}`
                          : order.type || "Takeaway"}
                        <span className="ml-2 font-mono text-[11px] font-bold text-muted-foreground">
                          #{order.id.slice(-6).toUpperCase()}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {order.items?.map((i) => `${i.quantity}× ${i.name}`).join(", ") || "No items"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs font-black text-muted-foreground">
                      {formatETB(order.total || 0)}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                        order.paymentStatus === "PAID"
                          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                      }`}
                    >
                      {order.paymentStatus === "PAID" ? "Paid" : "Unpaid"}
                    </span>
                  </div>
                </Link>
              ))}

              {metrics.todayOrders.length === 0 && (
                <div className="py-10 text-center space-y-1.5">
                  <CheckCircle2 className="h-6 w-6 mx-auto text-emerald-500 opacity-60" />
                  <p className="text-xs font-bold text-muted-foreground">
                    No active tickets right now.
                  </p>
                  <p className="text-[11px] text-muted-foreground/80">
                    New orders appear here the moment they’re placed.
                  </p>
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
