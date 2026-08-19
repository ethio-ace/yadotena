"use client";

import { useState, useEffect, useMemo } from "react";
import { analytics, PeriodPreset, SalesAnalytics } from "@/services/analytics";
import { AnalyticsToolbar } from "@/components/analytics/AnalyticsToolbar";
import { MetricCard } from "@/components/analytics/MetricCard";
import { RevenueTrendChart } from "@/components/analytics/RevenueTrendChart";
import { BarChart3, ShoppingBag, Receipt, TrendingUp, Download, Clock, Layers } from "lucide-react";
import { formatETB } from "@/lib/currency";
import { exportSalesAnalyticsCSV } from "@/lib/export";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts";

export default function SalesAnalyticsPage() {
  const [period, setPeriod] = useState<PeriodPreset>("today");
  const [data, setData] = useState<SalesAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    analytics
      .sales(period)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [period]);

  const peakHour = useMemo(() => {
    if (!data?.hourlySales || data.hourlySales.length === 0) return null;
    return data.hourlySales.reduce((max, h) => (h.revenue > max.revenue ? h : max), data.hourlySales[0]);
  }, [data]);

  const handleExport = () => {
    if (!data) return;
    exportSalesAnalyticsCSV({
      period,
      revenue: data.revenue,
      orders: data.orders,
      avgTicket: data.avgTicket,
      itemsSold: data.itemsSold,
      hourlySales: data.hourlySales,
      categorySales: data.categorySales,
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">Sales Analytics</h1>
          <p className="text-sm text-muted-foreground font-medium mt-0.5">
            Intraday revenue trends, hourly patterns, and category performance
          </p>
        </div>
        {data && (
          <button
            onClick={handleExport}
            className="inline-flex h-9 items-center gap-2 rounded-xl border bg-card px-4 text-xs font-bold text-foreground shadow-sm hover:bg-accent transition-colors"
          >
            <Download className="h-4 w-4 text-amber-500" />
            Export CSV
          </button>
        )}
      </div>

      <AnalyticsToolbar period={period} onPeriodChange={setPeriod} />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 bg-muted/40 border rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard label="Revenue" metric={data.revenue} format="currency" icon={<BarChart3 className="h-4 w-4" />} />
            <MetricCard label="Orders" metric={data.orders} icon={<Receipt className="h-4 w-4" />} />
            <MetricCard label="Avg Ticket" metric={data.avgTicket} format="currency" icon={<TrendingUp className="h-4 w-4" />} />
            <MetricCard label="Items Sold" metric={data.itemsSold} icon={<ShoppingBag className="h-4 w-4" />} />
          </div>

          <RevenueTrendChart data={data.revenueTrend} title="Revenue Trend" />

          {/* Hourly Sales Chart */}
          <div className="p-5 rounded-2xl border bg-card shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-sm font-black text-foreground flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-amber-500" /> Sales by Hour
                </h3>
                <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
                  Hourly order volume and revenue across 24-hour café operations
                </p>
              </div>
              {peakHour && peakHour.revenue > 0 && (
                <div className="rounded-xl border bg-amber-500/10 border-amber-500/20 px-3 py-1 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                  Peak: {peakHour.hour}:00 ({formatETB(peakHour.revenue)})
                </div>
              )}
            </div>

            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.hourlySales} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="hour"
                    tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={{ stroke: "var(--border)" }}
                    tickFormatter={(h: number) => `${h}:00`}
                    interval={1}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k` : String(v))}
                    width={40}
                  />
                  <Tooltip
                    cursor={{ fill: "var(--muted)", opacity: 0.25 }}
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                    formatter={(value, name, item) => [
                      formatETB(Number(value ?? 0)),
                      `Revenue (${item.payload.orders || 0} orders)`,
                    ]}
                    labelFormatter={(label) => `Hour ${label}:00`}
                  />
                  {peakHour && peakHour.revenue > 0 && (
                    <ReferenceLine x={peakHour.hour} stroke="var(--primary)" strokeDasharray="4 4" opacity={0.6} />
                  )}
                  <Bar dataKey="revenue" name="revenue" fill="#f59e0b" radius={[3, 3, 0, 0]} maxBarSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Category Sales Breakdown */}
          <div className="p-5 rounded-2xl border bg-card shadow-sm">
            <div className="mb-4">
              <h3 className="text-sm font-black text-foreground flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-amber-500" /> Sales by Category
              </h3>
              <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
                Revenue contribution and quantity distribution by menu category
              </p>
            </div>

            {data.categorySales.length === 0 ? (
              <div className="py-12 text-center border border-dashed rounded-2xl">
                <p className="text-xs font-bold text-muted-foreground">No category sales data for this period.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.categorySales.map((cat) => (
                  <div key={cat.category} className="rounded-xl border bg-background/50 p-3">
                    <div className="flex items-center justify-between gap-3 text-xs font-bold">
                      <div className="min-w-0">
                        <span className="text-foreground">{cat.category}</span>
                        <span className="text-muted-foreground font-normal ml-2">({cat.units} sold)</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-foreground font-extrabold mr-2">{formatETB(cat.revenue)}</span>
                        <span className="text-amber-500 font-black">{cat.share.toFixed(1)}%</span>
                      </div>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-amber-500/70 rounded-full transition-all"
                        style={{ width: `${Math.min(100, Math.max(0, cat.share))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
