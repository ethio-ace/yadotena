"use client";

import { useState } from "react";
import { Order } from "@/types";
import { KitchenColumn } from "./KitchenColumn";
import { Flame, Clock, CheckCircle2 } from "lucide-react";

interface KitchenBoardProps {
  orders: Order[];
  newOrderIds?: Set<string>;
  addonMap?: Record<string, string>;
  onStartPreparing: (orderId: string) => void;
  onMarkReady: (orderId: string) => void;
  onInspectOrder: (order: Order) => void;
  isLoading?: boolean;
}

export function KitchenBoard({
  orders,
  newOrderIds,
  addonMap,
  onStartPreparing,
  onMarkReady,
  onInspectOrder,
  isLoading,
}: KitchenBoardProps) {
  const [mobileTab, setMobileTab] = useState<"PENDING" | "PREPARING" | "READY">("PENDING");

  // Stable FIFO: oldest ticket on top. New arrivals slot in at the bottom with a
  // NEW highlight instead of reshuffling what the chef is already reading.
  const byOldestFirst = (a: Order, b: Order) =>
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();

  const pendingOrders = orders.filter((o) => o.status === "PENDING").sort(byOldestFirst);
  const preparingOrders = orders.filter((o) => o.status === "PREPARING").sort(byOldestFirst);
  const readyOrders = orders.filter((o) => o.status === "READY").sort(byOldestFirst);

  return (
    <div className="flex flex-col flex-1 p-4 max-w-[1800px] mx-auto w-full">
      {/* MOBILE SCREEN TAB CONTROL (Hidden on Tablet/Desktop md+) */}
      <div className="md:hidden flex gap-2 mb-4 bg-zinc-900 p-1.5 rounded-2xl border border-zinc-800">
        <button
          onClick={() => setMobileTab("PENDING")}
          className={`flex-1 py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all ${
            mobileTab === "PENDING"
              ? "bg-blue-600 text-white shadow-lg shadow-blue-900/40"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          <Flame className="h-4 w-4" />
          <span>NEW ({pendingOrders.length})</span>
        </button>

        <button
          onClick={() => setMobileTab("PREPARING")}
          className={`flex-1 py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all ${
            mobileTab === "PREPARING"
              ? "bg-amber-500 text-zinc-950 shadow-lg shadow-amber-900/40"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          <Clock className="h-4 w-4" />
          <span>PREP ({preparingOrders.length})</span>
        </button>

        <button
          onClick={() => setMobileTab("READY")}
          className={`flex-1 py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all ${
            mobileTab === "READY"
              ? "bg-emerald-600 text-white shadow-lg shadow-emerald-900/40"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          <CheckCircle2 className="h-4 w-4" />
          <span>READY ({readyOrders.length})</span>
        </button>
      </div>

      {/* MOBILE SINGLE-COLUMN DISPLAY */}
      <div className="md:hidden flex-1">
        {mobileTab === "PENDING" && (
          <KitchenColumn
            title="New Orders"
            status="PENDING"
            orders={pendingOrders}
            newOrderIds={newOrderIds}
            addonMap={addonMap}
            onStartPreparing={onStartPreparing}
            onInspect={onInspectOrder}
            isLoading={isLoading}
          />
        )}
        {mobileTab === "PREPARING" && (
          <KitchenColumn
            title="Preparing"
            status="PREPARING"
            orders={preparingOrders}
            addonMap={addonMap}
            onMarkReady={onMarkReady}
            onInspect={onInspectOrder}
            isLoading={isLoading}
          />
        )}
        {mobileTab === "READY" && (
          <KitchenColumn
            title="Ready for Pickup"
            status="READY"
            orders={readyOrders}
            addonMap={addonMap}
            onInspect={onInspectOrder}
            isLoading={isLoading}
          />
        )}
      </div>

      {/* DESKTOP & TABLET 3-COLUMN GRID DISPLAY (md+) */}
      <div className="hidden md:grid md:grid-cols-3 gap-5 flex-1 items-start">
        <KitchenColumn
          title="New Orders Waiting"
          status="PENDING"
          orders={pendingOrders}
          newOrderIds={newOrderIds}
          addonMap={addonMap}
          onStartPreparing={onStartPreparing}
          onInspect={onInspectOrder}
          isLoading={isLoading}
        />

        <KitchenColumn
          title="Currently Preparing"
          status="PREPARING"
          orders={preparingOrders}
          addonMap={addonMap}
          onMarkReady={onMarkReady}
          onInspect={onInspectOrder}
          isLoading={isLoading}
        />

        <KitchenColumn
          title="Ready for Waiter"
          status="READY"
          orders={readyOrders}
          addonMap={addonMap}
          onInspect={onInspectOrder}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
