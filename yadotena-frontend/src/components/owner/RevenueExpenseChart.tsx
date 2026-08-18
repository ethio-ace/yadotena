"use client";

import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { OwnerMetrics } from "@/lib/owner";
import { formatETB } from "@/lib/currency";

interface Point {
  label: string;
  revenue: number;
  expenses: number;
  net: number;
}

/**
 * Revenue vs recorded expenses, day by day. Long ranges are auto-bucketed
 * (weeks beyond 90 days) so the bars stay readable; the tooltip keeps exact
 * figures and the net (revenue − expenses) shows in each bar pair.
 */
export function RevenueExpenseChart({ metrics }: { metrics: OwnerMetrics }) {
  const data = useMemo<Point[]>(() => {
    const days = metrics.daily.length;
    const raw = metrics.daily.map((d, i) => ({
      date: d.date,
      revenue: d.revenue,
      expenses: metrics.dailyExpenses[i]?.amount ?? 0,
    }));

    if (days <= 90) {
      return raw.map((p) => ({
        label: p.date.slice(5).replace("-", "/"),
        revenue: Math.round(p.revenue * 100) / 100,
        expenses: Math.round(p.expenses * 100) / 100,
        net: Math.round((p.revenue - p.expenses) * 100) / 100,
      }));
    }

    // Bucket by ISO week: label = Monday of that week.
    const weeks = new Map<string, Point>();
    for (const p of raw) {
      const d = new Date(`${p.date}T00:00:00`);
      const day = (d.getDay() + 6) % 7;
      const monday = new Date(d);
      monday.setDate(d.getDate() - day);
      const key = monday.toISOString().slice(0, 10);
      const cur = weeks.get(key) ?? { label: key, revenue: 0, expenses: 0, net: 0 };
      cur.revenue += p.revenue;
      cur.expenses += p.expenses;
      cur.net = cur.revenue - cur.expenses;
      weeks.set(key, cur);
    }
    return [...weeks.values()].map((w) => ({
      ...w,
      label: w.label.slice(5).replace("-", "/"),
      revenue: Math.round(w.revenue * 100) / 100,
      expenses: Math.round(w.expenses * 100) / 100,
      net: Math.round(w.net * 100) / 100,
    }));
  }, [metrics.daily, metrics.dailyExpenses]);

  const hasExpenses = data.some((p) => p.expenses > 0);

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
            formatter={(value, name) => [formatETB(Number(value ?? 0)), name === "net" ? "Net (rev − exp)" : String(name)]}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="revenue" name="Revenue" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={26} />
          {hasExpenses && (
            <Bar dataKey="expenses" name="Expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={26} />
          )}
          {hasExpenses && <Bar dataKey="net" name="net" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={12} opacity={0.7} />}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
