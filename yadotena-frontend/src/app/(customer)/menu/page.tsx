"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
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
import { getImageUrl } from "@/lib/utils";
import Link from "next/link";

function MenuContent() {
  const { data: menu, isLoading: isMenuLoading } = useQuery({
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

  // Poll for live table/session orders
  const { data: allOrders } = useQuery({
    queryKey: ["orders"],
    queryFn: api.orders.getAll,
  });

  // Find active table session order if one is currently being prepared
  const activeSessionOrder = allOrders?.find((o) => {
    const isMatchingTable = tableId && o.tableId === tableId;
    const isMatchingOrderId = activeOrderId && o.id === activeOrderId;
    const isActiveStatus = o.status !== "COMPLETED" && o.status !== "CANCELLED";
    return (isMatchingTable || isMatchingOrderId) && isActiveStatus;
  });
  
  const setTableId = useCartStore((state) => state.setTableId);
  const searchParams = useSearchParams();
  const initialCategoryParam = searchParams.get("category");
  const tableParam = searchParams.get("table");

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState(initialCategoryParam || "All");
  const [selectedItemForModal, setSelectedItemForModal] = useState<MenuItem | null>(null);

  useEffect(() => {
    if (initialCategoryParam) {
      setActiveCategory(initialCategoryParam);
    }
  }, [initialCategoryParam]);

  useEffect(() => {
    if (tableParam) {
      setTableId(tableParam);
    }
  }, [tableParam, setTableId]);

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
  
  const filteredMenu = menu?.filter(m => {
    const isAvailable = m.available !== false;
    const matchesSearch = m.name.toLowerCase().includes(search.toLowerCase()) || 
                          m.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === "All" || m.category === activeCategory;
    return isAvailable && matchesSearch && matchesCategory;
  });

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
      
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
                  {tableId ? `Table ${tableId.replace("t", "")} Session` : "Your Active Order"}: <span className="text-primary">{activeSessionOrder.status}</span>
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
      <div className="relative rounded-3xl overflow-hidden border border-muted-foreground/15 shadow-md bg-gradient-to-br from-amber-600/10 via-primary/5 to-background p-6 md:p-8 flex flex-col justify-end min-h-[160px]">
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

          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-foreground">
              Yadotena Digital Menu Showcase
            </h1>
            <p className="text-muted-foreground text-xs md:text-sm mt-0.5 font-medium">
              Explore our farm-fresh dairy, artisanal kitchen meals, coffees, teas & craft beverages.
            </p>
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
        {filteredMenu?.map((item) => (
          <MenuItemCard 
            key={item.id} 
            item={item} 
            onOpenModal={() => setSelectedItemForModal(item)}
          />
        ))}

        {filteredMenu?.length === 0 && (
          <div className="text-center py-16 text-muted-foreground col-span-full space-y-3 bg-card/40 rounded-3xl border border-dashed p-8">
            <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mx-auto text-2xl">
              🔍
            </div>
            <h3 className="text-lg font-bold text-foreground">No dishes found</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              We couldn't find any dishes matching "{search}". Try searching for something else or browse categories.
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
          src={getImageUrl(item.image)} 
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
