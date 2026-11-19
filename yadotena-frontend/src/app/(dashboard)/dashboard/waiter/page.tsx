"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { Order, MenuItem, Table, ServiceRequest, AddonItem, MenuCategory } from "@/types";
import { soundAlerts } from "@/lib/audioAlerts";
import { findActiveOrderForTable } from "@/lib/tableUtils";
import { orderTicketNumber } from "@/lib/kitchen";
import { isShopProductItem } from "@/lib/orderUtils";

import { WaiterSidebar, WaiterView } from "@/components/waiter/WaiterSidebar";
import { TablesView } from "@/components/waiter/TablesView";
import { TableDetailView } from "@/components/waiter/TableDetailView";
import { CafeOrderBuilder, CartItem, OrderTarget } from "@/components/waiter/CafeOrderBuilder";
import { OrdersBoard, OrdersTab, ordersForTab } from "@/components/waiter/OrdersBoard";
import { AlertsView } from "@/components/waiter/AlertsView";
import { PaymentSettlementModal } from "@/components/PaymentSettlementModal";
import { OrderDetailsModal } from "@/components/OrderDetailsModal";
import { ArrowLeft, Check, Plus } from "lucide-react";

/**
 * Waiter workspace — one flow, nothing but orders:
 *   Tables (home) → tap a free table → pick dishes → Send to kitchen → back to Tables
 *   Tables → tap a busy table → see progress → Add items / Mark served / Settle bill
 *   Orders → Ready to serve / Active / Unpaid / Done today
 *   Calls  → customer "call waiter" / "bring the bill"
 */
export default function WaiterWorkspacePage() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();

  // ?tab=orders|tables|alerts|calls seeds the first view (no effect needed).
  const [view, setView] = useState<WaiterView>(() => {
    const t = searchParams.get("tab");
    return t === "orders" ? "orders" : t === "alerts" || t === "calls" ? "calls" : "tables";
  });
  const [ordersTab, setOrdersTab] = useState<OrdersTab>("ACTIVE");

  // Busy table being looked at (id, so it re-resolves against fresh data).
  const [activeTableId, setActiveTableId] = useState<string | null>(null);
  // Table the order builder was opened for (null = builder asks where to).
  const [builderTable, setBuilderTable] = useState<Table | null>(null);
  // Bumped on every builder entry so its internal step state starts fresh.
  const [builderKey, setBuilderKey] = useState(0);

  const [cafeCart, setCafeCart] = useState<CartItem[]>([]);
  const [shopCart, setShopCart] = useState<CartItem[]>([]);
  const [paymentOrder, setPaymentOrder] = useState<Order | null>(null);
  const [inspectOrder, setInspectOrder] = useState<Order | null>(null);

  // Ably pushes updates instantly; this poll is the safety net when realtime
  // is down or not configured, so guest orders and calls still show up.
  const LIVE_POLL_MS = 15_000;
  const { data: tables = [] } = useQuery<Table[]>({ queryKey: ["tables"], queryFn: api.tables.getAll });
  const { data: orders = [], isSuccess: ordersLoaded } = useQuery<Order[]>({ queryKey: ["orders"], queryFn: api.orders.getAll, refetchInterval: LIVE_POLL_MS });
  const { data: menu = [] } = useQuery<MenuItem[]>({ queryKey: ["menu"], queryFn: api.menu.getAll });
  const { data: categories = [] } = useQuery<MenuCategory[]>({ queryKey: ["categories"], queryFn: api.categories.getAll });
  const { data: allAddons = [] } = useQuery<AddonItem[]>({ queryKey: ["addons"], queryFn: () => api.addons.getAll() });
  const { data: serviceRequests = [] } = useQuery<ServiceRequest[]>({ queryKey: ["serviceRequests"], queryFn: api.serviceRequests.getAll, staleTime: 5000, refetchInterval: LIVE_POLL_MS });

  // Inline toast — POS screens never block on alert().
  const [toast, setToast] = useState<{ message: string; kind: "error" | "success" } | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);
  const showToast = (message: string, kind: "error" | "success" = "error") => setToast({ message, kind });

  const pendingCalls = serviceRequests.filter((r) => r.status === "PENDING");
  const callsByTable = useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of pendingCalls) if (r.tableId) m[r.tableId] = (m[r.tableId] || 0) + 1;
    return m;
  }, [pendingCalls]);
  const readyCount = useMemo(() => ordersForTab(orders, "READY").length, [orders]);
  const approvalCount = useMemo(() => ordersForTab(orders, "APPROVE").length, [orders]);

  // Chime + toast when a new guest order lands — not for ones already
  // waiting when the page first loads its orders.
  const prevApprovals = useRef<number | null>(null);
  useEffect(() => {
    if (!ordersLoaded) return;
    if (prevApprovals.current !== null && approvalCount > prevApprovals.current) {
      soundAlerts.playNewOrder();
      setToast({ message: "New guest order — check Tables to approve", kind: "success" });
    }
    prevApprovals.current = approvalCount;
  }, [approvalCount, ordersLoaded]);

  const tableName = (t?: Table | null) => t?.name || "table";
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["orders"] });
    queryClient.invalidateQueries({ queryKey: ["tables"] });
  };

  const toPayload = (items: CartItem[]) =>
    items.map((i) => ({
      menuItemId: i.menuItemId,
      quantity: i.quantity,
      specialInstructions: i.note || "",
      selectedAddons: i.addons.map((a) => a.id),
    }));

  // ── Mutations ────────────────────────────────────────────────────────────
  const createOrderMutation = useMutation({ mutationFn: api.orders.create });
  const appendItemsMutation = useMutation({
    mutationFn: ({ id, items }: { id: string; items: ReturnType<typeof toPayload> }) => api.orders.addItems(id, items),
  });
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Order["status"] }) => api.orders.updateStatus(id, status),
    onSuccess: invalidate,
    onError: (err: Error) => { soundAlerts.playError(); showToast(err?.message || "That didn't go through. Try again."); },
  });
  const resolveRequestMutation = useMutation({
    mutationFn: ({ id }: { id: string; type: string }) => api.serviceRequests.resolve(id),
    onSuccess: (_d, v) => {
      // Ably handles realtime invalidation.
      if (v.type === "BILL") soundAlerts.playBillRequest(); else soundAlerts.playWaiterCall();
    },
    onError: (err: Error) => { soundAlerts.playError(); showToast(err?.message || "Couldn't mark that call as done."); },
  });

  // ── Navigation ───────────────────────────────────────────────────────────
  const navigate = (v: WaiterView) => {
    setActiveTableId(null);
    if (v === "cafe-order") openBuilder(null);
    else setView(v);
  };

  const openBuilder = (table: Table | null) => {
    // A cart started for one table must never leak onto another.
    if ((table?.id ?? null) !== (builderTable?.id ?? null)) setCafeCart([]);
    setBuilderTable(table);
    setBuilderKey((k) => k + 1);
    setActiveTableId(null);
    setView("cafe-order");
  };

  const openTable = (table: Table) => {
    if (findActiveOrderForTable(table, orders)) {
      setActiveTableId(table.id);
    } else {
      // Free table (even if its stored status is stale) → straight to ordering.
      openBuilder(table);
    }
  };

  const backToTables = () => {
    setActiveTableId(null);
    setView("tables");
  };

  // ── Actions ──────────────────────────────────────────────────────────────
  const handleSubmit = (items: CartItem[], target: OrderTarget, appendOrderId?: string) => {
    const payload = toPayload(items);

    if (appendOrderId) {
      appendItemsMutation.mutate(
        { id: appendOrderId, items: payload },
        {
          onSuccess: () => {
            invalidate();
            soundAlerts.playActionConfirm();
            setCafeCart([]);
            showToast(`Added to #${orderTicketNumber({ id: appendOrderId })}${target.kind === "table" ? ` · ${tableName(target.table)}` : ""}`, "success");
            backToTables();
          },
          onError: (err: Error) => { soundAlerts.playError(); showToast(err?.message || "Couldn't add those items. Try again."); },
        }
      );
      return;
    }

    const isShop = target.kind === "shop";
    const hasKitchenWork = items.some((i) => {
      const mi = menu.find((m) => m.id === i.menuItemId);
      return mi && !isShopProductItem(mi);
    });

    createOrderMutation.mutate(
      {
        type: target.kind === "table" ? "DINE_IN" : "TAKEAWAY",
        status: isShop || !hasKitchenWork ? "COMPLETED" : "PENDING",
        paymentStatus: "PENDING",
        tableId: target.kind === "table" ? target.table.id : undefined,
        // Server derives id/name/price snapshots.
        items: payload as unknown as Parameters<typeof api.orders.create>[0]["items"],
        idempotencyKey: crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      },
      {
        onSuccess: (newOrder: Order) => {
          invalidate();
          soundAlerts.playActionConfirm();
          if (isShop) {
            setShopCart([]);
            setPaymentOrder(newOrder); // shop sales are paid on the spot
            backToTables();
            return;
          }
          setCafeCart([]);
          setBuilderTable(null);
          showToast(
            `Sent to kitchen · ${target.kind === "table" ? tableName(target.table) : "Takeaway"} #${orderTicketNumber(newOrder)}`,
            "success"
          );
          backToTables();
        },
        onError: (err: Error) => { soundAlerts.playError(); showToast(err?.message || "Couldn't create the order. Try again."); },
      }
    );
  };

  const serveReady = (o: Order) =>
    updateStatusMutation.mutate(
      { id: o.id, status: "SERVED" },
      { onSuccess: () => { soundAlerts.playActionConfirm(); showToast("Marked as served", "success"); } }
    );
  // Guest rounds from the public menu: approve sends them to the kitchen.
  const reviewMutation = useMutation({
    mutationFn: ({ id, action, roundNumber }: { id: string; action: "approve" | "reject"; roundNumber?: number }) =>
      api.orders.kitchenAction(id, { action, roundNumber }),
    onSuccess: (_d, v) => {
      invalidate();
      soundAlerts.playActionConfirm();
      showToast(v.action === "approve" ? "Approved — sent to the kitchen" : "Guest order rejected", "success");
    },
    onError: (err: Error) => { soundAlerts.playError(); showToast(err?.message || "Couldn't update that order. Try again."); },
  });
  const reviewOrder = (o: Order, action: "approve" | "reject", roundNumber?: number) => {
    if (action === "reject" && !window.confirm("Reject the guest's order? Tell them so they can order again.")) return;
    reviewMutation.mutate({ id: o.id, action, roundNumber });
  };

  // Paid tickets that finished kitchen work but weren't auto-closed.
  const completeOrder = (o: Order) => updateStatusMutation.mutate({ id: o.id, status: "COMPLETED" });

  // ── Derived view state ───────────────────────────────────────────────────
  const activeTable = activeTableId ? tables.find((t) => t.id === activeTableId) || null : null;
  const activeOrder = activeTable ? findActiveOrderForTable(activeTable, orders) : undefined;
  const focusMode = !!activeTable || view === "cafe-order" || view === "shop-sale";
  const busyOrderId = updateStatusMutation.isPending
    ? updateStatusMutation.variables?.id
    : reviewMutation.isPending ? reviewMutation.variables?.id : null;
  const submitting = createOrderMutation.isPending || appendItemsMutation.isPending;

  return (
    <div className="h-full min-h-0 bg-background flex flex-col md:flex-row">
      <WaiterSidebar
        view={activeTable ? "tables" : view}
        readyCount={readyCount}
        approvalCount={approvalCount}
        pendingCalls={pendingCalls.length}
        focusMode={focusMode}
        onNavigate={navigate}
      />

      <main className="flex-1 min-w-0 min-h-0 overflow-hidden" onPointerDown={() => soundAlerts.unlockAudio()}>
        {toast && (
          <div
            role="status"
            className={`fixed top-3 left-1/2 -translate-x-1/2 z-[60] max-w-[92vw] rounded-xl px-4 py-3 text-sm font-bold shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200 ${
              toast.kind === "error" ? "bg-red-600 text-white" : "bg-emerald-600 text-white"
            }`}
          >
            {toast.kind === "success" && <Check className="h-4 w-4 shrink-0" strokeWidth={3} />}
            {toast.message}
          </div>
        )}

        {activeTable ? (
          activeOrder ? (
            <TableDetailView
              table={activeTable}
              activeOrder={activeOrder}
              allAddons={allAddons}
              isServing={busyOrderId === activeOrder.id}
              onBack={backToTables}
              onAddItems={(t) => openBuilder(t)}
              onServeReady={serveReady}
              onViewOrder={setInspectOrder}
              onSettleOrder={setPaymentOrder}
              onReviewRound={(o, round, action) => reviewOrder(o, action, round)}
            />
          ) : (
            // The ticket closed while we were looking (settled / completed elsewhere).
            <div className="h-full flex flex-col items-center justify-center p-6 text-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <Check className="h-7 w-7" />
              </div>
              <div>
                <p className="text-lg font-black">{activeTable.name} is free</p>
                <p className="text-sm text-muted-foreground">The order on this table is closed.</p>
              </div>
              <div className="flex gap-2">
                <button onClick={backToTables} className="h-12 px-5 rounded-xl border-2 font-bold text-sm flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4" /> Tables
                </button>
                <button onClick={() => openBuilder(activeTable)} className="h-12 px-5 rounded-xl bg-amber-500 text-amber-950 font-black text-sm flex items-center gap-2">
                  <Plus className="h-4 w-4" strokeWidth={3} /> New order here
                </button>
              </div>
            </div>
          )
        ) : view === "tables" ? (
          <TablesView
            tables={tables}
            orders={orders}
            readyCount={readyCount}
            approvalCount={approvalCount}
            pendingCalls={pendingCalls.length}
            callsByTable={callsByTable}
            onSelectTable={openTable}
            onViewReady={() => { setOrdersTab("READY"); setView("orders"); }}
            onViewApprovals={() => { setOrdersTab("APPROVE"); setView("orders"); }}
            onViewCalls={() => setView("calls")}
          />
        ) : view === "cafe-order" ? (
          <CafeOrderBuilder
            key={`cafe-${builderKey}`}
            menu={menu} categories={categories} allAddons={allAddons}
            tables={tables} orders={orders}
            preselectedTable={builderTable}
            cart={cafeCart}
            isSubmitting={submitting}
            onCartChange={setCafeCart}
            onBack={backToTables}
            onSubmit={handleSubmit}
          />
        ) : view === "shop-sale" ? (
          <CafeOrderBuilder
            key="shop"
            menu={menu} categories={categories} allAddons={allAddons}
            tables={tables} orders={orders}
            isShopMode
            cart={shopCart}
            isSubmitting={submitting}
            onCartChange={setShopCart}
            onBack={backToTables}
            onSubmit={handleSubmit}
          />
        ) : view === "orders" ? (
          <OrdersBoard
            orders={orders}
            tab={ordersTab}
            busyOrderId={busyOrderId}
            onTabChange={setOrdersTab}
            onServe={serveReady}
            onComplete={completeOrder}
            onSettle={setPaymentOrder}
            onViewOrder={setInspectOrder}
            onApprove={(o) => reviewOrder(o, "approve")}
            onReject={(o) => reviewOrder(o, "reject")}
          />
        ) : (
          <AlertsView
            serviceRequests={serviceRequests}
            resolvingId={resolveRequestMutation.isPending ? resolveRequestMutation.variables?.id : null}
            onResolve={(id, type) => resolveRequestMutation.mutate({ id, type })}
            onGoToTable={(tableId) => {
              const table = tables.find((t) => t.id === tableId);
              if (table) openTable(table);
            }}
          />
        )}
      </main>

      <OrderDetailsModal
        order={inspectOrder}
        isOpen={!!inspectOrder}
        onClose={() => setInspectOrder(null)}
        menu={menu}
        onSettle={(o: Order) => { setInspectOrder(null); setPaymentOrder(o); }}
      />

      <PaymentSettlementModal
        order={paymentOrder}
        isOpen={!!paymentOrder}
        onClose={() => setPaymentOrder(null)}
        onSuccess={() => {
          invalidate();
          setPaymentOrder(null);
          showToast("Payment recorded", "success");
        }}
      />
    </div>
  );
}
