"use client";

import { Order, OrderItem } from "@/types";
import { Play, CheckCircle2, Clock, MapPin } from "lucide-react";
import {
  orderDestination,
  orderTicketNumber,
  addonNames,
  groupItemsByRound,
  roundStatus,
  itemStatus,
  statusLabel,
} from "@/lib/kitchen";

function ItemRow({ item, addonMap }: { item: OrderItem; addonMap?: Record<string, string> }) {
  const aNames = addonNames(item.selectedAddons, addonMap);
  const status = itemStatus(item);
  return (
    <div className="py-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[15px] font-bold text-zinc-100 leading-snug min-w-0">
          <span className="font-extrabold text-zinc-300 tabular-nums mr-2">{item.quantity}×</span>
          {item.name}
        </span>
        {status !== "PENDING" && (
          <span
            className={`shrink-0 text-[10px] font-bold uppercase tracking-wider ${
              status === "READY"
                ? "text-emerald-400"
                : status === "SERVED"
                  ? "text-zinc-600"
                  : "text-zinc-400"
            }`}
          >
            {status}
          </span>
        )}
      </div>

      {aNames.length > 0 && (
        <div className="mt-1.5 pl-7 space-y-0.5">
          {aNames.map((addon, aIdx) => (
            <div key={aIdx} className="text-[13px] font-medium text-zinc-400">
              + {addon}
            </div>
          ))}
        </div>
      )}

      {item.specialInstructions && (
        <p className="mt-1.5 pl-7 text-[13px] font-semibold text-amber-300/90">
          {item.specialInstructions}
        </p>
      )}
    </div>
  );
}

// Subtle text chips — color only as text, no filled backgrounds.
const ROUND_STATUS_TEXT: Record<string, string> = {
  PENDING: "text-amber-400",
  PREPARING: "text-zinc-300",
  READY: "text-emerald-400",
  SERVED: "text-zinc-600",
  CANCELLED: "text-red-400",
};
const ROUND_STATUS_DOT: Record<string, string> = {
  PENDING: "bg-amber-500",
  PREPARING: "bg-zinc-500",
  READY: "bg-emerald-500",
  SERVED: "bg-zinc-700",
  CANCELLED: "bg-red-500",
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
        className="bg-zinc-950 text-zinc-100 border-t md:border-t-0 md:border-l border-zinc-800 w-full md:w-full md:max-w-md h-[85vh] md:h-full flex flex-col justify-between overflow-y-auto animate-in slide-in-from-bottom duration-300 md:slide-in-from-right"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-zinc-800 pb-4 mb-5">
            <div>
              <span className="text-xs font-mono font-bold text-zinc-500 uppercase tracking-wide">
                #{orderTicketNumber(order)}
              </span>
              <h2 className="text-2xl font-black text-white mt-1 tracking-tight">{destination}</h2>
              <div className="mt-2 space-y-1 text-xs text-zinc-500 font-medium">
                <p className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-zinc-600" />
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
                    <MapPin className="h-3.5 w-3.5 text-zinc-600" />
                    <span>{order.deliveryAddress}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Ticket items — grouped by kitchen round, each with its own state */}
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-2">
            Kitchen items · {order.items?.length || 0}
          </h3>
          <div className="space-y-4">
            {rounds.map(({ round, items }) => {
              const rStatus = roundStatus(items);
              const extended = round > 1;
              return (
                <div key={round} className="rounded-xl border border-zinc-800 overflow-hidden">
                  <div className="flex items-center justify-between px-3.5 py-2 bg-zinc-900/80 border-b border-zinc-800">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                      {extended ? `Round ${round} · added later` : "Original ticket"}
                    </span>
                    <span className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${ROUND_STATUS_TEXT[rStatus]}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${ROUND_STATUS_DOT[rStatus]}`} />
                      {statusLabel(rStatus)}
                    </span>
                  </div>
                  <div className="px-3.5 divide-y divide-zinc-800/70">
                    {items.map((item, idx) => (
                      <ItemRow key={item.id || idx} item={item} addonMap={addonMap} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer actions — one per actionable round */}
        <div className="p-5 pt-4 border-t border-zinc-800 space-y-3">
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
                    className="w-full h-12 rounded-lg bg-amber-500 hover:bg-amber-400 text-amber-950 font-black text-sm tracking-wide flex items-center justify-center gap-2 transition-colors disabled:opacity-50 active:scale-[0.99]"
                  >
                    <Play className="h-4 w-4 fill-current" />
                    <span>Start {round > 1 ? `Round ${round}` : "preparing"}</span>
                  </button>
                )}

                {rStatus === "PREPARING" && (
                  <button
                    disabled={isUpdating}
                    onClick={() => {
                      onMarkReady?.(order.id, round);
                      onClose();
                    }}
                    className="w-full h-12 rounded-lg bg-zinc-100 hover:bg-white text-zinc-900 font-black text-sm tracking-wide flex items-center justify-center gap-2 transition-colors disabled:opacity-50 active:scale-[0.99]"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Mark {round > 1 ? `Round ${round}` : "ticket"} ready</span>
                  </button>
                )}

                {rStatus === "READY" && (
                  <div className="w-full h-12 rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 font-bold text-sm flex items-center justify-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{round > 1 ? `Round ${round}` : "Ticket"} ready — awaiting waiter</span>
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
