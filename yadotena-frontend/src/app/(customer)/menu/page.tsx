"use client";

import { useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { MenuItem } from "@/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Clock, Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ItemDetailModal } from "@/components/customer/ItemDetailModal";
import { SortSelect, sortCatalogItems, SortKey } from "@/components/customer/SortSelect";
import { TopProductsRow } from "@/components/customer/TopProductsRow";
import { formatETB } from "@/lib/currency";
import { getImageUrl } from "@/lib/utils";
import { isRetailProduct } from "@/lib/orderUtils";

function MenuContent() {
  const { data: menu, isLoading: isMenuLoading } = useQuery({
    queryKey: ["menu"],
    queryFn: api.menu.getAll,
  });

  const { data: dynamicCategories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: api.categories.getAll,
  });

  const { data: popularItems = [] } = useQuery({
    queryKey: ["menu", "popular"],
    queryFn: () => api.menu.getPopular(8),
  });

  const searchParams = useSearchParams();
  const initialCategoryParam = searchParams.get("category");

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState(initialCategoryParam || "All");
  const [prevCategoryParam, setPrevCategoryParam] = useState<string | null>(initialCategoryParam);
  const [sort, setSort] = useState<SortKey>("popularity");
  const [selectedItemForModal, setSelectedItemForModal] = useState<MenuItem | null>(null);

  // Keep the category in sync when the ?category= query param changes while mounted.
  if (prevCategoryParam !== initialCategoryParam) {
    setPrevCategoryParam(initialCategoryParam);
    setActiveCategory(initialCategoryParam || "All");
  }

  // Top sellers: from real order counts, falling back to "Popular"/"Favorite" tagged dishes.
  const topDishes = useMemo(() => {
    const popular = popularItems
      .filter(p => !isRetailProduct(p) && p.available !== false)
      .slice(0, 8);
    if (popular.length >= 3) return popular;
    const fallback = (menu || [])
      .filter(m => !isRetailProduct(m) && m.available !== false)
      .filter(m => m.dietaryTags?.some(t => /popular|favorite/i.test(t)))
      .slice(0, 8);
    return fallback.length > 0 ? fallback : (menu || []).filter(m => !isRetailProduct(m)).slice(0, 6);
  }, [popularItems, menu]);

  const filteredMenu = useMemo(() => {
    const cooked = (menu || []).filter(m => {
      const isAvailable = m.available !== false;
      const isCookedDish = !isRetailProduct(m);
      const matchesSearch = m.name.toLowerCase().includes(search.toLowerCase()) ||
                            m.description.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = activeCategory === "All" || m.category === activeCategory;
      return isAvailable && isCookedDish && matchesSearch && matchesCategory;
    });
    return sortCatalogItems(cooked, sort);
  }, [menu, search, activeCategory, sort]);

  if (isMenuLoading) {
    return (
      <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6 animate-pulse">
        <div className="h-56 bg-muted/60 rounded-3xl w-full"></div>
        <div className="h-12 bg-muted/60 rounded-2xl w-full"></div>
        <div className="flex gap-2"><div className="h-9 w-24 bg-muted/60 rounded-full"></div></div>
        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-80 bg-muted/60 rounded-3xl w-full"></div>)}
        </div>
      </div>
    );
  }

  // Combine dynamic categories with any categories present on menu items
  const categoryNamesFromMenu = Array.from(new Set(menu?.map(m => m.category || "General") || []));
  const combinedCategoryList = [
    { name: "All", icon: "✨" },
    ...dynamicCategories.map(c => ({ name: c.name, icon: c.icon || "🍽️" })),
    ...categoryNamesFromMenu
      .filter(cn => cn && !dynamicCategories.some(dc => dc.name === cn))
      .map(cn => ({ name: cn, icon: "🍽️" }))
  ];

  const hasFilters = search !== "" || activeCategory !== "All" || sort !== "popularity";

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-500">

      {/* Restaurant Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden border border-muted-foreground/15 shadow-md bg-gradient-to-br from-amber-600/10 via-primary/5 to-background p-6 md:p-8 flex flex-col justify-end min-h-[170px]">
        <div className="relative z-10 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold px-3 py-0.5 text-xs">
              <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block mr-1.5 animate-pulse" />
              Open Now
            </Badge>
            <Badge variant="secondary" className="bg-background/80 backdrop-blur-md font-semibold px-2.5 py-0.5 text-xs">
              <Clock className="h-3 w-3 mr-1 text-primary" />
              15-25 min avg prep
            </Badge>
          </div>

          <div className="flex items-start gap-3">
            <img
              src="/icon.svg"
              alt="Yadotena"
              className="h-12 w-12 md:h-14 md:w-14 rounded-2xl shadow-md shadow-primary/20 shrink-0"
            />
            <div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-foreground">
                Explore the Yadotena Café
              </h1>
              <p className="text-muted-foreground text-xs md:text-sm mt-0.5 font-medium max-w-xl">
                Farm-fresh dairy, artisan kitchen meals, coffees &amp; teas, and over-the-counter retail — all in one menu.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Sellers */}
      {topDishes.length > 0 && (
        <TopProductsRow
          items={topDishes}
          title="Top Dishes"
          subtitle="What everyone is ordering right now"
          onSelect={setSelectedItemForModal}
        />
      )}

      {/* Search, Sort & Category Filter Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search our delicious dishes, coffee, drinks..."
              className="pl-12 h-14 rounded-2xl bg-card border-muted-foreground/15 text-base shadow-sm focus-visible:ring-primary"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground hover:text-foreground bg-muted px-2 py-1 rounded-md"
              >
                Clear
              </button>
            )}
          </div>
          <SortSelect value={sort} onChange={setSort} />
        </div>

        {/* Scrollable Category Filter Pills */}
        <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none pt-1">
          {combinedCategoryList.map((cat) => {
            const isActive = activeCategory === cat.name;
            return (
              <button
                key={cat.name}
                type="button"
                onClick={() => setActiveCategory(cat.name)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all duration-200 ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 scale-105"
                    : "bg-card border border-muted hover:border-muted-foreground/30 text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>

        {/* Result count / active filters */}
        <div className="flex items-center justify-between text-[11px] text-muted-foreground font-semibold px-1">
          <span>{filteredMenu.length} {filteredMenu.length === 1 ? "dish" : "dishes"}</span>
          {hasFilters && (
            <button
              type="button"
              onClick={() => { setSearch(""); setActiveCategory("All"); setSort("popularity"); }}
              className="text-primary underline-offset-2 hover:underline font-bold"
            >
              Reset filters
            </button>
          )}
        </div>
      </div>

      {/* Menu Grid */}
      <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {filteredMenu.map((item) => (
          <MenuItemCard
            key={item.id}
            item={item}
            onOpenModal={() => setSelectedItemForModal(item)}
          />
        ))}

        {filteredMenu.length === 0 && (
          <div className="text-center py-16 text-muted-foreground col-span-full space-y-3 bg-card/40 rounded-3xl border border-dashed p-8">
            <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mx-auto text-2xl">
              🔍
            </div>
            <h3 className="text-lg font-bold text-foreground">No dishes found</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              We couldn&apos;t find any dishes matching &quot;{search}&quot;. Try searching for something else or browse categories.
            </p>
            <Button variant="outline" size="sm" className="rounded-full" onClick={() => { setSearch(""); setActiveCategory("All"); setSort("popularity"); }}>
              Reset Filters
            </Button>
          </div>
        )}
      </div>

      {/* Item Detail Modal (view-only — customers cannot order) */}
      <ItemDetailModal
        item={selectedItemForModal}
        isOpen={!!selectedItemForModal}
        onClose={() => setSelectedItemForModal(null)}
      />
    </div>
  );
}

function MenuItemCard({ item, onOpenModal }: { item: MenuItem; onOpenModal: () => void }) {
  return (
    <Card
      onClick={onOpenModal}
      className="overflow-hidden cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-muted-foreground/15 bg-card/70 backdrop-blur-sm flex flex-col group rounded-3xl"
    >
      {/* Dish Cover Image */}
      <div className="relative h-48 w-full overflow-hidden bg-muted">
        <img
          src={getImageUrl(item.image)}
          alt={item.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />

        {/* Category Badge & Popular Tag */}
        <div className="absolute top-3 left-3 flex gap-1.5">
          <Badge variant="secondary" className="bg-background/85 backdrop-blur-md font-bold text-xs shadow-sm">
            {item.category}
          </Badge>
        </div>
        {item.dietaryTags?.some(t => /popular|favorite/i.test(t)) && (
          <Badge className="absolute top-3 right-3 bg-amber-500/95 text-white font-bold text-[10px] px-2 py-0.5 rounded-full shadow-sm gap-0.5">
            <Star className="h-2.5 w-2.5 fill-current" />
            Popular
          </Badge>
        )}

        <div className="absolute bottom-3 right-3">
          <Badge variant="secondary" className="bg-background/85 backdrop-blur-md font-semibold text-[11px] flex items-center gap-1 shadow-sm">
            <Clock className="h-3 w-3 text-primary" />
            15m
          </Badge>
        </div>
      </div>

      {/* Dish Information */}
      <div className="p-5 flex flex-col flex-1 justify-between space-y-4">
        <div className="space-y-1.5">
          <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors line-clamp-1">
            {item.name}
          </h3>
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {item.description}
          </p>

          {item.dietaryTags && item.dietaryTags.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {item.dietaryTags.slice(0, 2).map((tag) => (
                <span key={tag} className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full border border-primary/20">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Price Tag */}
        <div className="pt-3 border-t border-muted/50 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-muted-foreground block font-bold uppercase">Price</span>
            <span className="font-black text-xl text-primary">{formatETB(item.price)}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function MenuPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground animate-pulse font-medium">Loading menu...</div>}>
      <MenuContent />
    </Suspense>
  );
}
