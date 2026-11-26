"use client";

import { useMemo, useState } from "react";
import { MenuItem, MenuCategory, AddonItem, MenuItemAddon, Table, Order, PaymentPreference } from "@/types";
import { formatETB } from "@/lib/currency";
import { getApplicableAddonsForItem, isShopProductItem } from "@/lib/orderUtils";
import { findActiveOrdersForTable } from "@/lib/tableUtils";
import { addonNames, orderTicketNumber } from "@/lib/kitchen";
import { ArrowLeft, Search, X, Minus, Plus, Check, ChevronDown, SlidersHorizontal, ShoppingBag, Package, Utensils, Bike } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CartItem {
  id: string;
  menuItemId: string;
  name: string;
  basePrice: number;
  quantity: number;
  addons: MenuItemAddon[];
  note: string;
}

/** A phone-in delivery: who, where, and how they'll pay. */
export interface DeliveryCustomer {
  name: string;
  phone: string;
  address: string;
  note: string;
  paymentPreference: PaymentPreference;
}

/** Where the order goes. A table can take a new ticket or extend an open one. */
export type OrderTarget =
  | { kind: "table"; table: Table }
  | { kind: "takeaway" }
  | { kind: "delivery"; customer: DeliveryCustomer }
  | { kind: "shop" };

const EMPTY_CUSTOMER: DeliveryCustomer = { name: "", phone: "", address: "", note: "", paymentPreference: "ON_DELIVERY" };

interface CafeOrderBuilderProps {
  menu: MenuItem[];
  categories: MenuCategory[];
  allAddons: AddonItem[];
  tables: Table[];
  orders: Order[];
  isShopMode?: boolean;
  /** Table chosen before entering (tapped on the floor) — skips the picker. */
  preselectedTable?: Table | null;
  /** Open in append mode on this ticket ("Add items"); otherwise a new ticket. */
  appendToOrderId?: string | null;
  cart: CartItem[];
  isSubmitting: boolean;
  onCartChange: (cart: CartItem[]) => void;
  onBack: () => void;
  onSubmit: (items: CartItem[], target: OrderTarget, appendOrderId?: string) => void;
}

const NOTE_PRESETS = ["No spicy", "Extra hot", "No onions", "Well done", "Extra sauce", "Separate plate"];

const itemTotal = (c: CartItem) => (c.basePrice + c.addons.reduce((s, a) => s + (a.price || 0), 0)) * c.quantity;

function imageSrc(item: MenuItem): string | null {
  const p = item.imageUrl || item.image;
  if (!p) return null;
  return p.startsWith("http") || p.startsWith("/") ? p : `/uploads/${p}`;
}

/**
 * The one order-entry screen: pick where it goes (table / takeaway), tap
 * dishes, send. A busy table defaults to a NEW ticket (a table can hold
 * several); the mode row lets the waiter add to an open ticket instead.
 */
export function CafeOrderBuilder({
  menu, categories, allAddons, tables, orders,
  isShopMode, preselectedTable, appendToOrderId, cart, isSubmitting, onCartChange, onBack, onSubmit,
}: CafeOrderBuilderProps) {
  const [target, setTarget] = useState<OrderTarget | null>(
    isShopMode ? { kind: "shop" } : preselectedTable ? { kind: "table", table: preselectedTable } : null
  );

  // Open tickets on the chosen table; the waiter picks "new ticket" (default)
  // or one of them to add to.
  const tableOrders = useMemo(
    () => (target?.kind === "table" ? findActiveOrdersForTable(target.table, orders) : []),
    [target, orders]
  );
  const [appendId, setAppendId] = useState<string | null>(appendToOrderId ?? null);
  const appendOrder = tableOrders.find((o) => o.id === appendId) || null;

  // Phone-in delivery details (step 1b), kept so "Change" can edit them.
  const [deliveryForm, setDeliveryForm] = useState<DeliveryCustomer | null>(null);
  const deliveryReady = !!deliveryForm
    && deliveryForm.name.trim().length >= 2
    && deliveryForm.phone.replace(/\D/g, "").length >= 9
    && deliveryForm.address.trim().length >= 5;

  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [showExisting, setShowExisting] = useState(false);

  // Options sheet (add-ons + kitchen note)
  const [configuring, setConfiguring] = useState<MenuItem | null>(null);
  const [sheetAddons, setSheetAddons] = useState<MenuItemAddon[]>([]);
  const [sheetNote, setSheetNote] = useState("");
  const [sheetQty, setSheetQty] = useState(1);

  const pool = useMemo(
    () => menu.filter((m) => m.available !== false && (isShopMode ? isShopProductItem(m) : !isShopProductItem(m))),
    [menu, isShopMode]
  );
  const catalog = useMemo(() => {
    const q = search.trim().toLowerCase();
    return pool.filter(
      (m) =>
        (!q || m.name.toLowerCase().includes(q)) &&
        (category === "All" || m.category === category || m.categoryId === category)
    );
  }, [pool, search, category]);
  const relevantCategories = useMemo(() => {
    const ids = new Set(pool.map((m) => m.categoryId || m.category));
    return categories.filter((c) => ids.has(c.id) || ids.has(c.name));
  }, [pool, categories]);

  const addonMap = useMemo(() => Object.fromEntries(allAddons.map((a) => [a.id, a.name])), [allAddons]);
  const qtyByItem = useMemo(() => {
    const m: Record<string, number> = {};
    for (const c of cart) m[c.menuItemId] = (m[c.menuItemId] || 0) + c.quantity;
    return m;
  }, [cart]);
  const cartTotal = cart.reduce((s, c) => s + itemTotal(c), 0);
  const cartCount = cart.reduce((s, c) => s + c.quantity, 0);

  const quickAdd = (item: MenuItem) => {
    const plain = cart.find((c) => c.menuItemId === item.id && c.addons.length === 0 && !c.note);
    onCartChange(
      plain
        ? cart.map((c) => (c.id === plain.id ? { ...c, quantity: c.quantity + 1 } : c))
        : [...cart, { id: crypto.randomUUID(), menuItemId: item.id, name: item.name, basePrice: item.price, quantity: 1, addons: [], note: "" }]
    );
  };
  const openOptions = (item: MenuItem) => {
    setConfiguring(item);
    setSheetAddons([]);
    setSheetNote("");
    setSheetQty(1);
  };
  const confirmOptions = () => {
    if (!configuring) return;
    onCartChange([
      ...cart,
      { id: crypto.randomUUID(), menuItemId: configuring.id, name: configuring.name, basePrice: configuring.price, quantity: sheetQty, addons: [...sheetAddons], note: sheetNote.trim() },
    ]);
    setConfiguring(null);
  };
  const changeQty = (id: string, delta: number) => {
    const line = cart.find((c) => c.id === id);
    if (!line) return;
    if (line.quantity + delta <= 0) onCartChange(cart.filter((c) => c.id !== id));
    else onCartChange(cart.map((c) => (c.id === id ? { ...c, quantity: c.quantity + delta } : c)));
  };
  const decItem = (menuItemId: string) => {
    const line = [...cart].reverse().find((c) => c.menuItemId === menuItemId);
    if (line) changeQty(line.id, -1);
  };

  const submit = () => {
    if (!target || cart.length === 0 || isSubmitting) return;
    setCartOpen(false);
    onSubmit(cart, target, appendOrder?.id);
  };

  const submitLabel = appendOrder
    ? `Add to #${orderTicketNumber(appendOrder)}`
    : target?.kind === "shop" ? "Complete sale" : "Send to kitchen";

  const title =
    target?.kind === "table" ? target.table.name
    : target?.kind === "takeaway" ? "Takeaway"
    : target?.kind === "delivery" ? `Delivery · ${target.customer.name}`
    : target?.kind === "shop" ? "Shop sale" : "New order";
  const subtitle = appendOrder
    ? `Adding to order #${orderTicketNumber(appendOrder)}`
    : target?.kind === "table" ? (tableOrders.length ? "New ticket on a busy table" : "New dine-in order")
    : target?.kind === "takeaway" ? "Counter pickup"
    : target?.kind === "delivery" ? `${target.customer.phone} · ${target.customer.address}`
    : target?.kind === "shop" ? "Packaged products · pay at counter" : "";

  // ── STEP 1b — phone-in delivery details ──────────────────────────────────
  if (!target && deliveryForm) {
    const set = (patch: Partial<DeliveryCustomer>) => setDeliveryForm({ ...deliveryForm, ...patch });
    const field = "mt-1 w-full h-12 px-3 rounded-xl border bg-background text-base";
    return (
      <div className="h-full overflow-y-auto animate-in fade-in duration-150">
        <form
          className="max-w-xl mx-auto p-4 sm:p-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (deliveryReady) setTarget({ kind: "delivery", customer: { ...deliveryForm, name: deliveryForm.name.trim(), phone: deliveryForm.phone.trim(), address: deliveryForm.address.trim(), note: deliveryForm.note.trim() } });
          }}
        >
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setDeliveryForm(null)} aria-label="Back" className="h-10 w-10 -ml-2 rounded-xl flex items-center justify-center hover:bg-muted">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-xl font-black">Delivery — who and where?</h1>
          </div>
          <label className="block">
            <span className="text-xs font-bold text-muted-foreground">Customer name</span>
            <input autoFocus value={deliveryForm.name} onChange={(e) => set({ name: e.target.value })} className={field} />
          </label>
          <label className="block">
            <span className="text-xs font-bold text-muted-foreground">Phone</span>
            <input type="tel" inputMode="tel" value={deliveryForm.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="09xx xxx xxx" className={field} />
          </label>
          <label className="block">
            <span className="text-xs font-bold text-muted-foreground">Address</span>
            <textarea rows={2} value={deliveryForm.address} onChange={(e) => set({ address: e.target.value })} placeholder="Area, street, building, landmark" className="mt-1 w-full px-3 py-2.5 rounded-xl border bg-background text-base resize-none" />
          </label>
          <label className="block">
            <span className="text-xs font-bold text-muted-foreground">Note for the rider (optional)</span>
            <input value={deliveryForm.note} onChange={(e) => set({ note: e.target.value })} className={field} />
          </label>
          <div role="radiogroup" aria-label="Payment" className="grid grid-cols-2 gap-2">
            {([["ON_DELIVERY", "Pays on delivery"], ["TRANSFER", "Transfers first"]] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={deliveryForm.paymentPreference === value}
                onClick={() => set({ paymentPreference: value })}
                className={cn(
                  "h-12 rounded-xl border-2 text-sm font-black",
                  deliveryForm.paymentPreference === value ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground"
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            type="submit"
            disabled={!deliveryReady}
            className="w-full h-14 rounded-2xl bg-primary disabled:bg-muted disabled:text-muted-foreground text-primary-foreground font-black text-base"
          >
            Continue to menu
          </button>
        </form>
      </div>
    );
  }

  // ── STEP 1 — where is this order going? ──────────────────────────────────
  if (!target) {
    const rows = tables
      .map((t) => ({ t, order: findActiveOrdersForTable(t, orders)[0] }))
      .sort((a, b) => Number(!!a.order) - Number(!!b.order) || a.t.name.localeCompare(b.t.name, undefined, { numeric: true }));
    return (
      <div className="h-full overflow-y-auto animate-in fade-in duration-150">
        <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-5">
          <div className="flex items-center gap-3">
            <button onClick={onBack} aria-label="Back" className="h-10 w-10 -ml-2 rounded-xl flex items-center justify-center hover:bg-muted">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-xl font-black">New order — where to?</h1>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => setTarget({ kind: "takeaway" })}
              className="h-16 rounded-2xl border-2 border-dashed font-black text-base flex items-center justify-center gap-2.5 hover:border-amber-500 hover:bg-amber-500/5 active:scale-[0.99] transition-all"
            >
              <ShoppingBag className="h-5 w-5" />
              Takeaway
            </button>
            <button
              onClick={() => setDeliveryForm(deliveryForm || EMPTY_CUSTOMER)}
              className="h-16 rounded-2xl border-2 border-dashed font-black text-base flex items-center justify-center gap-2.5 hover:border-violet-500 hover:bg-violet-500/5 active:scale-[0.99] transition-all"
            >
              <Bike className="h-5 w-5" />
              Delivery
            </button>
          </div>

          <div>
            <p className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-2">Or pick a table</p>
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2.5">
              {rows.map(({ t, order }) => (
                <button
                  key={t.id}
                  onClick={() => { setAppendId(null); setTarget({ kind: "table", table: t }); }}
                  className={cn(
                    "h-20 p-2 rounded-2xl border-2 flex flex-col items-center justify-center text-center active:scale-[0.97] transition-all",
                    order ? "border-amber-500/50 bg-amber-50/40 dark:bg-amber-950/10" : "hover:border-amber-500"
                  )}
                >
                  <span className="font-black text-sm truncate max-w-full">{t.name}</span>
                  <span className={cn("text-[11px] font-bold mt-0.5", order ? "text-amber-700 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400")}>
                    {order ? `Busy · #${orderTicketNumber(order)}` : "Open"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Cart contents (shared by the desktop rail and the mobile drawer) ─────
  const cartBody = (
    <>
      {appendOrder && (
        <div className="rounded-xl border bg-muted/30">
          <button onClick={() => setShowExisting((v) => !v)} className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-bold">
            <span>
              Already on #{orderTicketNumber(appendOrder)} · {appendOrder.items?.reduce((s, i) => s + i.quantity, 0) || 0} items ·{" "}
              <span className="tabular-nums">{formatETB(appendOrder.total)}</span>
            </span>
            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", showExisting && "rotate-180")} />
          </button>
          {showExisting && (
            <ul className="px-3 pb-2.5 space-y-1 max-h-40 overflow-y-auto">
              {appendOrder.items?.map((i, idx) => {
                const a = addonNames(i.selectedAddons, addonMap);
                return (
                  <li key={i.id || idx} className="text-xs text-muted-foreground">
                    <span className="font-bold text-foreground">{i.quantity}×</span> {i.name}
                    {a.length > 0 && <span> + {a.join(", ")}</span>}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {cart.length === 0 ? (
        <div className="py-10 text-center text-sm text-muted-foreground">
          <p className="font-bold text-foreground">No items yet</p>
          <p className="mt-1">Tap a dish to add it.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {cart.map((c) => (
            <li key={c.id} className="rounded-xl border bg-card p-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-bold leading-tight">{c.name}</p>
                  {c.addons.length > 0 && <p className="text-xs text-muted-foreground truncate">+ {c.addons.map((a) => a.name).join(", ")}</p>}
                  {c.note && <p className="text-xs font-bold text-amber-700 dark:text-amber-400 truncate">“{c.note}”</p>}
                </div>
                <span className="text-sm font-black tabular-nums shrink-0">{formatETB(itemTotal(c))}</span>
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                <button onClick={() => changeQty(c.id, -1)} aria-label={`One less ${c.name}`} className="h-9 w-9 rounded-lg border flex items-center justify-center hover:bg-muted">
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-8 text-center font-black tabular-nums">{c.quantity}</span>
                <button onClick={() => changeQty(c.id, 1)} aria-label={`One more ${c.name}`} className="h-9 w-9 rounded-lg border flex items-center justify-center hover:bg-muted">
                  <Plus className="h-4 w-4" />
                </button>
                <button onClick={() => onCartChange(cart.filter((x) => x.id !== c.id))} className="ml-auto h-9 px-2.5 rounded-lg text-xs font-bold text-muted-foreground hover:text-red-600 hover:bg-red-500/10">
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );

  const submitButton = (
    <button
      onClick={submit}
      disabled={cart.length === 0 || isSubmitting}
      className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground text-primary-foreground font-black text-base flex items-center justify-between px-5 active:scale-[0.98] transition-all"
    >
      <span className="flex items-center gap-2">
        {isSubmitting ? <span className="h-4 w-4 border-2 border-amber-950/30 border-t-amber-950 rounded-full animate-spin" /> : <Check className="h-5 w-5" strokeWidth={3} />}
        {isSubmitting ? "Sending…" : submitLabel}
      </span>
      <span className="tabular-nums">{formatETB(cartTotal)}</span>
    </button>
  );

  // ── STEP 2 — menu + cart ─────────────────────────────────────────────────
  return (
    <div className="flex h-full animate-in fade-in duration-150">
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="px-3 sm:px-4 py-2.5 border-b bg-card shrink-0 flex items-center gap-2">
          <button onClick={onBack} aria-label="Back" className="h-10 w-10 rounded-xl flex items-center justify-center hover:bg-muted shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-black leading-tight truncate">{title}</h1>
            <p className="text-xs text-muted-foreground font-medium truncate">{subtitle}</p>
          </div>
          {!isShopMode && !preselectedTable && (
            <button onClick={() => setTarget(null)} className="h-9 px-3 rounded-lg border text-xs font-bold text-muted-foreground hover:text-foreground shrink-0">
              Change
            </button>
          )}
        </div>

        {tableOrders.length > 0 && (
          <div className="px-3 sm:px-4 py-2 border-b shrink-0 flex gap-1.5 overflow-x-auto scrollbar-none" role="radiogroup" aria-label="Ticket">
            {[null, ...tableOrders.map((o) => o.id)].map((id) => {
              const o = id ? tableOrders.find((x) => x.id === id)! : null;
              const active = appendId === id;
              return (
                <button
                  key={id ?? "new"}
                  role="radio"
                  aria-checked={active}
                  onClick={() => setAppendId(id)}
                  className={cn(
                    "h-9 px-3.5 rounded-full text-xs font-black whitespace-nowrap border-2 transition-colors",
                    active ? "bg-primary border-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {o ? `Add to #${orderTicketNumber(o)} · ${formatETB(o.total)}` : "New ticket"}
                </button>
              );
            })}
          </div>
        )}

        {/* Search + categories */}
        <div className="px-3 sm:px-4 py-2.5 space-y-2.5 border-b shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isShopMode ? "Search products" : "Search dishes"}
              className="w-full h-11 pl-9 pr-9 rounded-xl border bg-background text-sm"
            />
            {search && (
              <button onClick={() => setSearch("")} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 flex items-center justify-center text-muted-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none -mx-1 px-1">
            {[{ id: "All", name: "All", icon: "" }, ...relevantCategories].map((c) => (
              <button
                key={c.id}
                onClick={() => setCategory(c.name)}
                className={cn(
                  "h-9 px-4 rounded-full text-sm font-bold whitespace-nowrap transition-colors",
                  category === c.name ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                {c.icon ? `${c.icon} ` : ""}{c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Menu grid — tap = add one, "Options" = add-ons / note */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 pb-28 lg:pb-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2.5">
            {catalog.map((item) => {
              const n = qtyByItem[item.id] || 0;
              const img = imageSrc(item);
              const hasAddons = !isShopMode && getApplicableAddonsForItem(item, allAddons).length > 0;
              return (
                <div
                  key={item.id}
                  className={cn(
                    "relative rounded-2xl border-2 bg-card overflow-hidden flex flex-col transition-colors",
                    n > 0 ? "border-amber-500" : "border-border hover:border-amber-500/50"
                  )}
                >
                  <button onClick={() => quickAdd(item)} className="text-left flex-1 flex flex-col active:scale-[0.98] transition-transform" aria-label={`Add ${item.name}`}>
                    <div className="h-20 bg-muted/50 flex items-center justify-center overflow-hidden">
                      {img ? (
                        <img src={img} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLElement).style.display = "none"; }} />
                      ) : isShopMode ? (
                        <Package className="h-6 w-6 text-muted-foreground/40" />
                      ) : (
                        <Utensils className="h-6 w-6 text-muted-foreground/40" />
                      )}
                    </div>
                    <div className="p-2.5 flex-1">
                      <p className="text-sm font-bold leading-tight line-clamp-2">{item.name}</p>
                      <p className="text-sm font-black mt-1 tabular-nums">{formatETB(item.price)}</p>
                    </div>
                  </button>

                  {n > 0 && (
                    <span className="absolute top-2 right-2 h-7 min-w-7 px-1.5 rounded-full bg-primary text-primary-foreground text-sm font-black flex items-center justify-center shadow tabular-nums">
                      {n}
                    </span>
                  )}

                  <div className="flex border-t">
                    {n > 0 && (
                      <button onClick={() => decItem(item.id)} aria-label={`One less ${item.name}`} className="h-10 w-12 flex items-center justify-center border-r text-muted-foreground hover:bg-muted">
                        <Minus className="h-4 w-4" />
                      </button>
                    )}
                    {!isShopMode ? (
                      <button
                        onClick={() => openOptions(item)}
                        className={cn(
                          "flex-1 h-10 text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-muted",
                          hasAddons ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"
                        )}
                      >
                        <SlidersHorizontal className="h-3.5 w-3.5" />
                        {hasAddons ? "Add-ons" : "Note"}
                      </button>
                    ) : (
                      <button onClick={() => quickAdd(item)} className="flex-1 h-10 text-xs font-bold flex items-center justify-center gap-1 hover:bg-muted">
                        <Plus className="h-3.5 w-3.5" /> Add
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {catalog.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <p className="font-bold">Nothing found</p>
              <p className="text-sm mt-1">Try another search or category.</p>
            </div>
          )}
        </div>
      </div>

      {/* Desktop cart rail — always visible, no extra tap to review */}
      <aside className="hidden lg:flex flex-col w-[340px] shrink-0 border-l bg-muted/20">
        <div className="px-4 h-[61px] border-b flex items-center justify-between shrink-0 bg-card">
          <h2 className="font-black">Order</h2>
          {cartCount > 0 && <span className="text-xs font-bold text-muted-foreground">{cartCount} item{cartCount === 1 ? "" : "s"}</span>}
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-3">{cartBody}</div>
        <div className="p-3 border-t bg-card">{submitButton}</div>
      </aside>

      {/* Mobile / tablet: bottom cart bar → drawer */}
      {cart.length > 0 && !cartOpen && (
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-background via-background/95 to-transparent">
          <button
            onClick={() => setCartOpen(true)}
            className="w-full h-14 rounded-2xl bg-foreground text-background font-black text-base flex items-center gap-3 px-4 shadow-xl active:scale-[0.99] transition-transform"
          >
            <span className="h-7 min-w-7 px-1.5 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center tabular-nums">{cartCount}</span>
            <span className="flex-1 text-left">Review order</span>
            <span className="tabular-nums">{formatETB(cartTotal)}</span>
          </button>
        </div>
      )}

      {cartOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/40 flex items-end" onClick={() => setCartOpen(false)}>
          <div
            className="bg-background w-full rounded-t-3xl max-h-[88vh] flex flex-col animate-in slide-in-from-bottom-4 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
              <div>
                <h3 className="font-black text-lg leading-tight">{title}</h3>
                <p className="text-xs text-muted-foreground">{subtitle}</p>
              </div>
              <button onClick={() => setCartOpen(false)} aria-label="Close" className="h-10 w-10 rounded-xl flex items-center justify-center hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3">{cartBody}</div>
            <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t space-y-2 shrink-0">
              {submitButton}
              <button onClick={() => setCartOpen(false)} className="w-full h-11 rounded-xl text-sm font-bold text-muted-foreground">
                Keep adding
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Options sheet: add-ons, kitchen note, quantity */}
      {configuring && (() => {
        const applicable = getApplicableAddonsForItem(configuring, allAddons);
        const lineTotal = (configuring.price + sheetAddons.reduce((s, a) => s + (a.price || 0), 0)) * sheetQty;
        return (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center" onClick={() => setConfiguring(null)}>
            <div
              className="bg-background w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl max-h-[88vh] flex flex-col animate-in slide-in-from-bottom-4 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start p-5 pb-3 shrink-0">
                <div>
                  <h3 className="text-lg font-black">{configuring.name}</h3>
                  <p className="text-sm text-muted-foreground tabular-nums">{formatETB(configuring.price)}</p>
                </div>
                <button onClick={() => setConfiguring(null)} aria-label="Close" className="h-10 w-10 rounded-xl flex items-center justify-center hover:bg-muted">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 space-y-5">
                {applicable.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Add-ons</p>
                    {applicable.map((a) => {
                      const on = sheetAddons.some((s) => s.id === a.id);
                      return (
                        <button
                          key={a.id}
                          onClick={() => setSheetAddons(on ? sheetAddons.filter((s) => s.id !== a.id) : [...sheetAddons, a])}
                          className={cn(
                            "w-full h-12 flex items-center justify-between gap-3 px-3 rounded-xl border-2 text-sm font-bold transition-colors",
                            on ? "border-amber-500 bg-primary text-primary-foreground" : "border-border hover:border-primary/50"
                          )}
                        >
                          <span className="flex items-center gap-2.5 min-w-0">
                            <span className={cn("h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0", on ? "bg-amber-950 border-amber-950 text-amber-500" : "border-muted-foreground/40 text-transparent")}>
                              <Check className="h-3.5 w-3.5" strokeWidth={3.5} />
                            </span>
                            <span className="truncate">{a.name}</span>
                          </span>
                          <span className="tabular-nums">{a.price > 0 ? `+${formatETB(a.price)}` : "Free"}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="space-y-2">
                  <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Note for the kitchen</p>
                  <div className="flex flex-wrap gap-1.5">
                    {NOTE_PRESETS.map((n) => (
                      <button
                        key={n}
                        onClick={() => setSheetNote(sheetNote === n ? "" : n)}
                        className={cn(
                          "h-9 px-3 rounded-full text-xs font-bold border-2 transition-colors",
                          sheetNote === n ? "border-amber-500 bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  <input
                    value={sheetNote}
                    onChange={(e) => setSheetNote(e.target.value)}
                    placeholder="Or type a note"
                    className="w-full h-11 px-3 rounded-xl border bg-background text-sm"
                  />
                </div>
              </div>

              <div className="p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] flex items-center gap-3 border-t mt-4 shrink-0">
                <div className="flex items-center gap-1">
                  <button onClick={() => setSheetQty(Math.max(1, sheetQty - 1))} aria-label="Less" className="h-12 w-12 rounded-xl border flex items-center justify-center hover:bg-muted">
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="text-lg font-black w-8 text-center tabular-nums">{sheetQty}</span>
                  <button onClick={() => setSheetQty(sheetQty + 1)} aria-label="More" className="h-12 w-12 rounded-xl border flex items-center justify-center hover:bg-muted">
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <button onClick={confirmOptions} className="flex-1 h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-sm active:scale-[0.98] transition-all tabular-nums">
                  Add · {formatETB(lineTotal)}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
