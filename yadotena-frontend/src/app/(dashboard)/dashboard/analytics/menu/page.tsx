"use client";

import { useState, useEffect } from "react";
import { analytics, PeriodPreset, MenuAnalytics } from "@/services/analytics";
import { AnalyticsToolbar } from "@/components/analytics/AnalyticsToolbar";
import { formatETB } from "@/lib/currency";
import { Search } from "lucide-react";

export default function MenuAnalyticsPage() {
  const [period, setPeriod] = useState<PeriodPreset>("today");
  const [data, setData] = useState<MenuAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "prepared" | "retail">("all");

  useEffect(() => {
    setLoading(true);
    analytics.menu(period)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [period]);

  const filteredItems = (data?.items || []).filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) || item.category.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "all" || item.type === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black">Menu Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">Item performance, category breakdown, and product insights</p>
      </div>

      <AnalyticsToolbar period={period} onPeriodChange={setPeriod} />

      {loading ? (
        <div className="h-64 bg-muted/40 border rounded-xl animate-pulse" />
      ) : data ? (
        <>
          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border bg-card shadow-sm">
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Items Sold</span>
              <p className="text-2xl font-black mt-1 text-foreground">{data.totalItemsSold.toLocaleString()}</p>
            </div>
            <div className="p-4 rounded-xl border bg-card shadow-sm">
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Menu Revenue</span>
              <p className="text-2xl font-black mt-1 text-amber-600 dark:text-amber-400">{formatETB(data.menuRevenue)}</p>
            </div>
            <div className="p-4 rounded-xl border bg-card shadow-sm">
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Best Seller</span>
              <p className="text-lg font-black mt-1 truncate text-foreground">{data.bestSeller || "—"}</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search menu or category..."
                className="w-full h-9 pl-9 pr-4 rounded-lg border bg-background text-sm font-medium"
              />
            </div>
            <div className="flex gap-1.5">
              {(["all", "prepared", "retail"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    filter === f ? "bg-amber-500 text-white" : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f === "all" ? "All Items" : f === "prepared" ? "Kitchen Menu" : "Retail Shop"}
                </button>
              ))}
            </div>
          </div>

          {/* Item Performance Table */}
          <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-wider text-muted-foreground">Item</th>
                    <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-wider text-muted-foreground">Category</th>
                    <th className="text-right px-4 py-3 text-[10px] font-black uppercase tracking-wider text-muted-foreground">Units</th>
                    <th className="text-right px-4 py-3 text-[10px] font-black uppercase tracking-wider text-muted-foreground">Revenue</th>
                    <th className="text-right px-4 py-3 text-[10px] font-black uppercase tracking-wider text-muted-foreground">Avg Price</th>
                    <th className="text-right px-4 py-3 text-[10px] font-black uppercase tracking-wider text-muted-foreground">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-bold text-foreground">{item.name}</td>
                      <td className="px-4 py-3 text-muted-foreground font-medium">{item.category}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-foreground">{item.unitsSold}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-amber-600 dark:text-amber-400">{formatETB(item.revenue)}</td>
                      <td className="px-4 py-3 text-right font-mono text-muted-foreground">{formatETB(item.avgPrice)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-amber-500 rounded-full" style={{ width: `${item.share}%` }} />
                          </div>
                          <span className="text-[10px] text-muted-foreground w-8 text-right font-semibold">{item.share.toFixed(0)}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredItems.length === 0 && (
              <div className="p-8 text-center text-muted-foreground text-sm font-medium">
                No menu items match the selected filter for this period.
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
