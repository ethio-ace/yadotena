"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/services/api";
import { useShopCartStore } from "@/stores/shopCartStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatETB } from "@/lib/currency";
import { withExclusiveCart } from "@/lib/cart-guard";
import { EmptyState, ErrorState } from "@/components/ui/empty-state";
import { Plus, Search, ShoppingBag } from "lucide-react";

export default function ShopPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["products-catalog"],
    queryFn: () => api.products.getCatalog(),
  });
  const { data: settings, isSuccess: settingsReady } = useQuery({
    queryKey: ["public-settings"],
    queryFn: () => api.settings.getPublic(),
    staleTime: 60_000,
  });
  const acceptingOrders = settingsReady && settings?.accepting_orders !== false;

  const addProduct = useShopCartStore((s) => s.addProduct);
  const items = useShopCartStore((s) => s.items);
  const cartCount = items.reduce((n, i) => n + i.quantity, 0);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  const products = data?.items || [];
  const categories = data?.categories || [];

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return products.filter((p) => {
      if (!p.available) return false;
      const matchCat = category === "All" || p.category === category;
      const matchQ =
        !q ||
        (p.name || "").toLowerCase().includes(q) ||
        (p.description || "").toLowerCase().includes(q);
      return matchCat && matchQ;
    });
  }, [products, search, category]);

  const handleAdd = (p: (typeof products)[number]) => {
    withExclusiveCart("shop", () => addProduct(p));
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Retail shop</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Packaged dairy and pantry goods — pickup or delivery. Separate from
            the kitchen menu.{" "}
            <Link href="/menu" className="text-primary font-semibold underline-offset-2 hover:underline">
              Order kitchen dishes
            </Link>
          </p>
        </div>
        <Link href="/shop/checkout">
          <Button
            className="rounded-full font-bold gap-2"
            disabled={cartCount === 0 || !acceptingOrders}
          >
            <ShoppingBag className="h-4 w-4" />
            Checkout ({cartCount})
          </Button>
        </Link>
      </div>

      {!settingsReady ? null : !acceptingOrders ? (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          Online ordering is paused. You can browse products, but checkout is unavailable until staff reopen orders.
        </div>
      ) : null}

      {isError ? (
        <ErrorState
          title="Could not load products"
          description="Check that the API is reachable, then try again."
          onRetry={() => refetch()}
        />
      ) : (
        <>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products…"
              className="pl-11 h-12 rounded-2xl"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge
              variant={category === "All" ? "default" : "secondary"}
              className="cursor-pointer px-3 py-1"
              onClick={() => setCategory("All")}
            >
              All
            </Badge>
            {categories.map((c) => (
              <Badge
                key={c.id}
                variant={category === c.name ? "default" : "secondary"}
                className="cursor-pointer px-3 py-1"
                onClick={() => setCategory(c.name)}
              >
                {c.name}
              </Badge>
            ))}
          </div>

          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-48 rounded-2xl bg-muted" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              title={
                products.length === 0
                  ? "The retail catalog is empty right now"
                  : "No products match"
              }
              description={
                products.length === 0
                  ? "Check back shortly, or browse the kitchen menu."
                  : "Try another category or clear search."
              }
              action={
                products.length === 0 ? (
                  <Link href="/menu">
                    <Button variant="outline" size="sm" className="rounded-full">
                      Browse kitchen menu
                    </Button>
                  </Link>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    onClick={() => {
                      setSearch("");
                      setCategory("All");
                    }}
                  >
                    Reset filters
                  </Button>
                )
              }
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((p) => (
                <div
                  key={p.id}
                  className="rounded-2xl border bg-card overflow-hidden flex flex-col"
                >
                  {p.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.image}
                      alt=""
                      className="h-36 w-full object-cover"
                    />
                  ) : (
                    <div className="h-36 bg-muted" />
                  )}
                  <div className="p-4 flex flex-col flex-1 gap-2">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {p.category}
                    </div>
                    <h2 className="font-bold text-lg leading-tight">{p.name}</h2>
                    <p className="text-xs text-muted-foreground line-clamp-2 flex-1">
                      {p.description}
                    </p>
                    <div className="flex items-center justify-between pt-2">
                      <span className="font-black text-primary">{formatETB(p.price)}</span>
                      <Button
                        size="sm"
                        className="rounded-full"
                        type="button"
                        onClick={() => handleAdd(p)}
                      >
                        <Plus className="h-4 w-4 mr-1" /> Add
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
