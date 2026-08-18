"use client";

import { MenuTemplate, pageSizeMm } from "@/lib/menuTemplate";
import { formatETB } from "@/lib/currency";
import { ChefHat, Phone, MapPin, CreditCard, QrCode } from "lucide-react";

export interface MenuSheetSection {
  title: string;
  description?: string;
  /** True when every item is an over-the-counter retail product. */
  isShop?: boolean;
  items: {
    id: string;
    name: string;
    description?: string;
    price: number;
    dietaryTags?: string[];
    preparationTime?: number;
    image?: string;
  }[];
}

export interface MenuSheetAddon {
  id: string;
  name: string;
  price: number;
}

export interface MenuSheetPayment {
  id: string;
  name: string;
  type: "CASH" | "DIGITAL" | string;
  accountNumber?: string;
  accountName?: string;
}

interface MenuSheetProps {
  template: MenuTemplate;
  sections: MenuSheetSection[];
  addons: MenuSheetAddon[];
  payments: MenuSheetPayment[];
  business: { phone?: string; address?: string } | null;
  /** When true the sheet is being printed: force real physical size, no shadows. */
  printing?: boolean;
}

const PAPER_STYLES: Record<string, { bg: string; ink: string; muted: string; rule: string; chip: string }> = {
  cream: { bg: "#fdfaf3", ink: "#241a10", muted: "#6b5636", rule: "#d9c9a8", chip: "#8a6f45" },
  white: { bg: "#ffffff", ink: "#1c1917", muted: "#57534e", rule: "#d6d3d1", chip: "#78716c" },
  black: { bg: "#16130f", ink: "#f4ede1", muted: "#b3a68c", rule: "#4a3f2e", chip: "#c9b896" },
};

const FONT_STACKS: Record<string, string> = {
  serif: "Georgia, 'Times New Roman', serif",
  sans: "var(--font-geist-sans), system-ui, sans-serif",
  mono: "ui-monospace, 'SF Mono', Menlo, monospace",
};

const BODY_SCALE: Record<string, { item: string; desc: string; section: string; price: string }> = {
  compact: { item: "text-[13px]", desc: "text-[11px]", section: "text-[17px]", price: "text-[13px]" },
  standard: { item: "text-[15px]", desc: "text-[12px]", section: "text-xl", price: "text-[15px]" },
  large: { item: "text-[17px]", desc: "text-[13px]", section: "text-2xl", price: "text-[17px]" },
};

export function MenuSheet({ template, sections, addons, payments, business, printing }: MenuSheetProps) {
  const paper = PAPER_STYLES[template.theme.paper] || PAPER_STYLES.cream;
  const fontStack = FONT_STACKS[template.theme.headingFont] || FONT_STACKS.serif;
  const scale = BODY_SCALE[template.theme.bodySize] || BODY_SCALE.standard;
  const size = pageSizeMm(template.page.size);
  const accent = template.theme.accent;
  const isDarkPaper = template.theme.paper === "black";
  const activePayments = payments.filter((p) => p.type !== "CASH");
  const cashAvailable = payments.some((p) => p.type === "CASH");
  const qrUrl = template.qr.url || (typeof window !== "undefined" ? window.location.origin : "");

  return (
    <div
      className={`menu-sheet mx-auto bg-white shadow-xl ${printing ? "" : "rounded-xl"}`}
      style={{ width: `${size.w}mm`, minHeight: `${size.h}mm`, background: paper.bg }}
      data-print-size={template.page.size}
    >
      <div
        className="flex flex-col"
        style={{
          padding: template.page.size === "A5" ? "10mm 9mm" : "14mm 16mm",
          color: paper.ink,
          fontFamily: fontStack,
          minHeight: `${size.h}mm`,
        }}
      >
        {/* ── Masthead ─────────────────────────────────────────────── */}
        <header className="text-center">
          <div className="flex items-center justify-center gap-3" style={{ color: accent }}>
            <span className="h-px w-14" style={{ background: paper.rule }} />
            {template.theme.showLogo ? (
              <ChefHat className="h-6 w-6" />
            ) : (
              <span className="h-6 w-6 rounded-full border-2" style={{ borderColor: accent }} />
            )}
            <span className="h-px w-14" style={{ background: paper.rule }} />
          </div>
          <h1
            className="mt-4 font-black uppercase leading-tight"
            style={{
              fontSize: template.page.size === "A5" ? "26px" : "38px",
              letterSpacing: "0.16em",
              color: paper.ink,
              fontFamily: fontStack,
            }}
          >
            {template.masthead.businessName}
          </h1>
          {template.masthead.tagline && (
            <p className="mt-1 italic" style={{ fontSize: template.page.size === "A5" ? "13px" : "16px", color: paper.muted }}>
              {template.masthead.tagline}
            </p>
          )}
          {template.masthead.address && (
            <p
              className="mt-2 font-bold uppercase"
              style={{ fontSize: "10px", letterSpacing: "0.28em", color: paper.chip }}
            >
              {template.masthead.address}
            </p>
          )}
          <div className="mt-6 flex items-center justify-center gap-2" style={{ color: paper.chip }}>
            <span className="h-px flex-1 max-w-40" style={{ background: paper.rule }} />
            <span className="text-[10px] font-bold uppercase tracking-[0.22em]">Menu</span>
            <span className="h-px flex-1 max-w-40" style={{ background: paper.rule }} />
          </div>
        </header>

        {/* ── Café menu vs shop & groceries ───────────────────────── */}
        {(() => {
          const menuSections = sections.filter((s) => !s.isShop);
          const shopSections = sections.filter((s) => s.isShop);
          const showMenu = template.sections.showMenu && menuSections.length > 0;
          const showShop = template.sections.showShop && shopSections.length > 0;

          const renderSection = (section: MenuSheetSection) => (
            <section key={section.title} className="break-inside-avoid">
              <div className="flex items-center gap-4">
                <h2
                  className={`font-bold uppercase ${scale.section}`}
                  style={{ letterSpacing: "0.14em", color: paper.ink, fontFamily: fontStack }}
                >
                  {section.title}
                </h2>
                <span className="h-px flex-1" style={{ background: paper.rule }} />
              </div>
              {section.description && (
                <p className="mt-1.5 italic" style={{ fontSize: "12px", color: paper.muted }}>
                  {section.description}
                </p>
              )}

              <div
                className={`mt-4 gap-x-8 gap-y-4 ${
                  template.sections.layout === "grid2" ? "grid grid-cols-1 sm:grid-cols-2" : "grid grid-cols-1"
                }`}
              >
                {section.items.map((item) => (
                  <div key={item.id} className="break-inside-avoid">
                    <div className={`flex gap-2.5 ${template.sections.showImages ? "items-start" : ""}`}>
                      {template.sections.showImages && item.image && (
                        <img
                          src={item.image}
                          alt={item.name}
                          loading="lazy"
                          className="mt-0.5 h-11 w-11 shrink-0 rounded-md object-cover"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-1">
                          <span className={`font-bold ${scale.item} leading-snug break-words`} style={{ color: paper.ink }}>
                            {item.name}
                          </span>
                          {template.sections.showPrice && (
                            <>
                              <span className="flex-1 border-b border-dotted translate-y-[-3px]" style={{ borderColor: paper.chip }} />
                              <span className={`font-bold ${scale.price} whitespace-nowrap`} style={{ color: accent }}>
                                {formatETB(item.price)}
                              </span>
                            </>
                          )}
                        </div>

                        {template.sections.showDescription && item.description && (
                          <p className={`mt-0.5 leading-relaxed ${scale.desc}`} style={{ color: paper.muted }}>
                            {item.description}
                          </p>
                        )}

                        {(template.sections.showTags || template.sections.showPrepTime) && (
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {template.sections.showTags &&
                              item.dietaryTags?.map((tag) => (
                                <span
                                  key={tag}
                                  className="text-[8px] font-bold uppercase tracking-[0.12em] rounded-full border px-2 py-0.5"
                                  style={{ color: paper.chip, borderColor: paper.rule }}
                                >
                                  {tag}
                                </span>
                              ))}
                            {template.sections.showPrepTime && item.preparationTime ? (
                              <span
                                className="text-[8px] font-bold uppercase tracking-[0.12em] rounded-full border px-2 py-0.5"
                                style={{ color: paper.chip, borderColor: paper.rule }}
                              >
                                ~{item.preparationTime} min
                              </span>
                            ) : null}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );

          return (
            <div className="mt-9 space-y-9">
              {showMenu && menuSections.map(renderSection)}

              {showShop && (
                <>
                  {/* New page + master divider: shop is a separate department. */}
                  {template.sections.shopOnNewPage && <div className="break-before-page" aria-hidden="true" />}
                  <div className="flex items-center gap-4 pt-6">
                    <span className="h-px flex-1" style={{ background: paper.rule }} />
                    <h2
                      className={`font-black uppercase ${scale.section}`}
                      style={{ letterSpacing: "0.18em", color: accent, fontFamily: fontStack }}
                    >
                      Shop &amp; Groceries
                    </h2>
                    <span className="h-px flex-1" style={{ background: paper.rule }} />
                  </div>
                  <p className="mt-1 text-center italic" style={{ fontSize: "12px", color: paper.muted }}>
                    Over-the-counter farm pantry — butter, honey, coffee packs &amp; spices
                  </p>
                  <div className="mt-6 space-y-9">
                    {shopSections.map(renderSection)}
                  </div>
                </>
              )}

              {!showMenu && !showShop && (
                <p className="text-center italic" style={{ color: paper.muted }}>
                  No sections selected — enable café menu or shop items in the designer.
                </p>
              )}
            </div>
          );
        })()}

        {/* ── Extras & Sides ───────────────────────────────────────── */}
        {template.extras.enabled && addons.length > 0 && (
          <section className="mt-9 break-inside-avoid">
            <div className="flex items-center gap-4">
              <h2 className={`font-bold uppercase ${scale.section}`} style={{ letterSpacing: "0.14em", color: paper.ink }}>
                Extras &amp; Sides
              </h2>
              <span className="h-px flex-1" style={{ background: paper.rule }} />
            </div>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
              {addons.map((addon) => (
                <div key={addon.id} className="flex items-baseline gap-1 break-inside-avoid">
                  <span className={`font-semibold ${scale.desc}`} style={{ color: paper.ink }}>
                    {addon.name}
                  </span>
                  <span className="flex-1 border-b border-dotted translate-y-[-3px]" style={{ borderColor: paper.chip }} />
                  <span className={`font-bold ${scale.desc} whitespace-nowrap`} style={{ color: accent }}>
                    {formatETB(addon.price)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Payment & Contact & QR blocks ───────────────────────── */}
        {(template.payments.enabled || template.contact.enabled || template.qr.enabled) && (
          <div className="mt-10 break-inside-avoid rounded-lg border p-5" style={{ borderColor: paper.rule, background: isDarkPaper ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.015)" }}>
            <div className={`grid gap-5 ${template.payments.enabled && template.contact.enabled ? "sm:grid-cols-2" : ""}`}>
              {template.payments.enabled && (
                <div>
                  <h3 className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: accent }}>
                    <CreditCard className="h-3.5 w-3.5" /> Payment Methods
                  </h3>
                  <div className="mt-2 space-y-1.5">
                    {cashAvailable && (
                      <p className="text-[11px] font-bold" style={{ color: paper.ink }}>
                        Cash — pay directly at your table or counter
                      </p>
                    )}
                    {activePayments.map((p) => (
                      <p key={p.id} className="text-[11px]" style={{ color: paper.muted }}>
                        <span className="font-bold" style={{ color: paper.ink }}>{p.name}</span>
                        {p.accountNumber ? ` · ${p.accountNumber}` : ""}
                        {p.accountName ? ` (${p.accountName})` : ""}
                      </p>
                    ))}
                    {activePayments.length === 0 && !cashAvailable && (
                      <p className="text-[11px] italic" style={{ color: paper.muted }}>Ask staff for payment options.</p>
                    )}
                  </div>
                </div>
              )}

              {template.contact.enabled && (
                <div>
                  <h3 className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: accent }}>
                    <MapPin className="h-3.5 w-3.5" /> Find Us
                  </h3>
                  <div className="mt-2 space-y-1.5 text-[11px]" style={{ color: paper.muted }}>
                    {business?.address && <p className="flex items-center gap-1.5"><MapPin className="h-3 w-3 shrink-0" style={{ color: paper.chip }} />{business.address}</p>}
                    {business?.phone && <p className="flex items-center gap-1.5"><Phone className="h-3 w-3 shrink-0" style={{ color: paper.chip }} />{business.phone}</p>}
                  </div>
                </div>
              )}

              {template.qr.enabled && (
                <div className={template.payments.enabled && template.contact.enabled ? "sm:col-span-2" : ""}>
                  <h3 className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: accent }}>
                    <QrCode className="h-3.5 w-3.5" /> Scan for Digital Menu
                  </h3>
                  <p className="mt-2 break-all text-[11px] font-mono" style={{ color: paper.muted }}>
                    {qrUrl}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Footer ───────────────────────────────────────────────── */}
        {template.footer.note && (
          <footer className="mt-10 border-t pt-5 text-center" style={{ borderColor: paper.rule }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: paper.chip }}>
              {template.footer.note}
            </p>
          </footer>
        )}
      </div>
    </div>
  );
}
