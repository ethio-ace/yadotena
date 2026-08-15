"use client";

import { Order } from "@/types";
import { KitchenOrderCard } from "./KitchenOrderCard";
import { KitchenEmptyState } from "./KitchenEmptyState";
import { Flame, Clock, CheckCircle2 } from "lucide-react";

interface KitchenColumnProps {
  title: string;
  status: "PENDING" | "PREPARING" | "READY";
  orders: Order[];
  onStartPreparing?: (orderId: string) => void;
  onMarkReady?: (orderId: string) => void;
  onInspect?: (order: Order) => void;
  isLoading?: boolean;
}

export function KitchenColumn({
  title,
  status,
  orders,
  onStartPreparing,
  onMarkReady,
  onInspect,
  isLoading,
}: KitchenColumnProps) {
  const getHeaderIcon = () => {
    switch (status) {
      case "PENDING":
        return <Flame className="h-5 w-5 text-blue-400" />;
      case "PREPARING":
        return <Clock className="h-5 w-5 text-amber-400" />;
      case "READY":
        return <CheckCircle2 className="h-5 w-5 text-emerald-400" />;
    }
  };

  const getHeaderColor = () => {
    switch (status) {
      case "PENDING":
        return "border-blue-500/30 bg-blue-950/20 text-blue-300";
      case "PREPARING":
        return "border-amber-500/30 bg-amber-950/20 text-amber-300";
      case "READY":
        return "border-emerald-500/30 bg-emerald-950/20 text-emerald-300";
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950/40 border border-zinc-850 rounded-2xl overflow-hidden shadow-xl">
      {/* Column Header */}
      <div className={`p-4 border-b flex items-center justify-between ${getHeaderColor()}`}>
        <div className="flex items-center gap-2">
          {getHeaderIcon()}
          <h2 className="font-black text-sm uppercase tracking-wider text-white">
            {title}
          </h2>
        </div>
        <span className="h-7 min-w-7 px-2.5 rounded-full bg-zinc-900 border border-zinc-700 text-white font-black text-xs flex items-center justify-center">
          {orders.length}
        </span>
      </div>

      {/* Cards List container */}
      <div className="flex-1 p-3 space-y-3 overflow-y-auto min-h-[400px]">
        {orders.map((order) => (
          <KitchenOrderCard
            key={order.id}
            order={order}
            onStartPreparing={onStartPreparing}
            onMarkReady={onMarkReady}
            onInspect={onInspect}
            isLoading={isLoading}
          />
        ))}

        {orders.length === 0 && (
          <KitchenEmptyState type={status} />
        )}
      </div>
    </div>
  );
}
