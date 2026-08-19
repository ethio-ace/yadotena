"use client";

import { useState, useEffect } from "react";
import { analytics, PeriodPreset, MenuAnalytics } from "@/services/analytics";
import { AnalyticsToolbar } from "@/components/analytics/AnalyticsToolbar";
import { formatETB } from "@/lib/currency";
import { Search, Coffee, ShoppingBag } from "lucide-react";

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
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "all" || item.type === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
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
            <div className="p-4 rounded-xl border bg-card">
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Items Sold</span>
              <p className="text-2xl font-black mt-1">{data.totalItemsSold.toLocaleString()}</p>
            </div>
            <div className="p-4 rounded-xl border bg-card">
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Menu Revenue</span>
              <p className="text-2xl font-black mt-1">{formatETB(data.menuRevenue)}</p>
            </div>
            <div className="p-4 rounded-xl border bg-card">
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Best Seller</span>
              <p className="text-lg font-black mt-1 truncate">{data.bestSeller || "—"}</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search items..."
                className="w-full h-9 pl-9 pr-4 rounded-lg border bg-background text-sm"
              />
            </div>
            <div className="flex gap-1.5">
              {(["all", "prepared", "retail"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    filter === f ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {f === "all" ? "All" : f === "prepared" ? "Menu" : "Retail"}
                </button>
              ))}
            </div>
          </div>

          {/* Item Performance Table */}
          <div className="rounded-xl border bg-card overflow-hidden">
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
                      <td className="px-4 py-3 font-bold">{item.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{item.category}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold">{item.unitsSold}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold">{formatETB(item.revenue)}</td>
                      <td className="px-4 py-3 text-right font-mono text-muted-foreground">{formatETB(item.avgPrice)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-foreground/60 rounded-full" style={{ width: `${item.share}%` }} />
                          </div>
                          <span className="text-[10px] text-muted-foreground w-8 text-right">{item.share.toFixed(0)}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredItems.length === 0 && (
              <div className="p-8 text-center text-muted-foreground text-sm">
                No items found for this period.
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
