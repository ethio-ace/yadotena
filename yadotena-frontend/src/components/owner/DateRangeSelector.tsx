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

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function monthAgoISO(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export function DateRangeSelector({ value, onChange, custom }: DateRangeSelectorProps) {
  const [from, setFrom] = useState(custom?.from ?? monthAgoISO());
  const [to, setTo] = useState(custom?.to ?? todayISO());
  const customActive = value === "custom";

  const handleOptionClick = (key: OwnerRange) => {
    if (key === "custom") {
      const start = from || monthAgoISO();
      const end = to || todayISO();
      onChange("custom", { from: start, to: end });
    } else {
      onChange(key);
    }
  };

  const applyCustom = (newFrom?: string, newTo?: string) => {
    const start = newFrom ?? from ?? monthAgoISO();
    const end = newTo ?? to ?? todayISO();
    const validEnd = end >= start ? end : start;
    onChange("custom", { from: start, to: validEnd });
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
            onClick={() => handleOptionClick(opt.key)}
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
        <div className="inline-flex items-center gap-2 p-1.5 bg-muted/50 border rounded-xl shadow-sm">
          <CalendarDays className="h-4 w-4 text-muted-foreground ml-1" />
          <label className="sr-only">From date</label>
          <input
            type="date"
            value={from}
            max={to}
            onChange={(e) => {
              const val = e.target.value;
              setFrom(val);
              applyCustom(val, to);
            }}
            className="rounded-lg border bg-card px-2 py-1 text-xs font-semibold text-foreground"
            aria-label="From date"
          />
          <span className="text-xs text-muted-foreground font-semibold">–</span>
          <label className="sr-only">To date</label>
          <input
            type="date"
            value={to}
            min={from}
            onChange={(e) => {
              const val = e.target.value;
              setTo(val);
              applyCustom(from, val);
            }}
            className="rounded-lg border bg-card px-2 py-1 text-xs font-semibold text-foreground"
            aria-label="To date"
          />
          <button
            onClick={() => applyCustom()}
            className="px-3 py-1 rounded-lg bg-foreground text-background text-xs font-black hover:opacity-90 transition-opacity"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}

interface DateRangeSelectorProps {
  value: OwnerRange;
  onChange: (range: OwnerRange, custom?: CustomRange) => void;
  custom?: CustomRange;
}
