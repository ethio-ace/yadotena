"use client";

import { formatETB } from "@/lib/currency";
import { DollarSign, ShoppingBag, Receipt, Grid3X3 } from "lucide-react";

interface TodaySummaryProps {
  todayRevenue: number;
  totalOrdersCount: number;
  avgOrderValue: number;
  occupiedTablesCount: number;
  totalTablesCount: number;
}

export function TodaySummary({
  todayRevenue = 0,
  totalOrdersCount = 0,
  avgOrderValue = 0,
  occupiedTablesCount = 0,
  totalTablesCount = 0,
}: TodaySummaryProps) {
  const tablePct =
    totalTablesCount > 0 ? Math.round((occupiedTablesCount / totalTablesCount) * 100) : 0;

  const metrics = [
    {
      label: "Today’s Revenue",
      value: formatETB(todayRevenue),
      sub: "Settled & verified sales",
      icon: DollarSign,
      tone: "emerald" as const,
    },
    {
      label: "Orders Today",
      value: totalOrdersCount.toString(),
      sub: "Tickets created today",
      icon: ShoppingBag,
      tone: "brand" as const,
    },
    {
      label: "Avg Ticket",
      value: formatETB(avgOrderValue),
      sub: "Per settled order",
      icon: Receipt,
      tone: "brand" as const,
    },
    {
      label: "Active Tables",
      value: `${occupiedTablesCount} / ${totalTablesCount}`,
      sub: totalTablesCount > 0 ? `${tablePct}% of the floor in use` : "No tables configured",
      icon: Grid3X3,
      tone: "brand" as const,
    },
  ];

  const toneStyles: Record<string, string> = {
    emerald: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
    brand: "text-primary bg-primary/10",
  };

  return (
    <section aria-label="Today’s performance" className="space-y-3">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <div
              key={m.label}
              className="p-4 rounded-2xl border bg-card flex flex-col justify-between shadow-xs"
            >
              <div className="flex items-center justify-between mb-2 gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                  {m.label}
                </span>
                <span className={`p-1.5 rounded-lg shrink-0 ${toneStyles[m.tone]}`} aria-hidden="true">
                  <Icon className="h-3.5 w-3.5" />
                </span>
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-black tracking-tight text-foreground tabular-nums">
                  {m.value}
                </p>
                <p className="text-[10px] text-muted-foreground font-medium mt-0.5 line-clamp-1">
                  {m.sub}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
