"use client";

import { useState, useMemo } from "react";
import { MenuItem, MenuCategory, AddonItem, MenuItemAddon, Table, Order } from "@/types";
import { formatETB } from "@/lib/currency";
import { getApplicableAddonsForItem, isShopProductItem } from "@/lib/orderUtils";
import { ArrowLeft, Search, X, Minus, Plus, MessageSquare, ShoppingCart } from "lucide-react";

export interface CartItem {
  id: string;
  menuItemId: string;
  name: string;
  basePrice: number;
  quantity: number;
  addons: MenuItemAddon[];
  note: string;
}

interface CafeOrderBuilderProps {
  menu: MenuItem[];
  categories: MenuCategory[];
  allAddons: AddonItem[];
  tables: Table[];
  orders: Order[];
  isShopMode?: boolean;
  preselectedTable?: Table | null;
  appendToOrder?: Order | null;
  onBack: () => void;
  onSubmit: (items: CartItem[], tableId: string | undefined, orderType: "DINE_IN" | "TAKEAWAY", appendOrderId?: string) => void;
}

const NOTE_PRESETS = ["No Spicy", "Extra Hot", "No Onions", "Well Done", "Extra Sauce", "Separate Plate"];

export function CafeOrderBuilder({
  menu, categories, allAddons, tables, orders,
  isShopMode, preselectedTable, appendToOrder, onBack, onSubmit,
}: CafeOrderBuilderProps) {
  // Flow state
  const [orderType, setOrderType] = useState<"DINE_IN" | "TAKEAWAY">(preselectedTable ? "DINE_IN" : "DINE_IN");
  const [selectedTable, setSelectedTable] = useState<Table | null>(preselectedTable || null);
  const [showTablePicker, setShowTablePicker] = useState(!preselectedTable && !isShopMode);

  // Catalog state
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);

  // Addon sheet state
  const [configuringItem, setConfiguringItem] = useState<MenuItem | null>(null);
  const [sheetAddons, setSheetAddons] = useState<MenuItemAddon[]>([]);
  const [sheetNote, setSheetNote] = useState("");
  const [sheetQty, setSheetQty] = useState(1);

  // Filter menu
  const catalogItems = useMemo(() => {
    const base = isShopMode ? menu.filter(m => isShopProductItem(m)) : menu.filter(m => !isShopProductItem(m));
    let items = base.filter(m => m.available !== false);
    if (search) items = items.filter(m => m.name.toLowerCase().includes(search.toLowerCase()));
    if (activeCategory !== "All") items = items.filter(m => m.category === activeCategory || m.categoryId === activeCategory);
    return items;
  }, [menu, isShopMode, search, activeCategory]);

  const relevantCategories = useMemo(() => {
    const items = isShopMode ? menu.filter(m => isShopProductItem(m)) : menu.filter(m => !isShopProductItem(m));
    const catIds = new Set(items.map(m => m.categoryId || m.category));
    return categories.filter(c => catIds.has(c.id) || catIds.has(c.name));
  }, [menu, categories, isShopMode]);

  // Cart helpers
  const addToCart = (item: MenuItem) => {
    const applicableAddons = getApplicableAddonsForItem(item, allAddons);
    if (applicableAddons.length > 0 && !isShopMode) {
      setConfiguringItem(item);
      setSheetAddons([]);
      setSheetNote("");
      setSheetQty(1);
    } else {
      const existing = cart.find(c => c.menuItemId === item.id && c.addons.length === 0 && !c.note);
      if (existing) {
        setCart(cart.map(c => c.id === existing.id ? { ...c, quantity: c.quantity + 1 } : c));
      } else {
        setCart([...cart, { id: crypto.randomUUID(), menuItemId: item.id, name: item.name, basePrice: item.price, quantity: 1, addons: [], note: "" }]);
      }
    }
  };

  const confirmAddonSheet = () => {
    if (!configuringItem) return;
    setCart([...cart, {
      id: crypto.randomUUID(), menuItemId: configuringItem.id, name: configuringItem.name,
      basePrice: configuringItem.price, quantity: sheetQty, addons: [...sheetAddons], note: sheetNote,
    }]);
    setConfiguringItem(null);
  };

  const updateQty = (id: string, delta: number) => {
    setCart(cart.map(c => c.id === id ? { ...c, quantity: Math.max(1, c.quantity + delta) } : c));
  };

  const removeItem = (id: string) => setCart(cart.filter(c => c.id !== id));

  const itemTotal = (c: CartItem) => (c.basePrice + c.addons.reduce((s, a) => s + (a.price || 0), 0)) * c.quantity;
  const cartTotal = cart.reduce((s, c) => s + itemTotal(c), 0);
  const cartCount = cart.reduce((s, c) => s + c.quantity, 0);

  const handleSubmit = () => {
    if (cart.length === 0) return;
    if (orderType === "DINE_IN" && !selectedTable && !appendToOrder) {
      setShowTablePicker(true);
      return;
    }
    onSubmit(cart, selectedTable?.id, orderType, appendToOrder?.id);
  };

  // === TABLE PICKER STEP ===
  if (showTablePicker && !isShopMode) {
    return (
      <div className="p-4 sm:p-6 max-w-2xl mx-auto animate-in fade-in duration-200">
        <button onClick={onBack} className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <h1 className="text-xl font-bold mb-2">New Café Order</h1>

        {/* Order type */}
        <div className="flex gap-2 mb-5">
          <button onClick={() => setOrderType("DINE_IN")} className={`flex-1 h-14 rounded-xl text-sm font-bold border-2 transition-all ${orderType === "DINE_IN" ? "border-amber-600 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400" : "border-border"}`}>
            🍽️ Dine-in
          </button>
          <button onClick={() => { setOrderType("TAKEAWAY"); setSelectedTable(null); setShowTablePicker(false); }} className={`flex-1 h-14 rounded-xl text-sm font-bold border-2 transition-all ${orderType === "TAKEAWAY" ? "border-amber-600 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400" : "border-border"}`}>
            🛍️ Takeaway
          </button>
        </div>

        {orderType === "DINE_IN" && (
          <>
            <p className="text-sm text-muted-foreground mb-3">Select a table to start the order.</p>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {tables.map(t => {
                const hasOrder = orders.some(o => o.tableId === t.id && o.status !== "COMPLETED" && o.status !== "CANCELLED");
                return (
                  <button key={t.id} onClick={() => { setSelectedTable(t); setShowTablePicker(false); }}
                    className={`p-4 rounded-xl border-2 text-center font-bold text-sm transition-all active:scale-95 ${
                      t.status === "AVAILABLE" ? "border-emerald-400/50 hover:border-emerald-500" : "border-amber-400/50 hover:border-amber-500"
                    }`}>
                    <div>{t.name || t.id}</div>
                    <div className="text-xs font-normal text-muted-foreground mt-1">{t.capacity}p · {t.status === "AVAILABLE" ? "Open" : "Busy"}</div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    );
  }

  // === ADDON BOTTOM SHEET ===
  const addonSheet = configuringItem && (() => {
    const applicable = getApplicableAddonsForItem(configuringItem, allAddons);
    return (
      <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center" onClick={() => setConfiguringItem(null)}>
        <div className="bg-card w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl p-5 space-y-4 max-h-[80vh] overflow-y-auto animate-in slide-in-from-bottom-4 duration-200" onClick={e => e.stopPropagation()}>
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-bold">{configuringItem.name}</h3>
              <p className="text-sm text-muted-foreground">{formatETB(configuringItem.price)}</p>
            </div>
            <button onClick={() => setConfiguringItem(null)} className="p-1 text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
          </div>

          {applicable.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase text-muted-foreground">Add-ons</p>
              {applicable.map(a => {
                const selected = sheetAddons.some(s => s.id === a.id);
                return (
                  <button key={a.id} onClick={() => setSheetAddons(selected ? sheetAddons.filter(s => s.id !== a.id) : [...sheetAddons, a])}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border text-sm transition-colors ${selected ? "border-amber-500 bg-amber-50/50 dark:bg-amber-950/20" : "border-border hover:bg-accent/50"}`}>
                    <span className="font-medium">{a.name}</span>
                    <span className="text-muted-foreground">{a.price > 0 ? `+${formatETB(a.price)}` : "Free"}</span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="space-y-2">
            <p className="text-xs font-bold uppercase text-muted-foreground">Kitchen Note</p>
            <div className="flex flex-wrap gap-1.5">
              {NOTE_PRESETS.map(n => (
                <button key={n} onClick={() => setSheetNote(sheetNote === n ? "" : n)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${sheetNote === n ? "border-amber-500 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400" : "border-border hover:bg-accent/50"}`}>
                  {n}
                </button>
              ))}
            </div>
            <input value={sheetNote} onChange={e => setSheetNote(e.target.value)} placeholder="Custom note..." className="w-full h-10 px-3 rounded-xl border bg-background text-sm" />
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-3">
              <button onClick={() => setSheetQty(Math.max(1, sheetQty - 1))} className="h-10 w-10 rounded-lg border flex items-center justify-center hover:bg-accent/50"><Minus className="h-4 w-4" /></button>
              <span className="text-lg font-bold w-8 text-center">{sheetQty}</span>
              <button onClick={() => setSheetQty(sheetQty + 1)} className="h-10 w-10 rounded-lg border flex items-center justify-center hover:bg-accent/50"><Plus className="h-4 w-4" /></button>
            </div>
            <button onClick={confirmAddonSheet} className="h-12 px-6 rounded-xl bg-amber-600 text-white font-bold text-sm hover:bg-amber-700 active:scale-95 transition-all">
              Add {formatETB((configuringItem.price + sheetAddons.reduce((s, a) => s + (a.price || 0), 0)) * sheetQty)}
            </button>
          </div>
        </div>
      </div>
    );
  })();

  const brandColor = isShopMode ? "emerald" : "amber";

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] animate-in fade-in duration-200">
      {/* Top bar */}
      <div className="flex items-center gap-3 p-3 border-b bg-card shrink-0">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-accent/50"><ArrowLeft className="h-5 w-5" /></button>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-bold truncate">
            {appendToOrder ? `Adding to #${appendToOrder.id.slice(-6).toUpperCase()}` : isShopMode ? "Shop Sale" : "Café Order"}
          </h1>
          {selectedTable && <p className="text-xs text-muted-foreground">{selectedTable.name || selectedTable.id} · Dine-in</p>}
          {orderType === "TAKEAWAY" && !isShopMode && <p className="text-xs text-muted-foreground">Takeaway</p>}
        </div>
        {/* Mobile cart button */}
        <button onClick={() => setMobileCartOpen(true)} className="lg:hidden relative p-2 rounded-lg hover:bg-accent/50">
          <ShoppingCart className="h-5 w-5" />
          {cartCount > 0 && <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-amber-600 text-white text-[10px] font-bold flex items-center justify-center">{cartCount}</span>}
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* CATALOG */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search + categories */}
          <div className="p-3 space-y-3 border-b shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..."
                className="w-full h-10 pl-9 pr-8 rounded-xl border bg-background text-sm" />
              {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"><X className="h-4 w-4" /></button>}
            </div>
            <div className="flex gap-2 overflow-x-auto scrollbar-none pb-0.5">
              <button onClick={() => setActiveCategory("All")}
                className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${activeCategory === "All" ? "bg-foreground text-background" : "bg-muted text-muted-foreground"}`}>
                All
              </button>
              {relevantCategories.map(c => (
                <button key={c.id} onClick={() => setActiveCategory(c.name)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${activeCategory === c.name ? "bg-foreground text-background" : "bg-muted text-muted-foreground"}`}>
                  {c.icon} {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Product grid */}
          <div className="flex-1 overflow-y-auto p-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {catalogItems.map(item => {
                const inCart = cart.filter(c => c.menuItemId === item.id).reduce((s, c) => s + c.quantity, 0);
                return (
                  <button key={item.id} onClick={() => addToCart(item)}
                    className="relative p-4 rounded-xl border bg-card text-left hover:shadow-md hover:border-foreground/20 active:scale-[0.97] transition-all">
                    <div className="font-bold text-sm leading-tight">{item.name}</div>
                    <div className="text-base font-bold text-foreground mt-2">{formatETB(item.price)}</div>
                    {inCart > 0 && (
                      <span className={`absolute top-2 right-2 h-6 w-6 rounded-full bg-${brandColor}-600 text-white text-xs font-bold flex items-center justify-center`}>
                        {inCart}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {catalogItems.length === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                <p className="font-medium">No products found.</p>
                <p className="text-sm mt-1">Try a different search or category.</p>
              </div>
            )}
          </div>
        </div>

        {/* DESKTOP CART SIDEBAR */}
        <div className="hidden lg:flex flex-col w-80 border-l bg-card">
          <div className="p-4 border-b">
            <h2 className="font-bold text-sm">
              {isShopMode ? "Sale" : "Order"} · {cartCount} item{cartCount !== 1 ? "s" : ""}
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {cart.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Add products to get started.</p>}
            {cart.map(c => (
              <div key={c.id} className="p-3 rounded-xl border space-y-1.5">
                <div className="flex justify-between">
                  <span className="font-bold text-sm">{c.name}</span>
                  <button onClick={() => removeItem(c.id)} className="text-muted-foreground hover:text-red-500"><X className="h-4 w-4" /></button>
                </div>
                {c.addons.length > 0 && <p className="text-xs text-muted-foreground">+ {c.addons.map(a => a.name).join(", ")}</p>}
                {c.note && <p className="text-xs text-amber-600 dark:text-amber-400 italic">"{c.note}"</p>}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <button onClick={() => c.quantity <= 1 ? removeItem(c.id) : updateQty(c.id, -1)} className="h-7 w-7 rounded-md border flex items-center justify-center text-muted-foreground hover:text-foreground"><Minus className="h-3 w-3" /></button>
                    <span className="text-sm font-bold w-5 text-center">{c.quantity}</span>
                    <button onClick={() => updateQty(c.id, 1)} className="h-7 w-7 rounded-md border flex items-center justify-center text-muted-foreground hover:text-foreground"><Plus className="h-3 w-3" /></button>
                  </div>
                  <span className="font-bold text-sm">{formatETB(itemTotal(c))}</span>
                </div>
              </div>
            ))}
          </div>
          {cart.length > 0 && (
            <div className="p-4 border-t space-y-3">
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>{formatETB(cartTotal)}</span>
              </div>
              <button onClick={handleSubmit}
                className={`w-full h-14 rounded-xl font-bold text-sm text-white active:scale-[0.97] transition-all ${isShopMode ? "bg-emerald-600 hover:bg-emerald-700" : "bg-amber-600 hover:bg-amber-700"}`}>
                {appendToOrder ? "Add to Order" : isShopMode ? "Pay" : "Send to Kitchen"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* MOBILE CART BAR */}
      {cart.length > 0 && (
        <div className="lg:hidden fixed bottom-16 left-3 right-3 z-30">
          <button onClick={() => setMobileCartOpen(true)}
            className={`w-full flex items-center justify-between p-4 rounded-2xl text-white font-bold text-sm shadow-xl active:scale-[0.97] transition-all ${isShopMode ? "bg-emerald-600" : "bg-amber-600"}`}>
            <span>{cartCount} item{cartCount !== 1 ? "s" : ""}</span>
            <span>{formatETB(cartTotal)}</span>
            <span>View Cart →</span>
          </button>
        </div>
      )}

      {/* MOBILE CART DRAWER */}
      {mobileCartOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/40 flex items-end" onClick={() => setMobileCartOpen(false)}>
          <div className="bg-card w-full rounded-t-2xl p-5 max-h-[80vh] overflow-y-auto space-y-3 animate-in slide-in-from-bottom-4 duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h3 className="font-bold">Cart · {cartCount} items</h3>
              <button onClick={() => setMobileCartOpen(false)}><X className="h-5 w-5" /></button>
            </div>
            {cart.map(c => (
              <div key={c.id} className="flex justify-between items-center p-3 rounded-xl border text-sm">
                <div>
                  <span className="font-bold">{c.quantity}× {c.name}</span>
                  {c.addons.length > 0 && <p className="text-xs text-muted-foreground">+{c.addons.map(a => a.name).join(", ")}</p>}
                </div>
                <span className="font-bold">{formatETB(itemTotal(c))}</span>
              </div>
            ))}
            <div className="flex justify-between font-bold text-lg pt-2 border-t">
              <span>Total</span><span>{formatETB(cartTotal)}</span>
            </div>
            <button onClick={() => { setMobileCartOpen(false); handleSubmit(); }}
              className={`w-full h-14 rounded-xl font-bold text-sm text-white ${isShopMode ? "bg-emerald-600" : "bg-amber-600"}`}>
              {appendToOrder ? "Add to Order" : isShopMode ? "Pay" : "Send to Kitchen"}
            </button>
          </div>
        </div>
      )}

      {addonSheet}
    </div>
  );
}
