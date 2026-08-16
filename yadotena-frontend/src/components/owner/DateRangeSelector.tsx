"use client";

import { OwnerRange } from "@/lib/owner";
import { cn } from "@/lib/utils";

const OPTIONS: { key: OwnerRange; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "quarter", label: "3 Months" },
  { key: "year", label: "This Year" },
];

interface DateRangeSelectorProps {
  value: OwnerRange;
  onChange: (range: OwnerRange) => void;
}

export function DateRangeSelector({ value, onChange }: DateRangeSelectorProps) {
  return (
    <div
      className="inline-flex items-center gap-1 p-1 bg-muted/50 border rounded-xl"
      role="tablist"
      aria-label="Reporting period"
    >
      {OPTIONS.map((opt) => (
        <button
          key={opt.key}
          role="tab"
          aria-selected={value === opt.key}
          onClick={() => onChange(opt.key)}
          className={cn(
            "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all",
            value === opt.key
              ? "bg-card text-foreground border shadow-sm"
              : "text-muted-foreground hover:text-foreground border border-transparent"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
