"use client";

import { motion } from "framer-motion";
import { RoundCard, isCardOverdue, orderDestination, orderTicketNumber } from "@/lib/kitchen";
import { KitchenTimer } from "./KitchenTimer";
import { KitchenItem } from "./KitchenItem";
import { KitchenFooter } from "./KitchenFooter";
import { Check, Flame, ArrowRight, Loader2, CircleCheck } from "lucide-react";

interface KitchenCardProps {
  card: RoundCard;
  isNew?: boolean;
  addonMap?: Record<string, string>;
  tableLabels?: Record<string, string>;
  onStartPreparing?: (orderId: string, round: number) => void;
  onMarkReady?: (orderId: string, round: number) => void;
  onInspectOrder?: (order: RoundCard["order"]) => void;
  updatingKey?: string | null;
}

export function KitchenCard({
  card,
  isNew,
  addonMap,
  tableLabels,
  onStartPreparing,
  onMarkReady,
  onInspectOrder,
  updatingKey,
}: KitchenCardProps) {
  const { order, round, status, items, extended, createdAt, startedAt } = card;
  const isUpdating = updatingKey === card.key;
  const overdue = isCardOverdue(card);
  const destination = orderDestination(order, tableLabels);
  const ticketCode = orderTicketNumber(order);

  // Dynamic card border & background tinting based on status & urgency
  let containerStyle = "bg-zinc-900 border-zinc-800 shadow-lg";

  if (status === "PENDING") {
    containerStyle = isNew
      ? "bg-zinc-900 border-amber-500 shadow-[0_0_24px_rgba(245,158,11,0.25)] ring-1 ring-amber-500/50"
      : overdue
      ? "bg-zinc-900 border-red-500/90 shadow-[0_0_20px_rgba(239,68,68,0.2)]"
      : "bg-zinc-900 border-amber-500/40 hover:border-amber-500/80";
  } else if (status === "PREPARING") {
    containerStyle = overdue
      ? "bg-zinc-900 border-red-500/90 shadow-[0_0_20px_rgba(239,68,68,0.2)]"
      : "bg-zinc-900 border-zinc-700/80 hover:border-zinc-500";
  } else if (status === "READY") {
    containerStyle = "bg-zinc-900 border-emerald-500/80 shadow-[0_0_24px_rgba(16,185,129,0.2)]";
  }

  const baselineTime = startedAt || createdAt;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      onClick={() => onInspectOrder?.(order)}
      className={`rounded-[1.25rem] border p-4 flex flex-col justify-between transition-all duration-200 cursor-pointer select-none relative group overflow-hidden ${containerStyle}`}
    >
      {/* Visual Header Glow Bar */}
      {status === "PENDING" && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
      )}
      {status === "PREPARING" && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-zinc-600 animate-pulse" />
      )}
      {status === "READY" && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
      )}

      {/* TOP BAR: Ticket Code, Destination & Radial Timer */}
      <div className="flex items-start justify-between gap-2 pb-3 border-b border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-extrabold text-zinc-50 tracking-tight">
              {destination}
            </span>
            <span className="text-xs font-mono font-bold text-amber-500 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-md">
              #{ticketCode}
            </span>
            {isNew && (
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" title="Fresh Ticket" />
            )}
          </div>

          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs font-bold text-zinc-400">
              {extended ? `Round ${round} • Added later` : `Round ${round}`}
            </span>
            {overdue && (
              <span className="text-[10px] font-black uppercase tracking-wider text-red-400 bg-red-950/80 border border-red-500/50 px-1.5 py-0.5 rounded flex items-center gap-1">
                <Flame className="h-3 w-3 text-red-400" />
                Overdue
              </span>
            )}
          </div>
        </div>

        {/* Radial Timer */}
        <KitchenTimer startedAt={baselineTime} status={status} />
      </div>

      {/* DYNAMIC ITEM LIST */}
      <div className="py-2 space-y-1 my-1">
        {items.map((item, idx) => (
          <KitchenItem key={item.id || idx} item={item} addonMap={addonMap} />
        ))}
      </div>

      {/* CUSTOMER NOTES SUMMARY (IF PRESENT) */}
      {order.notes && (
        <div className="my-2 p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800 text-xs font-semibold text-amber-300/90 leading-relaxed">
          <span className="font-bold text-amber-400 uppercase tracking-wider text-[10px] block mb-0.5">
            Customer Note:
          </span>
          {order.notes}
        </div>
      )}

      {/* CARD FOOTER METADATA */}
      <KitchenFooter
        order={order}
        round={round}
        extended={extended}
        createdAt={createdAt}
        tableLabel={destination}
      />

      {/* PRIMARY TOUCH ACTION BUTTON (Min Height: 56px Preferred) */}
      <div className="mt-3 pt-2">
        {status === "PENDING" && (
          <button
            disabled={isUpdating}
            onClick={(e) => {
              e.stopPropagation();
              onStartPreparing?.(order.id, round);
            }}
            className="w-full h-14 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-amber-950 font-extrabold text-base tracking-wide flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(245,158,11,0.3)] transition-all cursor-pointer disabled:opacity-50 active:scale-98"
          >
            {isUpdating ? (
              <Loader2 className="h-6 w-6 animate-spin text-amber-950" />
            ) : (
              <>
                <ArrowRight className="h-5 w-5 stroke-[3]" />
                <span>START PREPARING</span>
              </>
            )}
          </button>
        )}

        {status === "PREPARING" && (
          <button
            disabled={isUpdating}
            onClick={(e) => {
              e.stopPropagation();
              onMarkReady?.(order.id, round);
            }}
            className="w-full h-14 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-emerald-950 font-extrabold text-base tracking-wide flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(16,185,129,0.3)] transition-all cursor-pointer disabled:opacity-50 active:scale-98"
          >
            {isUpdating ? (
              <Loader2 className="h-6 w-6 animate-spin text-emerald-950" />
            ) : (
              <>
                <Check className="h-6 w-6 stroke-[3]" />
                <span>MARK READY</span>
              </>
            )}
          </button>
        )}

        {status === "READY" && (
          <div className="w-full h-14 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-extrabold text-sm flex items-center justify-center gap-2 select-none">
            <CircleCheck className="h-5 w-5 text-emerald-400" />
            <span>READY FOR PICKUP</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
