/**
 * Printable-menu template. A template describes HOW to display the catalog —
 * it never stores menu items or prices. The renderer queries the live catalog
 * (categories, items, add-ons, payment accounts, business settings) whenever
 * the sheet is previewed or printed, so the menu stays in sync automatically.
 */

export type PaperPreset = "cream" | "white" | "black";
export type MenuFont = "serif" | "sans" | "mono";
export type BodySize = "compact" | "standard" | "large";
export type ItemLayout = "list" | "grid2";

export interface MenuTemplate {
  version: 1;
  page: { size: "A4" | "A5" };
  theme: {
    paper: PaperPreset;
    accent: string;
    headingFont: MenuFont;
    bodySize: BodySize;
    showLogo: boolean;
  };
  masthead: {
    businessName: string;
    tagline: string;
    address: string;
  };
  sections: {
    mode: "all" | "selected";
    selectedCategoryIds: string[];
    layout: ItemLayout;
    showDescription: boolean;
    showPrice: boolean;
    showTags: boolean;
    showPrepTime: boolean;
    showImages: boolean;
  };
  extras: { enabled: boolean };
  payments: { enabled: boolean };
  contact: { enabled: boolean };
  qr: { enabled: boolean; url: string };
  footer: { note: string };
}

const STORAGE_KEY = "yadotena-menu-template-v1";

export const ACCENT_PRESETS = [
  { name: "Ember", value: "#a85a1f" },
  { name: "Forest", value: "#3f6212" },
  { name: "Teal", value: "#0f766e" },
  { name: "Burgundy", value: "#9f1239" },
  { name: "Navy", value: "#1e3a8a" },
  { name: "Slate", value: "#334155" },
];

export const DEFAULT_TEMPLATE: MenuTemplate = {
  version: 1,
  page: { size: "A4" },
  theme: {
    paper: "cream",
    accent: "#a85a1f",
    headingFont: "serif",
    bodySize: "standard",
    showLogo: true,
  },
  masthead: {
    businessName: "Yadotena",
    tagline: "Milk & Foods — Café & Artisan Kitchen",
    address: "Bole Road · Addis Ababa",
  },
  sections: {
    mode: "all",
    selectedCategoryIds: [],
    layout: "grid2",
    showDescription: true,
    showPrice: true,
    showTags: true,
    showPrepTime: false,
    showImages: false,
  },
  extras: { enabled: true },
  payments: { enabled: true },
  contact: { enabled: true },
  qr: { enabled: true, url: "" },
  footer: {
    note: "10% service charge & 15% VAT apply. We hope you enjoy your meal — mesgana, thank you!",
  },
};

function isTemplate(value: unknown): value is MenuTemplate {
  if (!value || typeof value !== "object") return false;
  const t = value as Record<string, unknown>;
  return (
    typeof t.theme === "object" &&
    typeof t.masthead === "object" &&
    typeof t.sections === "object" &&
    typeof t.footer === "object"
  );
}

/** Deep-ish merge so older saved templates keep working when new fields appear. */
export function mergeTemplate(base: MenuTemplate, saved: Partial<MenuTemplate>): MenuTemplate {
  const merged: MenuTemplate = {
    ...base,
    ...saved,
    page: { ...base.page, ...(saved.page || {}) },
    theme: { ...base.theme, ...(saved.theme || {}) },
    masthead: { ...base.masthead, ...(saved.masthead || {}) },
    sections: { ...base.sections, ...(saved.sections || {}) },
    extras: { ...base.extras, ...(saved.extras || {}) },
    payments: { ...base.payments, ...(saved.payments || {}) },
    contact: { ...base.contact, ...(saved.contact || {}) },
    qr: { ...base.qr, ...(saved.qr || {}) },
    footer: { ...base.footer, ...(saved.footer || {}) },
  };
  return merged;
}

export function loadTemplate(): MenuTemplate {
  if (typeof window === "undefined") return DEFAULT_TEMPLATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_TEMPLATE;
    const parsed = JSON.parse(raw);
    return isTemplate(parsed) ? mergeTemplate(DEFAULT_TEMPLATE, parsed) : DEFAULT_TEMPLATE;
  } catch {
    return DEFAULT_TEMPLATE;
  }
}

export function saveTemplate(template: MenuTemplate): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(template));
  } catch {
    // Storage can be unavailable (private mode); the designer still works in-session.
  }
}

/** Physical page width/height in millimetres. */
export function pageSizeMm(size: MenuTemplate["page"]["size"]): { w: number; h: number } {
  return size === "A5" ? { w: 148, h: 210 } : { w: 210, h: 297 };
}
