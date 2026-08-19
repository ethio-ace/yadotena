"use client";

import { useState } from "react";
import { Calendar } from "lucide-react";
import { PeriodPreset, DateRange } from "@/services/analytics";

interface AnalyticsToolbarProps {
  period: PeriodPreset;
  onPeriodChange: (period: PeriodPreset, range?: DateRange, compRange?: DateRange) => void;
  customRange?: DateRange;
  customCompRange?: DateRange;
}

const PERIODS: { key: PeriodPreset; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "this_week", label: "This Week" },
  { key: "last_week", label: "Last Week" },
  { key: "this_month", label: "This Month" },
  { key: "last_month", label: "Last Month" },
  { key: "this_year", label: "This Year" },
  { key: "custom", label: "Custom" },
];

function defaultCustomRange(): { start: string; end: string } {
  const end = new Date().toISOString().slice(0, 10);
  const d = new Date();
  d.setDate(d.getDate() - 30);
  const start = d.toISOString().slice(0, 10);
  return { start, end };
}

export function AnalyticsToolbar({
  period,
  onPeriodChange,
  customRange,
}: AnalyticsToolbarProps) {
  const defaults = defaultCustomRange();
  const [showCustom, setShowCustom] = useState(period === "custom");
  const [startDate, setStartDate] = useState(customRange?.start || defaults.start);
  const [endDate, setEndDate] = useState(customRange?.end || defaults.end);

  const handlePeriodClick = (pKey: PeriodPreset) => {
    if (pKey === "custom") {
      setShowCustom(true);
      const s = startDate || defaults.start;
      const e = endDate || defaults.end;
      onPeriodChange("custom", { start: s, end: e });
    } else {
      setShowCustom(false);
      onPeriodChange(pKey);
    }
  };

  const handleCustomApply = () => {
    const s = startDate || defaults.start;
    const e = endDate || defaults.end;
    onPeriodChange("custom", { start: s, end: e });
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
      {/* Period selector */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => handlePeriodClick(p.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              period === p.key
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Custom date range */}
      {showCustom && (
        <div className="flex items-center gap-2 p-2 rounded-xl border bg-card shadow-sm">
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              if (e.target.value && endDate) {
                onPeriodChange("custom", { start: e.target.value, end: endDate });
              }
            }}
            className="h-8 px-2 rounded-lg border bg-background text-xs font-medium"
          />
          <span className="text-xs text-muted-foreground font-bold">–</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              if (startDate && e.target.value) {
                onPeriodChange("custom", { start: startDate, end: e.target.value });
              }
            }}
            className="h-8 px-2 rounded-lg border bg-background text-xs font-medium"
          />
          <button
            onClick={handleCustomApply}
            className="h-8 px-3 rounded-lg bg-foreground text-background text-xs font-black hover:opacity-90 transition-opacity"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}
