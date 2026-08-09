"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { useCartStore } from "@/stores/cartStore";
import { MenuItem } from "@/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Minus, Search, Star, Clock, Sparkles, UtensilsCrossed, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ItemDetailModal } from "@/components/customer/ItemDetailModal";
import { formatETB } from "@/lib/currency";
import Link from "next/link";

const CATEGORY_ICONS: Record<string, string> = {
  All: "✨",
  "Main Course": "🍔",
  "Appetizers": "🍟",
  "Beverages": "☕",
  "Desserts": "🍰",
  "Pizza": "🍕",
  "Salads": "🥗",
};

export default function MenuPage() {
  const {
    data: menu = [],
    isLoading: isMenuLoading,
    isError: isMenuError,
    error: menuError,
    refetch: refetchMenu,
  } = useQuery({
    queryKey: ["menu"],
    queryFn: api.menu.getAll,
  });

  const { data: dynamicCategories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: api.categories.getAll,
  });

  const tableId = useCartStore((state) => state.tableId);
  const activeOrderId = useCartStore((state) => state.activeOrderId);
  const addItem = useCartStore((state) => state.addItem);

  const { data: tables = [] } = useQuery({
    queryKey: ["public-tables"],
    queryFn: api.tables.getAll,
  });

  // Poll the customer's own order via public track (no staff auth)
  const { data: trackedOrder } = useQuery({
    queryKey: ["orders", activeOrderId],
    queryFn: async () => {
      if (!activeOrderId) return null;
      return (await api.orders.getById(activeOrderId)) || null;
    },
    enabled: !!activeOrderId,
    refetchInterval: 3000,
  });

  const activeSessionOrder =
    trackedOrder && trackedOrder.status !== "COMPLETED" && trackedOrder.status !== "CANCELLED"
      ? trackedOrder
      : null;

  const tableName = tables.find((t) => t.id === tableId)?.name;
  
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [selectedItemForModal, setSelectedItemForModal] = useState<MenuItem | null>(null);

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
  const categoryNamesFromMenu = Array.from(new Set(menu.map((m) => m.category).filter(Boolean)));
  const combinedCategoryList = [
    { name: "All", icon: "✨" },
    ...dynamicCategories.map(c => ({ name: c.name, icon: c.icon || "🍽️" })),
    ...categoryNamesFromMenu
      .filter(cn => !dynamicCategories.some(dc => dc.name === cn))
      .map(cn => ({ name: cn, icon: CATEGORY_ICONS[cn] || "🍽️" }))
  ];
  
  const filteredMenu = menu.filter((m) => {
    const isAvailable = m.available !== false;
    const name = (m.name || "").toLowerCase();
    const description = (m.description || "").toLowerCase();
    const q = search.toLowerCase();
    const matchesSearch = name.includes(q) || description.includes(q);
    const matchesCategory = activeCategory === "All" || m.category === activeCategory;
    return isAvailable && matchesSearch && matchesCategory;
  });

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-500">

      {isMenuError && (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm space-y-2">
          <p className="font-semibold text-foreground">Could not load the menu</p>
          <p className="text-muted-foreground">
            {(menuError as Error)?.message || "Check that the API is reachable, then try again."}
          </p>
          <Button size="sm" variant="outline" onClick={() => refetchMenu()}>
            Retry
          </Button>
        </div>
      )}
      
      {/* Live Active Table Order Banner */}
      {activeSessionOrder && (
        <div className="bg-gradient-to-r from-amber-500/20 via-primary/15 to-amber-500/20 border border-primary/40 p-4 md:p-5 rounded-3xl backdrop-blur-md shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-3.5">
            <div className="h-12 w-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary shrink-0">
              <UtensilsCrossed className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base text-foreground">
                  {tableId ? `${tableName || "Table"} Session` : "Your Active Order"}: <span className="text-primary">{activeSessionOrder.status}</span>
                </span>
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block animate-ping" />
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {activeSessionOrder.items.length} items • Ticket #{activeSessionOrder.id.slice(-6).toUpperCase()} is currently in preparation
              </p>
            </div>
          </div>

          <Link href={`/order/${activeSessionOrder.id}`}>
            <Button size="sm" className="rounded-full font-bold shadow-md flex items-center gap-1.5 w-full sm:w-auto h-10 px-5">
              <span>View Live Tracker</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      )}

      {/* Restaurant Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden border border-muted-foreground/15 shadow-xl bg-gradient-to-br from-amber-600/20 via-primary/10 to-background p-6 md:p-10 flex flex-col justify-end min-h-[220px]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent opacity-60 pointer-events-none" />
        
        <div className="relative z-10 space-y-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold px-3 py-1 text-xs">
              <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block mr-1.5 animate-pulse" />
              Open Now
            </Badge>
            <Badge variant="secondary" className="bg-background/80 backdrop-blur-md font-semibold px-3 py-1 text-xs">
              <Clock className="h-3.5 w-3.5 mr-1 text-primary" />
              15-25 min avg prep
            </Badge>
            <Badge variant="secondary" className="bg-background/80 backdrop-blur-md font-semibold px-3 py-1 text-xs flex items-center text-amber-500">
              <Star className="h-3.5 w-3.5 fill-amber-500 mr-1" />
              4.9 (520+ reviews)
            </Badge>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
                Yadotena Milk & Foods
              </h1>
              <p className="text-muted-foreground text-sm md:text-base mt-1">
                Farm-fresh dairy, pure organic milk products, craft beverages & delicious kitchen foods.
              </p>
            </div>

            {tableId && (
              <div className="flex items-center gap-2 bg-primary/15 border border-primary/30 px-4 py-2 rounded-2xl self-start md:self-auto backdrop-blur-md shadow-sm">
                <UtensilsCrossed className="h-4 w-4 text-primary" />
                <span className="text-sm font-bold text-primary">{tableName || "Table"} · Dine-In</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search & Category Filter Section */}
      <div className="space-y-4">
        <div className="relative">
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

        {!isMenuError && filteredMenu.length === 0 && (
          <div className="text-center py-16 text-muted-foreground col-span-full space-y-3 bg-card/40 rounded-3xl border border-dashed p-8">
            <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mx-auto text-2xl">
              🔍
            </div>
            <h3 className="text-lg font-bold text-foreground">No dishes found</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              {search
                ? `We couldn't find any dishes matching "${search}". Try searching for something else or browse categories.`
                : "The menu is empty right now. Please check back shortly."}
            </p>
            <Button variant="outline" size="sm" className="rounded-full" onClick={() => { setSearch(""); setActiveCategory("All"); }}>
              Reset Filters
            </Button>
          </div>
        )}
      </div>

      {/* Item Customization Modal */}
      <ItemDetailModal
        item={selectedItemForModal}
        isOpen={!!selectedItemForModal}
        onClose={() => setSelectedItemForModal(null)}
        onAddToCart={(customItem) => addItem(customItem)}
      />
    </div>
  );
}

function MenuItemCard({ item, onOpenModal }: { item: MenuItem; onOpenModal: () => void }) {
  const addItem = useCartStore(state => state.addItem);
  const removeItem = useCartStore(state => state.removeItem);
  const updateQuantity = useCartStore(state => state.updateQuantity);
  const cartItems = useCartStore(state => state.items);
  
  // Find if item is already in cart
  const cartItem = cartItems.find(i => i.menuItemId === item.id);

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    addItem({
      menuItemId: item.id,
      name: item.name,
      price: item.price,
      quantity: 1,
    });
  };

  const handleIncrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (cartItem) {
      updateQuantity(cartItem.id, cartItem.quantity + 1);
    }
  };

  const handleDecrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (cartItem) {
      if (cartItem.quantity > 1) {
        updateQuantity(cartItem.id, cartItem.quantity - 1);
      } else {
        removeItem(cartItem.id);
      }
    }
  };

  return (
    <Card 
      onClick={onOpenModal}
      className="overflow-hidden cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-muted-foreground/15 bg-card/70 backdrop-blur-sm flex flex-col group rounded-3xl"
    >
      {/* Dish Cover Image */}
      <div className="relative h-48 w-full overflow-hidden bg-muted">
        <img 
          src={item.image} 
          alt={item.name} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
        />
        
        {/* Category Badge & Prep Time */}
        <div className="absolute top-3 left-3 flex gap-1.5">
          <Badge variant="secondary" className="bg-background/85 backdrop-blur-md font-bold text-xs shadow-sm">
            {item.category}
          </Badge>
        </div>

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
        
        {/* Price & Action Button */}
        <div className="flex items-center justify-between pt-3 border-t border-muted/50">
          <div>
            <span className="text-xs text-muted-foreground block font-medium">Price</span>
            <span className="font-black text-xl text-primary">{formatETB(item.price)}</span>
          </div>
          
          {cartItem ? (
            <div 
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-2 bg-muted/70 rounded-full p-1 border border-primary/20 shadow-inner"
            >
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-8 w-8 rounded-full hover:bg-background shadow-sm text-foreground" 
                onClick={handleDecrement}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className="font-bold text-sm w-4 text-center">{cartItem.quantity}</span>
              <Button 
                size="icon" 
                variant="default" 
                className="h-8 w-8 rounded-full shadow-md" 
                onClick={handleIncrement}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <Button 
              size="sm"
              className="rounded-full shadow-md font-bold px-4 h-9 hover:scale-105 transition-transform flex items-center gap-1.5" 
              onClick={handleQuickAdd}
            >
              <Plus className="h-4 w-4" />
              <span>Add</span>
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
