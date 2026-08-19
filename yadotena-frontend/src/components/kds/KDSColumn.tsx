"use client";

import { memo } from "react";
import { RoundCard } from "@/lib/kitchen";
import { KDSTicket } from "./KDSTicket";

interface KDSColumnProps {
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

export const KDSColumn = memo(function KDSColumn({
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
}: KDSColumnProps) {
  let titleColor = "text-zinc-300";
  let countBg = "bg-zinc-800 text-zinc-300";

  if (status === "PENDING") {
    titleColor = "text-amber-400 font-black";
    countBg = "bg-amber-500 text-amber-950 font-black";
  } else if (status === "PREPARING") {
    titleColor = "text-zinc-100 font-extrabold";
    countBg = "bg-zinc-800 text-zinc-200 font-bold";
  } else if (status === "READY") {
    titleColor = "text-emerald-400 font-black";
    countBg = "bg-emerald-500 text-emerald-950 font-black";
  }

  return (
    <div className="flex-1 min-w-[300px] max-w-full flex flex-col h-full bg-zinc-950 border border-zinc-800/80 rounded-xl overflow-hidden select-none">
      {/* COLUMN HEADER */}
      <div className="px-3.5 py-3 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/60 shrink-0">
        <div className="flex items-center gap-2">
          <h2 className={`text-sm tracking-wider uppercase ${titleColor}`}>
            {title}
          </h2>
          <span className={`px-2 py-0.5 rounded text-xs font-mono ${countBg}`}>
            {cards.length}
          </span>
        </div>
      </div>

      {/* TICKET QUEUE SCROLL AREA */}
      <div className="flex-1 p-2.5 overflow-y-auto space-y-2.5 scrollbar-thin scrollbar-thumb-zinc-800">
        {cards.map((card) => (
          <KDSTicket
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
          <div className="h-36 border border-dashed border-zinc-800 rounded-lg flex items-center justify-center p-4 text-center">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
              No tickets in {title}
            </span>
          </div>
        )}
      </div>
    </div>
  );
});
