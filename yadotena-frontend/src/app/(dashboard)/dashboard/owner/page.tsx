"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { useSidebarCollapse } from "@/hooks/useSidebarCollapse";
import { OwnerSidebar } from "@/components/owner/OwnerSidebar";
import { OwnerHeader } from "@/components/owner/OwnerHeader";
import { DateRangeSelector } from "@/components/owner/DateRangeSelector";
import { ComparisonBar } from "@/components/owner/PeriodCompare";
import { AttentionCenter } from "@/components/owner/AttentionCenter";
import { useOwnerOps } from "@/hooks/useOwnerOps";
import { CustomRange } from "@/lib/owner";
import { formatETB } from "@/lib/currency";
import { greetingForHour } from "@/lib/manager";
import {
  Wallet,
  Receipt,
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  PieChart,
  Activity,
  Zap,
  Target,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

const DrilldownTrend = dynamic(
  () => import("@/components/owner/DrilldownTrend").then((mod) => mod.DrilldownTrend),
  {
    loading: () => <div className="h-64 bg-muted/30 border rounded-2xl animate-pulse" />,
    ssr: false,
  }
);



const HourlyProfile = dynamic(
  () => import("@/components/owner/HourlyProfile").then((mod) => mod.HourlyProfile),
  {
    loading: () => <div className="h-64 bg-muted/30 border rounded-2xl animate-pulse" />,
    ssr: false,
  }
);

const PaymentMix = dynamic(
  () => import("@/components/owner/PaymentMix").then((mod) => mod.PaymentMix),
  {
    loading: () => <div className="h-64 bg-muted/30 border rounded-2xl animate-pulse" />,
    ssr: false,
  }
);

const TopProducts = dynamic(
  () => import("@/components/owner/TopProducts").then((mod) => mod.TopProducts),
  {
    loading: () => <div className="h-64 bg-muted/30 border rounded-2xl animate-pulse" />,
    ssr: false,
  }
);

const ExpensesCard = dynamic(
  () => import("@/components/owner/ExpensesCard").then((mod) => mod.ExpensesCard),
  {
    loading: () => <div className="h-64 bg-muted/30 border rounded-2xl animate-pulse" />,
    ssr: false,
  }
);

const TodayActivity = dynamic(
  () => import("@/components/owner/TodayActivity").then((mod) => mod.TodayActivity),
  {
    loading: () => <div className="h-64 bg-muted/30 border rounded-2xl animate-pulse" />,
    ssr: false,
  }
);

export default function OwnerDashboardPage() {
  const { data: session } = useSession();
  const { isCollapsed: isSidebarCollapsed, toggle: toggleSidebarCollapse } = useSidebarCollapse();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [customRange, setCustomRange] = useState<CustomRange | undefined>();

  const {
    rangeKey,
    setRangeKey,
    metrics,
    comparison,
    orders,
    expenses,
    recentActivity,
    isLoading,
  } = useOwnerOps(undefined, customRange);

  const handleRangeChange = (r: Parameters<typeof setRangeKey>[0], custom?: CustomRange) => {
    setRangeKey(r);
    if (r === "custom" && custom) setCustomRange(custom);
  };

  const userObj = session?.user
    ? {
        name: session.user.name || "Business Owner",
        role: session.user.role || "OWNER",
        email: session.user.email || undefined,
      }
    : { name: "Business Owner", role: "OWNER" };

  const handleOpenAttention = () => {
    document
      .getElementById("attention-center")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Compute additional metrics
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
      hourData: Array.from(hourMap.entries()).sort((a, b) => b[1].revenue - a[1].revenue),
    };
  }, [orders]);

  const recentTrend = useMemo(() => {
    const paidOrders = orders.filter((o) => o.paymentStatus === "PAID");
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const todayStr = today.toISOString().split('T')[0];
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    const todayOrders = paidOrders.filter((o) => o.createdAt?.toString().startsWith(todayStr));
    const yesterdayOrders = paidOrders.filter((o) => o.createdAt?.toString().startsWith(yesterdayStr));
    
    const todayRevenue = todayOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const yesterdayRevenue = yesterdayOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    
    const revenueChange = yesterdayRevenue > 0 
      ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 
      : 0;
    
    return {
      todayRevenue,
      yesterdayRevenue,
      todayOrders: todayOrders.length,
      yesterdayOrders: yesterdayOrders.length,
      revenueChange,
      ordersChange: yesterdayOrders.length > 0 
        ? ((todayOrders.length - yesterdayOrders.length) / yesterdayOrders.length) * 100 
        : 0,
    };
  }, [orders]);

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <OwnerSidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapse}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <OwnerHeader
          user={userObj}
          attentionCount={metrics.attentionCount}
          rangeDisplay={metrics.range.display}
          onOpenAttention={handleOpenAttention}
          onToggleSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Page Header with Greeting and Controls */}
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="text-3xl font-black tracking-tight text-foreground">
                  {greetingForHour(new Date().getHours())}
                </h1>
                <p className="text-sm text-muted-foreground font-medium mt-1">
                  {metrics.range.label} · {metrics.range.display}
                </p>
              </div>
              <DateRangeSelector value={rangeKey} onChange={handleRangeChange} custom={customRange} />
            </div>

            {isLoading && metrics.paidOrders === 0 && metrics.revenue === 0 ? (
              <div className="space-y-6">
                <div className="h-32 bg-muted/40 border rounded-2xl animate-pulse" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-40 bg-muted/40 border rounded-2xl animate-pulse" />
                  ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="h-80 bg-muted/40 border rounded-2xl animate-pulse" />
                  <div className="h-80 bg-muted/40 border rounded-2xl animate-pulse" />
                </div>
              </div>
            ) : (
              <>
                {/* Attention Center - Prominent at top */}
                <AttentionCenter metrics={metrics} />

                {/* Period Comparison Bar */}
                <ComparisonBar comparison={comparison} />

                {/* Primary KPI Cards - Revenue Focus */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Revenue Card - Primary */}
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
                      
                      {/* Trend Indicator */}
                      <div className="mt-4 flex items-center gap-4">
                        <div className={`flex items-center gap-1 ${recentTrend.revenueChange >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          {recentTrend.revenueChange >= 0 ? (
                            <ArrowUpRight className="h-4 w-4" />
                          ) : (
                            <ArrowDownRight className="h-4 w-4" />
                          )}
                          <span className="text-sm font-bold">
                            {Math.abs(recentTrend.revenueChange).toFixed(1)}%
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          vs yesterday · {formatETB(recentTrend.yesterdayRevenue)}
                        </span>
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
                      {recentTrend.ordersChange >= 0 ? (
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-rose-500" />
                      )}
                      <span className="text-xs font-bold text-muted-foreground">
                        {Math.abs(recentTrend.ordersChange).toFixed(1)}% vs yesterday
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
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      <span className="text-xs font-bold text-muted-foreground">
                        Target: {formatETB(500)}
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
                  {/* Revenue Trend - Main Chart */}
                  <div className="lg:col-span-2 bg-card border rounded-2xl p-6 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="font-black text-lg text-foreground flex items-center gap-2">
                          <BarChart3 className="h-5 w-5 text-amber-500" /> Revenue Trend
                        </h3>
                        <p className="text-sm text-muted-foreground font-medium mt-1">
                          Daily revenue over {metrics.range.label.toLowerCase()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-foreground">Peak Hour</p>
                        <p className="text-xs text-muted-foreground">
                          {peakHours.peakHour}:00 · {formatETB(peakHours.peakRevenue)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <DrilldownTrend
                        key={`${metrics.range.from}-${metrics.range.to}`}
                        orders={orders}
                        expenses={expenses}
                        range={metrics.range}
                      />
                    </div>
                  </div>

                  {/* Payment Methods Distribution */}
                  <div className="bg-card border rounded-2xl p-6 shadow-sm">
                    <h3 className="font-black text-lg text-foreground flex items-center gap-2">
                      <PieChart className="h-5 w-5 text-amber-500" /> Payment Methods
                    </h3>
                    <p className="text-sm text-muted-foreground font-medium mt-1">
                      Transaction distribution
                    </p>
                    <div className="mt-4">
                      <PaymentMix metrics={metrics} />
                    </div>
                  </div>
                </div>

                {/* Hourly Profile & Top Products */}
                <div className="grid gap-6 lg:grid-cols-3">
                  {/* Hourly Sales Profile */}
                  <div className="bg-card border rounded-2xl p-6 shadow-sm">
                    <h3 className="font-black text-lg text-foreground flex items-center gap-2">
                      <Clock className="h-5 w-5 text-amber-500" /> Hourly Sales Profile
                    </h3>
                    <p className="text-sm text-muted-foreground font-medium mt-1">
                      Revenue by hour of day
                    </p>
                    <div className="mt-4">
                      <HourlyProfile metrics={metrics} />
                    </div>
                  </div>

                  {/* Top Products */}
                  <div className="lg:col-span-2">
                    <TopProducts metrics={metrics} />
                  </div>
                </div>

                {/* Bottom Section: Expenses, Activity, Quick Stats */}
                <div className="grid gap-6 lg:grid-cols-3">
                  {/* Expenses Card */}
                  <div className="bg-card border rounded-2xl p-6 shadow-sm">
                    <h3 className="font-black text-lg text-foreground flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-amber-500" /> Recent Expenses
                    </h3>
                    <p className="text-sm text-muted-foreground font-medium mt-1">
                      Recorded costs this period
                    </p>
                    <div className="mt-4">
                      <ExpensesCard range={metrics.range} expenses={expenses} />
                    </div>
                  </div>

                  {/* Today's Activity */}
                  <div className="lg:col-span-2">
                    <TodayActivity logs={recentActivity} />
                  </div>
                </div>

                {/* Quick Stats Footer */}
                <div className="bg-gradient-to-r from-amber-500/5 via-transparent to-amber-500/5 border border-amber-500/10 rounded-2xl p-6">
                  <h3 className="font-black text-lg text-foreground flex items-center gap-2 mb-4">
                    <Zap className="h-5 w-5 text-amber-500" /> Quick Insights
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
                        {metrics.unpaidOrders}
                      </p>
                      <p className="text-xs text-muted-foreground font-medium">Pending Payments</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-black text-foreground">
                        {metrics.outOfStock}
                      </p>
                      <p className="text-xs text-muted-foreground font-medium">Out of Stock</p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
