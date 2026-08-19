"use client";

import { memo } from "react";
import { RoundCard, orderDestination, orderTicketNumber, addonNames } from "@/lib/kitchen";
import { KDSTimer } from "./KDSTimer";
import { OrderItem } from "@/types";
import { ArrowRight, Check, Loader2 } from "lucide-react";

interface KDSTicketProps {
  card: RoundCard;
  isNew?: boolean;
  addonMap?: Record<string, string>;
  tableLabels?: Record<string, string>;
  onStartPreparing?: (orderId: string, round: number) => void;
  onMarkReady?: (orderId: string, round: number) => void;
  onInspectOrder?: (order: RoundCard["order"]) => void;
  updatingKey?: string | null;
}

export const KDSTicket = memo(function KDSTicket({
  card,
  isNew,
  addonMap,
  tableLabels,
  onStartPreparing,
  onMarkReady,
  onInspectOrder,
  updatingKey,
}: KDSTicketProps) {
  const { order, round, status, items, extended, createdAt, startedAt } = card;
  const isUpdating = updatingKey === card.key;
  const destination = orderDestination(order, tableLabels);
  const ticketCode = orderTicketNumber(order);

  const baselineTime = startedAt || createdAt;

  // Visual card container rules: Neutral surface with clean border.
  // New rounds carry a subtle left amber border line (not a glowing entire card).
  let borderStyle = "border-zinc-800";
  let leftAccent = "";

  if (status === "PENDING") {
    borderStyle = "border-zinc-700/80";
    if (extended || isNew) {
      leftAccent = "border-l-4 border-l-amber-500";
    }
  } else if (status === "PREPARING") {
    borderStyle = "border-zinc-800";
  } else if (status === "READY") {
    borderStyle = "border-emerald-500/40";
  }

  return (
    <div
      onClick={() => onInspectOrder?.(order)}
      className={`bg-zinc-900 border ${borderStyle} ${leftAccent} rounded-xl p-3.5 flex flex-col justify-between transition-colors cursor-pointer select-none relative group`}
    >
      {/* TICKET HEADER: TABLE IDENTIFIER & TIMER */}
      <div className="flex items-start justify-between pb-2.5 border-b border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-black text-zinc-50 tracking-tight leading-none uppercase">
              {destination}
            </h3>
            <span className="text-xs font-mono font-bold text-zinc-400">
              #{ticketCode}
            </span>
          </div>

          <div className="flex items-center gap-2 mt-1">
            <span className="text-[11px] font-mono font-bold text-zinc-400 uppercase">
              {extended ? `ROUND ${round} · ADDED LATER` : `ROUND ${round}`}
            </span>
          </div>
        </div>

        {/* Tabular Monospaced Timer */}
        <KDSTimer startedAt={baselineTime} isReady={status === "READY"} />
      </div>

      {/* DISH ITEMS & MODIFIERS */}
      <div className="py-2 space-y-2.5 my-1">
        {items.map((item: OrderItem, idx: number) => {
          const addons = addonNames(item.addons || item.selectedAddons, addonMap);
          const qty = item.quantity || 1;

          return (
            <div key={item.id || idx} className="space-y-0.5">
              <div className="flex items-start gap-2">
                <span className="text-base font-black text-amber-400 font-mono shrink-0">
                  {qty}×
                </span>
                <span className="text-base font-extrabold text-zinc-100 leading-snug tracking-tight">
                  {item.name}
                </span>
              </div>

              {/* Addons Indented */}
              {addons.length > 0 && (
                <div className="pl-6 space-y-0.5">
                  {addons.map((a, i) => (
                    <div key={i} className="text-xs font-semibold text-zinc-400 flex items-center gap-1">
                      <span className="text-zinc-500">+</span>
                      <span>{a}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Special Instructions (Subtle Red/Amber Note) */}
              {item.specialInstructions && (
                <div className="pl-6 pt-0.5">
                  <div className="text-xs font-black uppercase tracking-wider text-red-400 flex items-center gap-1">
                    <span>⚠</span>
                    <span>{item.specialInstructions}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* CUSTOMER NOTES (IF PRESENT) */}
      {order.notes && (
        <div className="my-1.5 p-2 rounded-lg bg-zinc-950/80 border border-zinc-800/80 text-xs font-semibold text-amber-300/90">
          <span className="text-zinc-400 uppercase text-[10px] font-bold block mb-0.5">Note:</span>
          {order.notes}
        </div>
      )}

      {/* PRIMARY TOUCH ACTION BUTTON (56px Preferred Height) */}
      <div className="pt-2 border-t border-zinc-800/60 mt-1">
        {status === "PENDING" && (
          <button
            disabled={isUpdating}
            onClick={(e) => {
              e.stopPropagation();
              onStartPreparing?.(order.id, round);
            }}
            className="w-full h-14 rounded-lg bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-amber-950 font-black text-sm tracking-wide flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            {isUpdating ? (
              <Loader2 className="h-5 w-5 animate-spin text-amber-950" />
            ) : (
              <>
                <ArrowRight className="h-5 w-5 stroke-[2.5]" />
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
            className="w-full h-14 rounded-lg bg-zinc-800 hover:bg-zinc-750 active:bg-zinc-700 text-zinc-100 border border-zinc-700 font-extrabold text-sm tracking-wide flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            {isUpdating ? (
              <Loader2 className="h-5 w-5 animate-spin text-zinc-200" />
            ) : (
              <>
                <Check className="h-5 w-5 text-emerald-400 stroke-[2.5]" />
                <span>MARK READY</span>
              </>
            )}
          </button>
        )}

        {status === "READY" && (
          <div className="w-full h-14 rounded-lg bg-zinc-950 border border-emerald-500/40 text-emerald-400 font-extrabold text-xs flex items-center justify-center gap-1.5 uppercase select-none">
            <Check className="h-4 w-4 text-emerald-400" />
            <span>READY FOR PICKUP</span>
          </div>
        )}
      </div>
    </div>
  );
});
