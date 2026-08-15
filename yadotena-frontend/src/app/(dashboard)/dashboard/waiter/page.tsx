"use client";

import { useState } from "react";
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

import { Home, Grid3X3, ClipboardList, Bell, Coffee, ShoppingBag } from "lucide-react";

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

  // Data
  const { data: tables = [] } = useQuery<Table[]>({ queryKey: ["tables"], queryFn: api.tables.getAll });
  const { data: orders = [] } = useQuery<Order[]>({ queryKey: ["orders"], queryFn: api.orders.getAll });
  const { data: menu = [] } = useQuery<MenuItem[]>({ queryKey: ["menu"], queryFn: api.menu.getAll });
  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: api.categories.getAll });
  const { data: allAddons = [] } = useQuery<AddonItem[]>({ queryKey: ["addons"], queryFn: () => api.addons.getAll() });
  const { data: serviceRequests = [] } = useQuery<ServiceRequest[]>({ queryKey: ["serviceRequests"], queryFn: api.serviceRequests.getAll });

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
    onError: (err: any) => alert(err.message || "Order creation failed"),
  });

  const appendItemsMutation = useMutation({
    mutationFn: ({ id, items }: { id: string; items: any }) => api.orders.addItems(id, items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      soundAlerts.playActionPing();
      setView("orders");
    },
    onError: (err: any) => alert(err.message || "Failed to add items"),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: any }) => api.orders.updateStatus(id, status),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["orders"] }); queryClient.invalidateQueries({ queryKey: ["tables"] }); },
  });

  const resolveRequestMutation = useMutation({
    mutationFn: (id: string) => api.serviceRequests.resolve(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["serviceRequests"] }); soundAlerts.playActionPing(); },
  });

  // Handlers
  const handleCafeOrder = () => { setPreselectedTable(null); setAppendToOrder(null); setView("cafe-order"); };
  const handleShopSale = () => { setPreselectedTable(null); setAppendToOrder(null); setView("shop-sale"); };

  const handleNewOrderForTable = (table: Table) => {
    setPreselectedTable(table);
    setAppendToOrder(null);
    setView("cafe-order");
  };

  const handleAddItemsToOrder = (order: Order, table: Table) => {
    setPreselectedTable(table);
    setAppendToOrder(order);
    setView("cafe-order");
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
        items: payload as any,
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
          onBack={() => setView("home")}
          onNewOrderForTable={handleNewOrderForTable}
          onAddItemsToOrder={handleAddItemsToOrder}
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
      {inspectOrder && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setInspectOrder(null)}>
          <div className="bg-card rounded-2xl border p-5 max-w-md w-full max-h-[80vh] overflow-y-auto space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold">Order #{inspectOrder.id.slice(-6).toUpperCase()}</h3>
                <p className="text-sm text-muted-foreground">{inspectOrder.tableId ? `Table ${inspectOrder.tableId}` : inspectOrder.type} · {inspectOrder.status}</p>
              </div>
              <button onClick={() => setInspectOrder(null)} className="text-muted-foreground hover:text-foreground text-lg">✕</button>
            </div>
            <div className="space-y-2">
              {inspectOrder.items?.map((item, i) => (
                <div key={item.id || i} className="flex justify-between text-sm p-2 rounded-lg border">
                  <div>
                    <span className="font-medium">{item.quantity}× {item.name}</span>
                    {item.specialInstructions && <p className="text-xs text-muted-foreground italic mt-0.5">"{item.specialInstructions}"</p>}
                  </div>
                  <span className="font-mono">{(item.price * item.quantity).toFixed(0)} ETB</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between font-bold text-lg pt-2 border-t">
              <span>Total</span><span>{inspectOrder.total?.toFixed(0) || "0"} ETB</span>
            </div>
          </div>
        </div>
      )}

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
