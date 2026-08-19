"use client";

import { TrendPoint } from "@/services/analytics";
import { formatETB } from "@/lib/currency";

interface RevenueTrendChartProps {
  data: TrendPoint[];
  title?: string;
  showComparison?: boolean;
}

export function RevenueTrendChart({ data, title = "Revenue Trend", showComparison = true }: RevenueTrendChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="p-6 rounded-xl border bg-card">
        <h3 className="text-sm font-bold mb-4">{title}</h3>
        <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
          No data available for this period.
        </div>
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => Math.max(d.value, d.compare || 0)));
  const hasComparison = showComparison && data.some((d) => d.compare && d.compare > 0);

  return (
    <div className="p-6 rounded-xl border bg-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold">{title}</h3>
        {hasComparison && (
          <div className="flex items-center gap-3 text-[10px] font-bold text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-foreground" /> Current
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-muted-foreground/40" /> Previous
            </span>
          </div>
        )}
      </div>

      <div className="relative h-48">
        {/* Grid lines */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="border-b border-border/50" />
          ))}
        </div>

        {/* Bars */}
        <div className="absolute inset-0 flex items-end gap-1">
          {data.map((point, idx) => {
            const height = maxValue > 0 ? (point.value / maxValue) * 100 : 0;
            const compHeight = maxValue > 0 && point.compare ? (point.compare / maxValue) * 100 : 0;

            return (
              <div key={idx} className="flex-1 flex items-end justify-center gap-0.5 h-full relative group">
                {/* Comparison bar */}
                {hasComparison && compHeight > 0 && (
                  <div
                    className="w-full bg-muted-foreground/20 rounded-t-sm transition-all"
                    style={{ height: `${compHeight}%` }}
                  />
                )}
                {/* Current bar */}
                <div
                  className="w-full bg-foreground rounded-t-sm transition-all"
                  style={{ height: `${height}%` }}
                />
                
                {/* Tooltip */}
                <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  <div className="bg-foreground text-background px-2 py-1 rounded text-[10px] font-bold whitespace-nowrap shadow-lg">
                    {formatETB(point.value)}
                    {point.compare ? ` (prev: ${formatETB(point.compare)})` : ""}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* X-axis labels */}
      <div className="flex gap-1 mt-2">
        {data.map((point, idx) => (
          <div key={idx} className="flex-1 text-center">
            <span className="text-[9px] text-muted-foreground font-medium truncate block">
              {point.label.length > 5 ? point.label.slice(-5) : point.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
