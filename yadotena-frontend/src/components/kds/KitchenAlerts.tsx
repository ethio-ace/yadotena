"use client";

import { AlertTriangle, Bell, Flame, ChevronRight } from "lucide-react";
import { RoundCard, isCardOverdue } from "@/lib/kitchen";

interface KitchenAlertsProps {
  cards: RoundCard[];
  onInspectCard?: (card: RoundCard) => void;
}

export function KitchenAlerts({ cards, onInspectCard }: KitchenAlertsProps) {
  // Generate max 5 actionable alerts
  const alerts: Array<{
    id: string;
    type: "OVERDUE" | "PICKUP" | "MODIFIER";
    title: string;
    subtitle: string;
    card: RoundCard;
    icon: any;
    colorClass: string;
  }> = [];

  cards.forEach((c) => {
    if (alerts.length >= 5) return;

    if (isCardOverdue(c)) {
      const mainDish = c.items[0]?.name || "Dish";
      alerts.push({
        id: `overdue-${c.key}`,
        type: "OVERDUE",
        title: `${c.order.tableId ? `Table ${c.order.tableId.replace(/^t/i, "")}` : c.order.type} Overdue`,
        subtitle: `${mainDish} sitting >10m`,
        card: c,
        icon: Flame,
        colorClass: "text-red-400 border-red-500/40 bg-red-950/20",
      });
    } else if (c.status === "READY") {
      alerts.push({
        id: `ready-${c.key}`,
        type: "PICKUP",
        title: `Pickup Ready · ${c.order.tableId ? `Table ${c.order.tableId.replace(/^t/i, "")}` : c.order.type}`,
        subtitle: `${c.items.length} item(s) awaiting waiter`,
        card: c,
        icon: Bell,
        colorClass: "text-emerald-400 border-emerald-500/40 bg-emerald-950/20",
      });
    }
  });

  if (alerts.length === 0) {
    return (
      <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-3 text-center">
        <span className="text-[11px] font-medium text-zinc-500">
          No urgent alerts right now.
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[11px] font-bold text-zinc-400 uppercase tracking-wider px-1">
        <span className="flex items-center gap-1.5 text-red-400">
          <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
          Action Alerts ({alerts.length})
        </span>
      </div>

      <div className="space-y-1.5">
        {alerts.map((a) => {
          const Icon = a.icon;
          return (
            <div
              key={a.id}
              onClick={() => onInspectCard?.(a.card)}
              className={`p-2.5 rounded-xl border ${a.colorClass} hover:brightness-110 transition-all cursor-pointer flex items-center justify-between group active:scale-98`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon className="h-4 w-4 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-black text-zinc-100 truncate">
                    {a.title}
                  </div>
                  <div className="text-[10px] font-medium text-zinc-400 truncate">
                    {a.subtitle}
                  </div>
                </div>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-zinc-500 group-hover:text-zinc-300 transition-colors shrink-0" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
