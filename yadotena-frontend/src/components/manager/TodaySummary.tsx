"use client";

import { formatETB } from "@/lib/currency";
import { DollarSign, ShoppingBag, CreditCard, AlertCircle, EyeOff, Grid3X3 } from "lucide-react";

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
      label: "Today's Revenue",
      value: formatETB(todayRevenue),
      sub: "Total settled & verified sales",
      icon: DollarSign,
      color: "border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Total Orders",
      value: totalOrdersCount.toString(),
      sub: "Processed orders today",
      icon: ShoppingBag,
      color: "border-blue-500/20 bg-blue-500/5 text-blue-600 dark:text-blue-400",
    },
    {
      label: "Active Tables",
      value: `${occupiedTablesCount} / ${totalTablesCount}`,
      sub: totalTablesCount > 0 ? `${Math.round((occupiedTablesCount / totalTablesCount) * 100)}% Floor Capacity` : "No tables",
      icon: Grid3X3,
      color: "border-amber-500/20 bg-amber-500/5 text-amber-600 dark:text-amber-400",
    },
    {
      label: "Unpaid Orders",
      value: unpaidOrdersCount.toString(),
      sub: unpaidOrdersCount > 0 ? "Awaiting customer settlement" : "All orders settled",
      icon: AlertCircle,
      color: unpaidOrdersCount > 0 ? "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400" : "border-muted bg-muted/20 text-muted-foreground",
    },
    {
      label: "Pending Verification",
      value: pendingVerificationCount.toString(),
      sub: pendingVerificationCount > 0 ? "Digital payments to verify" : "All verified",
      icon: CreditCard,
      color: pendingVerificationCount > 0 ? "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400" : "border-muted bg-muted/20 text-muted-foreground",
    },
    {
      label: "Out of Stock",
      value: outOfStockCount.toString(),
      sub: outOfStockCount > 0 ? "Unavailable items" : "Full catalog available",
      icon: EyeOff,
      color: outOfStockCount > 0 ? "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400" : "border-muted bg-muted/20 text-muted-foreground",
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-black text-sm uppercase tracking-wider text-foreground">
          TODAY'S OPERATIONAL SUMMARY
        </h2>
        <span className="text-xs font-bold text-muted-foreground">Live Shift Totals</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <div
              key={m.label}
              className={`p-4 rounded-2xl border flex flex-col justify-between shadow-xs ${m.color}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase tracking-wider opacity-80">
                  {m.label}
                </span>
                <Icon className="h-4 w-4 shrink-0 opacity-70" />
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                  {m.value}
                </h3>
                <p className="text-[10px] opacity-75 font-medium mt-0.5 line-clamp-1">
                  {m.sub}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
