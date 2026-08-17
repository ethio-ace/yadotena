"use client";

import { useMemo, useState } from "react";
import { MenuItem, MenuCategory, AddonItem, MenuItemAddon, Order } from "@/types";
import { formatETB } from "@/lib/currency";
import { getApplicableAddonsForItem, isShopProductItem } from "@/lib/orderUtils";
import { Check, Minus, Plus, Search, ShoppingCart, X } from "lucide-react";
import type { CartItem } from "@/components/waiter/CafeOrderBuilder";

const NOTE_PRESETS = ["No Spicy", "Extra Hot", "No Onions", "Well Done", "Extra Sauce", "Separate Plate"];

interface TableAddItemsPanelProps {
  order: Order;
  menu: MenuItem[];
  categories: MenuCategory[];
  allAddons: AddonItem[];
  isSubmitting: boolean;
  onAppend: (items: CartItem[]) => void;
  onCollapse: () => void;
}

export function TableAddItemsPanel({
  order, menu, categories, allAddons, isSubmitting, onAppend, onCollapse,
}: TableAddItemsPanelProps) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [cart, setCart] = useState<CartItem[]>([]);

  // Addon sheet state
  const [configuringItem, setConfiguringItem] = useState<MenuItem | null>(null);
  const [sheetAddons, setSheetAddons] = useState<MenuItemAddon[]>([]);
  const [sheetNote, setSheetNote] = useState("");
  const [sheetQty, setSheetQty] = useState(1);

  const catalog = useMemo(() => {
    let items = menu.filter((m) => !isShopProductItem(m) && m.available !== false);
    if (search) items = items.filter((m) => m.name.toLowerCase().includes(search.toLowerCase()));
    if (activeCategory !== "All") {
      items = items.filter((m) => m.category === activeCategory || m.categoryId === activeCategory);
    }
    return items;
  }, [menu, search, activeCategory]);

  const relevantCategories = useMemo(() => {
    const items = menu.filter((m) => !isShopProductItem(m));
    const catIds = new Set(items.map((m) => m.categoryId || m.category));
    return categories.filter((c) => catIds.has(c.id) || catIds.has(c.name));
  }, [menu, categories]);

  const addToCart = (item: MenuItem) => {
    const applicable = getApplicableAddonsForItem(item, allAddons);
    if (applicable.length > 0) {
      setConfiguringItem(item);
      setSheetAddons([]);
      setSheetNote("");
      setSheetQty(1);
    } else {
      const existing = cart.find((c) => c.menuItemId === item.id && c.addons.length === 0 && !c.note);
      if (existing) {
        setCart(cart.map((c) => (c.id === existing.id ? { ...c, quantity: c.quantity + 1 } : c)));
      } else {
        setCart([...cart, {
          id: crypto.randomUUID(), menuItemId: item.id, name: item.name,
          basePrice: item.price, quantity: 1, addons: [], note: "",
        }]);
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
    setCart(cart.map((c) => (c.id === id ? { ...c, quantity: Math.max(1, c.quantity + delta) } : c)));
  };
  const removeItem = (id: string) => setCart(cart.filter((c) => c.id !== id));

  const cartCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of cart) map[c.menuItemId] = (map[c.menuItemId] || 0) + c.quantity;
    return map;
  }, [cart]);

  const itemTotal = (c: CartItem) => (c.basePrice + c.addons.reduce((s, a) => s + (a.price || 0), 0)) * c.quantity;
  const cartTotal = cart.reduce((s, c) => s + itemTotal(c), 0);
  const cartCount = cart.reduce((s, c) => s + c.quantity, 0);

  return (
    <div className="rounded-3xl border-2 border-amber-500/25 bg-amber-50/40 dark:bg-amber-950/10 overflow-hidden shadow-lg">
      {/* Panel header */}
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0">
            <Plus className="h-4.5 w-4.5" />
          </div>
          <div>
            <h4 className="font-black text-sm">Add Items to This Order</h4>
            <p className="text-[11px] text-muted-foreground font-medium">
              Extend #{order.id.slice(-6).toUpperCase()} — pick dishes & add-ons
            </p>
          </div>
        </div>
        {cartCount > 0 && (
          <span className="h-7 min-w-7 px-1.5 rounded-full bg-amber-600 text-white text-sm font-black flex items-center justify-center shadow">
            {cartCount}
          </span>
        )}
      </div>

      <div className="border-t border-amber-500/15">
        {/* Search + categories */}
        <div className="p-3 space-y-2.5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search dishes to add..."
              className="w-full h-10 pl-9 pr-8 rounded-xl border bg-background text-sm"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
            <button
              onClick={() => setActiveCategory("All")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                activeCategory === "All" ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
              }`}
            >
              All
            </button>
            {relevantCategories.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveCategory(c.name)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                  activeCategory === c.name ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
                }`}
              >
                {c.icon} {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Item grid */}
        <div className="px-3 max-h-[42vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-2">
            {catalog.map((item) => {
              const inCart = cartCountMap[item.id] || 0;
              return (
                <div
                  key={item.id}
                  className="group relative flex flex-col rounded-xl border bg-card text-left overflow-hidden cursor-pointer hover:border-amber-500/50 active:scale-[0.98] transition-all"
                  onClick={() => addToCart(item)}
                >
                  <div className="relative w-full h-14 bg-muted/40 flex items-center justify-center overflow-hidden">
                    {(() => {
                      const imgPath = item.imageUrl || item.image;
                      if (!imgPath) {
                        return (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent text-amber-600/60 dark:text-amber-400/60">
                            <ShoppingCart className="h-5 w-5 opacity-40" />
                          </div>
                        );
                      }
                      const srcUrl = imgPath.startsWith("http") || imgPath.startsWith("/") ? imgPath : `/uploads/${imgPath}`;
                      return (
                        <img
                          src={srcUrl}
                          alt={item.name}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLElement).style.display = "none"; }}
                        />
                      );
                    })()}
                    <button
                      onClick={(e) => { e.stopPropagation(); addToCart(item); }}
                      className="absolute bottom-1.5 right-1.5 h-6 w-6 rounded-full bg-amber-600 hover:bg-amber-700 text-white flex items-center justify-center shadow-md active:scale-95 transition-transform"
                      aria-label={`Add ${item.name}`}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                    {inCart > 0 && (
                      <span className="absolute top-1.5 right-1.5 h-5 min-w-5 px-1 rounded-full bg-amber-600 text-white text-[10px] font-black flex items-center justify-center shadow">
                        {inCart}
                      </span>
                    )}
                  </div>
                  <div className="p-2">
                    <div className="font-bold text-xs leading-tight line-clamp-1">{item.name}</div>
                    <div className="text-sm font-black text-amber-600 dark:text-amber-400">{formatETB(item.price)}</div>
                  </div>
                </div>
              );
            })}
          </div>
          {catalog.length === 0 && (
            <p className="text-center py-8 text-muted-foreground text-sm font-medium">No dishes match this search.</p>
          )}
        </div>

        {/* PINNED — what's selected & about to be added */}
        <div className="border-t-2 border-amber-500/20 bg-background/80 backdrop-blur p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              {cart.length > 0 ? "Currently selected — will be added" : "Nothing selected yet"}
            </p>
            {cart.length > 0 && (
              <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                {cartCount} item{cartCount === 1 ? "" : "s"}
              </span>
            )}
          </div>

          {cart.length > 0 ? (
            <>
              <div className="space-y-1.5 rounded-xl border bg-card p-2.5 max-h-44 overflow-y-auto">
                {cart.map((c) => (
                  <div key={c.id} className="flex items-center justify-between gap-2 text-xs">
                    <div className="min-w-0">
                      <span className="font-bold">{c.quantity}× {c.name}</span>
                      {c.addons.length > 0 && (
                        <span className="text-amber-600 dark:text-amber-400 block truncate font-medium">
                          + {c.addons.map((a) => a.name).join(", ")}
                        </span>
                      )}
                      {c.note && <span className="text-muted-foreground block truncate">📝 {c.note}</span>}
                      <span className="text-muted-foreground block">{formatETB(itemTotal(c))}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => updateQty(c.id, -1)} className="h-6 w-6 rounded-md border flex items-center justify-center text-muted-foreground hover:text-foreground">
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-5 text-center font-bold">{c.quantity}</span>
                      <button onClick={() => updateQty(c.id, 1)} className="h-6 w-6 rounded-md border flex items-center justify-center text-muted-foreground hover:text-foreground">
                        <Plus className="h-3 w-3" />
                      </button>
                      <button onClick={() => removeItem(c.id)} className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-red-500">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">To add</p>
                  <p className="font-black text-lg text-amber-600 dark:text-amber-400">{formatETB(cartTotal)}</p>
                </div>
                <button
                  onClick={() => onAppend(cart)}
                  disabled={isSubmitting}
                  className="flex-1 h-12 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-black text-sm flex items-center justify-center gap-2 active:scale-[0.97] transition-all shadow-md shadow-amber-600/20"
                >
                  {isSubmitting ? (
                    <span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  {isSubmitting ? "Adding..." : `Add ${cartCount} to Order #${order.id.slice(-6).toUpperCase()}`}
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Tap <span className="font-black text-amber-600 dark:text-amber-400">+</span> on a dish above — items with add-ons open a customizer.
              </p>
              <button
                onClick={onCollapse}
                className="shrink-0 h-10 px-4 rounded-xl border border-dashed text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
              >
                Done — close
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Addon sheet */}
      {configuringItem && (() => {
        const applicable = getApplicableAddonsForItem(configuringItem, allAddons);
        return (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center" onClick={() => setConfiguringItem(null)}>
            <div
              className="bg-card w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl p-5 space-y-4 max-h-[80vh] overflow-y-auto animate-in slide-in-from-bottom-4 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold">{configuringItem.name}</h3>
                  <p className="text-sm text-muted-foreground">{formatETB(configuringItem.price)}</p>
                </div>
                <button onClick={() => setConfiguringItem(null)} className="p-1 text-muted-foreground hover:text-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {applicable.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase text-muted-foreground">Add-ons</p>
                  {applicable.map((a) => {
                    const selected = sheetAddons.some((s) => s.id === a.id);
                    return (
                      <button
                        key={a.id}
                        onClick={() => setSheetAddons(selected ? sheetAddons.filter((s) => s.id !== a.id) : [...sheetAddons, a])}
                        className={`w-full flex items-center justify-between gap-3 p-3 rounded-xl border-2 text-sm font-bold transition-all active:scale-[0.98] ${
                          selected
                            ? "border-amber-500 bg-amber-500 text-white shadow-md shadow-amber-500/25"
                            : "border-border bg-background hover:border-amber-500/50 text-foreground"
                        }`}
                      >
                        <span className="flex items-center gap-2.5 min-w-0">
                          <span className={`h-5 w-5 rounded-md flex items-center justify-center shrink-0 border-2 ${
                            selected ? "bg-white border-white text-amber-600" : "border-muted-foreground/40 text-transparent"
                          }`}>
                            <Check className="h-3.5 w-3.5" strokeWidth={3.5} />
                          </span>
                          <span className="truncate">{a.name}</span>
                        </span>
                        <span className={selected ? "text-white/90" : "text-muted-foreground"}>
                          {a.price > 0 ? `+${formatETB(a.price)}` : "Free"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="space-y-2">
                <p className="text-xs font-bold uppercase text-muted-foreground">Kitchen Note</p>
                <div className="flex flex-wrap gap-1.5">
                  {NOTE_PRESETS.map((n) => (
                    <button
                      key={n}
                      onClick={() => setSheetNote(sheetNote === n ? "" : n)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all active:scale-95 ${
                        sheetNote === n
                          ? "border-amber-500 bg-amber-500 text-white shadow-md shadow-amber-500/25"
                          : "border-border bg-background text-muted-foreground hover:border-amber-500/50 hover:text-foreground"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <input
                  value={sheetNote}
                  onChange={(e) => setSheetNote(e.target.value)}
                  placeholder="Custom note..."
                  className="w-full h-10 px-3 rounded-xl border bg-background text-sm"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t">
                <div className="flex items-center gap-3">
                  <button onClick={() => setSheetQty(Math.max(1, sheetQty - 1))} className="h-10 w-10 rounded-lg border flex items-center justify-center hover:bg-accent/50">
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="text-lg font-bold w-8 text-center">{sheetQty}</span>
                  <button onClick={() => setSheetQty(sheetQty + 1)} className="h-10 w-10 rounded-lg border flex items-center justify-center hover:bg-accent/50">
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <button
                  onClick={confirmAddonSheet}
                  className="h-12 px-6 rounded-xl bg-amber-600 text-white font-bold text-sm hover:bg-amber-700 active:scale-95 transition-all shadow-md shadow-amber-600/20"
                >
                  Add {formatETB((configuringItem.price + sheetAddons.reduce((s, a) => s + (a.price || 0), 0)) * sheetQty)}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
