import { useState, useEffect } from "react";
import { OrderItem } from "@/types";
import { Clock, Play, CheckCircle2, AlertTriangle, Sparkles, Loader2, RotateCcw } from "lucide-react";
import {
  formatElapsed,
  getUrgency,
  orderDestination,
  orderTicketNumber,
  addonNames,
  itemStatus,
  RoundCard,
} from "@/lib/kitchen";

interface KitchenOrderCardProps {
  card: RoundCard;
  isNew?: boolean;
  addonMap?: Record<string, string>;
  tableLabels?: Record<string, string>;
  onStartPreparing?: (orderId: string, round: number) => void;
  onMarkReady?: (orderId: string, round: number) => void;
  onInspect?: (order: RoundCard["order"]) => void;
  updatingKey?: string | null;
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

/**
 * One kitchen round of one order. Rounds are independent production units: the
 * same ticket can appear in NEW (round 2 just arrived) and PREPARING (round 1
 * still cooking) at the same time, and starting one round never touches the
 * others.
 */
export function KitchenOrderCard({
  card,
  isNew = false,
  addonMap,
  tableLabels,
  onStartPreparing,
  onMarkReady,
  onInspect,
  updatingKey,
}: KitchenOrderCardProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  useEffect(() => {
    const calculateElapsed = () => {
      // Timer baseline: the moment this round entered PREPARING once started,
      // otherwise when the order was placed (waiting time).
      const baseline = card.startedAt || card.createdAt;
      const createdTime = new Date(baseline).getTime();
      const diffSec = Math.max(0, Math.floor((Date.now() - createdTime) / 1000));
      setElapsedSeconds(diffSec);
    };

    calculateElapsed();
    const timer = setInterval(calculateElapsed, 1000);
    return () => clearInterval(timer);
  }, [card.startedAt, card.createdAt]);

  const elapsedMins = Math.floor(elapsedSeconds / 60);
  const urgency = getUrgency(elapsedMins);
  const formattedTimer = formatElapsed(elapsedSeconds);
  const isThisUpdating = updatingKey === card.key;

  const { order, round, status, extended } = card;

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

  const destination = orderDestination(order, tableLabels);
  const orderNumber = orderTicketNumber(order);
  const mixedRound = new Set(card.items.map(itemStatus)).size > 1;

  return (
    <div
      onClick={() => onInspect?.(order)}
      className={`rounded-xl border p-4 transition-all duration-200 flex flex-col justify-between cursor-pointer select-none group relative overflow-hidden ${
        isNew ? "border-amber-500/70 bg-zinc-900 ring-1 ring-amber-500/20" : urgencyStyles.cardBorder
      }`}
    >
      {/* CARD HEADER */}
      <div>
        <div className="flex items-start justify-between border-b border-zinc-800 pb-3 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className={`text-base font-black tracking-tight ${urgencyStyles.headerText}`}>
                {destination}
              </h3>
              <span className="text-xs font-mono font-bold text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded-md border border-zinc-700/50">
                {orderNumber}
              </span>
              {extended && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-black uppercase tracking-wider">
                  R{round}
                </span>
              )}
              {isNew && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500 text-amber-950 text-[10px] font-black uppercase tracking-wider">
                  <Sparkles className="h-3 w-3" /> New
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-500 mt-0.5 font-medium">
              {extended ? `Round ${round} · added later` : order.type === "DINE_IN" ? "Dine-in ticket" : "Takeaway / counter"}
              {mixedRound ? " · mixed items" : ""}
            </p>
          </div>

          {/* Elapsed Timer — starts when this round entered PREPARING */}
          <div className="flex flex-col items-end gap-1">
            <span className={`px-2.5 py-1 rounded-lg text-xs font-mono flex items-center gap-1 ${urgencyStyles.timerBadge}`}>
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

        {/* EXTENDED ROUND RIBBON — this round was added to a live ticket */}
        {extended && (
          <div className="mb-3 -mx-1 flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/25 px-2.5 py-1.5 text-[11px] font-black text-amber-400 uppercase tracking-wide">
            <RotateCcw className="h-3.5 w-3.5 shrink-0" />
            <span>Round {round} added to live ticket</span>
          </div>
        )}

        {/* ITEMS — this round only */}
        <div className="space-y-2.5 mb-3">
          {card.items.map((item, idx) => (
            <ItemLines key={item.id || idx} item={item} addonMap={addonMap} />
          ))}
        </div>
      </div>

      {/* FOOTER & PRIMARY ACTION */}
      <div className="pt-3 border-t border-zinc-800" onClick={(e) => e.stopPropagation()}>
        {status === "PENDING" && (
          <button
            disabled={isThisUpdating}
            onClick={() => onStartPreparing?.(order.id, round)}
            className="w-full h-11 rounded-xl bg-amber-500 hover:bg-amber-400 text-amber-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {isThisUpdating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4 fill-current" />
            )}
            <span>{isThisUpdating ? "STARTING..." : `START PREPARING${extended ? ` ROUND ${round}` : ""}`}</span>
          </button>
        )}

        {status === "PREPARING" && (
          <button
            disabled={isThisUpdating}
            onClick={() => onMarkReady?.(order.id, round)}
            className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {isThisUpdating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            <span>{isThisUpdating ? "SAVING..." : `MARK READY${extended ? ` ROUND ${round}` : ""}`}</span>
          </button>
        )}

        {status === "READY" && (
          <div className="w-full h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 font-bold text-xs flex items-center justify-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>✓ READY — waiting for waiter pickup</span>
          </div>
        )}
      </div>
    </div>
  );
}
