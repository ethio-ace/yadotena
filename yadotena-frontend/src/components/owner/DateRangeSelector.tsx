"use client";

import { useState } from "react";
import { OwnerRange, CustomRange } from "@/lib/owner";
import { cn } from "@/lib/utils";
import { CalendarDays } from "lucide-react";

const OPTIONS: { key: OwnerRange; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "quarter", label: "3 Months" },
  { key: "year", label: "This Year" },
  { key: "custom", label: "Custom" },
];

interface DateRangeSelectorProps {
  value: OwnerRange;
  onChange: (range: OwnerRange, custom?: CustomRange) => void;
  /** Currently applied custom range (prefills the picker when present). */
  custom?: CustomRange;
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export function DateRangeSelector({ value, onChange, custom }: DateRangeSelectorProps) {
  const [from, setFrom] = useState(custom?.from ?? todayISO());
  const [to, setTo] = useState(custom?.to ?? todayISO());
  const customActive = value === "custom";

  const applyCustom = () => {
    const start = from || todayISO();
    const end = to && to >= start ? to : start;
    onChange("custom", { from: start, to: end });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
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
            onClick={() => {
              // Clicking Custom just opens the picker; Apply commits the dates.
              if (opt.key !== "custom") onChange(opt.key);
              else if (!customActive) onChange("custom");
            }}
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

      {customActive && (
        <div className="inline-flex items-center gap-2 p-1.5 bg-muted/50 border rounded-xl">
          <CalendarDays className="h-4 w-4 text-muted-foreground ml-1" />
          <label className="sr-only">From date</label>
          <input
            type="date"
            value={from}
            max={to}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-lg border bg-card px-2 py-1 text-xs font-semibold text-foreground"
            aria-label="From date"
          />
          <span className="text-xs text-muted-foreground font-semibold">–</span>
          <label className="sr-only">To date</label>
          <input
            type="date"
            value={to}
            min={from}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-lg border bg-card px-2 py-1 text-xs font-semibold text-foreground"
            aria-label="To date"
          />
          <button
            onClick={applyCustom}
            className="px-3 py-1 rounded-lg bg-foreground text-background text-xs font-black hover:opacity-90 transition-opacity"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}
