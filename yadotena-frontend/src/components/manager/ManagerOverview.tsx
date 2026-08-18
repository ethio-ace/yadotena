"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useManagerOps } from "@/hooks/useManagerOps";
import { greetingForHour } from "@/lib/manager";
import { AttentionCenter } from "./AttentionCenter";
import { QuickActions } from "./QuickActions";
import { TodaySummary } from "./TodaySummary";
import { LiveTickets } from "./LiveTickets";
import { StockWatch } from "./StockWatch";
import { AlertTriangle, RefreshCw, Grid3X3, ChevronRight } from "lucide-react";

export function ManagerOverview() {
  const { data: session } = useSession();
  const { metrics, tableNameById, isLoading, isError, refetchAll } = useManagerOps();

  const firstName = (session?.user?.name || "Manager").trim().split(" ")[0];
  const greeting = greetingForHour(new Date().getHours());
  const todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* PAGE HEADER — greeting + live floor pulse */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            {greeting}, {firstName}
          </h1>
          <p className="text-xs text-muted-foreground font-medium mt-1">{todayLabel}</p>
        </div>

        <Link
          href="/dashboard/tables"
          className="group flex items-center gap-2.5 px-3 py-2 rounded-xl border bg-card shadow-xs hover:border-primary/40 hover:shadow-md transition"
          aria-label={`${metrics.activeTables} of ${metrics.totalTables} tables in use — view floor`}
        >
          <Grid3X3 className="h-4 w-4 text-primary" aria-hidden="true" />
          <span className="text-xs font-black text-foreground">
            {metrics.activeTables}
            <span className="text-muted-foreground font-bold"> / {metrics.totalTables}</span> tables
            in use
          </span>
          <ChevronRight
            className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform"
            aria-hidden="true"
          />
        </Link>
      </div>

      {/* ACTIONABLE ERROR STATE */}
      {isError && (
        <div
          role="alert"
          className="p-4 rounded-2xl border border-destructive/30 bg-destructive/5 text-destructive text-xs font-bold flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Couldn’t load live data. Check your connection and try again.</span>
          </div>
          <button
            onClick={refetchAll}
            className="shrink-0 px-3 py-1.5 rounded-xl bg-destructive/10 hover:bg-destructive/20 border border-destructive/30 flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> RETRY
          </button>
        </div>
      )}

      {/* LOADING SKELETON */}
      {isLoading ? (
        <div className="space-y-6" aria-busy="true">
          <div className="h-14 rounded-2xl border bg-muted/30 animate-pulse" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 rounded-2xl border bg-muted/30 animate-pulse" />
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-3 items-start">
            <div className="lg:col-span-2 h-72 rounded-2xl border bg-muted/30 animate-pulse" />
            <div className="h-72 rounded-2xl border bg-muted/30 animate-pulse" />
          </div>
        </div>
      ) : (
        <>
          {/* 1. ATTENTION — everything that needs the manager today */}
          <AttentionCenter
            unverifiedPaymentsCount={metrics.pendingVerification}
            unavailableItemsCount={metrics.outOfStockCount}
            unpaidOrdersCount={metrics.unpaidOrders.length}
            activeServiceCallsCount={metrics.pendingServiceCalls}
          />

          {/* 2. TODAY — the day's health, at a glance */}
          <TodaySummary
            todayRevenue={metrics.todayRevenue}
            totalOrdersCount={metrics.totalOrdersToday}
            avgOrderValue={metrics.avgOrderValue}
            occupiedTablesCount={metrics.activeTables}
            totalTablesCount={metrics.totalTables}
          />

          {/* 3. FLOOR — live tickets + right rail of shortcuts & stock */}
          <div className="grid gap-4 lg:grid-cols-3 items-start">
            <div className="lg:col-span-2">
              <LiveTickets orders={metrics.todayOrders} tableNameById={tableNameById} />
            </div>
            <div className="space-y-4">
              <QuickActions />
              <StockWatch items={metrics.unavailableItems} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
