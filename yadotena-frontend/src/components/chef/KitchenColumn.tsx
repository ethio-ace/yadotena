"use client";

import { Order } from "@/types";
import { KitchenOrderCard } from "./KitchenOrderCard";
import { KitchenEmptyState } from "./KitchenEmptyState";
import { Flame, Clock, CheckCircle2 } from "lucide-react";

interface KitchenColumnProps {
  title: string;
  status: "PENDING" | "PREPARING" | "READY";
  orders: Order[];
  newOrderIds?: Set<string>;
  addonMap?: Record<string, string>;
  tableLabels?: Record<string, string>;
  onStartPreparing?: (orderId: string) => void;
  onMarkReady?: (orderId: string) => void;
  onInspect?: (order: Order) => void;
  updatingOrderId?: string | null;
}

export function KitchenColumn({
  title,
  status,
  orders,
  newOrderIds,
  addonMap,
  tableLabels,
  onStartPreparing,
  onMarkReady,
  onInspect,
  updatingOrderId,
}: KitchenColumnProps) {
  const headerDot = () => {
    switch (status) {
      case "PENDING":
        return "bg-amber-500";
      case "PREPARING":
        return "bg-zinc-500";
      case "READY":
        return "bg-emerald-500";
    }
  };

  const getHeaderIcon = () => {
    switch (status) {
      case "PENDING":
        return <Flame className="h-4 w-4 text-amber-500" />;
      case "PREPARING":
        return <Clock className="h-4 w-4 text-zinc-500" />;
      case "READY":
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950/60 border border-zinc-800 rounded-2xl overflow-hidden shadow-lg">
      {/* Column Header */}
      <div className="p-3.5 border-b border-zinc-800 bg-zinc-900/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${headerDot()}`} />
          {getHeaderIcon()}
          <h2 className="font-bold text-xs uppercase tracking-wider text-zinc-200">
            {title}
          </h2>
        </div>
        <span className="h-6 min-w-6 px-2 rounded-full bg-zinc-800 text-zinc-200 font-extrabold text-xs flex items-center justify-center border border-zinc-700">
          {orders.length}
        </span>
      </div>

      {/* Cards List container */}
      <div className="flex-1 p-3 space-y-3 overflow-y-auto min-h-[400px]">
        {orders.map((order) => (
          <KitchenOrderCard
            key={order.id}
            order={order}
            isNew={newOrderIds?.has(order.id)}
            addonMap={addonMap}
            tableLabels={tableLabels}
            onStartPreparing={onStartPreparing}
            onMarkReady={onMarkReady}
            onInspect={onInspect}
            updatingOrderId={updatingOrderId}
          />
        ))}

        {orders.length === 0 && (
          <KitchenEmptyState type={status} />
        )}
      </div>
    </div>
  );
}
