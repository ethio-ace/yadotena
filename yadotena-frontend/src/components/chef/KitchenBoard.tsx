"use client";

import { useState } from "react";
import { Order } from "@/types";
import { KitchenColumn } from "./KitchenColumn";
import { Flame, Clock, CheckCircle2 } from "lucide-react";
import { buildRoundCards, activeRoundCards } from "@/lib/kitchen";

interface KitchenBoardProps {
  orders: Order[];
  newCardKeys?: Set<string>;
  addonMap?: Record<string, string>;
  tableLabels?: Record<string, string>;
  onStartPreparing: (orderId: string, round: number) => void;
  onMarkReady: (orderId: string, round: number) => void;
  onInspectOrder: (order: Order) => void;
  updatingKey?: string | null;
}

export function KitchenBoard({
  orders,
  newCardKeys,
  addonMap,
  tableLabels,
  onStartPreparing,
  onMarkReady,
  onInspectOrder,
  updatingKey,
}: KitchenBoardProps) {
  const [mobileTab, setMobileTab] = useState<"PENDING" | "PREPARING" | "READY">("PENDING");

  // One card per kitchen round, not per order: a ticket with round 1 cooking
  // and round 2 just arrived shows in both PREPARING and NEW simultaneously.
  // Stable FIFO: oldest round on top; new arrivals slot in at the bottom.
  const cards = activeRoundCards(buildRoundCards(orders)).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const pendingCards = cards.filter((c) => c.status === "PENDING");
  const preparingCards = cards.filter((c) => c.status === "PREPARING");
  const readyCards = cards.filter((c) => c.status === "READY");

  return (
    <div className="flex flex-col flex-1 p-4 max-w-[1800px] mx-auto w-full">
      {/* MOBILE SCREEN TAB CONTROL (Hidden on Tablet/Desktop md+) */}
      <div className="md:hidden flex gap-2 mb-4 bg-zinc-900 p-1.5 rounded-2xl border border-zinc-800">
        <button
          onClick={() => setMobileTab("PENDING")}
          className={`flex-1 py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all ${
            mobileTab === "PENDING"
              ? "bg-amber-500 text-amber-950"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          <Flame className="h-4 w-4" />
          <span>NEW ({pendingCards.length})</span>
        </button>

        <button
          onClick={() => setMobileTab("PREPARING")}
          className={`flex-1 py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all ${
            mobileTab === "PREPARING"
              ? "bg-zinc-200 text-zinc-950"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          <Clock className="h-4 w-4" />
          <span>PREP ({preparingCards.length})</span>
        </button>

        <button
          onClick={() => setMobileTab("READY")}
          className={`flex-1 py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all ${
            mobileTab === "READY"
              ? "bg-emerald-600 text-white"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          <CheckCircle2 className="h-4 w-4" />
          <span>READY ({readyCards.length})</span>
        </button>
      </div>

      {/* MOBILE SINGLE-COLUMN DISPLAY */}
      <div className="md:hidden flex-1">
        {mobileTab === "PENDING" && (
          <KitchenColumn
            title="New Orders"
            status="PENDING"
            cards={pendingCards}
            newCardKeys={newCardKeys}
            addonMap={addonMap}
            tableLabels={tableLabels}
            onStartPreparing={onStartPreparing}
            onInspect={onInspectOrder}
            updatingKey={updatingKey}
          />
        )}
        {mobileTab === "PREPARING" && (
          <KitchenColumn
            title="Preparing"
            status="PREPARING"
            cards={preparingCards}
            addonMap={addonMap}
            tableLabels={tableLabels}
            onMarkReady={onMarkReady}
            onInspect={onInspectOrder}
            updatingKey={updatingKey}
          />
        )}
        {mobileTab === "READY" && (
          <KitchenColumn
            title="Ready for Pickup"
            status="READY"
            cards={readyCards}
            addonMap={addonMap}
            tableLabels={tableLabels}
            onInspect={onInspectOrder}
            updatingKey={updatingKey}
          />
        )}
      </div>

      {/* DESKTOP & TABLET 3-COLUMN GRID DISPLAY (md+) */}
      <div className="hidden md:grid md:grid-cols-3 gap-5 flex-1 items-start">
        <KitchenColumn
          title="New Rounds Waiting"
          status="PENDING"
          cards={pendingCards}
          newCardKeys={newCardKeys}
          addonMap={addonMap}
          tableLabels={tableLabels}
          onStartPreparing={onStartPreparing}
          onInspect={onInspectOrder}
          updatingKey={updatingKey}
        />

        <KitchenColumn
          title="Currently Preparing"
          status="PREPARING"
          cards={preparingCards}
          addonMap={addonMap}
          tableLabels={tableLabels}
          onMarkReady={onMarkReady}
          onInspect={onInspectOrder}
          updatingKey={updatingKey}
        />

        <KitchenColumn
          title="Ready for Waiter"
          status="READY"
          cards={readyCards}
          addonMap={addonMap}
          tableLabels={tableLabels}
          onInspect={onInspectOrder}
          updatingKey={updatingKey}
        />
      </div>
    </div>
  );
}
