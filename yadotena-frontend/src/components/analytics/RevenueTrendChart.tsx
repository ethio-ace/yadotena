"use client";

import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { TrendPoint } from "@/services/analytics";
import { formatETB } from "@/lib/currency";

interface RevenueTrendChartProps {
  data: TrendPoint[];
  title?: string;
  showComparison?: boolean;
}

export function RevenueTrendChart({ data, title = "Revenue Trend", showComparison = true }: RevenueTrendChartProps) {
  const chartData = useMemo(() => {
    if (!data) return [];
    return data.map((d) => ({
      label: d.label.length > 5 ? d.label.slice(5).replace("-", "/") : d.label,
      current: Math.round((d.value || 0) * 100) / 100,
      previous: Math.round((d.compare || 0) * 100) / 100,
    }));
  }, [data]);

  const hasComparison = showComparison && chartData.some((d) => d.previous > 0);

  if (!chartData || chartData.length === 0) {
    return (
      <div className="p-6 rounded-2xl border bg-card shadow-sm">
        <h3 className="text-sm font-black">{title}</h3>
        <div className="h-52 flex items-center justify-center text-muted-foreground text-xs font-bold">
          No data available for this period.
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 rounded-2xl border bg-card shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-black text-foreground">{title}</h3>
          <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
            {hasComparison ? "Comparing current period vs previous period revenue" : "Revenue distribution over time"}
          </p>
        </div>
      </div>

      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
              interval="preserveStartEnd"
              minTickGap={24}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k` : String(v))}
              width={42}
            />
            <Tooltip
              cursor={{ fill: "var(--muted)", opacity: 0.25 }}
              contentStyle={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                fontSize: 12,
              }}
              formatter={(value, name) => [
                formatETB(Number(value ?? 0)),
                name === "current" ? "Current Revenue" : "Previous Period",
              ]}
            />
            {hasComparison && <Legend wrapperStyle={{ fontSize: 11 }} />}
            <Bar dataKey="current" name="current" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={28} />
            {hasComparison && (
              <Bar dataKey="previous" name="previous" fill="#9ca3af" radius={[4, 4, 0, 0]} maxBarSize={28} opacity={0.6} />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
