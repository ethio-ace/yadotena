"use client";

import { useId, useMemo, useState } from "react";
import { DateRange, computePopularityTrend } from "@/lib/owner";
import { MenuItem, Order } from "@/types";
import { formatETB } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { TrendingUp, Search, Coffee, ShoppingBag } from "lucide-react";

function Sparkline({ values, max, gradientId }: { values: number[]; max: number; gradientId: string }) {
  if (values.length < 2 || max <= 0) {
    return (
      <div className="flex h-8 items-center text-[10px] text-muted-foreground font-semibold">
        No sales in period
      </div>
    );
  }
  const w = 180;
  const h = 40;
  const step = w / (values.length - 1);
  const pts = values.map((v, i) => `${(i * step).toFixed(1)},${(h - 4 - (v / max) * (h - 10)).toFixed(1)}`);
  const area = `0,${h} ${pts.join(" ")} ${w},${h}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-10 w-full max-w-[180px]" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.25" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${gradientId})`} />
      <polyline points={pts.join(" ")} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

type ChannelFilter = "ALL" | "MENU" | "RETAIL";

export function PopularityReport({
  range,
  orders,
  menuItems,
}: {
  range: DateRange;
  orders: Order[];
  menuItems: MenuItem[];
}) {
  const { rows, bucketLabel } = useMemo(
    () => computePopularityTrend({ range, orders, menuItems }),
    [range, orders, menuItems]
  );

  const [search, setSearch] = useState("");
  const [channel, setChannel] = useState<ChannelFilter>("ALL");

  const gradientId = useId();

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((p) => {
      if (channel === "MENU" && p.isRetail) return false;
      if (channel === "RETAIL" && !p.isRetail) return false;
      if (
        term &&
        !p.name.toLowerCase().includes(term) &&
        !p.category.toLowerCase().includes(term)
      )
        return false;
      return true;
    });
  }, [rows, search, channel]);

  const maxUnits = filtered.length > 0 ? filtered[0].units : 0;

  return (
    <div className="bg-card border rounded-2xl p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-black text-sm text-foreground flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4 text-amber-500" /> Popularity Trends
          </h3>
          <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
            Every product sold in this period · {bucketLabel} buckets · {filtered.length} of {rows.length} shown
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products…"
              className="h-9 w-44 rounded-xl border bg-background pl-8 pr-3 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50"
            />
          </div>

          <div className="flex items-center gap-1 p-1 bg-muted/50 border rounded-xl">
            {(["ALL", "MENU", "RETAIL"] as const).map((c) => (
              <button
                key={c}
                onClick={() => setChannel(c)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1",
                  channel === c ? "bg-card text-foreground border shadow-sm" : "text-muted-foreground border border-transparent"
                )}
              >
                {c === "ALL" ? "All" : c === "MENU" ? <><Coffee className="h-3 w-3" /> Menu</> : <><ShoppingBag className="h-3 w-3" /> Retail</>}
              </button>
            ))}
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="py-14 text-center border border-dashed rounded-2xl mt-4">
          <TrendingUp className="h-6 w-6 mx-auto text-muted-foreground opacity-50" />
          <p className="text-xs font-bold text-muted-foreground mt-2">No paid sales in this period.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-14 text-center border border-dashed rounded-2xl mt-4">
          <Search className="h-6 w-6 mx-auto text-muted-foreground opacity-50" />
          <p className="text-xs font-bold text-muted-foreground mt-2">No products match your search.</p>
          <button
            onClick={() => {
              setSearch("");
              setChannel("ALL");
            }}
            className="mt-2 text-[11px] font-bold text-primary underline"
          >
            Clear search & filters
          </button>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {filtered.map((p, idx) => (
            <div
              key={p.menuItemId}
              className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border bg-background/50 p-3"
            >
              <div className="w-10 text-center">
                <span className="text-lg font-black text-muted-foreground/60">{idx + 1}</span>
              </div>
              <div className="min-w-0 flex-1 basis-44">
                <p className="text-sm font-black text-foreground truncate">{p.name}</p>
                <p className="text-[11px] text-muted-foreground font-medium">
                  {p.category}
                  <span
                    className={cn(
                      "ml-2 px-1.5 py-0.5 rounded-full text-[9px] font-black border",
                      p.isRetail
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                    )}
                  >
                    {p.isRetail ? "Retail" : "Menu"}
                  </span>
                </p>
              </div>
              <div className="text-amber-500">
                <Sparkline values={p.series.map((s) => s.units)} max={maxUnits} gradientId={gradientId} />
              </div>
              <div className="text-right shrink-0">
                <span className="block text-sm font-black">{p.units} sold</span>
                <span className="block text-[11px] text-muted-foreground font-semibold">{formatETB(p.revenue)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
