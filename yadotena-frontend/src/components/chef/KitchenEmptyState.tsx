"use client";

import { CheckCircle2, Flame, Clock } from "lucide-react";

interface KitchenEmptyStateProps {
  type: "PENDING" | "PREPARING" | "READY" | "ALL_CLEAR";
}

export function KitchenEmptyState({ type }: KitchenEmptyStateProps) {
  const getDetails = () => {
    switch (type) {
      case "PENDING":
        return {
          title: "KITCHEN CLEAR",
          message: "No orders waiting in queue.",
          sub: "New incoming orders will appear here automatically.",
          icon: CheckCircle2,
          color: "text-blue-400/60 border-blue-900/30 bg-blue-950/10",
        };
      case "PREPARING":
        return {
          title: "NOTHING PREPARING",
          message: "No items currently on the line.",
          sub: "Tap 'Start Preparing' on a pending order when ready.",
          icon: Clock,
          color: "text-amber-400/60 border-amber-900/30 bg-amber-950/10",
        };
      case "READY":
        return {
          title: "NO READY TICKETS",
          message: "Pickup counter is clear.",
          sub: "Mark orders ready to notify waiters for table delivery.",
          icon: CheckCircle2,
          color: "text-emerald-400/60 border-emerald-900/30 bg-emerald-950/10",
        };
      case "ALL_CLEAR":
        return {
          title: "✓ KITCHEN CAUGHT UP",
          message: "All current orders are complete.",
          sub: "Great work! Kitchen display station is synchronized.",
          icon: CheckCircle2,
          color: "text-emerald-400 border-emerald-900/50 bg-emerald-950/20",
        };
    }
  };

  const details = getDetails();
  const Icon = details.icon;

  return (
    <div className={`py-16 px-6 text-center border border-dashed rounded-2xl space-y-2 my-auto ${details.color}`}>
      <Icon className="h-10 w-10 mx-auto opacity-70 mb-2" />
      <h3 className="font-black text-sm tracking-wider uppercase">{details.title}</h3>
      <p className="text-xs font-medium text-zinc-300 opacity-90">{details.message}</p>
      <p className="text-[11px] text-zinc-500 opacity-80">{details.sub}</p>
    </div>
  );
}
