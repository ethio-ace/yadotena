import { useState, useEffect } from "react";
import { Order } from "@/types";
import { Clock, Play, CheckCircle2, AlertTriangle, Sparkles, Loader2 } from "lucide-react";
import {
  formatElapsed,
  getUrgency,
  orderDestination,
  orderTicketNumber,
  addonNames,
} from "@/lib/kitchen";

interface KitchenOrderCardProps {
  order: Order;
  isNew?: boolean;
  addonMap?: Record<string, string>;
  tableLabels?: Record<string, string>;
  onStartPreparing?: (orderId: string) => void;
  onMarkReady?: (orderId: string) => void;
  onInspect?: (order: Order) => void;
  updatingOrderId?: string | null;
}

export function KitchenOrderCard({
  order,
  isNew = false,
  addonMap,
  tableLabels,
  onStartPreparing,
  onMarkReady,
  onInspect,
  updatingOrderId,
}: KitchenOrderCardProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  useEffect(() => {
    const calculateElapsed = () => {
      const createdTime = new Date(order.createdAt).getTime();
      const diffSec = Math.max(0, Math.floor((Date.now() - createdTime) / 1000));
      setElapsedSeconds(diffSec);
    };

    calculateElapsed();
    const timer = setInterval(calculateElapsed, 1000);
    return () => clearInterval(timer);
  }, [order.createdAt]);

  const elapsedMins = Math.floor(elapsedSeconds / 60);
  const urgency = getUrgency(elapsedMins);
  const formattedTimer = formatElapsed(elapsedSeconds);
  const isThisItemUpdating = updatingOrderId === order.id;

  const urgencyLabel =
    urgency === "URGENT"
      ? {
          text: "LATE TICKET",
          chip: "bg-red-600/20 text-red-400 border-red-500/40",
        }
      : urgency === "ATTENTION"
        ? {
            text: "ATTENTION",
            chip: "bg-amber-500/20 text-amber-300 border-amber-500/30",
          }
        : null;

  const getUrgencyStyles = () => {
    switch (urgency) {
      case "URGENT":
        return {
          cardBorder: "border-red-500/60 bg-zinc-900/90 shadow-md",
          timerBadge: "bg-red-600 text-white font-black",
          headerText: "text-red-400",
        };
      case "ATTENTION":
        return {
          cardBorder: "border-amber-500/40 bg-zinc-900/90 shadow-md",
          timerBadge: "bg-amber-500 text-zinc-950 font-black",
          headerText: "text-amber-400",
        };
      default:
        return {
          cardBorder: "border-zinc-800 bg-zinc-900/90 shadow-md hover:border-zinc-700",
          timerBadge: "bg-zinc-800 text-zinc-300 font-mono font-bold border border-zinc-700",
          headerText: "text-zinc-100",
        };
    }
  };

  const styles = getUrgencyStyles();
  const isPending = order.status === "PENDING";
  const isPreparing = order.status === "PREPARING";
  const isReady = order.status === "READY";

  const destination = orderDestination(order, tableLabels);
  const orderNumber = orderTicketNumber(order);

  return (
    <div
      onClick={() => onInspect?.(order)}
      className={`rounded-xl border p-4 transition-all duration-200 flex flex-col justify-between cursor-pointer select-none group relative overflow-hidden ${
        isNew ? "border-amber-400/80 bg-zinc-900 shadow-md" : styles.cardBorder
      }`}
    >
      {/* CARD HEADER */}
      <div>
        <div className="flex items-start justify-between border-b border-zinc-800 pb-3 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className={`text-base font-black tracking-tight ${styles.headerText}`}>
                {destination}
              </h3>
              <span className="text-xs font-mono font-bold text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded-md border border-zinc-700/50">
                {orderNumber}
              </span>
              {isNew && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500 text-zinc-950 text-[10px] font-black uppercase tracking-wider">
                  <Sparkles className="h-3 w-3" /> New
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5 font-medium">
              {order.type === "DINE_IN" ? "Dine-in Ticket" : "Takeaway / Counter"}
            </p>
          </div>

          {/* Elapsed Timer & Urgency Label */}
          <div className="flex flex-col items-end gap-1">
            <span className={`px-2.5 py-1 rounded-lg text-xs font-mono flex items-center gap-1 shadow-sm ${styles.timerBadge}`}>
              <Clock className="h-3.5 w-3.5" />
              {formattedTimer}
            </span>
            {urgencyLabel && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${urgencyLabel.chip}`}>
                {urgency === "URGENT" && <AlertTriangle className="h-3 w-3 text-red-400" />}
                {urgencyLabel.text}
              </span>
            )}
          </div>
        </div>

        {/* ITEMS & CUSTOMIZATIONS LIST */}
        <div className="space-y-2.5 mb-3">
          {order.items?.map((item, idx) => (
            <div key={item.id || idx} className="space-y-1">
              <div className="flex items-start justify-between text-sm">
                <span className="font-bold text-zinc-100 text-sm tracking-tight leading-tight">
                  <span className="text-amber-400 font-black mr-1.5">{item.quantity} ×</span>
                  {item.name}
                </span>
              </div>

              {/* Add-ons list */}
              {addonNames(item.selectedAddons, addonMap).length > 0 && (
                <div className="pl-3 space-y-0.5 text-xs font-medium text-zinc-400 border-l-2 border-amber-500/40 ml-1">
                  {addonNames(item.selectedAddons, addonMap).map((addon, aIdx) => (
                    <div key={aIdx} className="flex items-center gap-1 text-zinc-300">
                      <span className="text-amber-400 font-bold">+</span>
                      <span>{addon}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Special Instructions / Notes */}
              {item.specialInstructions && (
                <div className="mt-1 bg-amber-500/10 border border-amber-500/30 text-amber-300 px-2.5 py-1 rounded-md text-xs font-bold flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                  <span>⚠ {item.specialInstructions.toUpperCase()}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* FOOTER & PRIMARY SINGLE TOUCH ACTION */}
      <div className="pt-3 border-t border-zinc-800" onClick={(e) => e.stopPropagation()}>
        {isPending && (
          <button
            disabled={isThisItemUpdating}
            onClick={() => onStartPreparing?.(order.id)}
            className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {isThisItemUpdating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4 fill-current" />
            )}
            <span>{isThisItemUpdating ? "STARTING..." : "START PREPARING"}</span>
          </button>
        )}

        {isPreparing && (
          <button
            disabled={isThisItemUpdating}
            onClick={() => onMarkReady?.(order.id)}
            className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {isThisItemUpdating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            <span>{isThisItemUpdating ? "SAVING..." : "MARK READY"}</span>
          </button>
        )}

        {isReady && (
          <div className="w-full h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-xs flex items-center justify-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>✓ READY — Waiting for waiter pickup</span>
          </div>
        )}
      </div>
    </div>
  );
}
