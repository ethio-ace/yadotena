"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { Order, MenuItem, Table, ServiceRequest, AddonItem, MenuCategory } from "@/types";
import { soundAlerts } from "@/lib/audioAlerts";
import { findActiveOrderForTable } from "@/lib/tableUtils";

import { WaiterHome } from "@/components/waiter/WaiterHome";
import { WaiterSidebar, WaiterView } from "@/components/waiter/WaiterSidebar";
import { TablesView } from "@/components/waiter/TablesView";
import { TableDetailView } from "@/components/waiter/TableDetailView";
import { CafeOrderBuilder, CartItem } from "@/components/waiter/CafeOrderBuilder";
import { OrdersBoard } from "@/components/waiter/OrdersBoard";
import { AlertsView } from "@/components/waiter/AlertsView";
import { PaymentSettlementModal } from "@/components/PaymentSettlementModal";
import { OrderDetailsModal } from "@/components/OrderDetailsModal";

export default function WaiterWorkspacePage() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const [ordersDefaultTab, setOrdersDefaultTab] = useState<string>("ACTIVE");

  // Deep links from the shared header search (?tab=orders|tables|alerts) seed
  // the initial view — no effect needed, the value is known at first render.
  const initialTab = searchParams.get("tab");
  const [view, setView] = useState<WaiterView>(() =>
    initialTab === "tables" || initialTab === "orders" || initialTab === "alerts" ? initialTab : "home"
  );

  // The single table-detail experience shared by the Sell floor and the Tables
  // grid — clicking any table anywhere opens the same view with the add panel.
  const [activeTable, setActiveTable] = useState<{ table: Table; source: WaiterView } | null>(null);

  // Order builder context
  const [preselectedTable, setPreselectedTable] = useState<Table | null>(null);
  const [appendToOrder, setAppendToOrder] = useState<Order | null>(null);

  // Payment modal
  const [paymentOrder, setPaymentOrder] = useState<Order | null>(null);

  // Order detail modal
  const [inspectOrder, setInspectOrder] = useState<Order | null>(null);

  // Data — categories/addons are lazy-fetched when a surface needs them.
  const builderOpen = view === "cafe-order" || view === "shop-sale" || view === "tables" || !!activeTable;
  const { data: tables = [] } = useQuery<Table[]>({ queryKey: ["tables"], queryFn: api.tables.getAll });
  const { data: orders = [] } = useQuery<Order[]>({ queryKey: ["orders"], queryFn: api.orders.getAll });
  const { data: menu = [] } = useQuery<MenuItem[]>({ queryKey: ["menu"], queryFn: api.menu.getAll });
  const { data: categories = [] } = useQuery<MenuCategory[]>({ queryKey: ["categories"], queryFn: api.categories.getAll, enabled: builderOpen });
  const { data: allAddons = [] } = useQuery<AddonItem[]>({ queryKey: ["addons"], queryFn: () => api.addons.getAll(), enabled: builderOpen });
  const { data: serviceRequests = [] } = useQuery<ServiceRequest[]>({ queryKey: ["serviceRequests"], queryFn: api.serviceRequests.getAll });

  // Inline toast for action feedback — POS screens shouldn't block on alert().
  const [toast, setToast] = useState<{ message: string; kind: "error" | "success" } | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);
  const showToast = (message: string, kind: "error" | "success" = "error") => setToast({ message, kind });

  const pendingAlerts = serviceRequests.filter((r) => r.status === "PENDING").length;

  // Mutations
  const createOrderMutation = useMutation({
    mutationFn: api.orders.create,
    onSuccess: (newOrder) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["tables"] });
      soundAlerts.playActionConfirm();
      // If shop sale or counter → open payment immediately
      if (view === "shop-sale") {
        setPaymentOrder(newOrder);
        setView("home");
      } else {
        setView("orders");
      }
    },
    onError: (err: Error) => { soundAlerts.playError(); showToast(err?.message || "We couldn't create the order. Please try again."); },
  });

  type AppendPayload = Array<{
    menuItemId: string;
    quantity: number;
    specialInstructions: string;
    selectedAddons: string[];
  }>;

  const appendItemsMutation = useMutation({
    mutationFn: ({ id, items }: { id: string; items: AppendPayload }) => api.orders.addItems(id, items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["tables"] });
      soundAlerts.playActionConfirm();
      // Adding to an open table order returns to the floor view.
      setActiveTable(null);
      setView("tables");
    },
    onError: (err: Error) => { soundAlerts.playError(); showToast(err?.message || "We couldn't add those items. Please try again."); },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Order["status"] }) => api.orders.updateStatus(id, status),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["orders"] }); queryClient.invalidateQueries({ queryKey: ["tables"] }); },
  });

  const resolveRequestMutation = useMutation({
    mutationFn: ({ id, type }: { id: string; type: string }) => api.serviceRequests.resolve(id),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["serviceRequests"] });
      // Play the RIGHT sound based on what was resolved
      if (variables.type === "BILL") {
        soundAlerts.playBillRequest();  // 🧾 Bill settled
      } else {
        soundAlerts.playWaiterCall();   // 🛎️ Table call answered
      }
    },
    onError: (err: Error) => { soundAlerts.playError(); showToast(err?.message || "Couldn't resolve that request."); },
  });

  // Handlers
  const handleCafeOrder = () => { setPreselectedTable(null); setAppendToOrder(null); setView("cafe-order"); };
  const handleShopSale = () => { setPreselectedTable(null); setAppendToOrder(null); setView("shop-sale"); };

  const handleNewOrderForTable = (table: Table) => {
    setPreselectedTable(table);
    setAppendToOrder(null);
    // Leaving the table detail into the builder — clear the active table or the
    // activeTable branch keeps winning and the button appears dead.
    setActiveTable(null);
    setView("cafe-order");
  };

  const handleAppendItemsToOrder = (order: Order, items: CartItem[]) => {
    const payload = items.map((i) => ({
      menuItemId: i.menuItemId,
      quantity: i.quantity,
      specialInstructions: i.note || "",
      selectedAddons: i.addons.map((a) => a.id || a.name),
    }));
    appendItemsMutation.mutate({ id: order.id, items: payload });
  };

  const handleSubmitOrder = (items: CartItem[], tableId: string | undefined, orderType: "DINE_IN" | "TAKEAWAY", appendOrderId?: string) => {
    const payload = items.map((i) => ({
      menuItemId: i.menuItemId,
      quantity: i.quantity,
      specialInstructions: i.note || "",
      selectedAddons: i.addons.map((a) => a.id || a.name),
    }));

    if (appendOrderId) {
      appendItemsMutation.mutate({ id: appendOrderId, items: payload });
    } else {
      const isShop = view === "shop-sale";
      const hasPrepared = items.some((i) => {
        const mi = menu.find((m) => m.id === i.menuItemId);
        return mi && !mi.id.startsWith("shop-") && !(mi.category || "").toLowerCase().includes("shop");
      });

      createOrderMutation.mutate({
        type: orderType === "TAKEAWAY" ? "TAKEAWAY" : "DINE_IN",
        status: isShop || !hasPrepared ? "COMPLETED" : "PENDING",
        paymentStatus: "PENDING",
        tableId: orderType === "DINE_IN" ? tableId : undefined,
        // Server derives id/name/price snapshots; only menuItemId/qty/notes/addons are client-side.
        items: payload as unknown as Parameters<typeof api.orders.create>[0]["items"],
        idempotencyKey: crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      });
    }
  };

  const handleServe = (orderId: string) => updateStatusMutation.mutate({ id: orderId, status: "SERVED" });
  // Escape hatch for paid tickets that finished kitchen work before the backend
  // started auto-completing them — closes the order and frees the table.
  const handleComplete = (orderId: string) => updateStatusMutation.mutate({ id: orderId, status: "COMPLETED" });

  const openTable = (table: Table) => {
    const activeOrder = findActiveOrderForTable(table, orders);
    if (activeOrder) {
      // Table has an active order → show table detail with order + add items panel
      setActiveTable({ table, source: view === "home" ? "home" : "tables" });
    } else {
      // Table is free → skip detail page, go straight to order builder
      handleNewOrderForTable(table);
    }
  };
  const closeTable = () => {
    if (!activeTable) return;
    const source = activeTable.source;
    setActiveTable(null);
    setView(source);
  };

  const activeOrder = activeTable ? findActiveOrderForTable(activeTable.table, orders) : undefined;

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      <WaiterSidebar
        view={activeTable ? activeTable.source : view}
        pendingAlerts={pendingAlerts}
        onNavigate={(v) => { setActiveTable(null); setView(v); }}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Action feedback toast */}
        {toast && (
          <div
            role="status"
            className={`fixed top-3 left-1/2 -translate-x-1/2 z-50 max-w-[92vw] rounded-xl border px-4 py-2.5 text-sm font-bold shadow-xl animate-in fade-in slide-in-from-top-2 duration-200 ${
              toast.kind === "error"
                ? "bg-red-600 border-red-700 text-white"
                : "bg-emerald-600 border-emerald-700 text-white"
            }`}
          >
            {toast.message}
          </div>
        )}

        {/* MAIN CONTENT */}
        <div className="flex-1 overflow-y-auto">
          {activeTable ? (
            <div className="p-4 sm:p-6 max-w-6xl mx-auto">
              <TableDetailView
                table={activeTable.table}
                activeOrder={activeOrder}
                menu={menu}
                categories={categories}
                allAddons={allAddons}
                isAppending={appendItemsMutation.isPending}
                onBack={closeTable}
                onCreateOrder={handleNewOrderForTable}
                onAppendItems={handleAppendItemsToOrder}
                onViewOrder={(o) => setInspectOrder(o)}
                onSettleOrder={(o) => setPaymentOrder(o)}
              />
            </div>
          ) : view === "home" ? (
            <WaiterHome
              orders={orders}
              serviceRequests={serviceRequests}
              tables={tables}
              onCafeOrder={handleCafeOrder}
              onShopSale={handleShopSale}
              onViewReady={() => { setOrdersDefaultTab("READY"); setView("orders"); }}
              onViewUnpaid={() => { setOrdersDefaultTab("UNPAID"); setView("orders"); }}
              onViewAlerts={() => setView("alerts")}
              onOpenTable={openTable}
            />
          ) : view === "tables" ? (
            <TablesView
              tables={tables} orders={orders}
              onBack={() => setView("home")}
              onSelectTable={openTable}
              onNewOrder={handleCafeOrder}
            />
          ) : view === "cafe-order" ? (
            <CafeOrderBuilder
              menu={menu} categories={categories} allAddons={allAddons}
              tables={tables} orders={orders}
              preselectedTable={preselectedTable}
              appendToOrder={appendToOrder}
              onBack={() => setView("home")}
              onSubmit={handleSubmitOrder}
            />
          ) : view === "shop-sale" ? (
            <CafeOrderBuilder
              menu={menu} categories={categories} allAddons={allAddons}
              tables={tables} orders={orders}
              isShopMode
              onBack={() => setView("home")}
              onSubmit={handleSubmitOrder}
            />
          ) : view === "orders" ? (
            <OrdersBoard
              orders={orders}
              defaultTab={ordersDefaultTab}
              onBack={() => setView("home")}
              onServe={handleServe}
              onComplete={handleComplete}
              onSettle={(o) => setPaymentOrder(o)}
              onViewOrder={(o) => setInspectOrder(o)}
            />
          ) : (
            <AlertsView
              serviceRequests={serviceRequests}
              onBack={() => setView("home")}
              onResolve={(id, type) => resolveRequestMutation.mutate({ id, type })}
              onGoToTable={(tableId) => {
                const table = tables.find((t) => t.id === tableId);
                if (table) openTable(table);
              }}
            />
          )}
        </div>
      </div>

      {/* ORDER INSPECT MODAL */}
      <OrderDetailsModal
        order={inspectOrder}
        isOpen={!!inspectOrder}
        onClose={() => setInspectOrder(null)}
        menu={menu}
        onSettle={(o: Order) => setPaymentOrder(o)}
      />

      {/* PAYMENT MODAL */}
      <PaymentSettlementModal
        order={paymentOrder}
        isOpen={!!paymentOrder}
        onClose={() => setPaymentOrder(null)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["orders"] });
          queryClient.invalidateQueries({ queryKey: ["tables"] });
          setPaymentOrder(null);
        }}
      />
    </div>
  );
}
