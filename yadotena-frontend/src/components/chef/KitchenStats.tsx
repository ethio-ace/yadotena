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
      color: "border-blue-500/40 bg-blue-950/20 text-blue-400",
      badgeColor: "bg-blue-500 text-zinc-950",
    },
    {
      id: "PREPARING",
      label: "PREPARING",
      sublabel: "On the line",
      count: preparingCount,
      icon: Clock,
      color: "border-amber-500/40 bg-amber-950/20 text-amber-400",
      badgeColor: "bg-amber-400 text-zinc-950",
    },
    {
      id: "READY",
      label: "READY",
      sublabel: "Waiting for waiter",
      count: readyCount,
      icon: CheckCircle2,
      color: "border-emerald-500/40 bg-emerald-950/20 text-emerald-400",
      badgeColor: "bg-emerald-400 text-zinc-950",
    },
    {
      id: "OVERDUE",
      label: "OVERDUE",
      sublabel: `> ${KITCHEN_URGENT_MIN} mins elapsed`,
      count: overdueCount,
      icon: AlertTriangle,
      color: "border-red-500/40 bg-red-950/20 text-red-400",
      badgeColor: "bg-red-500 text-white animate-pulse",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-zinc-950/90 border-b border-zinc-800">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.id}
            className={`p-3.5 rounded-2xl border text-left relative overflow-hidden flex items-center justify-between shadow-md ${item.color}`}
          >
            <div>
              <div className="flex items-center gap-1.5 font-black text-xs tracking-wider uppercase opacity-90">
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </div>
              <p className="text-[11px] font-medium opacity-70 mt-0.5">{item.sublabel}</p>
            </div>

            <div className={`h-9 min-w-9 px-2 rounded-xl font-black text-lg flex items-center justify-center shadow-inner ${item.badgeColor}`}>
              {item.count}
            </div>
          </div>
        );
      })}
    </div>
  );
}
