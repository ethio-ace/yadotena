"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { Order, OrderStatus } from "@/types";
import { soundAlerts } from "@/lib/audioAlerts";

import { ChefHeader } from "@/components/chef/ChefHeader";
import { KitchenStats } from "@/components/chef/KitchenStats";
import { KitchenBoard } from "@/components/chef/KitchenBoard";
import { BatchView } from "@/components/chef/BatchView";
import { OrderDetailSheet } from "@/components/chef/OrderDetailSheet";
import { KitchenConnectionStatus } from "@/components/chef/KitchenConnectionStatus";
import { KitchenEmptyState } from "@/components/chef/KitchenEmptyState";
import { CheckCircle2, Clock, History as HistoryIcon, Utensils } from "lucide-react";

export default function KitchenDashboard() {
  const queryClient = useQueryClient();

  const [viewMode, setViewMode] = useState<"QUEUE" | "BATCH" | "HISTORY">("QUEUE");
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [inspectOrder, setInspectOrder] = useState<Order | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(true);

  // Track previous pending orders count to trigger chime on new incoming tickets
  const prevPendingCountRef = useRef<number>(0);

  const { data: orders = [], isLoading, refetch } = useQuery({
    queryKey: ["orders"],
    queryFn: api.orders.getAll,
    refetchInterval: 4000, // Real-time KDS state synchronization stream fallback
  });

  const pendingOrders = orders.filter((o) => o.status === "PENDING");
  const preparingOrders = orders.filter((o) => o.status === "PREPARING");
  const readyOrders = orders.filter((o) => o.status === "READY");
  const completedOrders = orders.filter((o) => ["SERVED", "COMPLETED"].includes(o.status));

  // Calculate overdue count (tickets open > 10 mins)
  const overdueCount = orders.filter((o) => {
    if (!["PENDING", "PREPARING"].includes(o.status)) return false;
    const created = new Date(o.createdAt).getTime();
    const diffMins = (Date.now() - created) / 60000;
    return diffMins >= 10;
  }).length;

  // Sound chime trigger on new order arrival
  useEffect(() => {
    if (pendingOrders.length > prevPendingCountRef.current && soundEnabled) {
      soundAlerts.playNewOrderChime();
    }
    prevPendingCountRef.current = pendingOrders.length;
  }, [pendingOrders.length, soundEnabled]);

  // Order status transition mutation (PENDING -> PREPARING -> READY)
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      api.orders.updateStatus(id, status),
    onSuccess: () => {
      if (soundEnabled) soundAlerts.playActionPing();
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["tables"] });
    },
    onError: (err: any) => {
      alert(err.message || "Failed to update kitchen ticket status");
    },
  });

  const handleStartPreparing = (orderId: string) => {
    updateStatusMutation.mutate({ id: orderId, status: "PREPARING" });
  };

  const handleMarkReady = (orderId: string) => {
    updateStatusMutation.mutate({ id: orderId, status: "READY" });
  };

  // Apply active status filter if selected from stats bar
  const displayedOrders = activeFilter
    ? activeFilter === "OVERDUE"
      ? orders.filter((o) => {
          if (!["PENDING", "PREPARING"].includes(o.status)) return false;
          return (Date.now() - new Date(o.createdAt).getTime()) / 60000 >= 10;
        })
      : orders.filter((o) => o.status === activeFilter)
    : orders;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans -m-3 sm:-m-4 md:-m-6 selection:bg-amber-500 selection:text-zinc-950">
      
      {/* Realtime Connection Warning Header */}
      <KitchenConnectionStatus
        isConnected={isConnected}
        onRefresh={() => refetch()}
      />

      {/* Primary KDS Header */}
      <ChefHeader
        activeCount={pendingOrders.length + preparingOrders.length}
        readyCount={readyOrders.length}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
        isConnected={isConnected}
      />

      {/* Operational Indicators / Filter Widgets Bar */}
      <KitchenStats
        pendingCount={pendingOrders.length}
        preparingCount={preparingOrders.length}
        readyCount={readyOrders.length}
        overdueCount={overdueCount}
        activeFilter={activeFilter}
        onSelectFilter={setActiveFilter}
      />

      {/* MAIN CONTENT WORKSPACE */}
      <main className="flex-1 flex flex-col">
        {isLoading && orders.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-12 text-zinc-500 font-bold text-sm animate-pulse">
            Synchronizing kitchen production stream...
          </div>
        ) : viewMode === "QUEUE" ? (
          <KitchenBoard
            orders={displayedOrders}
            onStartPreparing={handleStartPreparing}
            onMarkReady={handleMarkReady}
            onInspectOrder={setInspectOrder}
            isLoading={updateStatusMutation.isPending}
          />
        ) : viewMode === "BATCH" ? (
          <BatchView orders={orders} />
        ) : (
          /* TODAY'S COMPLETED HISTORY VIEW */
          <div className="p-4 sm:p-6 max-w-5xl mx-auto w-full space-y-4 animate-in fade-in duration-200">
            <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
                  <HistoryIcon className="h-5 w-5 text-amber-500" />
                  <span>Today's Production History</span>
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5 font-medium">
                  Log of completed and served tickets for this shift ({completedOrders.length} tickets).
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {completedOrders.map((o) => (
                <div
                  key={o.id}
                  onClick={() => setInspectOrder(o)}
                  className="p-4 rounded-xl border border-zinc-800 bg-zinc-950 hover:bg-zinc-900/60 transition-colors flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                    <div>
                      <div className="font-black text-sm text-white">
                        {o.tableId ? `Table ${o.tableId.replace(/^t/i, "")}` : o.type} • #{o.id.slice(-6).toUpperCase()}
                      </div>
                      <div className="text-xs text-zinc-400 font-medium">
                        {o.items?.map((i) => `${i.quantity}× ${i.name}`).join(", ")}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-zinc-500 font-mono">
                    {new Date(o.updatedAt || o.createdAt).toLocaleTimeString()}
                  </div>
                </div>
              ))}

              {completedOrders.length === 0 && (
                <div className="py-12 text-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-2xl">
                  No completed tickets recorded for this shift yet.
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ORDER INSPECTION SHEET DRAWER */}
      <OrderDetailSheet
        order={inspectOrder}
        isOpen={!!inspectOrder}
        onClose={() => setInspectOrder(null)}
        onStartPreparing={handleStartPreparing}
        onMarkReady={handleMarkReady}
        isLoading={updateStatusMutation.isPending}
      />
    </div>
  );
}
