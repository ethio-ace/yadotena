"use client";

import { useState, useMemo, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/services/api";
import { MenuItem } from "@/types";
import { Search, X, Plus, Minus, Utensils, MapPin, Receipt, LayoutList, ChevronRight, Bike, Clock } from "lucide-react";
import { ItemDetailModal } from "@/components/customer/ItemDetailModal";
import { formatETB } from "@/lib/currency";
import { getImageUrl, cn } from "@/lib/utils";
import { isRetailProduct } from "@/lib/orderUtils";
import { useCustomerDineIn } from "@/contexts/CustomerDineInContext";

interface Section {
  key: string;
  name: string;
  icon: string;
  description?: string;
  items: MenuItem[];
}

const POPULAR_KEY = "popular";
const sectionId = (key: string) => `menu-section-${key.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
// Header (64px) + sticky category bar (56px) on phones; desktop has no bar,
// so the same offset simply leaves a little breathing room.
const STICKY_OFFSET = 128;

/**
 * Public menu.
 *
 * Phones: a slim sticky bar (all-categories button, scroll-spied chips,
 * search icon) over one scrolling list. Desktop: a sticky category rail with
 * search beside a two-column dish grid. "Popular" is a swipeable strip, not a
 * repeat of the full rows. "+" adds without leaving the page; the cart opens
 * only from the bottom bar. Tapping a dish opens its options.
 */
function MenuContent() {
  const { data: menu = [], isLoading } = useQuery({ queryKey: ["menu"], queryFn: api.menu.getAll });
  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: api.categories.getAll });
  const { data: popularItems = [] } = useQuery({ queryKey: ["menu", "popular"], queryFn: () => api.menu.getPopular(8) });

  const searchParams = useSearchParams();
  const tableParam = searchParams.get("table");
  const tableKeyParam = searchParams.get("k");
  const modeParam = searchParams.get("mode");
  const {
    tableId, tableName, unmatchedTableCode, tablesStatus, setTableId, setIsTablePickerOpen, activeTableOrder,
    orderMode, setOrderMode, deliveryAvailable, deliveryOpenNow, deliveryHours, deliveryFee,
  } = useCustomerDineIn();

  // Scanning a table QR (…/menu?table=t4) connects the table (and means the
  // guest is here, not ordering delivery); the context resolves the code
  // against the real roster. A shared …/menu?mode=delivery link opens delivery.
  useEffect(() => {
    if (tableParam) {
      setTableId(tableParam, tableKeyParam);
      setOrderMode("DINE_IN");
    } else if (modeParam === "delivery") {
      setOrderMode("DELIVERY");
    }
  }, [tableParam, tableKeyParam, modeParam, setTableId, setOrderMode]);
  const isDelivery = orderMode === "DELIVERY";

  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<MenuItem | null>(null);
  const [activeKey, setActiveKey] = useState<string>("");

  const dishes = useMemo(() => menu.filter((m) => !isRetailProduct(m) && m.available !== false), [menu]);

  const popular = useMemo(() => {
    const ranked = popularItems.filter((p) => !isRetailProduct(p) && p.available !== false).slice(0, 8);
    const tagged = dishes.filter((m) => m.dietaryTags?.some((t) => /popular|favorite/i.test(String(t)))).slice(0, 8);
    return ranked.length >= 3 ? ranked : tagged;
  }, [popularItems, dishes]);

  const sections = useMemo<Section[]>(() => {
    const out: Section[] = [];
    // Admin-defined category order first, then any category only seen on items.
    const ordered = [...categories].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    const seen = new Set<string>();
    for (const c of ordered) {
      const items = dishes.filter((m) => m.category === c.name || m.categoryId === c.id);
      items.forEach((m) => seen.add(m.id));
      if (items.length) out.push({ key: c.id, name: c.name, icon: c.icon || "", description: c.description, items });
    }
    const rest = dishes.filter((m) => !seen.has(m.id));
    const byName = new Map<string, MenuItem[]>();
    rest.forEach((m) => byName.set(m.category || "More", [...(byName.get(m.category || "More") || []), m]));
    byName.forEach((items, name) => out.push({ key: `cat-${name}`, name, icon: "", items }));
    return out;
  }, [dishes, categories]);

  // Navigation targets: Popular (if any) followed by the categories.
  const navItems = useMemo(
    () => [
      ...(popular.length ? [{ key: POPULAR_KEY, name: "Popular", icon: "", count: popular.length }] : []),
      ...sections.map((s) => ({ key: s.key, name: s.name, icon: s.icon, count: s.items.length })),
    ],
    [popular.length, sections]
  );

  const query = search.trim().toLowerCase();
  const results = useMemo(
    () => (query ? dishes.filter((m) => m.name.toLowerCase().includes(query) || (m.description || "").toLowerCase().includes(query)) : []),
    [dishes, query]
  );

  // Scroll-spy: the section under the sticky bar drives the active chip/rail item.
  useEffect(() => {
    if (query || navItems.length === 0) return;
    const els = navItems.map((n) => document.getElementById(sectionId(n.key))).filter(Boolean) as HTMLElement[];
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveKey(visible[0].target.getAttribute("data-key") || "");
      },
      { rootMargin: `-${STICKY_OFFSET + 4}px 0px -55% 0px` }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [navItems, query]);

  // Keep the active chip visible inside the horizontal strip (phones).
  const chipsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const strip = chipsRef.current;
    const el = strip?.querySelector<HTMLElement>(`[data-tab="${activeKey}"]`);
    if (!strip || !el) return;
    strip.scrollTo({ left: el.offsetLeft - strip.clientWidth / 2 + el.clientWidth / 2, behavior: "smooth" });
  }, [activeKey]);

  const jumpTo = (key: string) => {
    setSearch("");
    setSearchOpen(false);
    setSheetOpen(false);
    setActiveKey(key);
    // Wait a frame so a closing search/sheet doesn't shift the target.
    requestAnimationFrame(() => document.getElementById(sectionId(key))?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const closeSearch = () => {
    setSearch("");
    setSearchOpen(false);
  };

  // Esc closes the category sheet.
  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSheetOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheetOpen]);

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto p-4 space-y-3 animate-pulse">
        <div className="h-6 w-48 bg-muted rounded-lg" />
        <div className="flex gap-2">{[1, 2, 3, 4].map((i) => <div key={i} className="h-9 w-24 bg-muted rounded-full" />)}</div>
        {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-28 bg-muted rounded-2xl" />)}
      </div>
    );
  }

  const searchField = (autoFocus: boolean) => (
    <div className="relative flex-1">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search dishes and drinks"
        aria-label="Search the menu"
        autoFocus={autoFocus}
        className="w-full h-10 pl-9 pr-9 rounded-xl border bg-card text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
      {search && (
        <button onClick={() => setSearch("")} aria-label="Clear search" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto pb-28 lg:px-6">
      {/* ── Dine in / Delivery switch (only once the owner turns delivery on) ── */}
      {deliveryAvailable && (
        <div className="px-4 lg:px-0 pt-3">
          <div role="radiogroup" aria-label="How would you like your order?" className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-muted max-w-sm">
            {([
              { mode: "DINE_IN", label: "Eat here", Icon: Utensils },
              { mode: "DELIVERY", label: "Delivery", Icon: Bike },
            ] as const).map(({ mode, label, Icon }) => (
              <button
                key={mode}
                role="radio"
                aria-checked={orderMode === mode}
                onClick={() => setOrderMode(mode)}
                className={cn(
                  "h-10 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-colors",
                  orderMode === mode ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Who / where this order is for ──────────────────────────────── */}
      <div className="px-4 lg:px-0 pt-3 pb-2">
        {isDelivery ? (
          <div className="flex items-center gap-2 text-sm">
            {deliveryOpenNow ? (
              <>
                <Bike className="h-4 w-4 text-violet-600 dark:text-violet-400 shrink-0" />
                <span className="font-bold truncate">
                  Delivery{deliveryFee > 0 ? ` · ${formatETB(deliveryFee)} fee` : ""}
                  {deliveryHours && <span className="font-medium text-muted-foreground"> · {deliveryHours}</span>}
                </span>
              </>
            ) : (
              <>
                <Clock className="h-4 w-4 text-amber-600 shrink-0" />
                <span className="font-bold">
                  Delivery is closed now{deliveryHours ? ` — we deliver ${deliveryHours}` : ""}. You can still browse.
                </span>
              </>
            )}
            {activeTableOrder && (
              <Link
                href={`/order/${encodeURIComponent(activeTableOrder.id)}`}
                className="ml-auto h-8 px-3 rounded-lg border bg-card text-xs font-bold flex items-center gap-1.5 shrink-0 hover:bg-muted"
              >
                <Receipt className="h-3.5 w-3.5" /> My order
              </Link>
            )}
          </div>
        ) : tableId ? (
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-primary shrink-0" />
            <span className="font-bold truncate">Ordering for {tableName}</span>
            <button onClick={() => setIsTablePickerOpen(true)} className="text-muted-foreground font-semibold underline-offset-2 hover:underline hover:text-foreground shrink-0">
              Change
            </button>
            {activeTableOrder && (
              <Link
                href={`/order/${encodeURIComponent(activeTableOrder.id)}`}
                className="ml-auto h-8 px-3 rounded-lg border bg-card text-xs font-bold flex items-center gap-1.5 shrink-0 hover:bg-muted"
              >
                <Receipt className="h-3.5 w-3.5" /> My order
              </Link>
            )}
          </div>
        ) : (
          <button
            onClick={() => setIsTablePickerOpen(true)}
            className="w-full rounded-xl border border-dashed border-primary/50 bg-accent px-3 py-2.5 flex items-center gap-3 text-left"
          >
            <MapPin className="h-4 w-4 text-primary shrink-0" />
            <span className="flex-1 min-w-0">
              <span className="block font-bold text-sm leading-tight">Choose your table to order</span>
              <span className="block text-xs text-muted-foreground">
                {tablesStatus === "loading" && tableParam
                  ? "Connecting to your table…"
                  : tablesStatus === "error"
                  ? "We couldn't reach the restaurant. Tap to try again."
                  : tablesStatus === "empty"
                  ? "Table ordering isn't set up yet. Please ask a waiter."
                  : unmatchedTableCode
                  ? `We couldn't find a table called “${unmatchedTableCode}”. Tap to pick yours.`
                  : "Or scan the QR code on your table. You can browse first."}
              </span>
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </button>
        )}
      </div>

      {/* ── Phone/tablet: sticky category bar ─────────────────────────── */}
      <div className="lg:hidden sticky top-[64px] z-30 bg-background/95 backdrop-blur border-b">
        <div className="h-14 px-2 flex items-center gap-1">
          {searchOpen ? (
            <>
              {searchField(true)}
              <button onClick={closeSearch} className="h-10 px-3 text-sm font-bold text-muted-foreground hover:text-foreground shrink-0">
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setSheetOpen(true)}
                aria-label="All categories"
                className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 hover:bg-muted"
              >
                <LayoutList className="h-5 w-5" />
              </button>
              <div className="relative flex-1 min-w-0">
                <div ref={chipsRef} className="flex gap-1 overflow-x-auto scrollbar-none py-1 pr-6 scroll-px-2">
                  {navItems.map((n) => (
                    <button
                      key={n.key}
                      data-tab={n.key}
                      onClick={() => jumpTo(n.key)}
                      aria-current={activeKey === n.key ? "true" : undefined}
                      className={cn(
                        "h-9 px-3.5 rounded-full text-sm font-bold whitespace-nowrap transition-colors shrink-0",
                        activeKey === n.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      )}
                    >
                      {n.name}
                    </button>
                  ))}
                </div>
                {/* Edge fade: says "there is more this way". */}
                <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent" aria-hidden="true" />
              </div>
              <button
                onClick={() => setSearchOpen(true)}
                aria-label="Search the menu"
                className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 hover:bg-muted"
              >
                <Search className="h-5 w-5" />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="lg:grid lg:grid-cols-[232px_minmax(0,1fr)] lg:gap-10 lg:pt-2">
        {/* ── Desktop: sticky category rail ───────────────────────────── */}
        <aside className="hidden lg:block">
          <div className="sticky top-[80px] space-y-3">
            {searchField(false)}
            <nav aria-label="Menu categories" className="space-y-0.5">
              {navItems.map((n) => (
                <button
                  key={n.key}
                  onClick={() => jumpTo(n.key)}
                  aria-current={!query && activeKey === n.key ? "true" : undefined}
                  className={cn(
                    "w-full h-10 px-3 rounded-xl flex items-center gap-2 text-sm text-left transition-colors",
                    !query && activeKey === n.key
                      ? "bg-primary/10 text-primary font-black"
                      : "font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <span className="flex-1 truncate">{n.name}</span>
                  <span className="text-xs tabular-nums opacity-70">{n.count}</span>
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* ── Content ─────────────────────────────────────────────────── */}
        <div className="px-4 lg:px-0 min-w-0">
          {query ? (
            <section className="pt-4">
              <p className="text-sm font-bold text-muted-foreground mb-2">
                {results.length} {results.length === 1 ? "dish matches" : "dishes match"} “{search.trim()}”
              </p>
              <div className="divide-y lg:divide-y-0 lg:grid lg:grid-cols-2 lg:gap-3">
                {results.map((item) => <MenuRow key={item.id} item={item} onOpen={() => setDetailItem(item)} />)}
              </div>
              {results.length === 0 && (
                <div className="py-16 text-center">
                  <p className="font-bold">Nothing on the menu matches that</p>
                  <p className="text-sm text-muted-foreground mt-1">Try a shorter word, or browse by category.</p>
                  <button
                    onClick={() => { closeSearch(); setSheetOpen(true); }}
                    className="mt-4 h-10 px-4 rounded-xl border bg-card text-sm font-bold hover:bg-muted lg:hidden"
                  >
                    Browse categories
                  </button>
                </div>
              )}
            </section>
          ) : (
            <>
              {popular.length > 0 && (
                <section id={sectionId(POPULAR_KEY)} data-key={POPULAR_KEY} style={{ scrollMarginTop: STICKY_OFFSET }} className="pt-4">
                  <h2 className="text-xl font-black tracking-tight">Popular here</h2>
                  <p className="text-sm text-muted-foreground">What guests order most</p>
                  <div className="mt-3 -mx-4 px-4 scroll-px-4 lg:mx-0 lg:px-0 lg:scroll-px-0 flex gap-3 overflow-x-auto scrollbar-none snap-x snap-mandatory pb-1">
                    {popular.map((item) => <PopularCard key={item.id} item={item} onOpen={() => setDetailItem(item)} />)}
                  </div>
                </section>
              )}

              {sections.map((s) => (
                <section key={s.key} id={sectionId(s.key)} data-key={s.key} style={{ scrollMarginTop: STICKY_OFFSET }} className="pt-8">
                  <div className="flex items-baseline gap-2">
                    <h2 className="text-xl font-black tracking-tight">{s.name}</h2>
                    <span className="text-sm font-bold text-muted-foreground tabular-nums">{s.items.length}</span>
                  </div>
                  {s.description && <p className="text-sm text-muted-foreground max-w-prose">{s.description}</p>}
                  <div className="mt-1 divide-y lg:mt-3 lg:divide-y-0 lg:grid lg:grid-cols-2 lg:gap-3">
                    {s.items.map((item) => <MenuRow key={`${s.key}-${item.id}`} item={item} onOpen={() => setDetailItem(item)} />)}
                  </div>
                </section>
              ))}

              {sections.length === 0 && (
                <div className="py-16 text-center text-muted-foreground">
                  <Utensils className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="font-bold">The menu is empty right now.</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Phone: all-categories sheet ───────────────────────────────── */}
      {sheetOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end" role="dialog" aria-modal="true" aria-label="Menu categories">
          <button className="absolute inset-0 bg-black/45 animate-in fade-in duration-150" aria-label="Close categories" onClick={() => setSheetOpen(false)} />
          <div className="relative bg-card rounded-t-3xl max-h-[75vh] flex flex-col animate-in slide-in-from-bottom duration-200 pb-[env(safe-area-inset-bottom)]">
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <h2 className="text-lg font-black">Menu</h2>
              <button onClick={() => setSheetOpen(false)} aria-label="Close" className="h-10 w-10 -mr-2 rounded-xl flex items-center justify-center hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="overflow-y-auto px-2 pb-4">
              {navItems.map((n) => (
                <button
                  key={n.key}
                  onClick={() => jumpTo(n.key)}
                  className={cn(
                    "w-full h-14 px-3 rounded-2xl flex items-center gap-3 text-left transition-colors",
                    activeKey === n.key ? "bg-primary/10 text-primary" : "hover:bg-muted"
                  )}
                >
                  <span className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center text-lg shrink-0" aria-hidden="true">
                    {n.key === POPULAR_KEY ? "★" : n.icon || n.name.charAt(0)}
                  </span>
                  <span className="flex-1 font-bold">{n.name}</span>
                  <span className="text-sm font-semibold text-muted-foreground tabular-nums">{n.count} {n.count === 1 ? "item" : "items"}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}

      <ItemDetailModal item={detailItem} isOpen={!!detailItem} onClose={() => setDetailItem(null)} />
    </div>
  );
}

/** Photo over the dish's initial on a tint: the initial shows while the photo
 *  loads on a slow connection, and stays if there is no photo or it fails. */
function DishImage({ item, className }: { item: MenuItem; className?: string }) {
  const src = item.imageUrl || item.image;
  const [failed, setFailed] = useState(false);
  return (
    <div className={cn("relative bg-accent overflow-hidden flex items-center justify-center", className)}>
      <span className="text-2xl font-black text-primary/40 select-none" aria-hidden="true">{item.name.charAt(0)}</span>
      {src && !failed && (
        <img src={getImageUrl(src)} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" onError={() => setFailed(true)} />
      )}
    </div>
  );
}

/** "+" that turns into a − n + stepper once the dish is in the cart. */
function AddControl({ item, compact = false }: { item: MenuItem; compact?: boolean }) {
  const { addToCart, qtyInCart, decrementItem } = useCustomerDineIn();
  const qty = qtyInCart(item.id);
  const size = compact ? "h-8 w-8" : "h-9 w-9";

  if (qty > 0) {
    return (
      <div className="flex items-center rounded-xl bg-card shadow-md ring-1 ring-border">
        <button onClick={() => decrementItem(item.id)} aria-label={`One less ${item.name}`} className={cn(size, "rounded-l-xl flex items-center justify-center hover:bg-muted")}>
          <Minus className="h-4 w-4" />
        </button>
        <span className="min-w-6 text-center text-sm font-black tabular-nums" aria-live="polite">{qty}</span>
        <button onClick={() => addToCart(item, 1, [], "")} aria-label={`One more ${item.name}`} className={cn(size, "rounded-r-xl bg-primary text-primary-foreground flex items-center justify-center")}>
          <Plus className="h-4 w-4" strokeWidth={3} />
        </button>
      </div>
    );
  }
  return (
    <button
      onClick={() => addToCart(item, 1, [], "")}
      aria-label={`Add ${item.name}`}
      className={cn(size, "rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-md active:scale-95 transition-transform")}
    >
      <Plus className="h-4 w-4" strokeWidth={3} />
    </button>
  );
}

/** One dish: text first, photo on the right with the add control on it. */
function MenuRow({ item, onOpen }: { item: MenuItem; onOpen: () => void }) {
  return (
    <div className="flex gap-4 py-4 lg:p-3 lg:rounded-2xl lg:border lg:bg-card">
      <button onClick={onOpen} className="flex-1 min-w-0 text-left">
        <p className="font-bold leading-snug">{item.name}</p>
        {item.description && <p className="text-sm text-muted-foreground line-clamp-2 mt-1 leading-snug">{item.description}</p>}
        <p className="font-black mt-2 tabular-nums">{formatETB(item.price)}</p>
      </button>
      <div className="relative shrink-0 self-start">
        <button onClick={onOpen} tabIndex={-1} aria-hidden="true" className="block">
          <DishImage item={item} className="h-24 w-24 lg:h-28 lg:w-28 rounded-2xl" />
        </button>
        <div className="absolute -bottom-2 right-1/2 translate-x-1/2">
          <AddControl item={item} compact />
        </div>
      </div>
    </div>
  );
}

/** Compact card for the swipeable Popular strip. */
function PopularCard({ item, onOpen }: { item: MenuItem; onOpen: () => void }) {
  return (
    <div className="w-40 sm:w-44 shrink-0 snap-start">
      <div className="relative">
        <button onClick={onOpen} tabIndex={-1} aria-hidden="true" className="block w-full">
          <DishImage item={item} className="w-full aspect-[4/3] rounded-2xl" />
        </button>
        <div className="absolute bottom-2 right-2">
          <AddControl item={item} compact />
        </div>
      </div>
      <button onClick={onOpen} className="block w-full text-left mt-2">
        <p className="text-sm font-bold leading-snug line-clamp-2">{item.name}</p>
        <p className="text-sm font-black tabular-nums mt-0.5">{formatETB(item.price)}</p>
      </button>
    </div>
  );
}

export default function MenuPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground animate-pulse font-medium">Loading menu…</div>}>
      <MenuContent />
    </Suspense>
  );
}
