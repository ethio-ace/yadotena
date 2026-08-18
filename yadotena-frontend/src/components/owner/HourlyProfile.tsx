"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts";
import { OwnerMetrics } from "@/lib/owner";
import { formatETB } from "@/lib/currency";

/**
 * Revenue by hour of day (local café time), zero-filled across all 24 slots.
 * Instantly reveals the café's peak service windows — morning coffee rush,
 * lunch, and dinner — and which hours are dead air.
 */
export function HourlyProfile({ metrics }: { metrics: OwnerMetrics }) {
  const peak = metrics.hourly.reduce((max, h) => (h.revenue > max.revenue ? h : max), metrics.hourly[0] ?? { revenue: 0, orders: 0, hour: "" });
  const totalOrders = metrics.hourly.reduce((s, h) => s + h.orders, 0);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-muted-foreground font-medium">
          {totalOrders} paid orders across the period · peak hour{" "}
          <span className="font-black text-primary">{peak.hour}</span> ({formatETB(peak.revenue)})
        </p>
      </div>
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={metrics.hourly} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="hour"
              tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
              interval={1}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k` : String(v))}
              width={40}
            />
            <Tooltip
              cursor={{ fill: "var(--muted)", opacity: 0.25 }}
              contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }}
              formatter={(value, name) =>
                name === "revenue" ? [formatETB(Number(value ?? 0)), "Revenue"] : [value ?? "—", name]
              }
              labelFormatter={(label) => `Hour ${label}`}
            />
            <ReferenceLine x={peak.hour} stroke="var(--primary)" strokeDasharray="4 4" opacity={0.6} />
            <Bar dataKey="revenue" name="revenue" fill="#f59e0b" radius={[3, 3, 0, 0]} maxBarSize={18} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
