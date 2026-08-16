"use client";

import { useState, useEffect } from "react";
import { Order } from "@/types";
import { Clock, Play, CheckCircle2, AlertTriangle, Sparkles } from "lucide-react";
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
  isLoading?: boolean;
}

export function KitchenOrderCard({
  order,
  isNew = false,
  addonMap,
  tableLabels,
  onStartPreparing,
  onMarkReady,
  onInspect,
  isLoading = false,
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

  // Urgency is communicated with explicit labels + icons, never color alone.
  const urgencyLabel =
    urgency === "URGENT"
      ? {
          text: "LATE TICKET",
          chip: "bg-red-600 text-white border-red-500 animate-pulse",
        }
      : urgency === "ATTENTION"
        ? {
            text: "ATTENTION",
            chip: "bg-amber-500 text-zinc-950 border-amber-400",
          }
        : null;

  const getUrgencyStyles = () => {
    switch (urgency) {
      case "URGENT":
        return {
          cardBorder: "border-red-500/80 bg-red-950/20 shadow-red-900/30 ring-2 ring-red-500/40 animate-pulse",
          timerBadge: "bg-red-600 text-white font-black animate-pulse",
          headerText: "text-red-400",
        };
      case "ATTENTION":
        return {
          cardBorder: "border-amber-500/60 bg-amber-950/20 shadow-amber-900/20",
          timerBadge: "bg-amber-500 text-zinc-950 font-black",
          headerText: "text-amber-400",
        };
      default:
        return {
          cardBorder: "border-zinc-800 bg-zinc-900/90 shadow-xl hover:border-zinc-700",
          timerBadge: "bg-zinc-800 text-zinc-300 font-mono font-bold",
          headerText: "text-zinc-200",
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
      className={`rounded-2xl border p-4 transition-all duration-200 flex flex-col justify-between cursor-pointer select-none group relative overflow-hidden ${
        isNew ? "ring-2 ring-amber-400/70 border-amber-400/70 shadow-amber-900/30 animate-in fade-in zoom-in-95 duration-200" : styles.cardBorder
      }`}
    >
      {/* CARD HEADER */}
      <div>
        <div className="flex items-start justify-between border-b border-zinc-800/80 pb-3 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className={`text-lg font-black tracking-tight ${styles.headerText}`}>
                {destination}
              </h3>
              <span className="text-xs font-mono font-bold text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded-md">
                {orderNumber}
              </span>
              {isNew && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500 text-zinc-950 text-[10px] font-black uppercase tracking-wider animate-pulse">
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
            <span className={`px-2.5 py-1 rounded-xl text-xs font-mono flex items-center gap-1 shadow-sm ${styles.timerBadge}`}>
              <Clock className="h-3.5 w-3.5" />
              {formattedTimer}
            </span>
            {urgencyLabel && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider border ${urgencyLabel.chip}`}>
                {urgency === "URGENT" && <AlertTriangle className="h-3 w-3" />}
                {urgencyLabel.text}
              </span>
            )}
          </div>
        </div>

        {/* ITEMS & CUSTOMIZATIONS LIST */}
        <div className="space-y-3 mb-4">
          {order.items?.map((item, idx) => (
            <div key={item.id || idx} className="space-y-1">
              <div className="flex items-start justify-between text-sm">
                <span className="font-black text-white text-base tracking-tight leading-tight">
                  <span className="text-amber-400 font-extrabold mr-1.5">{item.quantity} ×</span>
                  {item.name}
                </span>
              </div>

              {/* Add-ons list */}
              {addonNames(item.selectedAddons, addonMap).length > 0 && (
                <div className="pl-4 space-y-0.5 text-xs font-medium text-zinc-400 border-l-2 border-amber-500/30 ml-1">
                  {addonNames(item.selectedAddons, addonMap).map((addon, aIdx) => (
                    <div key={aIdx} className="flex items-center gap-1 text-zinc-300">
                      <span className="text-amber-500 font-bold">+</span>
                      <span>{addon}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Special Instructions / Notes */}
              {item.specialInstructions && (
                <div className="mt-1 bg-amber-500/10 border border-amber-500/30 text-amber-300 px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                  <span>⚠ {item.specialInstructions.toUpperCase()}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* FOOTER & PRIMARY SINGLE TOUCH ACTION */}
      <div className="pt-3 border-t border-zinc-800/80" onClick={(e) => e.stopPropagation()}>
        {isPending && (
          <button
            disabled={isLoading}
            onClick={() => onStartPreparing?.(order.id)}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-sm tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-blue-900/40 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            <Play className="h-4 w-4 fill-current" />
            <span>START PREPARING</span>
          </button>
        )}

        {isPreparing && (
          <button
            disabled={isLoading}
            onClick={() => onMarkReady?.(order.id)}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/40 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>MARK READY</span>
          </button>
        )}

        {isReady && (
          <div className="w-full h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-xs flex items-center justify-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>✓ READY — Waiting for waiter pickup</span>
          </div>
        )}
      </div>
    </div>
  );
}
