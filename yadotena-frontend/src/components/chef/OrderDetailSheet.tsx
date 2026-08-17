"use client";

import { Order, OrderItem } from "@/types";
import { Play, CheckCircle2, Clock, AlertTriangle, MapPin, RotateCcw } from "lucide-react";
import {
  orderDestination,
  orderTicketNumber,
  addonNames,
  groupItemsByRound,
  roundStatus,
  itemStatus,
} from "@/lib/kitchen";

function ItemCard({ item, addonMap }: { item: OrderItem; addonMap?: Record<string, string> }) {
  const aNames = addonNames(item.selectedAddons, addonMap);
  const status = itemStatus(item);
  return (
    <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/60 space-y-2">
      <div className="flex items-start justify-between gap-2 text-base font-black text-white">
        <span>
          <span className="text-amber-500 font-extrabold mr-2">{item.quantity} ×</span>
          {item.name}
        </span>
        {status !== "PENDING" && (
          <span
            className={`shrink-0 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border ${
              status === "READY"
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                : status === "SERVED"
                  ? "bg-zinc-800 text-zinc-500 border-zinc-700"
                  : "bg-zinc-800 text-zinc-300 border-zinc-700"
            }`}
          >
            {status}
          </span>
        )}
      </div>

      {aNames.length > 0 && (
        <div className="pl-4 space-y-1 text-xs font-medium text-zinc-300 border-l-2 border-amber-500/30">
          {aNames.map((addon, aIdx) => (
            <div key={aIdx} className="flex items-center gap-1">
              <span className="text-amber-500 font-bold">+</span>
              <span>{addon}</span>
            </div>
          ))}
        </div>
      )}

      {item.specialInstructions && (
        <div className="mt-2 bg-amber-500/10 border border-amber-500/30 text-amber-300 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
          <span>⚠ {item.specialInstructions.toUpperCase()}</span>
        </div>
      )}
    </div>
  );
}

const ROUND_STATUS_CHIP: Record<string, string> = {
  PENDING: "bg-amber-500 text-amber-950",
  PREPARING: "bg-zinc-700 text-zinc-100",
  READY: "bg-emerald-600 text-white",
  SERVED: "bg-zinc-800 text-zinc-500",
  CANCELLED: "bg-red-500/10 text-red-400",
};

interface OrderDetailSheetProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onStartPreparing?: (orderId: string, round: number) => void;
  onMarkReady?: (orderId: string, round: number) => void;
  updatingKey?: string | null;
  addonMap?: Record<string, string>;
  tableLabels?: Record<string, string>;
}

export function OrderDetailSheet({
  order,
  isOpen,
  onClose,
  onStartPreparing,
  onMarkReady,
  updatingKey,
  addonMap,
  tableLabels,
}: OrderDetailSheetProps) {
  if (!isOpen || !order) return null;

  const destination = orderDestination(order, tableLabels);
  const rounds = groupItemsByRound(order.items);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end md:items-stretch md:justify-end animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-zinc-950 text-zinc-100 border-t md:border-t-0 md:border-l border-zinc-800 w-full md:w-full md:max-w-md h-[85vh] md:h-full flex flex-col justify-between p-6 shadow-2xl overflow-y-auto animate-in slide-in-from-bottom duration-300 md:slide-in-from-right"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          {/* Header */}
          <div className="flex items-start justify-between border-b border-zinc-800 pb-4 mb-6">
            <div>
              <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg uppercase tracking-wide">
                {orderTicketNumber(order)}
              </span>
              <h2 className="text-2xl font-black text-white mt-2 tracking-tight">
                {destination}
              </h2>
              <div className="mt-2 space-y-1 text-xs text-zinc-400 font-medium">
                <p className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-zinc-500" />
                  <span>
                    Placed at{" "}
                    {new Date(order.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </p>
                {order.type === "DELIVERY" && order.deliveryAddress && (
                  <p className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-zinc-500" />
                    <span>{order.deliveryAddress}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Ticket Items — grouped by kitchen round, each with its own state */}
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">
            Kitchen Items ({order.items?.length || 0})
          </h3>
          <div className="space-y-5">
            {rounds.map(({ round, items }) => {
              const rStatus = roundStatus(items);
              const extended = round > 1;
              return (
                <div key={round} className="rounded-2xl border border-zinc-800 overflow-hidden">
                  <div className="flex items-center justify-between gap-2 px-3.5 py-2 bg-zinc-900/80 border-b border-zinc-800">
                    <div className="flex items-center gap-2 min-w-0">
                      {extended && <RotateCcw className="h-3.5 w-3.5 shrink-0 text-amber-500" />}
                      <span className={`text-[10px] font-black uppercase tracking-wider ${extended ? "text-amber-400" : "text-zinc-400"}`}>
                        {extended ? `Round ${round} · added later` : "Original order"}
                      </span>
                    </div>
                    <span className={`shrink-0 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${ROUND_STATUS_CHIP[rStatus]}`}>
                      {rStatus === "PENDING" ? "Waiting" : rStatus}
                    </span>
                  </div>
                  <div className="p-3 space-y-3">
                    {items.map((item, idx) => (
                      <ItemCard key={item.id || idx} item={item} addonMap={addonMap} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Actions — one per actionable round */}
        <div className="pt-6 border-t border-zinc-800 space-y-3">
          {rounds.map(({ round, items }) => {
            const rStatus = roundStatus(items);
            const isUpdating = updatingKey === `${order.id}:${round}`;
            return (
              <div key={round}>
                {rStatus === "PENDING" && (
                  <button
                    disabled={isUpdating}
                    onClick={() => {
                      onStartPreparing?.(order.id, round);
                      onClose();
                    }}
                    className="w-full h-12 rounded-xl bg-amber-500 hover:bg-amber-400 text-amber-950 font-black text-sm tracking-wide flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    <Play className="h-5 w-5 fill-current" />
                    <span>START {round > 1 ? `ROUND ${round}` : "PREPARING"}</span>
                  </button>
                )}

                {rStatus === "PREPARING" && (
                  <button
                    disabled={isUpdating}
                    onClick={() => {
                      onMarkReady?.(order.id, round);
                      onClose();
                    }}
                    className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm tracking-wide flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-5 w-5" />
                    <span>MARK {round > 1 ? `ROUND ${round}` : "TICKET"} READY</span>
                  </button>
                )}

                {rStatus === "READY" && (
                  <div className="w-full p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-center text-sm flex items-center justify-center gap-2">
                    <CheckCircle2 className="h-5 w-5" />
                    <span>{round > 1 ? `Round ${round}` : "Ticket"} is READY — awaiting waiter service</span>
                  </div>
                )}
              </div>
            );
          })}

          <p className="text-center text-[11px] text-zinc-600 font-medium">
            Tap outside to close
          </p>
        </div>
      </div>
    </div>
  );
}
