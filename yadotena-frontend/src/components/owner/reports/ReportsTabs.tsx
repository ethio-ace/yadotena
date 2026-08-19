"use client";

import { cn } from "@/lib/utils";

export type ReportTabKey =
  | "revenue"
  | "menu"
  | "addons"
  | "popularity"
  | "staff"
  | "expenses"
  | "order-types";

const TABS: { key: ReportTabKey; label: string }[] = [
  { key: "revenue", label: "Revenue & Sales" },
  { key: "menu", label: "Menu & Categories" },
  { key: "addons", label: "Add-ons" },
  { key: "popularity", label: "Popularity Trends" },
  { key: "staff", label: "Staff & Roles" },
  { key: "expenses", label: "Expense Report" },
  { key: "order-types", label: "Order Types" },
];

export function ReportsTabs({
  active,
  onChange,
}: {
  active: ReportTabKey;
  onChange: (key: ReportTabKey) => void;
}) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
      {TABS.map((t) => (
        <button
          key={t.key}
          type="button"
          onClick={() => onChange(t.key)}
          className={cn(
            "px-3.5 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all border",
            active === t.key
              ? "bg-amber-500 text-white border-amber-500 shadow-sm"
              : "bg-card text-muted-foreground border-border hover:text-foreground hover:bg-muted/50"
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
