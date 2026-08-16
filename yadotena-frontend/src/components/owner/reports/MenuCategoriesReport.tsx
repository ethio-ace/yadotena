"use client";

import { useMemo } from "react";
import { SalesBreakdown } from "@/lib/owner";
import { formatETB } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { Tag, Coffee, ExternalLink, Layers } from "lucide-react";

/**
 * Menu & Categories report — read-only analytics for the owner. CRUD lives on
 * the operations pages (Café Menu / Add-ons), which are linked from here so
 * the analytics surface stays purely analytical.
 */
export function MenuCategoriesReport({
  breakdown,
  menuCount,
  categoryCount,
}: {
  breakdown: SalesBreakdown;
  menuCount: number;
  categoryCount: number;
}) {
  const maxCatRevenue = useMemo(
    () => (breakdown.categories.length > 0 ? breakdown.categories[0].revenue : 0),
    [breakdown.categories]
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-card border rounded-2xl p-4 shadow-sm">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Menu Items</p>
          <p className="mt-1 text-2xl font-black">{menuCount}</p>
          <p className="text-[11px] text-muted-foreground font-semibold">on the live menu</p>
        </div>
        <div className="bg-card border rounded-2xl p-4 shadow-sm">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Categories</p>
          <p className="mt-1 text-2xl font-black">{categoryCount}</p>
          <p className="text-[11px] text-muted-foreground font-semibold">active categories</p>
        </div>
        <div className="bg-card border rounded-2xl p-4 shadow-sm">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Products Sold</p>
          <p className="mt-1 text-2xl font-black">{breakdown.products.length}</p>
          <p className="text-[11px] text-muted-foreground font-semibold">with paid sales in period</p>
        </div>
        <div className="bg-card border rounded-2xl p-4 shadow-sm">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Retail Share</p>
          <p className="mt-1 text-2xl font-black">
            {(() => {
              const total = breakdown.menuVsRetail.menu + breakdown.menuVsRetail.retail;
              return total > 0 ? `${Math.round((breakdown.menuVsRetail.retail / total) * 100)}%` : "—";
            })()}
          </p>
          <p className="text-[11px] text-muted-foreground font-semibold">over-the-counter goods</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold">
          <Tag className="h-4 w-4 text-amber-500" />
          Ranks every product by units and revenue — no cost data exists, so no margin claims.
        </div>
        <a
          href="/dashboard/menu"
          className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 text-xs font-black text-white hover:bg-amber-600 transition-colors shadow-sm"
        >
          <Coffee className="h-4 w-4" />
          Manage Menu
          <ExternalLink className="h-3 w-3 opacity-70" />
        </a>
      </div>

      {breakdown.products.length === 0 ? (
        <div className="py-14 text-center border border-dashed rounded-2xl">
          <Tag className="h-6 w-6 mx-auto text-muted-foreground opacity-50" />
          <p className="text-xs font-bold text-muted-foreground mt-2">No paid sales in this period.</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto rounded-xl border bg-card">
            <table className="w-full text-xs text-left">
              <thead className="text-[10px] font-black text-muted-foreground uppercase bg-muted/50 border-b">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Channel</th>
                  <th className="px-4 py-3 text-right">Units Sold</th>
                  <th className="px-4 py-3 text-right">Orders</th>
                  <th className="px-4 py-3 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {breakdown.products.map((p, idx) => (
                  <tr key={p.menuItemId} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground font-bold">{idx + 1}</td>
                    <td className="px-4 py-3 font-black text-foreground">{p.name}</td>
                    <td className="px-4 py-3 text-muted-foreground font-medium">{p.category}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-black border",
                          p.isRetail
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                        )}
                      >
                        {p.isRetail ? "Retail" : "Menu"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-black">{p.units}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground font-semibold">{p.orderCount}</td>
                    <td className="px-4 py-3 text-right font-black text-primary text-sm">{formatETB(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-2 md:hidden">
            {breakdown.products.map((p, idx) => (
              <div key={p.menuItemId} className="flex items-center justify-between gap-3 p-3.5 rounded-xl border bg-card">
                <div className="min-w-0">
                  <p className="text-sm font-black truncate">
                    {idx + 1}. {p.name}
                  </p>
                  <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
                    {p.category} · {p.units} sold · {p.orderCount} orders
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="block text-sm font-black text-primary">{formatETB(p.revenue)}</span>
                  <span
                    className={cn(
                      "px-1.5 py-0.5 rounded-full text-[9px] font-black border",
                      p.isRetail
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                    )}
                  >
                    {p.isRetail ? "Retail" : "Menu"}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Category performance */}
          <div className="bg-card border rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-sm text-foreground flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-amber-500" /> Category Performance
              </h3>
              <a href="/dashboard/menu" className="text-[11px] font-bold text-primary hover:underline">
                Manage categories
              </a>
            </div>
            <div className="mt-4 space-y-3">
              {breakdown.categories.map((c) => {
                const pct = maxCatRevenue > 0 ? (c.revenue / maxCatRevenue) * 100 : 0;
                return (
                  <div key={c.category}>
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="flex items-center gap-1.5 text-foreground">
                        {c.category}
                        <span className="text-muted-foreground font-semibold">· {c.units} units</span>
                      </span>
                      <span className="text-muted-foreground">{formatETB(c.revenue)}</span>
                    </div>
                    <div className="mt-1.5 h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-amber-500/70 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
