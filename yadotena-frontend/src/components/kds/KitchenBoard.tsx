"use client";

import { useState } from "react";
import { RoundCard } from "@/lib/kitchen";
import { KitchenColumn } from "./KitchenColumn";

interface KitchenBoardProps {
  pendingCards: RoundCard[];
  preparingCards: RoundCard[];
  readyCards: RoundCard[];
  newCardKeys?: Set<string>;
  addonMap?: Record<string, string>;
  tableLabels?: Record<string, string>;
  onStartPreparing?: (orderId: string, round: number) => void;
  onMarkReady?: (orderId: string, round: number) => void;
  onInspectOrder?: (order: RoundCard["order"]) => void;
  updatingKey?: string | null;
}

export function KitchenBoard({
  pendingCards,
  preparingCards,
  readyCards,
  newCardKeys,
  addonMap,
  tableLabels,
  onStartPreparing,
  onMarkReady,
  onInspectOrder,
  updatingKey,
}: KitchenBoardProps) {
  // Mobile / Tablet tab fallback state
  const [mobileTab, setMobileTab] = useState<"NEW" | "PREP" | "READY">("NEW");

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-3 sm:p-4 select-none">
      {/* MOBILE / TABLET STICKY SEGMENTED TABS (Hidden on Desktop) */}
      <div className="lg:hidden flex p-1 bg-zinc-900 border border-zinc-800 rounded-2xl mb-3 shrink-0">
        <button
          onClick={() => setMobileTab("NEW")}
          className={`flex-1 h-11 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
            mobileTab === "NEW"
              ? "bg-amber-500 text-amber-950 font-black shadow-[0_0_12px_rgba(245,158,11,0.3)]"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          <span>NEW</span>
          <span className="px-1.5 py-0.5 rounded-md bg-zinc-950/40 text-[11px] font-mono">
            {pendingCards.length}
          </span>
        </button>

        <button
          onClick={() => setMobileTab("PREP")}
          className={`flex-1 h-11 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
            mobileTab === "PREP"
              ? "bg-zinc-100 text-zinc-950 font-black shadow-md"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          <span>PREP</span>
          <span className="px-1.5 py-0.5 rounded-md bg-zinc-950/40 text-[11px] font-mono">
            {preparingCards.length}
          </span>
        </button>

        <button
          onClick={() => setMobileTab("READY")}
          className={`flex-1 h-11 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
            mobileTab === "READY"
              ? "bg-emerald-500 text-emerald-950 font-black shadow-[0_0_12px_rgba(16,185,129,0.3)]"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          <span>READY</span>
          <span className="px-1.5 py-0.5 rounded-md bg-zinc-950/40 text-[11px] font-mono">
            {readyCards.length}
          </span>
        </button>
      </div>

      {/* DESKTOP 3-COLUMN KANBAN BOARD & MOBILE TAB SWITCHING */}
      <div className="flex-1 flex gap-3 sm:gap-4 overflow-hidden min-h-0">
        {/* NEW COLUMN */}
        <div className={`flex-1 h-full min-h-0 ${mobileTab === "NEW" ? "block" : "hidden lg:block"}`}>
          <KitchenColumn
            title="NEW TICKETS"
            status="PENDING"
            cards={pendingCards}
            newCardKeys={newCardKeys}
            addonMap={addonMap}
            tableLabels={tableLabels}
            onStartPreparing={onStartPreparing}
            onInspectOrder={onInspectOrder}
            updatingKey={updatingKey}
          />
        </div>

        {/* PREPARING COLUMN */}
        <div className={`flex-1 h-full min-h-0 ${mobileTab === "PREP" ? "block" : "hidden lg:block"}`}>
          <KitchenColumn
            title="PREPARING"
            status="PREPARING"
            cards={preparingCards}
            addonMap={addonMap}
            tableLabels={tableLabels}
            onMarkReady={onMarkReady}
            onInspectOrder={onInspectOrder}
            updatingKey={updatingKey}
          />
        </div>

        {/* READY FOR PICKUP COLUMN */}
        <div className={`flex-1 h-full min-h-0 ${mobileTab === "READY" ? "block" : "hidden lg:block"}`}>
          <KitchenColumn
            title="READY FOR PICKUP"
            status="READY"
            cards={readyCards}
            addonMap={addonMap}
            tableLabels={tableLabels}
            onInspectOrder={onInspectOrder}
            updatingKey={updatingKey}
          />
        </div>
      </div>
    </div>
  );
}
