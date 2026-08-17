import { useState, useEffect } from "react";
import { OrderItem } from "@/types";
import { Play, CheckCircle2, Loader2, ChevronRight } from "lucide-react";
import {
  formatElapsed,
  getUrgency,
  orderDestination,
  orderTicketNumber,
  addonNames,
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

function ItemLine({ item, addonMap }: { item: OrderItem; addonMap?: Record<string, string> }) {
  const aNames = addonNames(item.selectedAddons, addonMap);
  return (
    <div className="py-2.5">
      <div className="flex items-baseline gap-2">
        <span className="text-[15px] font-extrabold text-zinc-300 tabular-nums shrink-0">
          {item.quantity}×
        </span>
        <span className="text-[15px] font-bold text-zinc-100 leading-snug">{item.name}</span>
      </div>

      {aNames.length > 0 && (
        <div className="mt-1.5 pl-7 space-y-1">
          {aNames.map((addon, aIdx) => (
            <div key={aIdx} className="flex items-center gap-2 text-[13px] font-medium text-zinc-400">
              <span className="h-1 w-1 rounded-full bg-zinc-600 shrink-0" />
              {addon}
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

/**
 * One kitchen round of one order. Rounds are independent production units: the
 * same ticket can appear in NEW (round 2 just arrived) and PREPARING (round 1
 * still cooking) at the same time, and starting one round never touches the
 * others.
 *
 * Visual language is deliberately restrained: a 3px left accent strip carries
 * the state (amber = needs a chef, emerald = ready for pickup, red = overdue),
 * item names dominate the card, and exactly one action sits at the bottom.
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
  const overdue = getUrgency(elapsedMins) === "URGENT";
  const formattedTimer = formatElapsed(elapsedSeconds);
  const isThisUpdating = updatingKey === card.key;

  const { order, round, status, extended } = card;

  const accent =
    status === "PENDING"
      ? "bg-amber-500"
      : status === "READY"
        ? "bg-emerald-500"
        : overdue
          ? "bg-red-500"
          : "bg-transparent";

  const destination = orderDestination(order, tableLabels);
  const orderNumber = orderTicketNumber(order);

  return (
    <div
      onClick={() => onInspect?.(order)}
      className={`group relative overflow-hidden rounded-xl border bg-zinc-900 cursor-pointer select-none transition-colors ${
        isNew
          ? "border-amber-500/50"
          : overdue && status !== "READY"
            ? "border-red-500/40"
            : "border-zinc-800 hover:border-zinc-700"
      }`}
    >
      <div className={`absolute inset-y-0 left-0 w-[3px] ${accent}`} />

      {/* Header: destination + ticket number + timer */}
      <div className="px-4 pt-3.5 pb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="text-lg font-black tracking-tight text-white truncate">{destination}</h3>
            {extended && (
              <span className="shrink-0 rounded bg-amber-500/10 border border-amber-500/25 px-1.5 py-px text-[10px] font-extrabold text-amber-400">
                R{round}
              </span>
            )}
            {isNew && (
              <span className="shrink-0 rounded bg-amber-500 px-1.5 py-px text-[10px] font-black text-amber-950">
                NEW
              </span>
            )}
          </div>
          <p className="mt-1 text-[11px] font-medium text-zinc-500">
            <span className="font-mono font-bold text-zinc-500">#{orderNumber}</span>
            <span className="mx-1.5 text-zinc-700">·</span>
            {extended ? `Round ${round} · added later` : order.type === "DINE_IN" ? "Dine-in" : "Takeaway"}
          </p>
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0">
          <span
            className={`font-mono text-base font-bold tabular-nums leading-none ${
              overdue ? "text-red-400 animate-pulse" : "text-zinc-200"
            }`}
          >
            {formattedTimer}
          </span>
          <ChevronRight className="h-3.5 w-3.5 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      {/* Items — this round only */}
      <div className="px-4 divide-y divide-zinc-800/70">
        {card.items.map((item, idx) => (
          <ItemLine key={item.id || idx} item={item} addonMap={addonMap} />
        ))}
      </div>

      {/* Single primary action */}
      <div className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
        {status === "PENDING" && (
          <button
            disabled={isThisUpdating}
            onClick={() => onStartPreparing?.(order.id, round)}
            className="w-full h-11 rounded-lg bg-amber-500 hover:bg-amber-400 text-amber-950 font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-colors disabled:opacity-50 active:scale-[0.99]"
          >
            {isThisUpdating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4 fill-current" />
            )}
            <span>{isThisUpdating ? "Starting…" : "Start"}</span>
          </button>
        )}

        {status === "PREPARING" && (
          <button
            disabled={isThisUpdating}
            onClick={() => onMarkReady?.(order.id, round)}
            className="w-full h-11 rounded-lg bg-zinc-100 hover:bg-white text-zinc-900 font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-colors disabled:opacity-50 active:scale-[0.99]"
          >
            {isThisUpdating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            <span>{isThisUpdating ? "Saving…" : "Mark Ready"}</span>
          </button>
        )}

        {status === "READY" && (
          <div className="w-full h-11 rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            <span>Ready · awaiting waiter</span>
          </div>
        )}
      </div>
    </div>
  );
}
