"use client";

import { formatETB } from "@/lib/currency";
import { DollarSign, ShoppingBag, Grid3X3, AlertCircle, CreditCard, EyeOff } from "lucide-react";

interface TodaySummaryProps {
  todayRevenue: number;
  totalOrdersCount: number;
  unpaidOrdersCount: number;
  pendingVerificationCount: number;
  outOfStockCount: number;
  occupiedTablesCount: number;
  totalTablesCount: number;
}

export function TodaySummary({
  todayRevenue = 0,
  totalOrdersCount = 0,
  unpaidOrdersCount = 0,
  pendingVerificationCount = 0,
  outOfStockCount = 0,
  occupiedTablesCount = 0,
  totalTablesCount = 0,
}: TodaySummaryProps) {
  const metrics = [
    {
      label: "Today’s Revenue",
      value: formatETB(todayRevenue),
      sub: "Settled & verified sales",
      icon: DollarSign,
      tone: "emerald" as const,
      attention: false,
    },
    {
      label: "Orders Today",
      value: totalOrdersCount.toString(),
      sub: "Tickets created today",
      icon: ShoppingBag,
      tone: "brand" as const,
      attention: false,
    },
    {
      label: "Active Tables",
      value: `${occupiedTablesCount} / ${totalTablesCount}`,
      sub:
        totalTablesCount > 0
          ? `${Math.round((occupiedTablesCount / totalTablesCount) * 100)}% in use`
          : "No tables",
      icon: Grid3X3,
      tone: "brand" as const,
      attention: false,
    },
    {
      label: "Unpaid Orders",
      value: unpaidOrdersCount.toString(),
      sub: unpaidOrdersCount > 0 ? "Awaiting settlement" : "All settled",
      icon: AlertCircle,
      tone: "amber" as const,
    },
    {
      label: "Pending Verification",
      value: pendingVerificationCount.toString(),
      sub: pendingVerificationCount > 0 ? "Digital payments to verify" : "All verified",
      icon: CreditCard,
      tone: "amber" as const,
    },
    {
      label: "Out of Stock",
      value: outOfStockCount.toString(),
      sub: outOfStockCount > 0 ? "Unavailable items" : "Full catalog",
      icon: EyeOff,
      tone: "rose" as const,
    },
  ];

  const toneStyles: Record<string, string> = {
    emerald: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
    brand: "text-primary bg-primary/10",
    amber: "text-amber-600 dark:text-amber-400 bg-amber-500/10",
    rose: "text-rose-600 dark:text-rose-400 bg-rose-500/10",
  };

  return (
    <section className="space-y-3">
      <h2 className="font-black text-sm uppercase tracking-wider text-foreground">Today</h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <div
              key={m.label}
              className="p-4 rounded-2xl border bg-card flex flex-col justify-between shadow-xs"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                  {m.label}
                </span>
                <span className={`p-1.5 rounded-lg ${toneStyles[m.tone]}`}>
                  <Icon className="h-3.5 w-3.5" />
                </span>
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                  {m.value}
                </h3>
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
