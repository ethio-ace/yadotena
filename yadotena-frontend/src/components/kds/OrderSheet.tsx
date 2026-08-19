"use client";

import { Order } from "@/types";
import { CheckCircle2, Clock, AlertCircle } from "lucide-react";

interface OrderTimelineProps {
  order: Order;
}

export function OrderTimeline({ order }: OrderTimelineProps) {
  const createdTime = new Date(order.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const updatedTime = new Date(order.updatedAt || order.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const steps = [
    {
      id: "PENDING",
      title: "Order Received",
      time: createdTime,
      completed: true,
    },
    {
      id: "PREPARING",
      title: "Kitchen In Prep",
      time: order.status !== "PENDING" ? updatedTime : undefined,
      completed: ["PREPARING", "READY", "SERVED", "COMPLETED"].includes(order.status),
    },
    {
      id: "READY",
      title: "Ready for Pickup",
      time: ["READY", "SERVED", "COMPLETED"].includes(order.status) ? updatedTime : undefined,
      completed: ["READY", "SERVED", "COMPLETED"].includes(order.status),
    },
    {
      id: "SERVED",
      title: "Served & Completed",
      time: ["SERVED", "COMPLETED"].includes(order.status) ? updatedTime : undefined,
      completed: ["SERVED", "COMPLETED"].includes(order.status),
    },
  ];

  return (
    <div className="space-y-3 py-2">
      <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
        Production Lifecycle Timeline
      </div>

      <div className="relative pl-5 space-y-4 border-l-2 border-zinc-800">
        {steps.map((step, idx) => (
          <div key={step.id} className="relative flex items-center justify-between">
            <span
              className={`absolute -left-[25px] h-4 w-4 rounded-full flex items-center justify-center text-[10px] ${
                step.completed
                  ? "bg-emerald-500 text-emerald-950 font-bold"
                  : "bg-zinc-800 text-zinc-500"
              }`}
            >
              {step.completed ? "✓" : idx + 1}
            </span>

            <div className="min-w-0">
              <div className={`text-xs font-bold ${step.completed ? "text-zinc-100" : "text-zinc-500"}`}>
                {step.title}
              </div>
            </div>

            {step.time && (
              <span className="text-[11px] font-mono font-medium text-zinc-400">
                {step.time}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

interface OrderSheetProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onStartPreparing?: (orderId: string, round: number) => void;
  onMarkReady?: (orderId: string, round: number) => void;
  updatingKey?: string | null;
  addonMap?: Record<string, string>;
  tableLabels?: Record<string, string>;
}

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { groupItemsByRound, roundStatus, orderDestination, orderTicketNumber, addonNames } from "@/lib/kitchen";
import { formatETB } from "@/lib/currency";
import { Utensils, X, User, ShoppingBag, ArrowRight, Check } from "lucide-react";

export function OrderSheet({
  order,
  isOpen,
  onClose,
  onStartPreparing,
  onMarkReady,
  updatingKey,
  addonMap,
  tableLabels,
}: OrderSheetProps) {
  if (!order) return null;

  const rounds = groupItemsByRound(order.items);
  const destination = orderDestination(order, tableLabels);
  const ticketCode = orderTicketNumber(order);

  return (
    <Sheet open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full max-w-lg bg-zinc-950 border-l border-zinc-800 text-zinc-50 p-6 flex flex-col justify-between overflow-y-auto z-[80]">
        <div>
          {/* HEADER */}
          <SheetHeader className="pb-4 border-b border-zinc-800">
            <div className="flex items-center justify-between">
              <div>
                <SheetTitle className="text-2xl font-black text-white uppercase tracking-tight">
                  {destination}
                </SheetTitle>
                <SheetDescription className="text-xs text-zinc-400 font-medium">
                  Ticket #{ticketCode} · Created {new Date(order.createdAt).toLocaleTimeString()}
                </SheetDescription>
              </div>

              <div className="px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono font-bold text-xs">
                {order.type}
              </div>
            </div>
          </SheetHeader>

          {/* TIMELINE */}
          <div className="py-4 border-b border-zinc-800/80">
            <OrderTimeline order={order} />
          </div>

          {/* ROUNDS BREAKDOWN */}
          <div className="py-4 space-y-4">
            <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
              Kitchen Rounds ({rounds.length})
            </div>

            {rounds.map(({ round, items }) => {
              const rStatus = roundStatus(items, order.status);
              const isUpdating = updatingKey === `${order.id}:${round}`;

              return (
                <div key={round} className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-amber-500">
                      {round > 1 ? `Round ${round} · Added later` : `Round ${round} · Initial`}
                    </span>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-zinc-850 border border-zinc-800 text-zinc-300">
                      {rStatus}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {items.map((i) => {
                      const addons = addonNames(i.addons || i.selectedAddons, addonMap);
                      return (
                        <div key={i.id} className="text-xs">
                          <div className="font-bold text-zinc-100 flex items-center justify-between">
                            <span>{i.quantity}× {i.name}</span>
                            <span className="font-mono text-zinc-400">{formatETB(i.price * i.quantity)}</span>
                          </div>
                          {addons.length > 0 && (
                            <div className="text-[11px] text-zinc-400 pl-2 mt-0.5">
                              + {addons.join(", ")}
                            </div>
                          )}
                          {i.specialInstructions && (
                            <div className="text-[11px] font-bold text-red-400 pl-2 mt-0.5 uppercase">
                              ⚠ {i.specialInstructions}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Per Round Action Button */}
                  {rStatus === "PENDING" && onStartPreparing && (
                    <button
                      disabled={isUpdating}
                      onClick={() => onStartPreparing(order.id, round)}
                      className="w-full h-11 rounded-xl bg-amber-500 hover:bg-amber-400 text-amber-950 font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <ArrowRight className="h-4 w-4" />
                      <span>START PREPARING ROUND {round}</span>
                    </button>
                  )}

                  {rStatus === "PREPARING" && onMarkReady && (
                    <button
                      disabled={isUpdating}
                      onClick={() => onMarkReady(order.id, round)}
                      className="w-full h-11 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <Check className="h-4 w-4" />
                      <span>MARK ROUND {round} READY</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* CUSTOMER NOTES & PAYMENT STATUS */}
          <div className="pt-2 space-y-2 border-t border-zinc-800/80 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400 font-bold">Payment Status:</span>
              <span className={`font-mono font-black ${order.paymentStatus === "PAID" ? "text-emerald-400" : "text-amber-400"}`}>
                {order.paymentStatus || "UNPAID"}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-zinc-400 font-bold">Total Amount:</span>
              <span className="font-mono font-black text-zinc-100 text-sm">
                {formatETB(order.total)}
              </span>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-zinc-800 mt-4">
          <button
            onClick={onClose}
            className="w-full h-12 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold text-xs transition-colors cursor-pointer"
          >
            Close Sheet
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
