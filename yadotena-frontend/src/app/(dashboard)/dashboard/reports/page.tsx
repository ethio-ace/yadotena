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
import { StaffReport } from "@/components/owner/reports/StaffReport";
import { ExpensesReport } from "@/components/owner/reports/ExpensesReport";
import { CustomersReport } from "@/components/owner/reports/CustomersReport";
import { useOwnerOps } from "@/hooks/useOwnerOps";
import { computeSalesBreakdown, CustomRange, OwnerRange } from "@/lib/owner";
import { formatETB } from "@/lib/currency";
import { ComparisonBar, Delta } from "@/components/owner/PeriodCompare";
import { RevenueExpenseChart } from "@/components/owner/RevenueExpenseChart";
import { HourlyProfile } from "@/components/owner/HourlyProfile";
import {
  Wallet,
  Receipt,
  TrendingUp,
  Banknote,
  Coffee,
  ShoppingBag,
  BarChart3,
  Layers,
  Store,
  Sparkles,
  Clock,
  Scale,
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
    // metrics.range is rebuilt each render; key on the stable pieces instead.
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

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-16">
      {/* Page header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-amber-500" />
            Analytics Hub
          </h1>
          <p className="text-xs text-muted-foreground font-medium mt-1">
            Reports for the period · {metrics.range.display}
          </p>
        </div>
        <DateRangeSelector value={rangeKey} onChange={setRange} custom={customRange} />
      </div>

      {/* Report tabs */}
      <ReportsTabs active={tab} onChange={setTab} />

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 bg-muted/40 border rounded-2xl animate-pulse" />
            ))}
          </div>
          <div className="h-72 bg-muted/40 border rounded-2xl animate-pulse" />
        </div>
      ) : tab === "revenue" ? (
        <>
          {/* Comparison vs the equivalent previous period */}
          <ComparisonBar comparison={comparison} />

          {/* Summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <div className="bg-card border rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Revenue</span>
                <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Wallet className="h-4 w-4" />
                </div>
              </div>
              <h2 className="mt-2 text-2xl font-black text-foreground">{formatETB(metrics.revenue)}</h2>
              <p className="text-[11px] text-muted-foreground font-semibold mt-0.5">Paid orders only</p>
              <div className="mt-2 flex items-center gap-1.5">
                <Delta pct={comparison.revenuePct} />
                <span className="text-[10px] font-semibold text-muted-foreground">vs {comparison.previousLabel}</span>
              </div>
            </div>

            <div className="bg-card border rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Paid Orders</span>
                <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Receipt className="h-4 w-4" />
                </div>
              </div>
              <h2 className="mt-2 text-2xl font-black text-foreground">{metrics.paidOrders}</h2>
              <p className="text-[11px] text-muted-foreground font-semibold mt-0.5">In this period</p>
              <div className="mt-2 flex items-center gap-1.5">
                <Delta pct={comparison.paidOrdersPct} />
                <span className="text-[10px] font-semibold text-muted-foreground">vs {comparison.previousLabel}</span>
              </div>
            </div>

            <div className="bg-card border rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Avg Order</span>
                <div className="h-8 w-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </div>
              <h2 className="mt-2 text-2xl font-black text-foreground">{formatETB(metrics.averageTicket)}</h2>
              <p className="text-[11px] text-muted-foreground font-semibold mt-0.5">Revenue ÷ orders</p>
              <div className="mt-2 flex items-center gap-1.5">
                <Delta pct={comparison.averageTicketPct} />
                <span className="text-[10px] font-semibold text-muted-foreground">vs {comparison.previousLabel}</span>
              </div>
            </div>

            <div className="bg-card border rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Recorded Expenses</span>
                <div className="h-8 w-8 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                  <Banknote className="h-4 w-4" />
                </div>
              </div>
              <h2 className="mt-2 text-2xl font-black text-foreground">{formatETB(metrics.expenses)}</h2>
              <p className="text-[11px] text-muted-foreground font-semibold mt-0.5">Recorded this period</p>
              <div className="mt-2 flex items-center gap-1.5">
                <Delta pct={comparison.expensesPct} invert />
                <span className="text-[10px] font-semibold text-muted-foreground">vs {comparison.previousLabel}</span>
              </div>
            </div>
          </div>

          {/* Revenue vs expenses + hourly profile */}
          <div className="grid gap-4 lg:grid-cols-5">
            <div className="bg-card border rounded-2xl p-5 shadow-sm lg:col-span-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-black text-sm text-foreground flex items-center gap-1.5">
                    <Scale className="h-4 w-4 text-emerald-500" /> Revenue vs Recorded Expenses
                  </h3>
                  <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
                    Daily bars — net (rev − exp) in green; long periods auto-bucket to weeks
                  </p>
                </div>
                <span className="text-[11px] font-black text-muted-foreground">
                  Net {formatETB(metrics.revenueMinusExpenses)}
                </span>
              </div>
              <div className="mt-3">
                <RevenueExpenseChart metrics={metrics} />
              </div>
            </div>

            <div className="bg-card border rounded-2xl p-5 shadow-sm lg:col-span-2">
              <h3 className="font-black text-sm text-foreground flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-amber-500" /> Hourly Sales Profile
              </h3>
              <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
                Paid revenue by hour of day — spot your rush windows
              </p>
              <div className="mt-3">
                <HourlyProfile metrics={metrics} />
              </div>
            </div>
          </div>

          {/* Trend + mix */}
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <DrilldownTrend
                key={`${metrics.range.from}-${metrics.range.to}`}
                orders={orders}
                expenses={expenses}
                range={metrics.range}
              />
            </div>

            <div className="space-y-4">
              {/* Menu vs Retail */}
              <div className="bg-card border rounded-2xl p-5 shadow-sm">
                <h3 className="font-black text-sm text-foreground flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-amber-500" /> Sales Mix
                </h3>
                <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
                  Café menu vs over-the-counter retail
                </p>
                <div className="mt-4 space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="flex items-center gap-1.5 text-foreground">
                        <Coffee className="h-3.5 w-3.5" /> Café Menu
                      </span>
                      <span className="text-muted-foreground">{formatETB(menuVsRetail.menu)} · {menuPct}%</span>
                    </div>
                    <div className="mt-1.5 h-2.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-amber-500/80 rounded-full transition-all" style={{ width: `${mixTotal > 0 ? menuPct : 0}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="flex items-center gap-1.5 text-foreground">
                        <ShoppingBag className="h-3.5 w-3.5" /> Retail
                      </span>
                      <span className="text-muted-foreground">{formatETB(menuVsRetail.retail)} · {retailPct}%</span>
                    </div>
                    <div className="mt-1.5 h-2.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-emerald-500/80 rounded-full transition-all" style={{ width: `${mixTotal > 0 ? retailPct : 0}%` }} />
                    </div>
                  </div>
                  {mixTotal === 0 && (
                    <p className="text-[11px] text-muted-foreground">No paid sales to split yet.</p>
                  )}
                </div>
              </div>

              {/* Order channels */}
              <div className="bg-card border rounded-2xl p-5 shadow-sm">
                <h3 className="font-black text-sm text-foreground flex items-center gap-1.5">
                  <Store className="h-4 w-4 text-amber-500" /> Order Channels
                </h3>
                <div className="mt-3 space-y-2">
                  {breakdown.orderTypeMix.length === 0 && (
                    <p className="text-[11px] text-muted-foreground">No paid orders in this period.</p>
                  )}
                  {breakdown.orderTypeMix.map((t) => (
                    <div key={t.type} className="flex items-center justify-between text-xs">
                      <span className="font-bold text-foreground capitalize">
                        {t.type.toLowerCase().replace("_", " ")}
                      </span>
                      <span className="text-muted-foreground font-semibold">
                        {t.count} · {formatETB(t.revenue)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Top products */}
          <div className="bg-card border rounded-2xl p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-black text-sm text-foreground flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-amber-500" /> Top Products
                </h3>
                <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
                  Best sellers in this period — full ranking on the Menu & Categories tab
                </p>
              </div>
            </div>
            {breakdown.products.length === 0 ? (
              <p className="text-xs text-muted-foreground mt-5">No paid sales in this period.</p>
            ) : (
              <div className="mt-4 grid gap-2 md:grid-cols-2">
                {breakdown.products.slice(0, 6).map((p, idx) => (
                  <div key={p.menuItemId} className="flex items-center justify-between gap-3 rounded-xl border bg-background/50 p-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-6 text-center text-sm font-black text-muted-foreground/60">{idx + 1}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-black truncate">{p.name}</p>
                        <p className="text-[11px] text-muted-foreground font-medium">{p.units} sold · {p.orderCount} orders</p>
                      </div>
                    </div>
                    <span className="text-sm font-black text-primary shrink-0">{formatETB(p.revenue)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Payment mix */}
          {metrics.paymentMix.length > 0 && (
            <div className="bg-card border rounded-2xl p-5 shadow-sm">
              <h3 className="font-black text-sm text-foreground">Payment Methods</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {metrics.paymentMix.map((m) => (
                  <span
                    key={m.method}
                    className="px-3 py-1.5 rounded-xl border bg-background text-xs font-bold text-foreground flex items-center gap-2"
                  >
                    {m.label}
                    <span className="text-muted-foreground">{m.count} · {m.percent}%</span>
                  </span>
                ))}
              </div>
            </div>
          )}
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
      ) : tab === "staff" ? (
        <StaffReport range={metrics.range} />
      ) : tab === "expenses" ? (
        <ExpensesReport range={metrics.range} expenses={expenses} />
      ) : (
        <CustomersReport range={metrics.range} orders={orders} />
      )}
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4 pb-16">
          <div className="h-10 bg-muted/40 border rounded-2xl animate-pulse" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 bg-muted/40 border rounded-2xl animate-pulse" />
            ))}
          </div>
          <div className="h-72 bg-muted/40 border rounded-2xl animate-pulse" />
        </div>
      }
    >
      <AnalyticsHub />
    </Suspense>
  );
}
