"use client";

import { useState } from "react";
import { RoundCard } from "@/lib/kitchen";
import { KDSColumn } from "./KDSColumn";

interface KDSBoardProps {
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

export function KDSBoard({
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
}: KDSBoardProps) {
  const [mobileTab, setMobileTab] = useState<"NEW" | "PREP" | "READY">("NEW");

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-2 sm:p-3 select-none">
      {/* MOBILE / TABLET SEGMENTED TABS */}
      <div className="lg:hidden flex p-1 bg-zinc-900 border border-zinc-800 rounded-lg mb-2 shrink-0">
        <button
          onClick={() => setMobileTab("NEW")}
          className={`flex-1 h-10 rounded text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all ${
            mobileTab === "NEW"
              ? "bg-amber-500 text-amber-950 font-black"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          <span>NEW</span>
          <span className="px-1.5 py-0.2 rounded bg-zinc-950/40 text-[11px]">
            {pendingCards.length}
          </span>
        </button>

        <button
          onClick={() => setMobileTab("PREP")}
          className={`flex-1 h-10 rounded text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all ${
            mobileTab === "PREP"
              ? "bg-zinc-100 text-zinc-950 font-black"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          <span>PREP</span>
          <span className="px-1.5 py-0.2 rounded bg-zinc-950/40 text-[11px]">
            {preparingCards.length}
          </span>
        </button>

        <button
          onClick={() => setMobileTab("READY")}
          className={`flex-1 h-10 rounded text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all ${
            mobileTab === "READY"
              ? "bg-emerald-500 text-emerald-950 font-black"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          <span>READY</span>
          <span className="px-1.5 py-0.2 rounded bg-zinc-950/40 text-[11px]">
            {readyCards.length}
          </span>
        </button>
      </div>

      {/* 3-COLUMN PRODUCTION QUEUE */}
      <div className="flex-1 flex gap-2.5 overflow-hidden min-h-0">
        {/* NEW COLUMN */}
        <div className={`flex-1 h-full min-h-0 ${mobileTab === "NEW" ? "block" : "hidden lg:block"}`}>
          <KDSColumn
            title="NEW"
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
          <KDSColumn
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
          <KDSColumn
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
