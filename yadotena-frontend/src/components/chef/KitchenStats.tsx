"use client";

import { Flame, Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import { KITCHEN_URGENT_MIN } from "@/lib/kitchen";

interface KitchenStatsProps {
  pendingCount: number;
  preparingCount: number;
  readyCount: number;
  overdueCount: number;
}

export function KitchenStats({
  pendingCount,
  preparingCount,
  readyCount,
  overdueCount,
}: KitchenStatsProps) {
  const items = [
    {
      id: "PENDING",
      label: "NEW",
      sublabel: "Waiting for chef",
      count: pendingCount,
      icon: Flame,
      iconColor: "text-amber-500",
      badgeColor: "bg-amber-500/15 text-amber-400 border border-amber-500/25 font-black",
    },
    {
      id: "PREPARING",
      label: "PREPARING",
      sublabel: "On the line",
      count: preparingCount,
      icon: Clock,
      iconColor: "text-zinc-400",
      badgeColor: "bg-zinc-800 text-zinc-200 border border-zinc-700 font-black",
    },
    {
      id: "READY",
      label: "READY",
      sublabel: "Waiting for waiter",
      count: readyCount,
      icon: CheckCircle2,
      iconColor: "text-emerald-500",
      badgeColor: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 font-black",
    },
    {
      id: "OVERDUE",
      label: "OVERDUE",
      sublabel: `> ${KITCHEN_URGENT_MIN} mins elapsed`,
      count: overdueCount,
      icon: AlertTriangle,
      iconColor: "text-red-400",
      badgeColor: "bg-red-500/10 text-red-400 border border-red-500/30 font-black",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-zinc-950 border-b border-zinc-800">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.id}
            className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-900 text-left flex items-center justify-between shadow-sm"
          >
            <div>
              <div className="flex items-center gap-1.5 font-bold text-xs tracking-wider uppercase text-zinc-300">
                <Icon className={`h-4 w-4 shrink-0 ${item.iconColor}`} />
                <span>{item.label}</span>
              </div>
              <p className="text-[11px] font-medium text-zinc-400 mt-0.5">{item.sublabel}</p>
            </div>

            <div className={`h-8 min-w-8 px-2.5 rounded-lg text-sm flex items-center justify-center shadow-sm ${item.badgeColor}`}>
              {item.count}
            </div>
          </div>
        );
      })}
    </div>
  );
}
