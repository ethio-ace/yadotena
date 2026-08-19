"use client";

import { useState } from "react";
import { Calendar, ChevronDown, ArrowLeftRight } from "lucide-react";
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

export function AnalyticsToolbar({
  period,
  onPeriodChange,
  customRange,
  customCompRange,
}: AnalyticsToolbarProps) {
  const [showCustom, setShowCustom] = useState(false);
  const [startDate, setStartDate] = useState(customRange?.start || "");
  const [endDate, setEndDate] = useState(customRange?.end || "");
  const [compStartDate, setCompStartDate] = useState(customCompRange?.start || "");
  const [compEndDate, setCompEndDate] = useState(customCompRange?.end || "");

  const handleCustomApply = () => {
    if (startDate && endDate) {
      onPeriodChange("custom", { start: startDate, end: endDate });
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
      {/* Period selector */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => {
              onPeriodChange(p.key);
              setShowCustom(p.key === "custom");
            }}
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
        <div className="flex items-center gap-2 p-2 rounded-xl border bg-card">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-8 px-2 rounded-lg border bg-background text-xs font-medium"
          />
          <span className="text-xs text-muted-foreground">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="h-8 px-2 rounded-lg border bg-background text-xs font-medium"
          />
          <button
            onClick={handleCustomApply}
            className="h-8 px-3 rounded-lg bg-foreground text-background text-xs font-bold"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}
