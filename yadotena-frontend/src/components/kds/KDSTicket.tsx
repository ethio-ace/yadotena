"use client";

import { memo } from "react";
import { RoundCard, orderDestination, orderTicketNumber, addonNames } from "@/lib/kitchen";
import { KDSTimer } from "./KDSTimer";
import { OrderItem } from "@/types";
import { ArrowRight, Check, Loader2, CircleCheck } from "lucide-react";

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

  // Calm border rules: subtle indicators, not aggressive colors.
  // Left amber line for new/extended rounds. Emerald text for ready.
  let borderClass = "border-zinc-800";
  let leftAccent = "";

  if (status === "PENDING") {
    borderClass = extended || isNew ? "border-zinc-700/60" : "border-zinc-800/80";
    if (extended || isNew) {
      leftAccent = "border-l-[3px] border-l-amber-500/80";
    }
  } else if (status === "PREPARING") {
    borderClass = "border-zinc-800/60";
  } else if (status === "READY") {
    borderClass = "border-emerald-500/30";
  }

  return (
    <div
      onClick={() => onInspectOrder?.(order)}
      className={`bg-zinc-900 border ${borderClass} ${leftAccent} rounded-xl p-3.5 flex flex-col justify-between transition-colors cursor-pointer select-none group`}
    >
      {/* TICKET HEADER: TABLE + TICKER + TIMER */}
      <div className="flex items-start justify-between pb-2.5 border-b border-zinc-800/60">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-[17px] font-black text-zinc-50 tracking-tight leading-none uppercase truncate">
              {destination}
            </h3>
            <span className="text-[11px] font-mono font-bold text-zinc-500 shrink-0">
              #{ticketCode}
            </span>
          </div>

          {extended && (
            <div className="mt-1 flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-amber-400/80 uppercase tracking-wider">
                Round {round} · New
              </span>
            </div>
          )}
        </div>

        <KDSTimer startedAt={baselineTime} isReady={status === "READY"} />
      </div>

      {/* ITEMS */}
      <div className="py-2 space-y-2 my-1">
        {items.map((item: OrderItem, idx: number) => {
          const addons = addonNames(item.addons || item.selectedAddons, addonMap);
          const qty = item.quantity || 1;

          return (
            <div key={item.id || idx} className="space-y-0.5">
              <div className="flex items-start gap-2">
                <span className="text-[15px] font-black text-amber-400/90 font-mono shrink-0 leading-none mt-px">
                  {qty}×
                </span>
                <span className="text-[15px] font-extrabold text-zinc-100 leading-snug tracking-tight">
                  {item.name}
                </span>
              </div>

              {addons.length > 0 && (
                <div className="pl-6 space-y-0.5">
                  {addons.map((a, i) => (
                    <div key={i} className="text-[11px] font-semibold text-zinc-500 flex items-center gap-1">
                      <span className="text-zinc-600">+</span>
                      <span>{a}</span>
                    </div>
                  ))}
                </div>
              )}

              {item.specialInstructions && (
                <div className="pl-6 pt-0.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-red-400/90">
                    {item.specialInstructions}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* CUSTOMER NOTE */}
      {order.notes && (
        <div className="my-1 p-2 rounded-lg bg-zinc-950/80 border border-zinc-800/60 text-[11px] font-semibold text-zinc-400">
          {order.notes}
        </div>
      )}

      {/* ACTION BUTTON */}
      <div className="pt-2 border-t border-zinc-800/50 mt-1">
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
            className="w-full h-14 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700 font-extrabold text-sm tracking-wide flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
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
          <div className="w-full h-14 rounded-lg border border-emerald-500/30 bg-zinc-950 text-emerald-400 font-extrabold text-xs flex items-center justify-center gap-1.5 uppercase select-none">
            <CircleCheck className="h-4 w-4" />
            <span>READY FOR PICKUP</span>
          </div>
        )}
      </div>
    </div>
  );
});
