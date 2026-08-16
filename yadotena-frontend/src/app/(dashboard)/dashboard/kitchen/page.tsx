"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { api } from "@/services/api";
import { Order, OrderStatus } from "@/types";
import { soundAlerts } from "@/lib/audioAlerts";
import { isOrderOverdue, orderTicketNumber } from "@/lib/kitchen";
import { formatTableRef, useTableLabels } from "@/hooks/useTableLabels";
import { useAblySync, AblyConnectionState } from "@/contexts/AblySyncProvider";

import { ChefHeader } from "@/components/chef/ChefHeader";
import { KitchenStats } from "@/components/chef/KitchenStats";
import { KitchenBoard } from "@/components/chef/KitchenBoard";
import { BatchView } from "@/components/chef/BatchView";
import { OrderDetailSheet } from "@/components/chef/OrderDetailSheet";
import { KitchenConnectionStatus } from "@/components/chef/KitchenConnectionStatus";
import { CheckCircle2, History as HistoryIcon, AlertTriangle, X } from "lucide-react";

export default function KitchenDashboard() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const { connectionState } = useAblySync();
  const isConnected = connectionState === "connected";
  // Only a real drop (not the initial handshake) counts as connection loss —
  // during the first seconds the channel is still establishing, and if realtime
  // is unavailable entirely the app falls back to polling without alarming.
  const connectionDown =
    connectionState === "disconnected" ||
    connectionState === "suspended" ||
    connectionState === "failed";

  const [viewMode, setViewMode] = useState<"QUEUE" | "BATCH" | "HISTORY">("QUEUE");
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const stored = window.localStorage.getItem("kds.sound");
    return stored === null ? true : stored === "1";
  });
  const [inspectOrder, setInspectOrder] = useState<Order | null>(null);
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState<string | null>(null);

  // --- connection lifecycle: resync authoritative state after a real drop ---
  const prevConnectionStateRef = useRef<AblyConnectionState | null>(null);
  useEffect(() => {
    const prev = prevConnectionStateRef.current;
    prevConnectionStateRef.current = connectionState;
    if (prev && prev !== "connected" && connectionState === "connected") {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["tables"] });
    }
  }, [connectionState, queryClient]);

  // --- kitchen data: Ably drives instant updates, polling is a fallback ---
  const { data: orders = [], isLoading, refetch } = useQuery({
    queryKey: ["orders"],
    queryFn: api.orders.getAll,
    // Realtime channel up → slow safety-net poll. Channel down → poll harder.
    refetchInterval: isConnected ? 15000 : 3000,
  });

  const pendingOrders = orders.filter((o) => o.status === "PENDING");
  const preparingOrders = orders.filter((o) => o.status === "PREPARING");
  const readyOrders = orders.filter((o) => o.status === "READY");
  const completedOrders = orders.filter((o) => ["SERVED", "COMPLETED"].includes(o.status));
  const overdueCount = orders.filter((o) => isOrderOverdue(o)).length;
  const activeCount = pendingOrders.length + preparingOrders.length;

  // Addon catalog so kitchen tickets can render addon names instead of raw ids.
  const { data: addons = [] } = useQuery({
    queryKey: ["addons"],
    queryFn: () => api.addons.getAll(),
  });
  const addonMap = Object.fromEntries(addons.map((a) => [a.id, a.name]));
  const tableLabels = useTableLabels();

  // --- new-ticket detection: one chime per ticket + temporary NEW highlight ---
  const seenPendingIdsRef = useRef<Set<string>>(new Set());
  const isFirstSyncRef = useRef(true);
  const highlightTimersRef = useRef<number[]>([]);

  useEffect(() => {
    const pendingIds = new Set(pendingOrders.map((o) => o.id));

    // First sync is a baseline — existing tickets are not "new".
    if (isFirstSyncRef.current) {
      seenPendingIdsRef.current = pendingIds;
      isFirstSyncRef.current = false;
      return;
    }

    const fresh = [...pendingIds].filter((id) => !seenPendingIdsRef.current.has(id));
    if (fresh.length === 0) return;

    seenPendingIdsRef.current = new Set([...seenPendingIdsRef.current, ...pendingIds]);

    if (soundEnabled) soundAlerts.playNewOrderChime();

    setNewOrderIds((prev) => {
      const next = new Set(prev);
      fresh.forEach((id) => next.add(id));
      return next;
    });

    const timer = window.setTimeout(() => {
      setNewOrderIds((prev) => {
        const next = new Set(prev);
        fresh.forEach((id) => next.delete(id));
        return next;
      });
    }, 12000);
    highlightTimersRef.current.push(timer);
  }, [pendingOrders, soundEnabled]);

  useEffect(() => () => {
    highlightTimersRef.current.forEach((t) => window.clearTimeout(t));
  }, []);

  // --- persist sound preference ---
  useEffect(() => {
    try {
      window.localStorage.setItem("kds.sound", soundEnabled ? "1" : "0");
    } catch {
      // ignore
    }
  }, [soundEnabled]);

  const handleToggleSound = () => {
    soundAlerts.unlockAudio();
    setSoundEnabled((s) => !s);
  };

  // --- transient notice auto-dismiss ---
  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(null), 6000);
    return () => window.clearTimeout(t);
  }, [notice]);

  // --- conservative optimistic transitions: rollback + resync on conflict ---
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      api.orders.updateStatus(id, status),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ["orders"] });
      const previous = queryClient.getQueryData<Order[]>(["orders"]);
      queryClient.setQueryData<Order[]>(["orders"], (old) =>
        (old ?? []).map((o) =>
          o.id === id ? { ...o, status, updatedAt: new Date().toISOString() } : o
        )
      );
      return { previous };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(["orders"], ctx.previous);
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      const message = (err as Error)?.message || "";
      setNotice(
        /transition/i.test(message)
          ? "Ticket was already updated by another station — kitchen state refreshed."
          : `${message} — Kitchen state refreshed.`
      );
    },
    onSuccess: () => {
      if (soundEnabled) soundAlerts.playActionPing();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["tables"] });
    },
  });

  const handleStartPreparing = (orderId: string) => {
    soundAlerts.unlockAudio();
    updateStatusMutation.mutate({ id: orderId, status: "PREPARING" });
  };

  const handleMarkReady = (orderId: string) => {
    soundAlerts.unlockAudio();
    updateStatusMutation.mutate({ id: orderId, status: "READY" });
  };

  const handleResync = () => {
    queryClient.invalidateQueries({ queryKey: ["orders"] });
    queryClient.invalidateQueries({ queryKey: ["tables"] });
    refetch();
  };

  const chefName = session?.user?.name || "Kitchen Station";

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-amber-500 selection:text-zinc-950">
      {/* Realtime Connection Banner */}
      <KitchenConnectionStatus isConnected={!connectionDown} onRefresh={handleResync} />

      {/* Primary KDS Header */}
      <ChefHeader
        activeCount={activeCount}
        readyCount={readyOrders.length}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        isConnected={isConnected}
        chefName={chefName}
      />

      {/* Operational Indicators (not navigation) */}
      <KitchenStats
        pendingCount={pendingOrders.length}
        preparingCount={preparingOrders.length}
        readyCount={readyOrders.length}
        overdueCount={overdueCount}
      />

      {/* MAIN CONTENT WORKSPACE */}
      <main className="flex-1 flex flex-col">
        {isLoading && orders.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-12 text-zinc-500 font-bold text-sm animate-pulse">
            Synchronizing kitchen production stream...
          </div>
        ) : viewMode === "QUEUE" ? (
          <KitchenBoard
            orders={orders}
            newOrderIds={newOrderIds}
            addonMap={addonMap}
            tableLabels={tableLabels}
            onStartPreparing={handleStartPreparing}
            onMarkReady={handleMarkReady}
            onInspectOrder={setInspectOrder}
            isLoading={updateStatusMutation.isPending}
          />
        ) : viewMode === "BATCH" ? (
          <BatchView orders={orders} addonMap={addonMap} tableLabels={tableLabels} />
        ) : (
          /* TODAY'S COMPLETED HISTORY VIEW */
          <div className="p-4 sm:p-6 max-w-5xl mx-auto w-full space-y-4 animate-in fade-in duration-200">
            <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
                  <HistoryIcon className="h-5 w-5 text-amber-500" />
                  <span>Today’s Production History</span>
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
                        {o.tableId ? formatTableRef(o.tableId, tableLabels) : o.type} • {orderTicketNumber(o)}
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
        addonMap={addonMap}
        tableLabels={tableLabels}
      />

      {/* TRANSIENT OPERATIONAL NOTICE */}
      {notice && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[70] w-[calc(100%-2rem)] max-w-md">
          <div className="flex items-start gap-3 p-4 rounded-2xl border border-amber-500/40 bg-zinc-900/95 backdrop-blur shadow-2xl animate-in slide-in-from-bottom-4 duration-200">
            <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs font-bold text-zinc-200 leading-relaxed flex-1">{notice}</p>
            <button
              onClick={() => setNotice(null)}
              className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
