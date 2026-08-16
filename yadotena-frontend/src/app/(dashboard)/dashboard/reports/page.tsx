"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { MenuItem } from "@/types";
import { DateRangeSelector } from "@/components/owner/DateRangeSelector";
import { DrilldownTrend } from "@/components/owner/DrilldownTrend";
import { MenuItemModal } from "@/components/dashboard/MenuItemModal";
import { CategoryManageModal } from "@/components/dashboard/CategoryManageModal";
import { useOwnerOps } from "@/hooks/useOwnerOps";
import { computeSalesBreakdown, OwnerRange } from "@/lib/owner";
import { formatETB } from "@/lib/currency";
import { cn } from "@/lib/utils";
import {
  Wallet,
  Receipt,
  TrendingUp,
  Banknote,
  Coffee,
  ShoppingBag,
  Search,
  BarChart3,
  Tag,
  Layers,
  Store,
  Plus,
  Pencil,
} from "lucide-react";

const RANGE_KEYS: OwnerRange[] = ["today", "yesterday", "week", "month", "quarter", "year", "all"];

function SalesReports() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qRange = searchParams.get("range") as OwnerRange | null;
  const rangeKey: OwnerRange = qRange && RANGE_KEYS.includes(qRange) ? qRange : "today";

  const { metrics, orders, menuItems, isLoading } = useOwnerOps(rangeKey);

  const [editingProduct, setEditingProduct] = useState<MenuItem | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  const queryClient = useQueryClient();
  const menuItemById = useMemo(
    () => new Map(menuItems.map((m) => [m.id, m])),
    [menuItems]
  );

  const toggleAvailability = useMutation({
    mutationFn: api.menu.toggleAvailability,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["menu"] }),
  });

  const openProductEditor = (item: MenuItem | null) => {
    setEditingProduct(item);
    setShowProductModal(true);
  };

  const breakdown = useMemo(
    () => computeSalesBreakdown({ range: metrics.range, orders, menuItems }),
    // metrics.range is rebuilt each render; key on the stable pieces instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rangeKey, orders, menuItems]
  );

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("All");
  const [channel, setChannel] = useState<"ALL" | "MENU" | "RETAIL">("ALL");

  const setRange = (r: OwnerRange) => {
    router.replace(`/dashboard/reports?range=${r}`);
  };

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    return breakdown.products.filter((p) => {
      if (category !== "All" && p.category !== category) return false;
      if (channel === "MENU" && p.isRetail) return false;
      if (channel === "RETAIL" && !p.isRetail) return false;
      if (term && !p.name.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [breakdown.products, search, category, channel]);

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
            Sales &amp; Products
          </h1>
          <p className="text-xs text-muted-foreground font-medium mt-1">
            What sold in this period · {metrics.range.display}
          </p>
        </div>
        <DateRangeSelector value={rangeKey} onChange={setRange} />
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 bg-muted/40 border rounded-2xl animate-pulse" />
            ))}
          </div>
          <div className="h-72 bg-muted/40 border rounded-2xl animate-pulse" />
        </div>
      ) : (
        <>
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
            </div>
          </div>

          {/* Trend + mix */}
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <DrilldownTrend
                key={`${metrics.range.from}-${metrics.range.to}`}
                orders={orders}
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

          {/* Product performance */}
          <div className="bg-card border rounded-2xl p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <div>
                  <h3 className="font-black text-sm text-foreground">Product Performance</h3>
                  <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
                    Units sold and revenue per product — click a row to edit
                  </p>
                </div>
                <button
                  onClick={() => openProductEditor(null)}
                  className="h-9 px-3.5 rounded-xl bg-amber-500 text-white font-black text-xs flex items-center gap-1.5 hover:bg-amber-600 transition-colors shadow-sm"
                >
                  <Plus className="h-4 w-4" />
                  Add Product
                </button>
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

                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="h-9 rounded-xl border bg-background px-2.5 text-xs font-bold outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50"
                  aria-label="Filter by category"
                >
                  <option value="All">All categories</option>
                  {breakdown.categories.map((c) => (
                    <option key={c.category} value={c.category}>
                      {c.category}
                    </option>
                  ))}
                </select>

                <div className="flex items-center gap-1 p-1 bg-muted/50 border rounded-xl">
                  {(["ALL", "MENU", "RETAIL"] as const).map((c) => (
                    <button
                      key={c}
                      onClick={() => setChannel(c)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all",
                        channel === c ? "bg-card text-foreground border shadow-sm" : "text-muted-foreground border border-transparent"
                      )}
                    >
                      {c === "ALL" ? "All" : c === "MENU" ? "Menu" : "Retail"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {filteredProducts.length === 0 ? (
              <div className="py-14 text-center space-y-1.5">
                <Tag className="h-6 w-6 mx-auto text-muted-foreground opacity-50" />
                <p className="text-xs font-bold text-muted-foreground">
                  No products match{breakdown.products.length === 0 ? " — no paid sales in this period" : ""}.
                </p>
                {breakdown.products.length > 0 && (
                  <button
                    onClick={() => {
                      setSearch("");
                      setCategory("All");
                      setChannel("ALL");
                    }}
                    className="text-[11px] font-bold text-primary underline"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="mt-4 hidden md:block overflow-x-auto rounded-xl border">
                  <table className="w-full text-xs text-left">
                    <thead className="text-[10px] font-black text-muted-foreground uppercase bg-muted/50 border-b">
                      <tr>
                        <th className="px-4 py-3">#</th>
                        <th className="px-4 py-3">Product</th>
                        <th className="px-4 py-3">Category</th>
                        <th className="px-4 py-3">Channel</th>
                        <th className="px-4 py-3 text-right">Units Sold</th>
                        <th className="px-4 py-3 text-right">Orders</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredProducts.map((p, idx) => {
                        const mi = menuItemById.get(p.menuItemId);
                        const isToggling = toggleAvailability.isPending && toggleAvailability.variables === mi?.id;
                        return (
                          <tr
                            key={p.menuItemId}
                            onClick={() => mi && openProductEditor(mi)}
                            className={cn(
                              "transition-colors",
                              mi ? "cursor-pointer hover:bg-muted/40" : "hover:bg-muted/20"
                            )}
                          >
                            <td className="px-4 py-3 text-muted-foreground font-bold">{idx + 1}</td>
                            <td className="px-4 py-3 font-black text-foreground flex items-center gap-2">
                              <span className="truncate">{p.name}</span>
                              {mi && <Pencil className="h-3 w-3 text-muted-foreground opacity-40 shrink-0" />}
                            </td>
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
                            <td className="px-4 py-3">
                              {mi && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleAvailability.mutate(mi.id);
                                  }}
                                  disabled={isToggling}
                                  className={cn(
                                    "px-2 py-1 rounded-full text-[10px] font-black border flex items-center gap-1.5 transition-colors",
                                    mi.available
                                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                                      : "bg-muted text-muted-foreground border-border hover:text-foreground"
                                  )}
                                >
                                  <span
                                    className={cn(
                                      "h-1.5 w-1.5 rounded-full",
                                      mi.available ? "bg-emerald-500" : "bg-muted-foreground"
                                    )}
                                  />
                                  {isToggling ? "…" : mi.available ? "Available" : "Out"}
                                </button>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right font-black text-primary text-sm">{formatETB(p.revenue)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="mt-4 space-y-2 md:hidden">
                  {filteredProducts.map((p, idx) => {
                    const mi = menuItemById.get(p.menuItemId);
                    const isToggling = toggleAvailability.isPending && toggleAvailability.variables === mi?.id;
                    return (
                      <div
                        key={p.menuItemId}
                        onClick={() => mi && openProductEditor(mi)}
                        className={cn(
                          "flex items-center justify-between gap-3 p-3.5 rounded-xl border bg-background/50",
                          mi && "cursor-pointer active:scale-[0.995] transition-transform"
                        )}
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-black text-foreground truncate">
                            {idx + 1}. {p.name}
                          </p>
                          <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
                            {p.category} · {p.units} sold · {p.orderCount} orders
                          </p>
                          {mi && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleAvailability.mutate(mi.id);
                              }}
                              disabled={isToggling}
                              className={cn(
                                "mt-1.5 px-2 py-0.5 rounded-full text-[9px] font-black border flex items-center gap-1.5",
                                mi.available
                                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                  : "bg-muted text-muted-foreground border-border"
                              )}
                            >
                              <span className={cn("h-1.5 w-1.5 rounded-full", mi.available ? "bg-emerald-500" : "bg-muted-foreground")} />
                              {isToggling ? "…" : mi.available ? "Available" : "Out"}
                            </button>
                          )}
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
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Category performance */}
          <div className="bg-card border rounded-2xl p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-black text-sm text-foreground">Category Performance</h3>
                <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
                  Revenue per category for the period
                </p>
              </div>
              <button
                onClick={() => setShowCategoryModal(true)}
                className="h-8 px-3 rounded-xl border text-[11px] font-bold text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors flex items-center gap-1.5"
              >
                <Layers className="h-3.5 w-3.5" />
                Manage Categories
              </button>
            </div>
            {breakdown.categories.length === 0 ? (
              <p className="text-xs text-muted-foreground mt-5">No sales to rank in this period.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {breakdown.categories.map((c) => {
                  const pct = breakdown.categories[0].revenue > 0 ? (c.revenue / breakdown.categories[0].revenue) * 100 : 0;
                  return (
                    <div key={c.category}>
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-foreground">{c.category}</span>
                        <span className="text-muted-foreground">
                          {c.units} units · {formatETB(c.revenue)}
                        </span>
                      </div>
                      <div className="mt-1.5 h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-amber-500/70 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Payment mix footnote strip */}
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
      )}

      {/* Product editor (create + edit) */}
      {showProductModal && (
        <MenuItemModal
          isOpen={showProductModal}
          onClose={() => {
            setShowProductModal(false);
            setEditingProduct(null);
          }}
          itemToEdit={editingProduct}
        />
      )}

      {/* Category manager */}
      {showCategoryModal && (
        <CategoryManageModal isOpen onClose={() => setShowCategoryModal(false)} />
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
      <SalesReports />
    </Suspense>
  );
}
