"use client";

import { Flame, Clock, CheckCircle2, AlertTriangle } from "lucide-react";

interface KitchenStatsProps {
  pendingCount: number;
  preparingCount: number;
  readyCount: number;
  overdueCount: number;
  activeFilter?: string | null;
  onSelectFilter?: (filter: string | null) => void;
}

export function KitchenStats({
  pendingCount,
  preparingCount,
  readyCount,
  overdueCount,
  activeFilter = null,
  onSelectFilter,
}: KitchenStatsProps) {
  const items = [
    {
      id: "PENDING",
      label: "NEW",
      sublabel: "Waiting for chef",
      count: pendingCount,
      icon: Flame,
      color: "border-blue-500/40 bg-blue-950/20 text-blue-400 hover:border-blue-400",
      activeColor: "bg-blue-600 text-white border-blue-500 shadow-blue-500/20",
      badgeColor: "bg-blue-500 text-zinc-950",
    },
    {
      id: "PREPARING",
      label: "PREPARING",
      sublabel: "On the line",
      count: preparingCount,
      icon: Clock,
      color: "border-amber-500/40 bg-amber-950/20 text-amber-400 hover:border-amber-400",
      activeColor: "bg-amber-500 text-zinc-950 border-amber-400 shadow-amber-500/20",
      badgeColor: "bg-amber-400 text-zinc-950",
    },
    {
      id: "READY",
      label: "READY",
      sublabel: "Waiting for waiter",
      count: readyCount,
      icon: CheckCircle2,
      color: "border-emerald-500/40 bg-emerald-950/20 text-emerald-400 hover:border-emerald-400",
      activeColor: "bg-emerald-600 text-white border-emerald-500 shadow-emerald-500/20",
      badgeColor: "bg-emerald-400 text-zinc-950",
    },
    {
      id: "OVERDUE",
      label: "OVERDUE",
      sublabel: "> 10 mins elapsed",
      count: overdueCount,
      icon: AlertTriangle,
      color: "border-red-500/40 bg-red-950/20 text-red-400 hover:border-red-400",
      activeColor: "bg-red-600 text-white border-red-500 shadow-red-500/20",
      badgeColor: "bg-red-500 text-white animate-pulse",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-zinc-950/90 border-b border-zinc-850">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeFilter === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onSelectFilter?.(isActive ? null : item.id)}
            className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden flex items-center justify-between shadow-md active:scale-[0.98] ${
              isActive ? item.activeColor : item.color
            }`}
          >
            <div>
              <div className="flex items-center gap-1.5 font-black text-xs tracking-wider uppercase opacity-90">
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </div>
              <p className="text-[11px] font-medium opacity-70 mt-0.5">{item.sublabel}</p>
            </div>

            <div
              className={`h-9 min-w-9 px-2 rounded-xl font-black text-lg flex items-center justify-center shadow-inner ${
                isActive ? "bg-black/20 text-current" : item.badgeColor
              }`}
            >
              {item.count}
            </div>
          </button>
        );
      })}
    </div>
  );
}
