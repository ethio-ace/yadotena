"use client";

import { Order } from "@/types";
import { Play, CheckCircle2, Clock, AlertTriangle, MapPin } from "lucide-react";
import { orderDestination, orderTicketNumber, addonNames } from "@/lib/kitchen";

interface OrderDetailSheetProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onStartPreparing?: (orderId: string) => void;
  onMarkReady?: (orderId: string) => void;
  isLoading?: boolean;
  addonMap?: Record<string, string>;
  tableLabels?: Record<string, string>;
}

export function OrderDetailSheet({
  order,
  isOpen,
  onClose,
  onStartPreparing,
  onMarkReady,
  isLoading,
  addonMap,
  tableLabels,
}: OrderDetailSheetProps) {
  if (!isOpen || !order) return null;

  const isPending = order.status === "PENDING";
  const isPreparing = order.status === "PREPARING";
  const isReady = order.status === "READY";
  const destination = orderDestination(order, tableLabels);
  const hasStarted = order.status !== "PENDING";

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
                    Created at{" "}
                    {new Date(order.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </p>
                {hasStarted && (
                  <p className="flex items-center gap-2">
                    <Play className="h-3.5 w-3.5 text-zinc-500" />
                    <span>
                      Started at{" "}
                      {new Date(order.updatedAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </p>
                )}
                {order.type === "DELIVERY" && order.deliveryAddress && (
                  <p className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-zinc-500" />
                    <span>{order.deliveryAddress}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Ticket Items List */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Kitchen Items ({order.items?.length || 0})
            </h3>

            <div className="space-y-3">
              {order.items?.map((item, idx) => (
                <div key={item.id || idx} className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/60 space-y-2">
                  <div className="flex items-start justify-between text-base font-black text-white">
                    <span>
                      <span className="text-amber-400 font-extrabold mr-2">{item.quantity} ×</span>
                      {item.name}
                    </span>
                  </div>

                  {addonNames(item.selectedAddons, addonMap).length > 0 && (
                    <div className="pl-4 space-y-1 text-xs font-medium text-zinc-300 border-l-2 border-amber-500/30">
                      {addonNames(item.selectedAddons, addonMap).map((addon, aIdx) => (
                        <div key={aIdx} className="flex items-center gap-1">
                          <span className="text-amber-400 font-bold">+</span>
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
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-6 border-t border-zinc-800 space-y-3">
          {isPending && (
            <button
              disabled={isLoading}
              onClick={() => {
                onStartPreparing?.(order.id);
                onClose();
              }}
              className="w-full h-14 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-base tracking-wide flex items-center justify-center gap-2 shadow-xl shadow-blue-900/40 active:scale-[0.98] transition-all"
            >
              <Play className="h-5 w-5 fill-current" />
              <span>START PREPARING TICKET</span>
            </button>
          )}

          {isPreparing && (
            <button
              disabled={isLoading}
              onClick={() => {
                onMarkReady?.(order.id);
                onClose();
              }}
              className="w-full h-14 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-base tracking-wide flex items-center justify-center gap-2 shadow-xl shadow-emerald-900/40 active:scale-[0.98] transition-all"
            >
              <CheckCircle2 className="h-5 w-5" />
              <span>MARK TICKET AS READY</span>
            </button>
          )}

          {isReady && (
            <div className="w-full p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-center text-sm flex items-center justify-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              <span>Ticket is READY & awaiting waiter service</span>
            </div>
          )}

          <p className="text-center text-[11px] text-zinc-600 font-medium">
            Tap outside to close
          </p>
        </div>
      </div>
    </div>
  );
}
