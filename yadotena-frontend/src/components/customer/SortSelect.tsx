"use client";

import { ArrowUpDown } from "lucide-react";

export type SortKey = "popularity" | "name_asc" | "name_desc" | "price_asc" | "price_desc";

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "popularity", label: "Most Popular" },
  { value: "name_asc", label: "Name (A–Z)" },
  { value: "name_desc", label: "Name (Z–A)" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
];

interface SortSelectProps {
  value: SortKey;
  onChange: (value: SortKey) => void;
}

/** Compact dropdown used by the public menu & shop pages to sort products. */
export function SortSelect({ value, onChange }: SortSelectProps) {
  return (
    <div className="relative flex items-center gap-2 shrink-0">
      <ArrowUpDown className="h-4 w-4 text-muted-foreground pointer-events-none absolute left-3.5 z-10" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as SortKey)}
        aria-label="Sort products"
        className="appearance-none bg-card border border-muted hover:border-muted-foreground/30 text-muted-foreground hover:text-foreground text-xs font-black rounded-full pl-10 pr-8 h-11 cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40"
      >
        {SORT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <svg
        className="pointer-events-none absolute right-3.5 h-3.5 w-3.5 text-muted-foreground"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
      </svg>
    </div>
  );
}

/** Applies the selected sort to a list of catalog items. */
export function sortCatalogItems<T extends { name: string; price: number; orderCount?: number }>(
  items: T[],
  sort: SortKey
): T[] {
  const list = [...items];
  switch (sort) {
    case "name_asc":
      return list.sort((a, b) => a.name.localeCompare(b.name));
    case "name_desc":
      return list.sort((a, b) => b.name.localeCompare(a.name));
    case "price_asc":
      return list.sort((a, b) => a.price - b.price);
    case "price_desc":
      return list.sort((a, b) => b.price - a.price);
    case "popularity":
    default:
      return list.sort((a, b) => (b.orderCount || 0) - (a.orderCount || 0));
  }
}
