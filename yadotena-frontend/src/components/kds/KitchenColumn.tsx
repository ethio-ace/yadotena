"use client";

import { RoundCard } from "@/lib/kitchen";
import { KitchenCard } from "./KitchenCard";

interface KitchenColumnProps {
  title: string;
  status: "PENDING" | "PREPARING" | "READY";
  cards: RoundCard[];
  newCardKeys?: Set<string>;
  addonMap?: Record<string, string>;
  tableLabels?: Record<string, string>;
  onStartPreparing?: (orderId: string, round: number) => void;
  onMarkReady?: (orderId: string, round: number) => void;
  onInspectOrder?: (order: RoundCard["order"]) => void;
  updatingKey?: string | null;
}

export function KitchenColumn({
  title,
  status,
  cards,
  newCardKeys,
  addonMap,
  tableLabels,
  onStartPreparing,
  onMarkReady,
  onInspectOrder,
  updatingKey,
}: KitchenColumnProps) {
  // Compute average wait time in column
  const now = Date.now();
  const times = cards.map((c) =>
    Math.max(0, Math.floor((now - new Date(c.startedAt || c.createdAt).getTime()) / 60000))
  );
  const avgTimeMin = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;

  // Header styling rules: Amber for NEW, Zinc for PREPARING, Emerald for READY
  let headerStyle = "border-zinc-800 bg-zinc-900/90 text-zinc-100";
  let badgeStyle = "bg-zinc-800 text-zinc-300";
  let barColor = "bg-zinc-600";

  if (status === "PENDING") {
    headerStyle = "border-amber-500/40 bg-zinc-900/95 text-amber-400";
    badgeStyle = "bg-amber-500 text-amber-950 font-black shadow-[0_0_12px_rgba(245,158,11,0.3)]";
    barColor = "bg-amber-500";
  } else if (status === "PREPARING") {
    headerStyle = "border-zinc-700 bg-zinc-900/95 text-zinc-100";
    badgeStyle = "bg-zinc-800 text-zinc-200 font-bold";
    barColor = "bg-zinc-400";
  } else if (status === "READY") {
    headerStyle = "border-emerald-500/40 bg-zinc-900/95 text-emerald-400";
    badgeStyle = "bg-emerald-500 text-emerald-950 font-black shadow-[0_0_12px_rgba(16,185,129,0.3)]";
    barColor = "bg-emerald-500";
  }

  return (
    <div className="flex-1 min-w-[320px] max-w-full flex flex-col h-full bg-zinc-950/40 rounded-3xl border border-zinc-800/80 overflow-hidden select-none">
      {/* STICKY COLUMN HEADER */}
      <div className={`p-4 border-b ${headerStyle} backdrop-blur-md sticky top-0 z-10 shrink-0`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <h2 className="text-base font-black tracking-tight uppercase">
              {title}
            </h2>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-black ${badgeStyle}`}>
              {cards.length}
            </span>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
              Avg Time
            </span>
            <span className="text-xs font-mono font-bold text-zinc-200">
              {avgTimeMin} min
            </span>
          </div>
        </div>

        {/* Small Sparkline / Progress Bar */}
        <div className="w-full h-1 bg-zinc-800 rounded-full mt-3 overflow-hidden">
          <div
            className={`h-full ${barColor} transition-all duration-300`}
            style={{ width: `${Math.min(100, cards.length * 15)}%` }}
          />
        </div>
      </div>

      {/* INDEPENDENT SCROLLABLE CARDS AREA */}
      <div className="flex-1 p-3 overflow-y-auto space-y-3 scrollbar-hide">
        {cards.map((card) => (
          <KitchenCard
            key={card.key}
            card={card}
            isNew={newCardKeys?.has(card.key)}
            addonMap={addonMap}
            tableLabels={tableLabels}
            onStartPreparing={onStartPreparing}
            onMarkReady={onMarkReady}
            onInspectOrder={onInspectOrder}
            updatingKey={updatingKey}
          />
        ))}

        {cards.length === 0 && (
          <div className="h-48 border-2 border-dashed border-zinc-800/80 rounded-2xl flex flex-col items-center justify-center p-6 text-center text-zinc-600">
            <span className="text-2xl mb-1">🍳</span>
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
              No tickets in {title}
            </span>
            <span className="text-[11px] font-medium text-zinc-600 mt-0.5">
              Station clear
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
