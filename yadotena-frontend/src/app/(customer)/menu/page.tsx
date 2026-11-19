"use client";

import { useState, useMemo, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/services/api";
import { MenuItem } from "@/types";
import { Search, X, Plus, Minus, Utensils, MapPin, Receipt } from "lucide-react";
import { ItemDetailModal } from "@/components/customer/ItemDetailModal";
import { formatETB } from "@/lib/currency";
import { getImageUrl, cn } from "@/lib/utils";
import { isRetailProduct } from "@/lib/orderUtils";
import { useCustomerDineIn } from "@/contexts/CustomerDineInContext";

interface Section {
  key: string;
  name: string;
  icon: string;
  items: MenuItem[];
}

const POPULAR_KEY = "popular";
const sectionId = (key: string) => `menu-section-${key.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;

/**
 * Public menu: one scrolling list grouped by category with a sticky tab bar.
 * "+" adds a dish without leaving the page; the cart opens only when the
 * guest taps the bottom bar. Tapping a dish opens its options (add-ons, note).
 */
function MenuContent() {
  const { data: menu = [], isLoading } = useQuery({ queryKey: ["menu"], queryFn: api.menu.getAll });
  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: api.categories.getAll });
  const { data: popularItems = [] } = useQuery({ queryKey: ["menu", "popular"], queryFn: () => api.menu.getPopular(8) });

  const searchParams = useSearchParams();
  const tableParam = searchParams.get("table");
  const { tableId, tableName, unmatchedTableCode, setTableId, setIsTablePickerOpen, activeTableOrder } = useCustomerDineIn();

  // Scanning a table QR (…/menu?table=t4) connects the table; the context
  // resolves the code against the real roster.
  useEffect(() => {
    if (tableParam) setTableId(tableParam);
  }, [tableParam, setTableId]);

  const [search, setSearch] = useState("");
  const [detailItem, setDetailItem] = useState<MenuItem | null>(null);
  const [activeKey, setActiveKey] = useState<string>("");

  const dishes = useMemo(() => menu.filter((m) => !isRetailProduct(m) && m.available !== false), [menu]);

  const sections = useMemo<Section[]>(() => {
    const out: Section[] = [];
    const popular = popularItems.filter((p) => !isRetailProduct(p) && p.available !== false).slice(0, 5);
    const fallback = dishes.filter((m) => m.dietaryTags?.some((t) => /popular|favorite/i.test(t))).slice(0, 5);
    const top = popular.length >= 3 ? popular : fallback;
    if (top.length > 0) out.push({ key: POPULAR_KEY, name: "Popular", icon: "🔥", items: top });

    // Admin-defined category order first, then any category only seen on items.
    const ordered = [...categories].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    const seen = new Set<string>();
    for (const c of ordered) {
      const items = dishes.filter((m) => m.category === c.name || m.categoryId === c.id);
      items.forEach((m) => seen.add(m.id));
      if (items.length) out.push({ key: c.id, name: c.name, icon: c.icon || "🍽️", items });
    }
    const rest = dishes.filter((m) => !seen.has(m.id));
    const byName = new Map<string, MenuItem[]>();
    rest.forEach((m) => byName.set(m.category || "More", [...(byName.get(m.category || "More") || []), m]));
    byName.forEach((items, name) => out.push({ key: `cat-${name}`, name, icon: "🍽️", items }));
    return out;
  }, [dishes, categories, popularItems]);

  const query = search.trim().toLowerCase();
  const results = useMemo(
    () => (query ? dishes.filter((m) => m.name.toLowerCase().includes(query) || (m.description || "").toLowerCase().includes(query)) : []),
    [dishes, query]
  );

  // Highlight the tab of the section currently under the sticky bar.
  const tabsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (query || sections.length === 0) return;
    const els = sections.map((s) => document.getElementById(sectionId(s.key))).filter(Boolean) as HTMLElement[];
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveKey(visible[0].target.getAttribute("data-key") || "");
      },
      { rootMargin: "-140px 0px -60% 0px" }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [sections, query]);

  // Keep the active tab scrolled into view in the tab bar.
  useEffect(() => {
    const el = tabsRef.current?.querySelector<HTMLElement>(`[data-tab="${activeKey}"]`);
    el?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [activeKey]);

  const jumpTo = (key: string) => {
    setSearch("");
    setActiveKey(key);
    document.getElementById(sectionId(key))?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto p-4 space-y-3 animate-pulse">
        <div className="h-12 bg-muted rounded-2xl" />
        <div className="flex gap-2">{[1, 2, 3, 4].map((i) => <div key={i} className="h-9 w-24 bg-muted rounded-full" />)}</div>
        {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-24 bg-muted rounded-2xl" />)}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto pb-28">
      {/* Table status — tells the guest whether they can order */}
      <div className="px-4 pt-4">
        {tableId ? (
          <div className="rounded-2xl border bg-card px-4 py-3 flex items-center gap-3">
            <span className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <MapPin className="h-4 w-4" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-black leading-tight truncate">Ordering for {tableName}</p>
              <button onClick={() => setIsTablePickerOpen(true)} className="text-xs font-bold text-muted-foreground hover:text-foreground">
                Not your table? Change
              </button>
            </div>
            {activeTableOrder && (
              <Link
                href={`/order/${encodeURIComponent(activeTableOrder.id)}`}
                className="h-9 px-3 rounded-xl border text-xs font-bold flex items-center gap-1.5 shrink-0 hover:bg-muted"
              >
                <Receipt className="h-3.5 w-3.5" /> My order
              </Link>
            )}
          </div>
        ) : (
          <button
            onClick={() => setIsTablePickerOpen(true)}
            className="w-full rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 px-4 py-3 flex items-center gap-3 text-left"
          >
            <span className="h-9 w-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0">
              <MapPin className="h-4 w-4" />
            </span>
            <span className="flex-1">
              <span className="block font-black leading-tight">Choose your table to order</span>
              <span className="block text-xs text-muted-foreground">
                {unmatchedTableCode
                  ? `We couldn't find a table called “${unmatchedTableCode}”. Tap to pick yours from the list.`
                  : "Or scan the QR code on your table. You can browse first."}
              </span>
            </span>
          </button>
        )}
      </div>

      {/* Sticky search + category tabs */}
      <div className="sticky top-[64px] z-30 bg-background/95 backdrop-blur border-b mt-3">
        <div className="px-4 pt-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search the menu"
              className="w-full h-11 pl-10 pr-10 rounded-2xl border bg-card text-sm"
            />
            {search && (
              <button onClick={() => setSearch("")} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center text-muted-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        {!query && (
          <div ref={tabsRef} className="flex gap-1.5 overflow-x-auto scrollbar-none px-4 py-2.5">
            {sections.map((s) => (
              <button
                key={s.key}
                data-tab={s.key}
                onClick={() => jumpTo(s.key)}
                className={cn(
                  "h-9 px-4 rounded-full text-sm font-bold whitespace-nowrap transition-colors shrink-0",
                  activeKey === s.key ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                {s.icon} {s.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-4">
        {query ? (
          <section className="pt-4">
            <p className="text-xs font-bold text-muted-foreground mb-1">
              {results.length} result{results.length === 1 ? "" : "s"} for “{search.trim()}”
            </p>
            {results.map((item) => <MenuRow key={item.id} item={item} onOpen={() => setDetailItem(item)} />)}
            {results.length === 0 && (
              <div className="py-16 text-center text-muted-foreground">
                <p className="font-bold text-foreground">Nothing matches that</p>
                <p className="text-sm">Try another word, or browse the categories.</p>
              </div>
            )}
          </section>
        ) : (
          sections.map((s) => (
            <section key={s.key} id={sectionId(s.key)} data-key={s.key} className="pt-5 scroll-mt-[180px]">
              <h2 className="text-lg font-black mb-1">{s.icon} {s.name}</h2>
              <div className="divide-y">
                {s.items.map((item) => <MenuRow key={`${s.key}-${item.id}`} item={item} onOpen={() => setDetailItem(item)} />)}
              </div>
            </section>
          ))
        )}
        {!query && sections.length === 0 && (
          <div className="py-16 text-center text-muted-foreground">
            <Utensils className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="font-bold">The menu is empty right now.</p>
          </div>
        )}
      </div>

      <ItemDetailModal item={detailItem} isOpen={!!detailItem} onClose={() => setDetailItem(null)} />
    </div>
  );
}

/** One dish: tap the row for options, tap + to add one straight away. */
function MenuRow({ item, onOpen }: { item: MenuItem; onOpen: () => void }) {
  const { addToCart, qtyInCart, decrementItem } = useCustomerDineIn();
  const qty = qtyInCart(item.id);
  const img = item.imageUrl || item.image;

  return (
    <div className="flex items-center gap-3 py-3">
      <button onClick={onOpen} className="flex-1 min-w-0 flex items-center gap-3 text-left">
        <div className="h-20 w-20 rounded-2xl bg-muted overflow-hidden shrink-0 flex items-center justify-center">
          {img ? (
            <img
              src={getImageUrl(img)}
              alt=""
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <Utensils className="h-6 w-6 text-muted-foreground/40" />
          )}
        </div>
        <div className="min-w-0">
          <p className="font-bold leading-tight">{item.name}</p>
          {item.description && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{item.description}</p>}
          <p className="font-black mt-1 tabular-nums">{formatETB(item.price)}</p>
        </div>
      </button>

      {qty > 0 ? (
        <div className="flex items-center gap-1 shrink-0 rounded-2xl bg-primary/10 p-1">
          <button onClick={() => decrementItem(item.id)} aria-label={`One less ${item.name}`} className="h-9 w-9 rounded-xl bg-background flex items-center justify-center">
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-6 text-center font-black tabular-nums">{qty}</span>
          <button onClick={() => addToCart(item, 1, [], "")} aria-label={`One more ${item.name}`} className="h-9 w-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
            <Plus className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => addToCart(item, 1, [], "")}
          aria-label={`Add ${item.name}`}
          className="h-11 w-11 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-sm active:scale-95 transition-transform"
        >
          <Plus className="h-5 w-5" strokeWidth={3} />
        </button>
      )}
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
