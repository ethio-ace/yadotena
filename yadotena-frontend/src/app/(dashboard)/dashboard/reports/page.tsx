"use client";

import { Suspense, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/services/api";
import { useQuery } from "@tanstack/react-query";
import { DateRangeSelector } from "@/components/owner/DateRangeSelector";
import { ReportsTabs, ReportTabKey } from "@/components/owner/reports/ReportsTabs";

const DrilldownTrend = dynamic(
  () => import("@/components/owner/DrilldownTrend").then((mod) => mod.DrilldownTrend),
  {
    loading: () => <div className="h-64 bg-muted/30 border rounded-2xl animate-pulse" />,
    ssr: false,
  }
);
import { MenuCategoriesReport } from "@/components/owner/reports/MenuCategoriesReport";
import { AddonsReport } from "@/components/owner/reports/AddonsReport";
import { PopularityReport } from "@/components/owner/reports/PopularityReport";
import { CustomersReport } from "@/components/owner/reports/CustomersReport";
import { PaymentsReport } from "@/components/owner/reports/PaymentsReport";
import { StaffReport } from "@/components/owner/reports/StaffReport";
import { ExpensesReport } from "@/components/owner/reports/ExpensesReport";
import { OrderTypesReport } from "@/components/owner/reports/OrderTypesReport";
import { useOwnerOps } from "@/hooks/useOwnerOps";
import { computeSalesBreakdown, CustomRange, OwnerRange } from "@/lib/owner";
import { formatETB } from "@/lib/currency";
import { exportReportTabCSV, exportFullReportCSV } from "@/lib/export";
import { ComparisonBar, Delta } from "@/components/owner/PeriodCompare";
import { RevenueExpenseChart } from "@/components/owner/RevenueExpenseChart";
import { HourlyProfile } from "@/components/owner/HourlyProfile";
import {
  Wallet,
  Receipt,
  TrendingUp,
  TrendingDown,
  Coffee,
  ShoppingBag,
  BarChart3,
  Layers,
  Store,
  Sparkles,
  Clock,
  Scale,
  Target,
  Activity,
  PieChart,
  Zap,
  Download,
  FileSpreadsheet,
  Printer,
} from "lucide-react";

const RANGE_KEYS: OwnerRange[] = ["today", "yesterday", "week", "month", "quarter", "year", "custom"];

function AnalyticsHub() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qRange = searchParams.get("range") as OwnerRange | null;
  const rangeKey: OwnerRange = qRange && RANGE_KEYS.includes(qRange) ? qRange : "today";
  const customRange: CustomRange | undefined =
    rangeKey === "custom" && searchParams.get("from")
      ? {
          from: searchParams.get("from")!,
          to: searchParams.get("to") || searchParams.get("from")!,
        }
      : undefined;

  const { metrics, comparison, orders, menuItems, expenses, isLoading } = useOwnerOps(rangeKey, customRange);

  const [tab, setTab] = useState<ReportTabKey>("revenue");

  const breakdown = useMemo(
    () => computeSalesBreakdown({ range: metrics.range, orders, menuItems }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rangeKey, orders, menuItems]
  );

  const menuCount = useQuery({
    queryKey: ["menu"],
    queryFn: api.menu.getAll,
  });

  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: api.categories.getAll,
  });

  const setRange = (r: OwnerRange, custom?: CustomRange) => {
    if (r === "custom" && custom) {
      router.replace(`/dashboard/reports?range=custom&from=${custom.from}&to=${custom.to}`);
    } else {
      router.replace(`/dashboard/reports?range=${r}`);
    }
  };

  const { menuVsRetail } = breakdown;
  const mixTotal = menuVsRetail.menu + menuVsRetail.retail;
  const menuPct = mixTotal > 0 ? Math.round((menuVsRetail.menu / mixTotal) * 100) : 0;
  const retailPct = 100 - menuPct;

  const loading = isLoading && metrics.revenue === 0 && metrics.paidOrders === 0;

  // Compute additional analytics
  const orderTypeDistribution = useMemo(() => {
    const paidOrders = orders.filter((o) => o.paymentStatus === "PAID");
    const dineIn = paidOrders.filter((o) => o.type === "DINE_IN");
    const takeaway = paidOrders.filter((o) => o.type === "TAKEAWAY");
    const delivery = paidOrders.filter((o) => o.type === "DELIVERY");
    
    return {
      dineIn: { count: dineIn.length, revenue: dineIn.reduce((sum, o) => sum + (o.total || 0), 0) },
      takeaway: { count: takeaway.length, revenue: takeaway.reduce((sum, o) => sum + (o.total || 0), 0) },
      delivery: { count: delivery.length, revenue: delivery.reduce((sum, o) => sum + (o.total || 0), 0) },
      total: paidOrders.length,
    };
  }, [orders]);

  const peakHours = useMemo(() => {
    const paidOrders = orders.filter((o) => o.paymentStatus === "PAID");
    const hourMap = new Map<number, { revenue: number; orders: number }>();
    
    paidOrders.forEach((o) => {
      const hour = new Date(o.createdAt).getHours();
      const current = hourMap.get(hour) || { revenue: 0, orders: 0 };
      current.revenue += o.total || 0;
      current.orders += 1;
      hourMap.set(hour, current);
    });

    let peakHour = 0;
    let peakRevenue = 0;
    hourMap.forEach((data, hour) => {
      if (data.revenue > peakRevenue) {
        peakRevenue = data.revenue;
        peakHour = hour;
      }
    });

    return {
      peakHour,
      peakRevenue,
      peakOrders: hourMap.get(peakHour)?.orders || 0,
    };
  }, [orders]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-16">
      {/* Page Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <BarChart3 className="h-6 w-6" />
            </div>
            Analytics Hub
          </h1>
          <p className="text-sm text-muted-foreground font-medium mt-2 ml-15">
            Comprehensive business intelligence · {metrics.range.display}
          </p>
        </div>
        <DateRangeSelector value={rangeKey} onChange={setRange} custom={customRange} />
      </div>

      {/* Report Tabs & Export Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ReportsTabs active={tab} onChange={setTab} />
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportFullReportCSV(metrics.range, metrics, orders, expenses)}
            className="inline-flex h-9 items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-amber-950 px-4 text-xs font-black shadow-sm transition-all"
          >
            <FileSpreadsheet className="h-4 w-4" /> Export Complete Report
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border bg-card px-3 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors shadow-sm"
          >
            <Printer className="h-3.5 w-3.5" /> PDF
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-36 bg-muted/40 border rounded-2xl animate-pulse" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="h-80 bg-muted/40 border rounded-2xl animate-pulse" />
            <div className="h-80 bg-muted/40 border rounded-2xl animate-pulse" />
          </div>
        </div>
      ) : tab === "revenue" ? (
        <>
          {/* Period Comparison */}
          <ComparisonBar comparison={comparison} />

          {/* Primary KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Revenue Card */}
            <div className="col-span-1 md:col-span-2 lg:col-span-2 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 rounded-2xl p-6 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full -mr-16 -mt-16" />
              <div className="relative">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">
                    Total Revenue
                  </span>
                  <div className="h-12 w-12 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <Wallet className="h-6 w-6" />
                  </div>
                </div>
                <h2 className="mt-3 text-4xl font-black tracking-tight text-foreground">
                  {formatETB(metrics.revenue)}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground font-medium">
                  From {metrics.paidOrders} paid orders
                </p>
                
                <div className="mt-4 flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <Delta pct={comparison.revenuePct} />
                    <span className="text-xs font-bold text-muted-foreground">
                      vs {comparison.previousLabel}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Paid Orders Card */}
            <div className="bg-card border rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                  Paid Orders
                </span>
                <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Receipt className="h-5 w-5" />
                </div>
              </div>
              <h3 className="mt-3 text-3xl font-black text-foreground">{metrics.paidOrders}</h3>
              <p className="mt-2 text-sm text-muted-foreground font-medium">
                Avg {formatETB(metrics.averageTicket)} per order
              </p>
              
              <div className="mt-4 flex items-center gap-1">
                <Delta pct={comparison.paidOrdersPct} />
                <span className="text-xs font-bold text-muted-foreground">
                  vs {comparison.previousLabel}
                </span>
              </div>
            </div>

            {/* Average Ticket Card */}
            <div className="bg-card border rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                  Avg Order Value
                </span>
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Target className="h-5 w-5" />
                </div>
              </div>
              <h3 className="mt-3 text-3xl font-black text-foreground">
                {formatETB(metrics.averageTicket)}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground font-medium">
                Revenue per transaction
              </p>
              
              <div className="mt-4 flex items-center gap-1">
                <Delta pct={comparison.averageTicketPct} />
                <span className="text-xs font-bold text-muted-foreground">
                  vs {comparison.previousLabel}
                </span>
              </div>
            </div>
          </div>

          {/* Secondary KPI Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Net Income Card */}
            <div className={`bg-card border rounded-2xl p-5 shadow-sm ${metrics.revenueMinusExpenses >= 0 ? 'border-emerald-500/20' : 'border-rose-500/20'}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                  Net Income
                </span>
                <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${metrics.revenueMinusExpenses >= 0 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
                  {metrics.revenueMinusExpenses >= 0 ? (
                    <TrendingUp className="h-5 w-5" />
                  ) : (
                    <TrendingDown className="h-5 w-5" />
                  )}
                </div>
              </div>
              <h3 className={`mt-2 text-2xl font-black ${metrics.revenueMinusExpenses >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {formatETB(metrics.revenueMinusExpenses)}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground font-medium">
                Revenue - Recorded Expenses
              </p>
              
              <div className="mt-3 flex items-center gap-1">
                <Delta pct={comparison.netPct} />
                <span className="text-xs font-bold text-muted-foreground">
                  vs {comparison.previousLabel}
                </span>
              </div>
            </div>

            {/* Expenses Card */}
            <div className="bg-card border rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                  Recorded Expenses
                </span>
                <div className="h-9 w-9 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                  <Activity className="h-5 w-5" />
                </div>
              </div>
              <h3 className="mt-2 text-2xl font-black text-foreground">{formatETB(metrics.expenses)}</h3>
              <p className="mt-1 text-xs text-muted-foreground font-medium">
                {metrics.range.label.toLowerCase()} costs
              </p>
              
              <div className="mt-3 flex items-center gap-1">
                <Delta pct={comparison.expensesPct} invert />
                <span className="text-xs font-bold text-muted-foreground">
                  vs {comparison.previousLabel}
                </span>
              </div>
            </div>

            {/* Order Channels Card */}
            <div className="bg-card border rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                  Order Channels
                </span>
                <div className="h-9 w-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <ShoppingBag className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">Dine-in</span>
                  <span className="text-xs font-bold text-muted-foreground">
                    {orderTypeDistribution.dineIn.count} · {formatETB(orderTypeDistribution.dineIn.revenue)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">Takeaway</span>
                  <span className="text-xs font-bold text-muted-foreground">
                    {orderTypeDistribution.takeaway.count} · {formatETB(orderTypeDistribution.takeaway.revenue)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">Delivery</span>
                  <span className="text-xs font-bold text-muted-foreground">
                    {orderTypeDistribution.delivery.count} · {formatETB(orderTypeDistribution.delivery.revenue)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Revenue vs Expenses Chart */}
            <div className="lg:col-span-2 bg-card border rounded-2xl p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-black text-lg text-foreground flex items-center gap-2">
                    <Scale className="h-5 w-5 text-emerald-500" /> Revenue vs Recorded Expenses
                  </h3>
                  <p className="text-sm text-muted-foreground font-medium mt-1">
                    Daily bars · net in green · long periods auto-bucket to weeks
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-foreground">Net Income</p>
                  <p className={`text-lg font-black ${metrics.revenueMinusExpenses >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {formatETB(metrics.revenueMinusExpenses)}
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <RevenueExpenseChart metrics={metrics} />
              </div>
            </div>

            {/* Hourly Sales Profile */}
            <div className="bg-card border rounded-2xl p-6 shadow-sm">
              <h3 className="font-black text-lg text-foreground flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-500" /> Hourly Sales Profile
              </h3>
              <p className="text-sm text-muted-foreground font-medium mt-1">
                Revenue by hour of day — spot rush windows
              </p>
              <div className="mt-2 p-2 bg-amber-500/5 rounded-lg border border-amber-500/10">
                <p className="text-xs font-bold text-amber-700 dark:text-amber-300">
                  Peak Hour: {peakHours.peakHour}:00
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatETB(peakHours.peakRevenue)} revenue · {peakHours.peakOrders} orders
                </p>
              </div>
              <div className="mt-4">
                <HourlyProfile metrics={metrics} />
              </div>
            </div>
          </div>

          {/* Trend & Mix Section */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Drilldown Trend */}
            <div className="lg:col-span-2">
              <DrilldownTrend
                key={`${metrics.range.from}-${metrics.range.to}`}
                orders={orders}
                expenses={expenses}
                range={metrics.range}
              />
            </div>

            {/* Sales Mix & Order Channels */}
            <div className="space-y-6">
              {/* Menu vs Retail */}
              <div className="bg-card border rounded-2xl p-6 shadow-sm">
                <h3 className="font-black text-lg text-foreground flex items-center gap-2">
                  <Layers className="h-5 w-5 text-amber-500" /> Sales Mix
                </h3>
                <p className="text-sm text-muted-foreground font-medium mt-1">
                  Café menu vs over-the-counter retail
                </p>
                <div className="mt-4 space-y-4">
                  <div>
                    <div className="flex items-center justify-between text-sm font-bold">
                      <span className="flex items-center gap-2 text-foreground">
                        <Coffee className="h-4 w-4" /> Café Menu
                      </span>
                      <span className="text-muted-foreground">{formatETB(menuVsRetail.menu)} · {menuPct}%</span>
                    </div>
                    <div className="mt-2 h-3 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-amber-500/80 rounded-full transition-all" style={{ width: `${mixTotal > 0 ? menuPct : 0}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-sm font-bold">
                      <span className="flex items-center gap-2 text-foreground">
                        <ShoppingBag className="h-4 w-4" /> Retail
                      </span>
                      <span className="text-muted-foreground">{formatETB(menuVsRetail.retail)} · {retailPct}%</span>
                    </div>
                    <div className="mt-2 h-3 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-emerald-500/80 rounded-full transition-all" style={{ width: `${mixTotal > 0 ? retailPct : 0}%` }} />
                    </div>
                  </div>
                  {mixTotal === 0 && (
                    <p className="text-sm text-muted-foreground">No paid sales to split yet.</p>
                  )}
                </div>
              </div>

              {/* Order Channels */}
              <div className="bg-card border rounded-2xl p-6 shadow-sm">
                <h3 className="font-black text-lg text-foreground flex items-center gap-2">
                  <Store className="h-5 w-5 text-amber-500" /> Order Channels
                </h3>
                <div className="mt-4 space-y-3">
                  {breakdown.orderTypeMix.length === 0 && (
                    <p className="text-sm text-muted-foreground">No paid orders in this period.</p>
                  )}
                  {breakdown.orderTypeMix.map((t) => (
                    <div key={t.type} className="flex items-center justify-between p-3 rounded-xl border bg-background/50">
                      <span className="font-bold text-foreground capitalize">
                        {t.type.toLowerCase().replace("_", " ")}
                      </span>
                      <span className="text-sm font-bold text-muted-foreground">
                        {t.count} · {formatETB(t.revenue)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Top Products */}
          <div className="bg-card border rounded-2xl p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-black text-lg text-foreground flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-amber-500" /> Top Products
                </h3>
                <p className="text-sm text-muted-foreground font-medium mt-1">
                  Best sellers in this period — full ranking on the Menu & Categories tab
                </p>
              </div>
            </div>
            {breakdown.products.length === 0 ? (
              <p className="text-sm text-muted-foreground mt-5">No paid sales in this period.</p>
            ) : (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {breakdown.products.slice(0, 8).map((p, idx) => (
                  <div key={p.menuItemId} className="flex items-center justify-between gap-4 rounded-xl border bg-background/50 p-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-8 text-center text-lg font-black text-muted-foreground/60">{idx + 1}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-black truncate">{p.name}</p>
                        <p className="text-xs text-muted-foreground font-medium">{p.units} sold · {p.orderCount} orders</p>
                      </div>
                    </div>
                    <span className="text-sm font-black text-primary shrink-0">{formatETB(p.revenue)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Payment Mix */}
          {metrics.paymentMix.length > 0 && (
            <div className="bg-card border rounded-2xl p-6 shadow-sm">
              <h3 className="font-black text-lg text-foreground flex items-center gap-2">
                <PieChart className="h-5 w-5 text-amber-500" /> Payment Methods
              </h3>
              <div className="mt-4 flex flex-wrap gap-3">
                {metrics.paymentMix.map((m) => (
                  <span
                    key={m.method}
                    className="px-4 py-2 rounded-xl border bg-background text-sm font-bold text-foreground flex items-center gap-2"
                  >
                    {m.label}
                    <span className="text-muted-foreground">{m.count} · {m.percent}%</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Quick Insights Footer */}
          <div className="bg-gradient-to-r from-amber-500/5 via-transparent to-amber-500/5 border border-amber-500/10 rounded-2xl p-6">
            <h3 className="font-black text-lg text-foreground flex items-center gap-2 mb-4">
              <Zap className="h-5 w-5 text-amber-500" /> Analytics Insights
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-black text-foreground">
                  {orderTypeDistribution.dineIn.count > 0 
                    ? Math.round((orderTypeDistribution.dineIn.count / orderTypeDistribution.total) * 100)
                    : 0}%
                </p>
                <p className="text-xs text-muted-foreground font-medium">Dine-in Orders</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-foreground">
                  {peakHours.peakHour}:00
                </p>
                <p className="text-xs text-muted-foreground font-medium">Peak Hour</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-foreground">
                  {menuPct}%
                </p>
                <p className="text-xs text-muted-foreground font-medium">Menu Sales</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-foreground">
                  {formatETB(metrics.averageTicket)}
                </p>
                <p className="text-xs text-muted-foreground font-medium">Avg Order Value</p>
              </div>
            </div>
          </div>
        </>
      ) : tab === "menu" ? (
        <MenuCategoriesReport
          breakdown={breakdown}
          menuCount={menuCount.data?.length ?? 0}
          categoryCount={categories.data?.length ?? 0}
        />
      ) : tab === "addons" ? (
        <AddonsReport range={metrics.range} orders={orders} />
      ) : tab === "popularity" ? (
        <PopularityReport range={metrics.range} orders={orders} menuItems={menuItems} />
      ) : tab === "customers" ? (
        <CustomersReport range={metrics.range} orders={orders} />
      ) : tab === "payments" ? (
        <PaymentsReport range={metrics.range} orders={orders} />
      ) : tab === "staff" ? (
        <StaffReport range={metrics.range} />
      ) : tab === "expenses" ? (
        <ExpensesReport range={metrics.range} expenses={expenses} />
      ) : (
        <OrderTypesReport range={metrics.range} orders={orders} />
      )}
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 pb-16">
          <div className="h-12 bg-muted/40 border rounded-2xl animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-36 bg-muted/40 border rounded-2xl animate-pulse" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="h-80 bg-muted/40 border rounded-2xl animate-pulse" />
            <div className="h-80 bg-muted/40 border rounded-2xl animate-pulse" />
          </div>
        </div>
      }
    >
      <AnalyticsHub />
    </Suspense>
  );
}
