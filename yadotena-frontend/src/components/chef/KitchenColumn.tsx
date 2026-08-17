"use client";

import { RoundCard } from "@/lib/kitchen";
import { KitchenOrderCard } from "./KitchenOrderCard";
import { KitchenEmptyState } from "./KitchenEmptyState";

interface KitchenColumnProps {
  title: string;
  status: "PENDING" | "PREPARING" | "READY";
  cards: RoundCard[];
  newCardKeys?: Set<string>;
  addonMap?: Record<string, string>;
  tableLabels?: Record<string, string>;
  onStartPreparing?: (orderId: string, round: number) => void;
  onMarkReady?: (orderId: string, round: number) => void;
  onInspect?: (order: RoundCard["order"]) => void;
  updatingKey?: string | null;
  /** Cap visible cards so the overview stays glanceable; larger queues get a "view all" link. */
  maxCards?: number;
  onShowAll?: () => void;
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
  onInspect,
  updatingKey,
  maxCards,
  onShowAll,
}: KitchenColumnProps) {
  const visibleCards = maxCards && cards.length > maxCards ? cards.slice(0, maxCards) : cards;
  return (
    <div className="flex flex-col h-full rounded-xl border border-zinc-800 bg-zinc-900/30 overflow-hidden">
      {/* Column header — quiet on purpose; the cards carry the state color */}
      <div className="px-4 py-2.5 border-b border-zinc-800 flex items-center justify-between">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">{title}</h2>
        <span className="text-sm font-extrabold text-zinc-300 tabular-nums">{cards.length}</span>
      </div>

      {/* Cards list container */}
      <div className="flex-1 p-3 space-y-3 overflow-y-auto min-h-[400px]">
        {visibleCards.map((card) => (
          <KitchenOrderCard
            key={card.key}
            card={card}
            isNew={newCardKeys?.has(card.key)}
            addonMap={addonMap}
            tableLabels={tableLabels}
            onStartPreparing={onStartPreparing}
            onMarkReady={onMarkReady}
            onInspect={onInspect}
            updatingKey={updatingKey}
          />
        ))}

        {cards.length === 0 && <KitchenEmptyState type={status} />}

        {maxCards && cards.length > maxCards && (
          <button
            onClick={onShowAll}
            className="w-full py-2.5 rounded-lg border border-dashed border-zinc-700 text-[11px] font-bold text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors"
          >
            View all {cards.length} →
          </button>
        )}
      </div>
    </div>
  );
}
