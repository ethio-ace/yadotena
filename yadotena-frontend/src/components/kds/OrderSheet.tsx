"use client";

import { Order } from "@/types";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { groupItemsByRound, roundStatus, orderDestination, orderTicketNumber, addonNames } from "@/lib/kitchen";
import { formatETB } from "@/lib/currency";
import { ArrowRight, Check } from "lucide-react";

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
      title: "Received",
      time: createdTime,
      completed: true,
    },
    {
      id: "PREPARING",
      title: "In Prep",
      time: order.status !== "PENDING" ? updatedTime : undefined,
      completed: ["PREPARING", "READY", "SERVED", "COMPLETED"].includes(order.status),
    },
    {
      id: "READY",
      title: "Ready",
      time: ["READY", "SERVED", "COMPLETED"].includes(order.status) ? updatedTime : undefined,
      completed: ["READY", "SERVED", "COMPLETED"].includes(order.status),
    },
    {
      id: "SERVED",
      title: "Served",
      time: ["SERVED", "COMPLETED"].includes(order.status) ? updatedTime : undefined,
      completed: ["SERVED", "COMPLETED"].includes(order.status),
    },
  ];

  return (
    <div className="space-y-2.5 py-1">
      <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
        Timeline
      </div>

      <div className="relative pl-4 space-y-3 border-l border-zinc-800">
        {steps.map((step, idx) => (
          <div key={step.id} className="relative flex items-center justify-between">
            <span
              className={`absolute -left-[21px] h-3.5 w-3.5 rounded-full flex items-center justify-center text-[8px] ${
                step.completed
                  ? "bg-emerald-500 text-emerald-950 font-bold"
                  : "bg-zinc-800 text-zinc-500"
              }`}
            >
              {step.completed ? "✓" : idx + 1}
            </span>

            <span className={`text-[11px] font-bold ${step.completed ? "text-zinc-200" : "text-zinc-500"}`}>
              {step.title}
            </span>

            {step.time && (
              <span className="text-[10px] font-mono text-zinc-500">
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
      <SheetContent className="w-full max-w-md bg-zinc-950 border-l border-zinc-800 text-zinc-50 p-5 flex flex-col justify-between overflow-y-auto z-[80]">
        <div>
          {/* HEADER */}
          <SheetHeader className="pb-3 border-b border-zinc-800">
            <div className="flex items-center justify-between">
              <div>
                <SheetTitle className="text-lg font-black text-white uppercase tracking-tight">
                  {destination}
                </SheetTitle>
                <SheetDescription className="text-[11px] text-zinc-400 font-medium">
                  #{ticketCode} · {new Date(order.createdAt).toLocaleTimeString()}
                </SheetDescription>
              </div>
              <span className="px-2.5 py-0.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 font-mono font-bold text-[11px]">
                {order.type}
              </span>
            </div>
          </SheetHeader>

          {/* TIMELINE */}
          <div className="py-3 border-b border-zinc-800/60">
            <OrderTimeline order={order} />
          </div>

          {/* ROUNDS */}
          <div className="py-3 space-y-3">
            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
              Rounds ({rounds.length})
            </div>

            {rounds.map(({ round, items }) => {
              const rStatus = roundStatus(items, order.status);
              const isUpdating = updatingKey === `${order.id}:${round}`;

              return (
                <div key={round} className="p-3 rounded-xl bg-zinc-900 border border-zinc-800/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-zinc-400">
                      {round > 1 ? `Round ${round} · Added later` : `Round ${round}`}
                    </span>
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
                      {rStatus}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {items.map((i) => {
                      const addons = addonNames(i.addons || i.selectedAddons, addonMap);
                      return (
                        <div key={i.id} className="text-[11px]">
                          <div className="font-bold text-zinc-200 flex items-center justify-between">
                            <span>{i.quantity}× {i.name}</span>
                            <span className="font-mono text-zinc-500">{formatETB(i.price * i.quantity)}</span>
                          </div>
                          {addons.length > 0 && (
                            <div className="text-[10px] text-zinc-500 pl-2 mt-0.5">
                              + {addons.join(", ")}
                            </div>
                          )}
                          {i.specialInstructions && (
                            <div className="text-[10px] font-bold text-red-400/80 pl-2 mt-0.5 uppercase">
                              {i.specialInstructions}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {rStatus === "PENDING" && onStartPreparing && (
                    <button
                      disabled={isUpdating}
                      onClick={() => onStartPreparing(order.id, round)}
                      className="w-full h-10 rounded-lg bg-amber-500 hover:bg-amber-400 text-amber-950 font-black text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <ArrowRight className="h-3.5 w-3.5" />
                      <span>START ROUND {round}</span>
                    </button>
                  )}

                  {rStatus === "PREPARING" && onMarkReady && (
                    <button
                      disabled={isUpdating}
                      onClick={() => onMarkReady(order.id, round)}
                      className="w-full h-10 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-black text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-zinc-700"
                    >
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      <span>MARK ROUND {round} READY</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* PAYMENT & TOTAL */}
          <div className="pt-2 space-y-1.5 border-t border-zinc-800/60 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-zinc-500 font-bold">Payment</span>
              <span className={`font-mono font-black ${order.paymentStatus === "PAID" ? "text-emerald-400" : "text-amber-400"}`}>
                {order.paymentStatus || "UNPAID"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-500 font-bold">Total</span>
              <span className="font-mono font-black text-zinc-100 text-sm">
                {formatETB(order.total)}
              </span>
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-zinc-800 mt-3">
          <button
            onClick={onClose}
            className="w-full h-11 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold text-[11px] transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
