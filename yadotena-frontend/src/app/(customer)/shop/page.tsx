"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { useCartStore } from "@/stores/cartStore";
import { MenuItem } from "@/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Minus, Search, ShoppingBag, Sparkles, PackageCheck, Truck, ShieldCheck, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { formatETB } from "@/lib/currency";
import { getImageUrl } from "@/lib/utils";
import Link from "next/link";
import Header from "@/components/layout/Header";

const DEFAULT_SHOP_ITEMS: MenuItem[] = [
  {
    id: "shop-milk-1l",
    name: "Fresh Whole Milk (1 Liter)",
    description: "Daily farm-fresh, pasteurized whole cow's milk in eco-glass bottle.",
    price: 60,
    category: "Shop & Groceries",
    image: "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=400&q=70",
    available: true,
    preparationTime: 5,
  },
  {
    id: "shop-ergo-500g",
    name: "Artisanal Spiced Ergo (500g)",
    description: "Traditional fermented Ethiopian yogurt infused with cardamom & black seed.",
    price: 90,
    category: "Shop & Groceries",
    image: "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=400&q=70",
    available: true,
    preparationTime: 5,
  },
  {
    id: "shop-honey-1kg",
    name: "Ethiopian Wild Organic Honey (1kg)",
    description: "100% pure raw forest honey harvested from Lalibela highlands.",
    price: 450,
    category: "Shop & Groceries",
    image: "https://images.unsplash.com/photo-1587049352847-4a222e784d38?auto=format&fit=crop&w=400&q=70",
    available: true,
    preparationTime: 5,
  },
  {
    id: "shop-cheese-250g",
    name: "Pasteurized Cottage Cheese / Ayib (250g)",
    description: "Creamy homemade Ayib cheese, perfect with mitmita and spinach.",
    price: 180,
    category: "Shop & Groceries",
    image: "https://images.unsplash.com/photo-1552767059-ce182ead8c1b?auto=format&fit=crop&w=400&q=70",
    available: true,
    preparationTime: 5,
  },
  {
    id: "shop-butter-500g",
    name: "Fresh Farm Butter / Kibbeh (500g)",
    description: "Churned fresh cow's butter from Debre Zeit dairy co-op.",
    price: 320,
    category: "Shop & Groceries",
    image: "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?auto=format&fit=crop&w=400&q=70",
    available: true,
    preparationTime: 5,
  },
  {
    id: "shop-ghee-1kg",
    name: "Spiced Clarified Butter / Niter Kibbeh (1kg)",
    description: "Traditional clarified butter slow-infused with korarima, koseret & garlic.",
    price: 650,
    category: "Shop & Groceries",
    image: "https://images.unsplash.com/photo-1627483262268-9c2b5b2834b5?auto=format&fit=crop&w=400&q=70",
    available: true,
    preparationTime: 5,
  },
  {
    id: "shop-coffee-500g",
    name: "Yirgacheffe Roast Coffee Beans (500g)",
    description: "Single-origin floral & citrus notes, freshly roasted in house.",
    price: 350,
    category: "Shop & Groceries",
    image: "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=400&q=70",
    available: true,
    preparationTime: 5,
  },
];

export default function ShopPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const addItem = useCartStore((state) => state.addItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const items = useCartStore((state) => state.items);

  const { data: dbMenu = [] } = useQuery({
    queryKey: ["menu"],
    queryFn: api.menu.getAll,
  });

  const dbShopItems = dbMenu.filter(
    (item) =>
      item.category?.toLowerCase().includes("shop") ||
      item.category?.toLowerCase().includes("dairy") ||
      item.category?.toLowerCase().includes("grocer")
  );

  const displayProducts = dbShopItems.length > 0 ? dbShopItems : DEFAULT_SHOP_ITEMS;

  const filteredProducts = displayProducts.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCartItem = (menuItemId: string) => {
    return items.find((i) => i.menuItemId === menuItemId);
  };

  const handleAddToCart = (product: MenuItem) => {
    addItem({
      menuItemId: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col pb-24">
      <Header />

      {/* Hero Banner */}
      <section className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-amber-950 text-emerald-50 px-4 sm:px-8 py-10 sm:py-14 border-b border-emerald-800/40">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-3 text-center md:text-left max-w-2xl">
            <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 px-3 py-1 text-xs font-black uppercase tracking-wider rounded-xl">
              🌾 Farm Direct Grocery & Dairy Shop
            </Badge>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
              Yadotena Retail Store
            </h1>
            <p className="text-sm sm:text-base text-emerald-200 font-medium">
              Order fresh pasteurized milk, artisanal ergo yogurt, highland wild honey, and authentic Ethiopian spices delivered straight to your home or table.
            </p>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-2 text-xs font-bold text-emerald-300">
              <span className="flex items-center gap-1.5 bg-emerald-900/60 px-3 py-1.5 rounded-xl border border-emerald-700/50">
                <Truck className="h-4 w-4 text-amber-400" /> Fast Express Delivery
              </span>
              <span className="flex items-center gap-1.5 bg-emerald-900/60 px-3 py-1.5 rounded-xl border border-emerald-700/50">
                <ShieldCheck className="h-4 w-4 text-emerald-400" /> 100% Organic & Pasteurized
              </span>
            </div>
          </div>

          <div className="flex gap-4">
            <Link href="/menu">
              <Button size="lg" className="rounded-2xl font-black text-xs bg-amber-500 hover:bg-amber-400 text-amber-950 gap-2 shadow-lg shadow-amber-500/20">
                <ShoppingBag className="h-4 w-4" /> Switch to Restaurant Menu
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Main Shop Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-8 w-full space-y-6">
        {/* Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card/60 p-4 rounded-3xl border shadow-sm backdrop-blur-sm">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search milk, honey, butter, spices..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-2xl h-11 pl-10 text-xs bg-muted/40 border-muted"
            />
          </div>

          <div className="text-xs font-bold text-muted-foreground flex items-center gap-2">
            <PackageCheck className="h-4 w-4 text-primary" />
            <span>Showing <strong className="text-foreground">{filteredProducts.length}</strong> Sellable Shop Items</span>
          </div>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => {
            const cartItem = getCartItem(product.id);
            const qty = cartItem ? cartItem.quantity : 0;

            return (
              <Card key={product.id} className="group overflow-hidden rounded-3xl border shadow-md hover:shadow-xl transition-all duration-300 flex flex-col bg-card">
                <div className="relative h-48 w-full overflow-hidden bg-muted">
                  <img
                    src={getImageUrl(product.image)}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 left-3">
                    <Badge className="bg-primary/90 text-primary-foreground font-black text-[10px] uppercase rounded-xl px-2.5 py-0.5 shadow-md">
                      Fresh Farm Pack
                    </Badge>
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-start">
                      <h3 className="font-black text-base text-foreground leading-snug group-hover:text-primary transition-colors">
                        {product.name}
                      </h3>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 font-medium">
                      {product.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-muted-foreground block uppercase tracking-wider">Price</span>
                      <span className="text-lg font-black text-primary">{formatETB(product.price)}</span>
                    </div>

                    {cartItem && qty > 0 ? (
                      <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 p-1 rounded-2xl">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            if (qty === 1) {
                              removeItem(cartItem.id);
                            } else {
                              updateQuantity(cartItem.id, qty - 1);
                            }
                          }}
                          className="h-8 w-8 rounded-xl hover:bg-primary/20"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </Button>
                        <span className="font-black text-xs w-5 text-center">{qty}</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => updateQuantity(cartItem.id, qty + 1)}
                          className="h-8 w-8 rounded-xl hover:bg-primary/20"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        onClick={() => handleAddToCart(product)}
                        className="rounded-2xl font-black text-xs h-9 px-4 bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 shadow-md shadow-primary/20"
                      >
                        <Plus className="h-4 w-4" /> Add to Cart
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
}
