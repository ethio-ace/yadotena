"use client";

import { Order } from "@/types";
import { Phone, MapPin, Banknote, Landmark, MessageSquareText } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Who / where / how-they-pay for a delivery ticket. The phone is a tap-to-call
 * link: staff call every website delivery to confirm before approving it.
 */
export function DeliveryInfo({ order, className }: { order: Order; className?: string }) {
  if (order.type !== "DELIVERY") return null;
  const transfer = order.paymentPreference === "TRANSFER";
  return (
    <div className={cn("rounded-xl border border-violet-500/30 bg-violet-500/5 px-3 py-2.5 space-y-1.5 text-sm", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-black truncate">{order.customerName || "Delivery customer"}</span>
        {order.customerPhone && (
          <a
            href={`tel:${order.customerPhone}`}
            onClick={(e) => e.stopPropagation()}
            className="h-9 px-3 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-black flex items-center gap-1.5 shrink-0 tabular-nums"
          >
            <Phone className="h-3.5 w-3.5" /> {order.customerPhone}
          </a>
        )}
      </div>
      {order.deliveryAddress && (
        <p className="flex items-start gap-1.5 text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span className="text-foreground font-medium">{order.deliveryAddress}</span>
        </p>
      )}
      {order.notes && (
        <p className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400 font-bold">
          <MessageSquareText className="h-3.5 w-3.5 mt-0.5 shrink-0" /> {order.notes}
        </p>
      )}
      {order.paymentPreference && (
        <p className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
          {transfer ? <Landmark className="h-3.5 w-3.5" /> : <Banknote className="h-3.5 w-3.5" />}
          {transfer ? "Will transfer before delivery — check it arrived" : "Pays on delivery (cash / mobile money)"}
        </p>
      )}
    </div>
  );
}
