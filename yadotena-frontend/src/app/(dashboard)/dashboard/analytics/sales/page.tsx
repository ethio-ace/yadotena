"use client";

import { useState, useEffect } from "react";
import { analytics, PeriodPreset, SalesAnalytics } from "@/services/analytics";
import { AnalyticsToolbar } from "@/components/analytics/AnalyticsToolbar";
import { MetricCard } from "@/components/analytics/MetricCard";
import { RevenueTrendChart } from "@/components/analytics/RevenueTrendChart";
import { BarChart3, ShoppingBag, Receipt, TrendingUp } from "lucide-react";
import { formatETB } from "@/lib/currency";

export default function SalesAnalyticsPage() {
  const [period, setPeriod] = useState<PeriodPreset>("today");
  const [data, setData] = useState<SalesAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    analytics.sales(period)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [period]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black">Sales Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">Revenue trends, hourly patterns, and category performance</p>
      </div>

      <AnalyticsToolbar period={period} onPeriodChange={setPeriod} />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 bg-muted/40 border rounded-xl animate-pulse" />
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

          <RevenueTrendChart data={data.revenueTrend} title="Revenue by Day" />

          {/* Hourly Sales */}
          <div className="p-6 rounded-xl border bg-card">
            <h3 className="text-sm font-bold mb-4">Sales by Hour</h3>
            <div className="flex items-end gap-1 h-32">
              {Array.from({ length: 24 }).map((_, hour) => {
                const point = data.hourlySales.find((h) => h.hour === hour);
                const maxRevenue = Math.max(...data.hourlySales.map((h) => h.revenue), 1);
                const height = point ? (point.revenue / maxRevenue) * 100 : 0;
                return (
                  <div key={hour} className="flex-1 flex flex-col items-center gap-1 group relative">
                    <div className="w-full bg-foreground/80 rounded-t-sm transition-all" style={{ height: `${height}%` }} />
                    <span className="text-[8px] text-muted-foreground">{hour}</span>
                    {point && (
                      <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        <div className="bg-foreground text-background px-2 py-1 rounded text-[10px] font-bold whitespace-nowrap shadow-lg">
                          {hour}:00 — {formatETB(point.revenue)} ({point.orders} orders)
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Category Sales */}
          <div className="p-6 rounded-xl border bg-card">
            <h3 className="text-sm font-bold mb-4">Sales by Category</h3>
            <div className="space-y-3">
              {data.categorySales.map((cat) => (
                <div key={cat.category} className="flex items-center gap-3">
                  <div className="w-24 text-xs font-bold truncate">{cat.category}</div>
                  <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-foreground/80 rounded-full transition-all"
                      style={{ width: `${cat.share}%` }}
                    />
                  </div>
                  <div className="w-20 text-right">
                    <span className="text-xs font-bold">{formatETB(cat.revenue)}</span>
                  </div>
                  <div className="w-12 text-right">
                    <span className="text-[10px] text-muted-foreground">{cat.share.toFixed(0)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
