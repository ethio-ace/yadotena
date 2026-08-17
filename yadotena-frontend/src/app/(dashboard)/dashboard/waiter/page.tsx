"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { Order, MenuItem, Table, ServiceRequest, AddonItem } from "@/types";
import { soundAlerts } from "@/lib/audioAlerts";

import { WaiterHome } from "@/components/waiter/WaiterHome";
import { TablesView } from "@/components/waiter/TablesView";
import { CafeOrderBuilder, CartItem } from "@/components/waiter/CafeOrderBuilder";
import { OrdersBoard } from "@/components/waiter/OrdersBoard";
import { AlertsView } from "@/components/waiter/AlertsView";
import { PaymentSettlementModal } from "@/components/PaymentSettlementModal";
import { OrderDetailsModal } from "@/components/OrderDetailsModal";

import { Home, Grid3X3, ClipboardList, Bell } from "lucide-react";

type View = "home" | "tables" | "cafe-order" | "shop-sale" | "orders" | "alerts";

export default function WaiterWorkspacePage() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<View>("home");
  const [ordersDefaultTab, setOrdersDefaultTab] = useState<string>("ACTIVE");

  // Order builder context
  const [preselectedTable, setPreselectedTable] = useState<Table | null>(null);
  const [appendToOrder, setAppendToOrder] = useState<Order | null>(null);

  // Payment modal
  const [paymentOrder, setPaymentOrder] = useState<Order | null>(null);

  // Order detail modal
  const [inspectOrder, setInspectOrder] = useState<Order | null>(null);

  // Data — categories/addons are only needed inside the order builder, so they
  // are fetched lazily when that view opens (react-query keeps them cached after
  // the first visit). The other queries serve home/tables/orders/alerts.
  const builderOpen = view === "cafe-order" || view === "shop-sale" || view === "tables";
  const { data: tables = [] } = useQuery<Table[]>({ queryKey: ["tables"], queryFn: api.tables.getAll });
  const { data: orders = [] } = useQuery<Order[]>({ queryKey: ["orders"], queryFn: api.orders.getAll });
  const { data: menu = [] } = useQuery<MenuItem[]>({ queryKey: ["menu"], queryFn: api.menu.getAll });
  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: api.categories.getAll, enabled: builderOpen });
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

  const pendingAlerts = serviceRequests.filter(r => r.status === "PENDING").length;

  // Mutations
  const createOrderMutation = useMutation({
    mutationFn: api.orders.create,
    onSuccess: (newOrder) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["tables"] });
      soundAlerts.playActionPing();
      // If shop sale or counter → open payment immediately
      if (view === "shop-sale") {
        setPaymentOrder(newOrder);
        setView("home");
      } else {
        setView("orders");
      }
    },
    onError: (err: Error) => showToast(err?.message || "We couldn't create the order. Please try again."),
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
      soundAlerts.playActionPing();
      // Adding to an open table order returns to the floor view.
      setView("tables");
    },
    onError: (err: Error) => showToast(err?.message || "We couldn't add those items. Please try again."),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Order["status"] }) => api.orders.updateStatus(id, status),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["orders"] }); queryClient.invalidateQueries({ queryKey: ["tables"] }); },
  });

  const resolveRequestMutation = useMutation({
    mutationFn: (id: string) => api.serviceRequests.resolve(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["serviceRequests"] }); soundAlerts.playActionPing(); },
    onError: (err: Error) => showToast(err?.message || "Couldn't resolve that request."),
  });

  // Handlers
  const handleCafeOrder = () => { setPreselectedTable(null); setAppendToOrder(null); setView("cafe-order"); };
  const handleShopSale = () => { setPreselectedTable(null); setAppendToOrder(null); setView("shop-sale"); };

  const handleNewOrderForTable = (table: Table) => {
    setPreselectedTable(table);
    setAppendToOrder(null);
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
    const payload = items.map(i => ({
      menuItemId: i.menuItemId,
      quantity: i.quantity,
      specialInstructions: i.note || "",
      selectedAddons: i.addons.map(a => a.id || a.name),
    }));

    if (appendOrderId) {
      appendItemsMutation.mutate({ id: appendOrderId, items: payload });
    } else {
      const isShop = view === "shop-sale";
      const hasPrepared = items.some(i => {
        const mi = menu.find(m => m.id === i.menuItemId);
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

  // Navigation items
  const navItems = [
    { key: "home" as View, icon: Home, label: "Sell" },
    { key: "tables" as View, icon: Grid3X3, label: "Tables" },
    { key: "orders" as View, icon: ClipboardList, label: "Orders" },
    { key: "alerts" as View, icon: Bell, label: "Alerts", badge: pendingAlerts },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
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
      {view === "home" && (
        <WaiterHome
          orders={orders}
          serviceRequests={serviceRequests}
          onCafeOrder={handleCafeOrder}
          onShopSale={handleShopSale}
          onViewReady={() => { setOrdersDefaultTab("READY"); setView("orders"); }}
          onViewUnpaid={() => { setOrdersDefaultTab("UNPAID"); setView("orders"); }}
          onViewAlerts={() => setView("alerts")}
        />
      )}

      {view === "tables" && (
        <TablesView
          tables={tables} orders={orders}
          menu={menu} categories={categories} allAddons={allAddons}
          isAppending={appendItemsMutation.isPending}
          onBack={() => setView("home")}
          onNewOrderForTable={handleNewOrderForTable}
          onAppendItems={handleAppendItemsToOrder}
          onViewOrder={o => setInspectOrder(o)}
          onSettleOrder={o => setPaymentOrder(o)}
        />
      )}

      {view === "cafe-order" && (
        <CafeOrderBuilder
          menu={menu} categories={categories} allAddons={allAddons}
          tables={tables} orders={orders}
          preselectedTable={preselectedTable}
          appendToOrder={appendToOrder}
          onBack={() => setView("home")}
          onSubmit={handleSubmitOrder}
        />
      )}

      {view === "shop-sale" && (
        <CafeOrderBuilder
          menu={menu} categories={categories} allAddons={allAddons}
          tables={tables} orders={orders}
          isShopMode
          onBack={() => setView("home")}
          onSubmit={handleSubmitOrder}
        />
      )}

      {view === "orders" && (
        <OrdersBoard
          orders={orders}
          defaultTab={ordersDefaultTab}
          onBack={() => setView("home")}
          onServe={handleServe}
          onSettle={o => setPaymentOrder(o)}
          onViewOrder={o => setInspectOrder(o)}
        />
      )}

      {view === "alerts" && (
        <AlertsView
          serviceRequests={serviceRequests}
          onBack={() => setView("home")}
          onResolve={id => resolveRequestMutation.mutate(id)}
        />
      )}

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

      {/* BOTTOM NAVIGATION */}
      {!["cafe-order", "shop-sale"].includes(view) && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t px-2 py-1.5 flex items-center justify-around max-w-lg mx-auto">
          {navItems.map(n => {
            const active = view === n.key || (n.key === "home" && ["home"].includes(view));
            return (
              <button key={n.key} onClick={() => { setView(n.key); if (n.key === "orders") setOrdersDefaultTab("ACTIVE"); }}
                className={`relative flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl transition-colors ${active ? "text-foreground font-bold" : "text-muted-foreground"}`}>
                <n.icon className="h-5 w-5" />
                <span className="text-[10px]">{n.label}</span>
                {n.badge && n.badge > 0 && (
                  <span className="absolute top-0.5 right-2 h-4 w-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">{n.badge}</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
