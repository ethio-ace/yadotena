"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { MenuItem, MenuCategory } from "@/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, ShoppingBag, PackageCheck } from "lucide-react";
import { formatETB } from "@/lib/currency";
import { getImageUrl } from "@/lib/utils";
import { ItemDetailModal } from "@/components/customer/ItemDetailModal";

// Helper function to check if item is a packaged retail product
export const isRetailProduct = (item: MenuItem): boolean => {
  const cat = (item.category || "").toLowerCase();
  const catId = item.categoryId || "";
  return (
    item.id.startsWith("shop-") ||
    catId.startsWith("cat-shop") ||
    cat.includes("shop") ||
    cat.includes("tomoca") ||
    cat.includes("pack") ||
    cat.includes("butter") ||
    cat.includes("honey") ||
    cat.includes("spice") ||
    cat.includes("powder") ||
    cat.includes("retail")
  );
};

export default function ShopPage() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [selectedProduct, setSelectedProduct] = useState<MenuItem | null>(null);

  const { data: menu = [], isLoading: isMenuLoading } = useQuery({
    queryKey: ["menu"],
    queryFn: api.menu.getAll,
  });

  const { data: dbCategories = [] } = useQuery<MenuCategory[]>({
    queryKey: ["categories"],
    queryFn: api.categories.getAll,
  });

  // Filter database categories relevant to over-the-counter packaged retail products
  const shopDbCategories = dbCategories.filter((cat) => {
    const isShopId = cat.id.startsWith("cat-shop");
    const isShopName =
      cat.name.toLowerCase().includes("shop") ||
      cat.name.toLowerCase().includes("tomoca") ||
      cat.name.toLowerCase().includes("coffee") ||
      cat.name.toLowerCase().includes("butter") ||
      cat.name.toLowerCase().includes("dairy") ||
      cat.name.toLowerCase().includes("honey") ||
      cat.name.toLowerCase().includes("spice");

    const hasShopItems = menu.some(
      (item) => item.categoryId === cat.id && isRetailProduct(item)
    );

    return isShopId || isShopName || hasShopItems;
  });

  // Dynamic category list from database
  const categoryFilterList = [
    { id: "All", name: "All Packaged Products", icon: "📦" },
    ...shopDbCategories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      icon: cat.icon || "🛒",
    })),
  ];

  // Filter shop products (only over-the-counter packaged goods)
  const shopProducts = menu.filter((item) => {
    const isAvailable = item.available !== false;
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      (item.description || "").toLowerCase().includes(search.toLowerCase());

    const isRetail = isRetailProduct(item);

    let matchesCategory = activeCategory === "All";
    if (!matchesCategory) {
      matchesCategory =
        item.categoryId === activeCategory || item.category === activeCategory;
    }

    return isAvailable && isRetail && matchesSearch && matchesCategory;
  });

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-300">
      
      {/* Storefront Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden border border-muted-foreground/15 shadow-xl bg-gradient-to-br from-amber-600/15 via-primary/10 to-background p-6 md:p-10 flex flex-col justify-end min-h-[190px]">
        <div className="relative z-10 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-extrabold px-3 py-1 text-xs">
              <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block mr-1.5 animate-pulse" />
              Over-The-Counter Packaged Goods
            </Badge>
            <Badge variant="secondary" className="bg-background/80 backdrop-blur-md font-bold px-3 py-1 text-xs">
              ☕ Tomoca Ground Coffee & Sealed Jars
            </Badge>
          </div>

          <div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-foreground flex items-center gap-2">
              <ShoppingBag className="h-8 w-8 text-primary" />
              Yadotena Retail Storefront
            </h1>
            <p className="text-muted-foreground text-sm md:text-base mt-1 font-medium max-w-2xl">
              Authentic packaged sellable products to take home: Tomoca ground coffee packs, roasted coffee beans, sealed Niter Kibbeh butter jars, Ayib cheese tubs, wild honey jars & Berbere spice pouches.
            </p>
          </div>
        </div>
      </div>

      {/* Search & Dynamic Database Category Navigation */}
      <div className="space-y-4">
        <div className="relative max-w-2xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search Tomoca ground coffee, roasted beans, butter jars, honey..."
            className="pl-12 h-12 rounded-2xl bg-card border-muted-foreground/20 text-sm shadow-sm focus-visible:ring-primary"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground hover:text-foreground bg-muted px-2 py-1 rounded-md"
            >
              Clear
            </button>
          )}
        </div>

        {/* Dynamic Database Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none pt-1">
          {categoryFilterList.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-black whitespace-nowrap transition-all duration-200 ${
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
      </div>

      {/* Products Grid */}
      {isMenuLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-72 bg-muted/60 rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {shopProducts.map((product) => (
            <Card
              key={product.id}
              onClick={() => setSelectedProduct(product)}
              className="overflow-hidden cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-muted-foreground/15 bg-card flex flex-col justify-between rounded-3xl group"
            >
              {/* Product Image */}
              <div className="relative h-48 w-full bg-muted overflow-hidden">
                <img
                  src={getImageUrl(product.image)}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <Badge className="absolute top-3 left-3 bg-background/90 backdrop-blur-md text-foreground font-bold text-[10px] px-2.5 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                  <PackageCheck className="h-3 w-3 text-emerald-500" />
                  <span>Packaged Goods</span>
                </Badge>

                <Badge className="absolute bottom-3 right-3 bg-emerald-500 text-white font-bold text-[10px] px-2 py-0.5 rounded-full shadow-sm">
                  In Stock
                </Badge>
              </div>

              {/* Product Info */}
              <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors line-clamp-1">
                    {product.name}
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
                    {product.description || "Authentic over-the-counter packaged product."}
                  </p>
                </div>

                <div className="pt-3 border-t border-muted/50 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-muted-foreground font-bold uppercase block">Retail Unit Price</span>
                    <span className="font-black text-lg text-primary">{formatETB(product.price)}</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}

          {shopProducts.length === 0 && (
            <div className="col-span-full py-16 text-center text-muted-foreground space-y-3 bg-card/40 rounded-3xl border border-dashed p-8">
              <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mx-auto text-2xl">
                📦
              </div>
              <h3 className="text-lg font-bold text-foreground">No retail packaged products found</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                We couldn't find any packaged retail items matching your selection.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setActiveCategory("All");
                }}
                className="text-xs font-bold text-primary underline"
              >
                Reset Store Filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Product Detail Modal */}
      <ItemDetailModal
        item={selectedProduct}
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />
    </div>
  );
}
