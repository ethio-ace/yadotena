import { useState, useEffect } from "react";
import { Order, OrderItem } from "@/types";
import { Clock, Play, CheckCircle2, AlertTriangle, Sparkles, Loader2, RotateCcw } from "lucide-react";
import {
  formatElapsed,
  getUrgency,
  orderDestination,
  orderTicketNumber,
  addonNames,
  groupItemsByRound,
  hasAddedRounds,
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

function ItemLines({ item, addonMap }: { item: OrderItem; addonMap?: Record<string, string> }) {
  const aNames = addonNames(item.selectedAddons, addonMap);
  return (
    <div className="space-y-1">
      <div className="flex items-start justify-between text-sm">
        <span className="font-bold text-zinc-100 text-sm tracking-tight leading-tight">
          <span className="text-amber-500 font-black mr-1.5">{item.quantity} ×</span>
          {item.name}
        </span>
      </div>

      {aNames.length > 0 && (
        <div className="pl-3 space-y-0.5 text-xs font-medium text-zinc-400 border-l-2 border-amber-500/40 ml-1">
          {aNames.map((addon, aIdx) => (
            <div key={aIdx} className="flex items-center gap-1 text-zinc-300">
              <span className="text-amber-500 font-bold">+</span>
              <span>{addon}</span>
            </div>
          ))}
        </div>
      )}

      {item.specialInstructions && (
        <div className="mt-1 bg-amber-500/10 border border-amber-500/25 text-amber-300 px-2.5 py-1 rounded-md text-xs font-bold flex items-center gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
          <span>⚠ {item.specialInstructions.toUpperCase()}</span>
        </div>
      )}
    </div>
  );
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

  const rounds = groupItemsByRound(order.items);
  const extended = hasAddedRounds(order);
  const latestRound = rounds.length;

  const urgencyLabel =
    urgency === "URGENT"
      ? { text: "LATE", chip: "bg-red-500/10 text-red-400 border-red-500/30" }
      : urgency === "ATTENTION"
        ? { text: "ATTENTION", chip: "bg-amber-500/10 text-amber-400 border-amber-500/25" }
        : null;

  const urgencyStyles = (() => {
    switch (urgency) {
      case "URGENT":
        return {
          cardBorder: "border-red-500/50 bg-zinc-900",
          timerBadge: "bg-red-500/10 text-red-400 border border-red-500/30",
          headerText: "text-red-400",
        };
      case "ATTENTION":
        return {
          cardBorder: "border-amber-500/30 bg-zinc-900",
          timerBadge: "bg-amber-500/10 text-amber-400 border border-amber-500/25",
          headerText: "text-zinc-100",
        };
      default:
        return {
          cardBorder: "border-zinc-800 bg-zinc-900 hover:border-zinc-700",
          timerBadge: "bg-zinc-800/80 text-zinc-300 border border-zinc-700/60",
          headerText: "text-zinc-100",
        };
    }
  })();

  const styles = urgencyStyles;
  const isPending = order.status === "PENDING";
  const isPreparing = order.status === "PREPARING";
  const isReady = order.status === "READY";

  const destination = orderDestination(order, tableLabels);
  const orderNumber = orderTicketNumber(order);

  return (
    <div
      onClick={() => onInspect?.(order)}
      className={`rounded-xl border p-4 transition-all duration-200 flex flex-col justify-between cursor-pointer select-none group relative overflow-hidden ${
        isNew ? "border-amber-500/70 bg-zinc-900 ring-1 ring-amber-500/20" : styles.cardBorder
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
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500 text-amber-950 text-[10px] font-black uppercase tracking-wider">
                  <Sparkles className="h-3 w-3" /> New
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-500 mt-0.5 font-medium">
              {order.type === "DINE_IN" ? "Dine-in Ticket" : "Takeaway / Counter"}
            </p>
          </div>

          {/* Elapsed Timer */}
          <div className="flex flex-col items-end gap-1">
            <span className={`px-2.5 py-1 rounded-lg text-xs font-mono flex items-center gap-1 ${styles.timerBadge}`}>
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

        {/* EXTENDED TICKET RIBBON — a waiter added items to this order after it was placed */}
        {extended && (
          <div className="mb-3 -mx-1 flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/25 px-2.5 py-1.5 text-[11px] font-black text-amber-400 uppercase tracking-wide">
            <RotateCcw className="h-3.5 w-3.5 shrink-0" />
            <span>Ticket extended — Round {latestRound} added later</span>
          </div>
        )}

        {/* ITEMS — grouped by kitchen round */}
        <div className="space-y-3 mb-3">
          {rounds.map(({ round, items }) => {
            const isLatest = round === latestRound;
            const isAdded = round > 1;
            return (
              <div key={round}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  {rounds.length > 1 && (
                    <>
                      <span className={`text-[10px] font-black uppercase tracking-wider ${
                        isAdded ? "text-amber-500" : "text-zinc-500"
                      }`}>
                        {isAdded ? `Round ${round} · Added later` : "Original order"}
                      </span>
                      <span className="h-px flex-1 bg-zinc-800" />
                      {isAdded && isLatest && isPending && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-500 text-amber-950 text-[9px] font-black uppercase tracking-wider">
                          New
                        </span>
                      )}
                    </>
                  )}
                </div>
                <div className="space-y-2.5">
                  {items.map((item, idx) => (
                    <ItemLines key={item.id || idx} item={item} addonMap={addonMap} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* FOOTER & PRIMARY ACTION */}
      <div className="pt-3 border-t border-zinc-800" onClick={(e) => e.stopPropagation()}>
        {isPending && (
          <button
            disabled={isThisItemUpdating}
            onClick={() => onStartPreparing?.(order.id)}
            className="w-full h-11 rounded-xl bg-amber-500 hover:bg-amber-400 text-amber-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50"
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
            className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50"
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
          <div className="w-full h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 font-bold text-xs flex items-center justify-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>✓ READY — Waiting for waiter pickup</span>
          </div>
        )}
      </div>
    </div>
  );
}
