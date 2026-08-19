"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { api } from "@/services/api";
import { Order, ItemKitchenStatus } from "@/types";
import { soundAlerts } from "@/lib/audioAlerts";
import { buildRoundCards, activeRoundCards, isCardOverdue, deriveOrderStatus } from "@/lib/kitchen";
import { useTableLabels } from "@/hooks/useTableLabels";
import { useAblySync, AblyConnectionState } from "@/contexts/AblySyncProvider";

import { ChefHeader } from "@/components/kds/ChefHeader";
import { KitchenSidebar, KitchenWorkspaceMode } from "@/components/kds/KitchenSidebar";
import { KitchenCategoryFilter } from "@/components/kds/KitchenFilters";
import { KitchenBoard } from "@/components/kds/KitchenBoard";
import { BatchPlanner } from "@/components/kds/BatchPlanner";
import { OrderSheet } from "@/components/kds/OrderSheet";
import { ConnectionBanner } from "@/components/kds/ConnectionBanner";
import { AlertTriangle, X } from "lucide-react";

export default function KitchenDashboard() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const { connectionState } = useAblySync();
  const isConnected = connectionState === "connected";
  const connectionDown =
    connectionState === "disconnected" ||
    connectionState === "suspended" ||
    connectionState === "failed";

  const [workspaceMode, setWorkspaceMode] = useState<KitchenWorkspaceMode>("QUEUE");
  const [selectedFilter, setSelectedFilter] = useState<KitchenCategoryFilter>("ALL");
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const stored = window.localStorage.getItem("kds.sound");
    return stored === null ? true : stored === "1";
  });

  const [inspectOrder, setInspectOrder] = useState<Order | null>(null);
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState<string | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  // Connection resync on reconnection
  const prevConnectionStateRef = useRef<AblyConnectionState | null>(null);
  useEffect(() => {
    const prev = prevConnectionStateRef.current;
    prevConnectionStateRef.current = connectionState;
    if (prev && prev !== "connected" && connectionState === "connected") {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["tables"] });
    }
  }, [connectionState, queryClient]);

  // Main orders feed (Instant WebSocket or 3s polling fallback)
  const { data: orders = [], isLoading, refetch } = useQuery({
    queryKey: ["orders"],
    queryFn: api.orders.getAll,
    refetchInterval: isConnected ? false : 3000,
  });

  // Addon catalog for mapping add-on string IDs to names
  const { data: addons = [] } = useQuery({
    queryKey: ["addons"],
    queryFn: () => api.addons.getAll(),
  });
  const addonMap = useMemo(() => Object.fromEntries(addons.map((a) => [a.id, a.name])), [addons]);
  const tableLabels = useTableLabels();

  // Active kitchen round cards
  const allCards = useMemo(() => activeRoundCards(buildRoundCards(orders)), [orders]);

  // Category filtering logic
  const filteredCards = useMemo(() => {
    if (selectedFilter === "ALL") return allCards;

    const drinkKeywords = ["coffee", "latte", "cappuccino", "tea", "macchiato", "espresso", "juice", "drink", "water", "soda"];
    const bakeryKeywords = ["pastry", "croissant", "bread", "cake", "muffin", "donut", "bakery"];
    const dessertKeywords = ["dessert", "ice cream", "sweet", "pudding", "tiramisu"];

    return allCards.filter((card) => {
      return card.items.some((item) => {
        const nameLower = item.name.toLowerCase();

        if (selectedFilter === "DRINKS") {
          return drinkKeywords.some((k) => nameLower.includes(k));
        }
        if (selectedFilter === "COFFEE") {
          return ["coffee", "latte", "cappuccino", "espresso", "macchiato"].some((k) => nameLower.includes(k));
        }
        if (selectedFilter === "BAKERY") {
          return bakeryKeywords.some((k) => nameLower.includes(k));
        }
        if (selectedFilter === "DESSERT") {
          return dessertKeywords.some((k) => nameLower.includes(k));
        }
        if (selectedFilter === "FOOD") {
          return !drinkKeywords.some((k) => nameLower.includes(k)) && !bakeryKeywords.some((k) => nameLower.includes(k));
        }
        return true;
      });
    });
  }, [allCards, selectedFilter]);

  const pendingCards = useMemo(() => filteredCards.filter((c) => c.status === "PENDING"), [filteredCards]);
  const preparingCards = useMemo(() => filteredCards.filter((c) => c.status === "PREPARING"), [filteredCards]);
  const readyCards = useMemo(() => filteredCards.filter((c) => c.status === "READY"), [filteredCards]);

  // Compute average wait time across active unserved tickets
  const avgWaitMin = useMemo(() => {
    const now = Date.now();
    const waitTimes = allCards
      .filter((c) => c.status === "PENDING" || c.status === "PREPARING")
      .map((c) => Math.max(0, Math.floor((now - new Date(c.createdAt).getTime()) / 60000)));

    return waitTimes.length
      ? Math.round(waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length)
      : 0;
  }, [allCards]);

  // New-round sound alert & visual glow
  const seenPendingKeysRef = useRef<Set<string>>(new Set());
  const isFirstSyncRef = useRef(true);

  const pendingKeys = useMemo(
    () => new Set(pendingCards.map((c) => c.key)),
    [pendingCards]
  );

  useEffect(() => {
    if (isFirstSyncRef.current) {
      seenPendingKeysRef.current = pendingKeys;
      isFirstSyncRef.current = false;
      return;
    }

    const fresh = [...pendingKeys].filter((key) => !seenPendingKeysRef.current.has(key));
    if (fresh.length === 0) return;

    seenPendingKeysRef.current = new Set([...seenPendingKeysRef.current, ...pendingKeys]);

    if (soundEnabled) soundAlerts.playNewOrder();

    setNewOrderIds((prev) => {
      const next = new Set(prev);
      fresh.forEach((key) => next.add(key));
      return next;
    });

    const timer = window.setTimeout(() => {
      setNewOrderIds((prev) => {
        const next = new Set(prev);
        fresh.forEach((key) => next.delete(key));
        return next;
      });
    }, 12000);

    return () => window.clearTimeout(timer);
  }, [pendingKeys, soundEnabled]);

  // Persist sound preference
  useEffect(() => {
    try {
      window.localStorage.setItem("kds.sound", soundEnabled ? "1" : "0");
    } catch {}
  }, [soundEnabled]);

  const handleToggleSound = () => {
    soundAlerts.unlockAudio();
    setSoundEnabled((s) => !s);
  };

  // Kitchen transition mutation
  const kitchenMutation = useMutation({
    mutationFn: ({ id, round, action }: { id: string; round: number; action: "start" | "ready" | "serve" | "cancel" }) =>
      api.orders.kitchenAction(id, { roundNumber: round, action }),
    onMutate: async ({ id, round, action }) => {
      const key = `${id}:${round}`;
      setUpdatingOrderId(key);
      await queryClient.cancelQueries({ queryKey: ["orders"] });
      const previous = queryClient.getQueryData<Order[]>(["orders"]);
      const targetItemStatus: ItemKitchenStatus =
        action === "start" ? "PREPARING" : action === "ready" ? "READY" : action === "serve" ? "SERVED" : "CANCELLED";

      queryClient.setQueryData<Order[]>(["orders"], (old) =>
        (old ?? []).map((o) => {
          if (o.id !== id) return o;
          const items = (o.items || []).map((i) =>
            (i.roundNumber || 1) !== round ? i : { ...i, status: targetItemStatus }
          );
          return { ...o, items, status: deriveOrderStatus(items), updatedAt: new Date().toISOString() };
        })
      );
      return { previous };
    },
    onError: (err, _vars, ctx) => {
      setUpdatingOrderId(null);
      if (ctx?.previous) queryClient.setQueryData(["orders"], ctx.previous);
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      const message = (err as Error)?.message || "";
      setNotice(
        /transition|eligible|already|completed|cancelled/i.test(message)
          ? "Ticket was already updated by another station — kitchen refreshed."
          : `${message} — Kitchen refreshed.`
      );
    },
    onSuccess: (_data, variables) => {
      setUpdatingOrderId(null);
      if (soundEnabled) {
        const { action } = variables;
        if (action === "ready") {
          soundAlerts.playOrderReady();
        } else if (action === "start") {
          soundAlerts.playActionConfirm();
        } else if (action === "serve") {
          soundAlerts.playOrderCompleted();
        } else if (action === "cancel") {
          soundAlerts.playError();
        }
      }
    },
    onSettled: () => {
      setUpdatingOrderId(null);
    },
  });

  const handleStartPreparing = (orderId: string, round: number) => {
    soundAlerts.unlockAudio();
    kitchenMutation.mutate({ id: orderId, round, action: "start" });
  };

  const handleMarkReady = (orderId: string, round: number) => {
    soundAlerts.unlockAudio();
    kitchenMutation.mutate({ id: orderId, round, action: "ready" });
  };

  const handleResync = () => {
    queryClient.invalidateQueries({ queryKey: ["orders"] });
    queryClient.invalidateQueries({ queryKey: ["tables"] });
    refetch();
  };

  const chefName = session?.user?.name || "Kitchen Station";

  return (
    <div className="h-screen bg-zinc-950 text-zinc-50 flex flex-col font-sans overflow-hidden select-none">
      {/* Real-time Connection Banner */}
      <ConnectionBanner isConnected={!connectionDown} onRefresh={handleResync} />

      {/* Industrial KDS Command Center Header */}
      <ChefHeader
        pendingCount={pendingCards.length}
        preparingCount={preparingCards.length}
        readyCount={readyCards.length}
        avgWaitMin={avgWaitMin}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        onRefresh={handleResync}
        chefName={chefName}
        isConnected={!connectionDown}
      />

      {/* MAIN WORKSPACE: Fixed Left Rail + Queue / Batch Surface */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Fixed Left Rail */}
        <KitchenSidebar
          cards={allCards}
          workspaceMode={workspaceMode}
          onWorkspaceModeChange={setWorkspaceMode}
          selectedFilter={selectedFilter}
          onSelectFilter={setSelectedFilter}
          onInspectCard={(c) => setInspectOrder(c.order)}
        />

        {/* Dynamic Center Surface: Queue Board vs Batch Production Planner */}
        <main className="flex-1 flex flex-col overflow-hidden bg-zinc-950">
          {isLoading && orders.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-12 text-zinc-500 font-bold text-sm animate-pulse">
              Synchronizing production stream...
            </div>
          ) : workspaceMode === "QUEUE" ? (
            <KitchenBoard
              pendingCards={pendingCards}
              preparingCards={preparingCards}
              readyCards={readyCards}
              newCardKeys={newOrderIds}
              addonMap={addonMap}
              tableLabels={tableLabels}
              onStartPreparing={handleStartPreparing}
              onMarkReady={handleMarkReady}
              onInspectOrder={setInspectOrder}
              updatingKey={updatingOrderId}
            />
          ) : (
            <BatchPlanner
              orders={orders}
              addonMap={addonMap}
              tableLabels={tableLabels}
            />
          )}
        </main>
      </div>

      {/* ORDER INSPECTION DRAWER SHEET */}
      <OrderSheet
        order={inspectOrder}
        isOpen={!!inspectOrder}
        onClose={() => setInspectOrder(null)}
        onStartPreparing={handleStartPreparing}
        onMarkReady={handleMarkReady}
        updatingKey={updatingOrderId}
        addonMap={addonMap}
        tableLabels={tableLabels}
      />

      {/* TRANSIENT OPERATIONAL NOTICE */}
      {notice && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[90] w-[calc(100%-2rem)] max-w-md">
          <div className="flex items-start gap-3 p-4 rounded-2xl border border-amber-500/40 bg-zinc-900/95 backdrop-blur-md shadow-2xl animate-in slide-in-from-bottom-4 duration-200">
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
