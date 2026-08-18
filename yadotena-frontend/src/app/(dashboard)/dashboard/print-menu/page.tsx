"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ACCENT_PRESETS,
  DEFAULT_TEMPLATE,
  MenuTemplate,
  loadTemplate,
  mergeTemplate,
  pageSizeMm,
  saveTemplate,
} from "@/lib/menuTemplate";
import { MenuSheet } from "@/components/dashboard/MenuSheet";
import { isRetailProduct } from "@/lib/orderUtils";
import {
  Printer,
  ShieldAlert,
  Settings2,
  Eye,
  FileText,
  RotateCcw,
  Check,
  UtensilsCrossed,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Mode = "design" | "preview" | "print";

export default function PrintableMenuPage() {
  const { data: session } = useSession();
  const role = (session?.user?.role || "").toUpperCase();
  const isOwner = role === "OWNER";

  const [mode, setMode] = useState<Mode>("design");
  const [template, setTemplate] = useState<MenuTemplate>(() => loadTemplate());
  const [savedFlash, setSavedFlash] = useState(false);

  // Auto-save whenever the template changes; flash a subtle "Saved" chip.
  useEffect(() => {
    saveTemplate(template);
    const show = setTimeout(() => setSavedFlash(true), 0);
    const hide = setTimeout(() => setSavedFlash(false), 1600);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, [template]);

  const patch = (p: Partial<MenuTemplate>) => setTemplate((prev) => mergeTemplate(prev, p));
  const patchTheme = (p: Partial<MenuTemplate["theme"]>) => patch({ theme: { ...template.theme, ...p } });
  const patchMasthead = (p: Partial<MenuTemplate["masthead"]>) => patch({ masthead: { ...template.masthead, ...p } });
  const patchSections = (p: Partial<MenuTemplate["sections"]>) => patch({ sections: { ...template.sections, ...p } });
  const patchPage = (p: Partial<MenuTemplate["page"]>) => patch({ page: { ...template.page, ...p } });

  // ── Live catalog data ──────────────────────────────────────────────
  const { data: menu = [], isLoading } = useQuery({
    queryKey: ["menu"],
    queryFn: api.menu.getAll,
  });
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: api.categories.getAll,
  });
  const { data: addons = [] } = useQuery({
    queryKey: ["addons"],
    queryFn: () => api.addons.getAll(),
  });
  const { data: methods = [] } = useQuery({
    queryKey: ["paymentMethods"],
    queryFn: () => api.paymentMethods.getAll(true),
  });
  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: api.settings.get,
  });

  const availableItems = useMemo(() => menu.filter((m) => m.available !== false), [menu]);

  // Group dishes into sections: DB categories first (sort order), leftovers last.
  // Each section is tagged as café menu or shop based on its items (the same
  // retail heuristic the customer storefront uses).
  const sections = useMemo(() => {
    const bucket = new Map<string, (typeof availableItems)[number][]>();
    const put = (key: string, item: (typeof availableItems)[number]) => {
      if (!bucket.has(key)) bucket.set(key, []);
      bucket.get(key)!.push(item);
    };
    for (const item of availableItems) {
      const inDb = item.categoryId && categories.some((c) => c.id === item.categoryId);
      put(inDb ? `cat:${item.categoryId}` : `name:${item.category || "Uncategorized"}`, item);
    }

    const ordered: { title: string; description?: string; isShop: boolean; items: typeof availableItems }[] = [];
    for (const cat of categories) {
      const items = bucket.get(`cat:${cat.id}`);
      if (items?.length) {
        ordered.push({
          title: cat.name,
          description: cat.description,
          isShop: items.every((i) => isRetailProduct(i)),
          items,
        });
        bucket.delete(`cat:${cat.id}`);
      }
    }
    for (const [key, items] of bucket) {
      if (!items.length) continue;
      ordered.push({
        title: key.startsWith("name:") ? key.slice(5) : key.replace(/^cat:/, ""),
        isShop: items.every((i) => isRetailProduct(i)),
        items,
      });
    }
    return ordered;
  }, [availableItems, categories]);

  const shopSectionCount = sections.filter((s) => s.isShop).length;
  const menuSectionCount = sections.length - shopSectionCount;

  // Sections actually shown on the sheet, honoring the template's selection.
  const sheetSections = useMemo(() => {
    if (template.sections.mode === "all") return sections;
    return sections.filter((s) => {
      const cat = categories.find((c) => c.name === s.title);
      return cat ? template.sections.selectedCategoryIds.includes(cat.id) : false;
    });
  }, [sections, template.sections.mode, template.sections.selectedCategoryIds, categories]);

  const activeAddons = useMemo(() => addons.filter((a) => a.isActive !== false), [addons]);

  const sheetPayments = useMemo(() => {
    const raw = (methods || []) as {
      id: string;
      name: string;
      type: string;
      accountNumber?: string;
      accountName?: string;
    }[];
    return raw.map((m) => ({
      id: m.id,
      name: m.name,
      type: m.type,
      accountNumber: m.accountNumber,
      accountName: m.accountName,
    }));
  }, [methods]);

  const business = useMemo(() => {
    const s = (settings || {}) as { phone?: string; address?: string };
    return {
      phone: s.phone || "",
      address: s.address || template.masthead.address,
    };
  }, [settings, template.masthead.address]);

  // ── Preview scaling (mm → px so the sheet fits the pane) ──────────
  const previewRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(0.6);
  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    const compute = () => {
      const sheetPx = (pageSizeMm(template.page.size).w / 25.4) * 96;
      // Floor stays low so the sheet still fits the right-hand pane when the
      // editor takes its column on narrow screens — the sheet is always
      // visible beside the settings, never hidden behind a toggle.
      setZoom(Math.min(1, Math.max(0.14, (el.clientWidth - 24) / sheetPx)));
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [template.page.size]);

  const sheetPx = (pageSizeMm(template.page.size).w / 25.4) * 96;
  const zoomedW = Math.round(sheetPx * zoom);

  if (!isOwner) {
    return (
      <div className="space-y-6 animate-in fade-in duration-200 pb-16">
        <div className="max-w-2xl mx-auto rounded-2xl border border-amber-500/30 bg-amber-500/5 shadow-sm p-8 text-center">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h2 className="font-black text-xl text-foreground">Owner Access Required</h2>
          <p className="text-sm text-muted-foreground mt-1.5">
            The printable menu is a brand asset controlled by the business owner. Ask the owner to design and print it.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-200 pb-16">
      {/* @page must match the selected paper size for correct printing. */}
      <style>{`@page { size: ${template.page.size} portrait; margin: 0; }`}</style>

      {/* ── Top bar ────────────────────────────────────────────────── */}
      <div className="print:hidden flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <UtensilsCrossed className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
              <span>Menu Designer</span>
            </h2>
            <p className="text-xs text-muted-foreground">
              Design once — the sheet always renders your live catalog. Edit, preview, then print.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-2xl border text-xs font-bold">
            {(
              [
                { id: "design" as Mode, label: "Design", icon: Settings2 },
                { id: "preview" as Mode, label: "Preview", icon: Eye },
                { id: "print" as Mode, label: "Print", icon: FileText },
              ] as { id: Mode; label: string; icon: React.ElementType }[]
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setMode(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl transition-all",
                  mode === tab.id ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          <Button
            onClick={() => {
              setTemplate(DEFAULT_TEMPLATE);
              setMode("design");
            }}
            variant="outline"
            className="rounded-xl h-9 px-3 text-xs font-bold gap-1.5"
            title="Reset template to defaults"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </Button>

          <Button
            onClick={() => window.print()}
            className="rounded-xl h-9 px-4 text-xs font-black bg-primary text-primary-foreground gap-1.5 shadow-md shadow-primary/25"
          >
            <Printer className="h-4 w-4" />
            Print
          </Button>

          <span
            className={cn(
              "flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 transition-opacity",
              savedFlash ? "opacity-100" : "opacity-0"
            )}
            aria-live="polite"
          >
            <Check className="h-3.5 w-3.5" /> Saved
          </span>
        </div>
      </div>

      {/* ── Design mode: editor + live sheet ───────────────────────── */}
      {mode === "design" && (
        <div className="grid grid-cols-[minmax(220px,260px)_minmax(0,1fr)] sm:grid-cols-[minmax(250px,290px)_minmax(0,1fr)] lg:grid-cols-[minmax(300px,360px)_minmax(0,1fr)] gap-4 lg:gap-6 items-start">
          {/* Editor panel — the preview always sits beside it, same page. */}
          <div className="space-y-4 print:hidden min-w-0">
            {/* Page & theme */}
            <section className="bg-card rounded-2xl border shadow-sm p-4 space-y-3.5">
              <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground">Page &amp; Theme</h3>

              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-foreground">Paper size</span>
                <div className="flex gap-1 bg-muted/60 p-1 rounded-xl text-xs font-bold">
                  {(["A4", "A5"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => patchPage({ size: s })}
                      className={cn(
                        "px-3 py-1.5 rounded-lg transition-all",
                        template.page.size === s ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-foreground">Paper tone</span>
                <div className="flex gap-1.5">
                  {(["cream", "white", "black"] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => patchTheme({ paper: p })}
                      title={p}
                      className={cn(
                        "h-7 w-9 rounded-lg border-2 transition-all",
                        template.theme.paper === p ? "ring-2 ring-primary ring-offset-2" : "opacity-70 hover:opacity-100"
                      )}
                      style={{
                        background: p === "cream" ? "#fdfaf3" : p === "white" ? "#ffffff" : "#16130f",
                        borderColor: p === "black" ? "#4a3f2e" : "#d9c9a8",
                      }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <span className="text-sm font-bold text-foreground block mb-1.5">Accent color</span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {ACCENT_PRESETS.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => patchTheme({ accent: c.value })}
                      title={c.name}
                      className={cn(
                        "h-7 w-7 rounded-full border-2 border-black/10 transition-all",
                        template.theme.accent === c.value && "ring-2 ring-primary ring-offset-2"
                      )}
                      style={{ background: c.value }}
                    />
                  ))}
                  <label className="relative h-7 w-7 rounded-full border-2 border-dashed border-muted-foreground/40 cursor-pointer overflow-hidden" title="Custom color">
                    <input
                      type="color"
                      value={template.theme.accent}
                      onChange={(e) => patchTheme({ accent: e.target.value })}
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    />
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-muted-foreground">+</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-foreground">Heading font</span>
                <div className="flex gap-1 bg-muted/60 p-1 rounded-xl text-xs font-bold">
                  {(
                    [
                      { id: "serif", label: "Serif" },
                      { id: "sans", label: "Sans" },
                      { id: "mono", label: "Mono" },
                    ] as const
                  ).map((f) => (
                    <button
                      key={f.id}
                      onClick={() => patchTheme({ headingFont: f.id })}
                      className={cn(
                        "px-2.5 py-1.5 rounded-lg transition-all",
                        template.theme.headingFont === f.id ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
                      )}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-foreground">Body size</span>
                <div className="flex gap-1 bg-muted/60 p-1 rounded-xl text-xs font-bold">
                  {(
                    [
                      { id: "compact", label: "S" },
                      { id: "standard", label: "M" },
                      { id: "large", label: "L" },
                    ] as const
                  ).map((s) => (
                    <button
                      key={s.id}
                      onClick={() => patchTheme({ bodySize: s.id })}
                      className={cn(
                        "px-2.5 py-1.5 rounded-lg transition-all",
                        template.theme.bodySize === s.id ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
                      )}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <Toggle label="Show logo mark" checked={template.theme.showLogo} onChange={(v) => patchTheme({ showLogo: v })} />
            </section>

            {/* Masthead */}
            <section className="bg-card rounded-2xl border shadow-sm p-4 space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground">Masthead</h3>
              <Field label="Business name">
                <Input
                  value={template.masthead.businessName}
                  onChange={(e) => patchMasthead({ businessName: e.target.value })}
                  className="h-9 text-sm rounded-xl"
                />
              </Field>
              <Field label="Tagline">
                <Input
                  value={template.masthead.tagline}
                  onChange={(e) => patchMasthead({ tagline: e.target.value })}
                  className="h-9 text-sm rounded-xl"
                />
              </Field>
              <Field label="Address line">
                <Input
                  value={template.masthead.address}
                  onChange={(e) => patchMasthead({ address: e.target.value })}
                  className="h-9 text-sm rounded-xl"
                />
              </Field>
            </section>

            {/* Sections & items */}
            <section className="bg-card rounded-2xl border shadow-sm p-4 space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground">Sections &amp; Items</h3>

              <div className="space-y-1 rounded-xl border border-dashed border-muted/70 bg-muted/20 p-3">
                <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-2">Include on sheet</p>
                <Toggle
                  label={`Café menu · ${menuSectionCount} sections`}
                  checked={template.sections.showMenu}
                  onChange={(v) => patchSections({ showMenu: v })}
                />
                <Toggle
                  label={`Shop items · ${shopSectionCount} sections`}
                  checked={template.sections.showShop}
                  onChange={(v) => patchSections({ showShop: v })}
                />
                {template.sections.showShop && shopSectionCount > 0 && (
                  <Toggle
                    label="Shop on its own page"
                    checked={template.sections.shopOnNewPage}
                    onChange={(v) => patchSections({ shopOnNewPage: v })}
                  />
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-foreground">Categories</span>
                <div className="flex gap-1 bg-muted/60 p-1 rounded-xl text-xs font-bold">
                  {(
                    [
                      { id: "all", label: "All" },
                      { id: "selected", label: "Pick" },
                    ] as const
                  ).map((m) => (
                    <button
                      key={m.id}
                      onClick={() => patchSections({ mode: m.id })}
                      className={cn(
                        "px-2.5 py-1.5 rounded-lg transition-all",
                        template.sections.mode === m.id ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
                      )}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {template.sections.mode === "selected" && (
                <div className="flex flex-wrap gap-1.5">
                  {categories.map((c) => (
                    <button
                      key={c.id}
                      onClick={() =>
                        patchSections({
                          selectedCategoryIds: template.sections.selectedCategoryIds.includes(c.id)
                            ? template.sections.selectedCategoryIds.filter((id) => id !== c.id)
                            : [...template.sections.selectedCategoryIds, c.id],
                        })
                      }
                      className={cn(
                        "px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-all",
                        template.sections.selectedCategoryIds.includes(c.id)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-muted-foreground border-muted hover:text-foreground"
                      )}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-foreground">Item layout</span>
                <div className="flex gap-1 bg-muted/60 p-1 rounded-xl text-xs font-bold">
                  {(
                    [
                      { id: "list", label: "List" },
                      { id: "grid2", label: "2 Columns" },
                    ] as const
                  ).map((l) => (
                    <button
                      key={l.id}
                      onClick={() => patchSections({ layout: l.id })}
                      className={cn(
                        "px-2.5 py-1.5 rounded-lg transition-all",
                        template.sections.layout === l.id ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
                      )}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <Toggle label="Descriptions" checked={template.sections.showDescription} onChange={(v) => patchSections({ showDescription: v })} />
                <Toggle label="Prices" checked={template.sections.showPrice} onChange={(v) => patchSections({ showPrice: v })} />
                <Toggle label="Dietary tags" checked={template.sections.showTags} onChange={(v) => patchSections({ showTags: v })} />
                <Toggle label="Prep time" checked={template.sections.showPrepTime} onChange={(v) => patchSections({ showPrepTime: v })} />
                <Toggle label="Item photos" checked={template.sections.showImages} onChange={(v) => patchSections({ showImages: v })} />
              </div>
            </section>

            {/* Blocks */}
            <section className="bg-card rounded-2xl border shadow-sm p-4 space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground">Blocks</h3>
              <Toggle label="Extras &amp; Sides (real add-ons)" checked={template.extras.enabled} onChange={(v) => patch({ extras: { ...template.extras, enabled: v } })} />
              <Toggle label="Payment methods" checked={template.payments.enabled} onChange={(v) => patch({ payments: { ...template.payments, enabled: v } })} />
              <Toggle label="Contact / find us" checked={template.contact.enabled} onChange={(v) => patch({ contact: { ...template.contact, enabled: v } })} />
              <Toggle label="Digital menu URL" checked={template.qr.enabled} onChange={(v) => patch({ qr: { ...template.qr, enabled: v } })} />
              {template.qr.enabled && (
                <Field label="URL shown on the sheet">
                  <Input
                    value={template.qr.url}
                    onChange={(e) => patch({ qr: { ...template.qr, url: e.target.value } })}
                    placeholder="https://…/menu"
                    className="h-9 text-xs font-mono rounded-xl"
                  />
                </Field>
              )}
            </section>

            {/* Footer */}
            <section className="bg-card rounded-2xl border shadow-sm p-4 space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground">Footer note</h3>
              <Textarea
                value={template.footer.note}
                onChange={(e) => patch({ footer: { ...template.footer, note: e.target.value } })}
                rows={2}
                className="text-xs rounded-xl resize-none"
              />
            </section>
          </div>

          {/* Live sheet preview — always visible beside the editor. */}
          <div
            ref={previewRef}
            className="bg-muted/30 border rounded-2xl p-3 sm:p-4 overflow-x-auto md:sticky md:top-4 print:hidden min-w-0"
          >
            <div className="flex items-center justify-between mb-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              <span>Live preview · {template.page.size} · {sections.length} sections</span>
              <span>{Math.round(zoom * 100)}%</span>
            </div>
            <div className="mx-auto" style={{ width: zoomedW }}>
              <div style={{ zoom }}>
                <MenuSheet
                  template={template}
                  sections={sheetSections}
                  addons={activeAddons}
                  payments={sheetPayments}
                  business={business}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Preview mode: the sheet alone ──────────────────────────── */}
      {mode === "preview" && (
        <div ref={previewRef} className="bg-muted/30 border rounded-2xl p-6 print:hidden overflow-x-auto">
          <div className="mx-auto" style={{ width: zoomedW }}>
            <div style={{ zoom }}>
              <MenuSheet
                template={template}
                sections={sheetSections}
                addons={activeAddons}
                payments={sheetPayments}
                business={business}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Print mode: full-size sheet, ready to print ────────────── */}
      {mode === "print" && (
        <div className="space-y-4">
          <div className="print:hidden bg-primary/5 border border-primary/20 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground font-medium">
              The sidebar, header, and this toolbar are hidden automatically. The sheet prints at full {template.page.size} size with page breaks kept clean.
            </p>
            <Button onClick={() => window.print()} className="rounded-xl h-10 px-5 text-sm font-black bg-primary text-primary-foreground gap-2 shrink-0">
              <Printer className="h-4 w-4" /> Print final preview
            </Button>
          </div>
          {isLoading ? (
            <div className="mx-auto max-w-3xl h-96 bg-muted/40 rounded-2xl animate-pulse" />
          ) : (
            <MenuSheet
              template={template}
              sections={sheetSections}
              addons={activeAddons}
              payments={sheetPayments}
              business={business}
              printing
            />
          )}
        </div>
      )}
    </div>
  );
}

/* ── Small form helpers ─────────────────────────────────────────────── */

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between gap-2 w-full py-1.5 group"
    >
      <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors text-left">{label}</span>
      <span
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors",
          checked ? "bg-primary border-primary" : "bg-muted border-muted"
        )}
      >
        <span
          className={cn(
            "inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-[22px]" : "translate-x-[3px]"
          )}
        />
      </span>
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
