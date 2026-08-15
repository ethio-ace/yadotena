"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatETB } from "@/lib/currency";
import { getImageUrl } from "@/lib/utils";
import { 
  Search, Plus, Trash2, Check, CreditCard, X, ShoppingBag, 
  ArrowLeft, Sparkles, ChevronRight, Users, Utensils, Zap,
  Clock, Coffee, RefreshCw, Edit2, Filter, Receipt, LayoutDashboard,
  CheckCircle2, AlertCircle, FileText, ChevronDown, ListFilter
} from "lucide-react";
import { PaymentSettlementModal } from "@/components/PaymentSettlementModal";
import { Order, MenuItem, MenuItemAddon, Table, AddonItem } from "@/types";
import { getApplicableAddonsForItem, isShopProductItem } from "@/lib/orderUtils";
import { soundAlerts } from "@/lib/audioAlerts";

export interface WaiterCartItem {
  cartItemId: string;
  menuItemId: string;
  name: string;
  basePrice: number;
  quantity: number;
  selectedAddons: MenuItemAddon[];
  specialInstructions: string;
}

const KITCHEN_NOTE_PRESETS = [
  "No Spicy",
  "Extra Hot",
  "No Onions",
  "Serve Warm",
  "Extra Sauce",
  "Separate Plate",
  "Well Done",
];

export default function WaiterWorkspacePage() {
  const queryClient = useQueryClient();

  // Top-level Navigation View: "dashboard" (home) | "entry" (order entry workspace) | "orders" (active orders list) | "history" (completed history)
  const [activeView, setActiveView] = useState<"dashboard" | "entry" | "orders" | "history">("dashboard");

  // Mode inside Order Entry workspace: "PREPARED" (Prepared Menu) vs "SHOP" (Retail Shop Store)
  const [entryMode, setEntryMode] = useState<"PREPARED" | "SHOP">("PREPARED");

  // Order Context State
  const [orderType, setOrderType] = useState<"DINE_IN" | "TAKEAWAY" | "COUNTER">("DINE_IN");
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [tableModalOpen, setTableModalOpen] = useState<boolean>(false);

  // Category & Search State
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Ticket / Cart State
  const [cartItems, setCartItems] = useState<WaiterCartItem[]>([]);

  // Modifier Sheet State (for creating new item or editing existing cart item)
  const [configuringDish, setConfiguringDish] = useState<MenuItem | null>(null);
  const [editingCartItemId, setEditingCartItemId] = useState<string | null>(null);
  const [modalAddons, setModalAddons] = useState<MenuItemAddon[]>([]);
  const [modalNote, setModalNote] = useState<string>("");
  const [modalQty, setModalQty] = useState<number>(1);

  // Modals & Detail Inspection
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState<Order | null>(null);
  const [inspectingOrder, setInspectingOrder] = useState<Order | null>(null);

  // Orders Queue Filter
  const [ordersFilterTab, setOrdersFilterTab] = useState<"ALL" | "UNPAID" | "READY" | "COMPLETED">("ALL");

  // Data Queries
  const { data: tables = [] } = useQuery<Table[]>({
    queryKey: ["tables"],
    queryFn: api.tables.getAll,
  });

  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ["orders"],
    queryFn: api.orders.getAll,
  });

  const { data: menu = [] } = useQuery<MenuItem[]>({
    queryKey: ["menu"],
    queryFn: api.menu.getAll,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: api.categories.getAll,
  });

  const { data: allAddons = [] } = useQuery<AddonItem[]>({
    queryKey: ["addons"],
    queryFn: () => api.addons.getAll(),
  });

  // Active ongoing order for currently selected table
  const activeOrderForSelectedTable = orders.find(
    (o) => o.tableId === selectedTable?.id && o.status !== "COMPLETED" && o.status !== "CANCELLED"
  );

  // Order Mutations
  const createOrderMutation = useMutation({
    mutationFn: api.orders.create,
    onSuccess: (newOrder) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["tables"] });
      soundAlerts.playActionPing();
      setCartItems([]);

      if (orderType === "COUNTER" || entryMode === "SHOP") {
        // Quick retail or counter sale: open settlement modal directly
        setSelectedOrderForPayment(newOrder);
      } else {
        // Switch view to active orders queue after sending to kitchen
        setActiveView("orders");
      }
    },
    onError: (err: any) => alert(err.message || "Order creation failed"),
  });

  const appendItemsMutation = useMutation({
    mutationFn: ({ id, items }: { id: string; items: any }) => api.orders.addItems(id, items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      soundAlerts.playActionPing();
      setCartItems([]);
      setActiveView("orders");
    },
    onError: (err: any) => alert(err.message || "Failed to add items"),
  });

  const updateOrderStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: any }) => api.orders.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });

  // Action Handlers
  const handleStartNewOrder = (mode: "PREPARED" | "SHOP" = "PREPARED") => {
    setEntryMode(mode);
    setOrderType(mode === "SHOP" ? "COUNTER" : "DINE_IN");
    setActiveCategory("All");
    setSearchQuery("");
    setActiveView("entry");
  };

  const handleSelectTable = (table: Table) => {
    setSelectedTable(table);
    setOrderType("DINE_IN");
    setTableModalOpen(false);
  };

  // Addon / Modifier Sheet Handlers
  const openModifierSheetForDish = (item: MenuItem) => {
    setConfiguringDish(item);
    setEditingCartItemId(null);
    setModalAddons([]);
    setModalNote("");
    setModalQty(1);
  };

  const openModifierSheetForCartItem = (cartItem: WaiterCartItem) => {
    const matchedMenuItem = menu.find((m) => m.id === cartItem.menuItemId) || {
      id: cartItem.menuItemId,
      name: cartItem.name,
      price: cartItem.basePrice,
      available: true,
    } as MenuItem;

    setConfiguringDish(matchedMenuItem);
    setEditingCartItemId(cartItem.cartItemId);
    setModalAddons([...cartItem.selectedAddons]);
    setModalNote(cartItem.specialInstructions);
    setModalQty(cartItem.quantity);
  };

  const handleSaveModalDishToCart = () => {
    if (!configuringDish) return;

    if (editingCartItemId) {
      // Editing existing cart item
      setCartItems((prev) =>
        prev.map((ci) =>
          ci.cartItemId === editingCartItemId
            ? {
                ...ci,
                quantity: modalQty,
                selectedAddons: [...modalAddons],
                specialInstructions: modalNote.trim(),
              }
            : ci
        )
      );
    } else {
      // Adding new line item
      const newItem: WaiterCartItem = {
        cartItemId: `c-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        menuItemId: configuringDish.id,
        name: configuringDish.name,
        basePrice: configuringDish.price,
        quantity: modalQty,
        selectedAddons: [...modalAddons],
        specialInstructions: modalNote.trim(),
      };
      setCartItems((prev) => [...prev, newItem]);
    }

    soundAlerts.playActionPing();
    setConfiguringDish(null);
    setEditingCartItemId(null);
  };

  const handleQuickAddItem = (item: MenuItem) => {
    const applicableAddons = getApplicableAddonsForItem(item, allAddons);
    if (applicableAddons.length > 0) {
      openModifierSheetForDish(item);
      return;
    }
    const newItem: WaiterCartItem = {
      cartItemId: `c-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      menuItemId: item.id,
      name: item.name,
      basePrice: item.price,
      quantity: 1,
      selectedAddons: [],
      specialInstructions: "",
    };
    soundAlerts.playActionPing();
    setCartItems((prev) => [...prev, newItem]);
  };

  const updateCartQty = (cartItemId: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((item) =>
          item.cartItemId === cartItemId ? { ...item, quantity: item.quantity + delta } : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeCartItem = (cartItemId: string) => {
    setCartItems((prev) => prev.filter((i) => i.cartItemId !== cartItemId));
  };

  const handleAddPresetNote = (preset: string) => {
    if (!modalNote) {
      setModalNote(preset);
    } else if (!modalNote.includes(preset)) {
      setModalNote(`${modalNote}, ${preset}`);
    }
  };

  // Order Submission Logic
  const handleSendToKitchenOrSubmit = () => {
    if (cartItems.length === 0) return alert("Please add items to ticket first.");

    if (orderType === "DINE_IN" && !selectedTable) {
      setTableModalOpen(true);
      return;
    }

    const itemsPayload = cartItems.map((item) => ({
      menuItemId: item.menuItemId,
      quantity: item.quantity,
      qty: item.quantity,
      specialInstructions: item.specialInstructions,
      notes: item.specialInstructions,
      selectedAddons: item.selectedAddons.map((a) => a.id || a.name),
    }));

    if (orderType === "DINE_IN" && selectedTable && activeOrderForSelectedTable) {
      // Append to active table session
      appendItemsMutation.mutate({
        id: activeOrderForSelectedTable.id,
        items: itemsPayload,
      });
    } else {
      // Create new order ticket
      const mappedType = orderType === "COUNTER" ? "TAKEAWAY" : orderType;
      const initialStatus = orderType === "COUNTER" ? "COMPLETED" : "PENDING";

      createOrderMutation.mutate({
        type: mappedType,
        status: initialStatus,
        paymentStatus: "PENDING",
        tableId: orderType === "DINE_IN" ? selectedTable?.id : undefined,
        items: itemsPayload as any,
        idempotencyKey: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
      });
    }
  };

  // Calculations
  const getItemUnitPrice = (item: WaiterCartItem) => {
    const addonsSum = item.selectedAddons.reduce((acc, a) => acc + (a.price || 0), 0);
    return item.basePrice + addonsSum;
  };

  const subtotal = cartItems.reduce((acc, i) => acc + getItemUnitPrice(i) * i.quantity, 0);
  const serviceCharge = orderType === "DINE_IN" ? subtotal * 0.10 : 0;
  const grandTotal = subtotal + serviceCharge;

  // Filter menu lists
  const preparedMenuItems = menu.filter((m) => !isShopProductItem(m));
  const retailShopItems = menu.filter((m) => isShopProductItem(m));

  // Ready and Unpaid Orders
  const readyOrders = orders.filter((o) => o.status === "READY");
  const activeUnpaidOrders = orders.filter((o) => o.paymentStatus !== "PAID" && o.status !== "CANCELLED");
  const recentOrders = orders.slice(0, 10);

  return (
    <div className="space-y-4 animate-in fade-in duration-200 pb-28 min-h-[calc(100vh-4rem)]">
      
      {/* KITCHEN READY NOTIFICATION STRIP */}
      {readyOrders.length > 0 && (
        <div className="bg-emerald-500/10 border-2 border-emerald-500/30 p-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-sm backdrop-blur-md">
          <div className="flex items-center gap-2.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
            <span className="h-3 w-3 rounded-full bg-emerald-500 animate-ping" />
            <span>{readyOrders.length} Order(s) Ready for Table Delivery:</span>
            {readyOrders.map((o) => (
              <Badge key={o.id} className="bg-emerald-600 text-white font-mono px-2 py-0.5 text-[10px]">
                {o.tableId ? `Table #${o.tableId.replace("t", "")}` : `#${o.id.slice(-4)}`}
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            {readyOrders.map((o) => (
              <Button
                key={o.id}
                size="sm"
                onClick={() => updateOrderStatusMutation.mutate({ id: o.id, status: "SERVED" })}
                className="h-8 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white gap-1 px-3 shadow-sm"
              >
                <Check className="h-3.5 w-3.5" /> Mark Table #{o.tableId?.replace("t", "") || o.id.slice(-4)} Served
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. WAITER HOME / DASHBOARD VIEW                                          */}
      {/* ========================================================================= */}
      {activeView === "dashboard" && (
        <div className="space-y-5 animate-in fade-in duration-200">
          
          {/* Header Card */}
          <div className="bg-card border rounded-3xl p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black text-xl">
                ☕
              </div>
              <div>
                <h2 className="text-xl font-black text-foreground">Yadotena Waiter Workspace</h2>
                <p className="text-xs text-muted-foreground font-medium">
                  Fast Order Taking • Instant Kitchen Dispatch • Direct Settlement
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs font-bold px-3 py-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Online & Ready
              </Badge>
            </div>
          </div>

          {/* TODAY QUICK ACTION TILES */}
          <div className="space-y-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground px-1">
              Start New Order Ticket
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Tile A: Prepared Menu */}
              <div
                onClick={() => handleStartNewOrder("PREPARED")}
                className="p-6 rounded-3xl border-2 border-primary/30 bg-card hover:border-primary transition-all cursor-pointer shadow-sm hover:shadow-lg group space-y-4 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-8 bg-primary/5 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />
                <div className="flex items-center justify-between">
                  <div className="h-14 w-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-md">
                    <Utensils className="h-7 w-7" />
                  </div>
                  <Badge className="bg-primary/20 text-primary border border-primary/30 text-xs font-bold px-3 py-1">
                    Prepared Dishes
                  </Badge>
                </div>

                <div>
                  <h4 className="text-xl font-black text-foreground group-hover:text-primary transition-colors">
                    + NEW MENU ORDER
                  </h4>
                  <p className="text-xs text-muted-foreground font-medium mt-1">
                    Coffee, Food, Juices, Breakfast & Custom Addons with Table Assignment
                  </p>
                </div>

                <div className="flex items-center text-xs font-black text-primary gap-1 group-hover:translate-x-1 transition-transform">
                  <span>Open Order Ticket Workspace</span>
                  <ChevronRight className="h-4 w-4" />
                </div>
              </div>

              {/* Tile B: Shop Retail */}
              <div
                onClick={() => handleStartNewOrder("SHOP")}
                className="p-6 rounded-3xl border-2 border-emerald-500/30 bg-card hover:border-emerald-500 transition-all cursor-pointer shadow-sm hover:shadow-lg group space-y-4 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-8 bg-emerald-500/5 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />
                <div className="flex items-center justify-between">
                  <div className="h-14 w-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
                    <ShoppingBag className="h-7 w-7" />
                  </div>
                  <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-bold px-3 py-1">
                    Direct Counter Sale
                  </Badge>
                </div>

                <div>
                  <h4 className="text-xl font-black text-foreground group-hover:text-emerald-600 transition-colors">
                    + SHOP RETAIL SALE
                  </h4>
                  <p className="text-xs text-muted-foreground font-medium mt-1">
                    Coffee Beans, Coffee Powder, Packaged Items & Over-the-Counter Products
                  </p>
                </div>

                <div className="flex items-center text-xs font-black text-emerald-600 dark:text-emerald-400 gap-1 group-hover:translate-x-1 transition-transform">
                  <span>Instant Counter Checkout</span>
                  <ChevronRight className="h-4 w-4" />
                </div>
              </div>

            </div>
          </div>

          {/* ACTIVE & UNPAID ORDERS LIST */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <span>Active & Unpaid Orders</span>
                <Badge className="bg-primary text-primary-foreground text-[10px] font-bold">
                  {activeUnpaidOrders.length} Active
                </Badge>
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveView("orders")}
                className="h-7 text-xs font-bold text-primary hover:underline p-0"
              >
                View All Orders →
              </Button>
            </div>

            {activeUnpaidOrders.length === 0 ? (
              <Card className="p-8 text-center rounded-3xl border border-dashed space-y-2 bg-card">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto opacity-80" />
                <h4 className="font-black text-sm text-foreground">All Orders Clear!</h4>
                <p className="text-xs text-muted-foreground">No pending or unpaid orders at the moment.</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {activeUnpaidOrders.map((order) => {
                  const isReady = order.status === "READY";
                  const isUnpaid = order.paymentStatus !== "PAID";

                  return (
                    <Card
                      key={order.id}
                      className={`p-4 rounded-2xl border-2 transition-all space-y-3 relative shadow-sm hover:shadow-md ${
                        isReady
                          ? "border-emerald-500/50 bg-emerald-500/5"
                          : "border-border bg-card hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-base text-foreground">
                              #{order.id.slice(-6).toUpperCase()}
                            </span>
                            <Badge variant="outline" className="text-[10px] font-mono">
                              {order.type || "DINE_IN"}
                            </Badge>
                          </div>
                          <p className="text-xs font-bold text-primary mt-0.5">
                            {order.tableId ? `Table #${order.tableId.replace("t", "")}` : "Takeaway / Counter"}
                          </p>
                        </div>

                        <div className="flex flex-col items-end gap-1">
                          <Badge
                            className={`text-[9px] font-black uppercase ${
                              isReady
                                ? "bg-emerald-600 text-white"
                                : "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                            }`}
                          >
                            {order.status}
                          </Badge>
                          {isUnpaid && (
                            <Badge className="bg-destructive/15 text-destructive border border-destructive/30 text-[9px] font-black">
                              UNPAID
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="text-xs text-muted-foreground font-medium border-t pt-2 space-y-1">
                        <div className="flex justify-between">
                          <span>{order.items?.length || 0} Line Item(s)</span>
                          <span className="font-black text-foreground text-sm">{formatETB(order.total)}</span>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setInspectingOrder(order)}
                          className="flex-1 h-9 rounded-xl text-xs font-bold border"
                        >
                          Inspect Ticket
                        </Button>

                        <Button
                          size="sm"
                          onClick={() => setSelectedOrderForPayment(order)}
                          className="flex-1 h-9 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                        >
                          <CreditCard className="h-3.5 w-3.5" /> Settle
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. ORDER ENTRY WORKSPACE (THE MAIN ORDER TAKING SCREEN)                    */}
      {/* ========================================================================= */}
      {activeView === "entry" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          
          {/* Header Bar */}
          <div className="bg-card border p-3 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
            
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveView("dashboard")}
                className="h-9 px-3 rounded-xl text-xs font-bold border gap-1 text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" /> Waiter Home
              </Button>

              {/* Mode Switch: Prepared Menu vs Shop Retail */}
              <div className="flex items-center p-1 bg-muted rounded-xl text-xs font-black border">
                <button
                  onClick={() => setEntryMode("PREPARED")}
                  className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                    entryMode === "PREPARED"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Utensils className="h-3.5 w-3.5" />
                  <span>Prepared Menu</span>
                </button>

                <button
                  onClick={() => setEntryMode("SHOP")}
                  className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                    entryMode === "SHOP"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <ShoppingBag className="h-3.5 w-3.5" />
                  <span>Retail Shop</span>
                </button>
              </div>
            </div>

            {/* Order Context Selector (Dine-in / Takeaway / Counter) */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border text-xs font-bold">
                <button
                  onClick={() => setOrderType("DINE_IN")}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    orderType === "DINE_IN"
                      ? "bg-background text-foreground shadow-xs font-black"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  🍽️ Dine-in
                </button>
                <button
                  onClick={() => { setOrderType("TAKEAWAY"); setSelectedTable(null); }}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    orderType === "TAKEAWAY"
                      ? "bg-background text-foreground shadow-xs font-black"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  🛍️ Takeaway
                </button>
                <button
                  onClick={() => { setOrderType("COUNTER"); setSelectedTable(null); }}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    orderType === "COUNTER"
                      ? "bg-background text-foreground shadow-xs font-black"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  ⚡ Counter
                </button>
              </div>

              {/* Table Selection Trigger if Dine-in */}
              {orderType === "DINE_IN" && (
                <Button
                  size="sm"
                  onClick={() => setTableModalOpen(true)}
                  className={`h-9 rounded-xl text-xs font-black border gap-1.5 ${
                    selectedTable
                      ? "bg-primary/10 border-primary text-primary hover:bg-primary/20"
                      : "bg-amber-500/10 border-amber-500/40 text-amber-600 dark:text-amber-400 animate-pulse"
                  }`}
                >
                  <Users className="h-3.5 w-3.5" />
                  <span>{selectedTable ? `Table #${selectedTable.id.replace("t", "")}` : "Select Table *"}</span>
                  <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                </Button>
              )}
            </div>

          </div>

          {/* MAIN GRID WORKSPACE (Menu side vs Cart side) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            
            {/* MENU / CATALOG COLUMN */}
            <div className="lg:col-span-8 space-y-4">
              <Card className="rounded-3xl border shadow-sm p-5 space-y-4 bg-card">
                
                {/* Search Bar & Category Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
                  <h3 className="font-black text-base flex items-center gap-2">
                    {entryMode === "PREPARED" ? (
                      <>
                        <Coffee className="h-4 w-4 text-primary" />
                        <span>Prepared Kitchen Dishes & Beverages</span>
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="h-4 w-4 text-emerald-600" />
                        <span>Retail Store Products & Over-the-Counter</span>
                      </>
                    )}
                  </h3>

                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={entryMode === "PREPARED" ? "Search cappuccino, burger..." : "Search coffee beans, honey..."}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 text-xs h-9 rounded-xl bg-muted/40 border"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Horizontal Category Scroll Bar */}
                <div className="flex gap-2 overflow-x-auto text-xs pb-1 scrollbar-none">
                  <button
                    onClick={() => setActiveCategory("All")}
                    className={`px-4 py-2 rounded-xl font-extrabold whitespace-nowrap border transition-all ${
                      activeCategory === "All"
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-card border-muted text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    All {entryMode === "PREPARED" ? "Dishes" : "Products"} ({entryMode === "PREPARED" ? preparedMenuItems.length : retailShopItems.length})
                  </button>

                  {entryMode === "PREPARED" && (
                    <button
                      onClick={() => setActiveCategory("✨ Standalone Add-ons")}
                      className={`px-4 py-2 rounded-xl font-extrabold whitespace-nowrap border transition-all ${
                        activeCategory === "✨ Standalone Add-ons"
                          ? "bg-primary text-primary-foreground border-primary shadow-sm"
                          : "bg-card border-muted text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      ✨ Standalone Add-ons ({allAddons.length})
                    </button>
                  )}

                  {categories
                    .filter((c) => {
                      const isShopCat = c.id.startsWith("cat-shop") || c.name.toLowerCase().includes("shop") || c.name.toLowerCase().includes("dairy") || c.name.toLowerCase().includes("butter") || c.name.toLowerCase().includes("honey") || c.name.toLowerCase().includes("coffee") || c.name.toLowerCase().includes("spice");
                      return entryMode === "SHOP" ? isShopCat : !isShopCat;
                    })
                    .map((c) => {
                      const itemsInCat = (entryMode === "PREPARED" ? preparedMenuItems : retailShopItems).filter(
                        (m) => m.category === c.name || m.categoryId === c.id
                      );
                      return (
                        <button
                          key={c.id}
                          onClick={() => setActiveCategory(c.name)}
                          className={`px-4 py-2 rounded-xl font-extrabold whitespace-nowrap border transition-all ${
                            activeCategory === c.name
                              ? "bg-primary text-primary-foreground border-primary shadow-sm"
                              : "bg-card border-muted text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          {c.icon || (entryMode === "SHOP" ? "🛒" : "🥘")} {c.name} ({itemsInCat.length})
                        </button>
                      );
                    })}
                </div>

                {/* Selectable Items Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 max-h-[580px] overflow-y-auto pr-1">
                  {activeCategory === "✨ Standalone Add-ons" && entryMode === "PREPARED" ? (
                    allAddons
                      .filter((addon) => {
                        const matchesSearch = addon.name.toLowerCase().includes(searchQuery.toLowerCase());
                        return matchesSearch && addon.isActive !== false;
                      })
                      .map((addon) => {
                        const inCartCount = cartItems
                          .filter((c) => c.menuItemId === addon.id)
                          .reduce((sum, c) => sum + c.quantity, 0);

                        return (
                          <div
                            key={addon.id}
                            className="p-4 rounded-2xl border border-primary/20 bg-card hover:border-primary transition-all flex flex-col justify-between space-y-3 relative shadow-sm hover:shadow-md"
                          >
                            {inCartCount > 0 && (
                              <div className="absolute top-3 right-3 bg-primary text-primary-foreground font-black text-[10px] px-2 py-0.5 rounded-full shadow-md z-10 animate-pulse">
                                {inCartCount} IN TICKET
                              </div>
                            )}

                            <div className="space-y-1">
                              <Badge className="bg-primary/10 text-primary border-primary/30 text-[9px] font-bold uppercase">
                                ✨ Standalone Extra
                              </Badge>
                              <h4 className="font-bold text-sm text-foreground leading-snug">
                                {addon.name}
                              </h4>
                              <span className="font-black text-base text-primary block">
                                {formatETB(addon.price)}
                              </span>
                            </div>

                            <Button
                              size="sm"
                              onClick={() => {
                                const newItem: WaiterCartItem = {
                                  cartItemId: `c-addon-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                                  menuItemId: addon.id,
                                  name: `[Extra] ${addon.name}`,
                                  basePrice: addon.price,
                                  quantity: 1,
                                  selectedAddons: [],
                                  specialInstructions: "",
                                };
                                soundAlerts.playActionPing();
                                setCartItems((prev) => [...prev, newItem]);
                              }}
                              className="w-full h-9 text-xs font-bold rounded-xl bg-primary text-primary-foreground gap-1.5 shadow-sm"
                            >
                              <Plus className="h-4 w-4" /> Add Standalone Extra
                            </Button>
                          </div>
                        );
                      })
                  ) : (
                    (entryMode === "PREPARED" ? preparedMenuItems : retailShopItems)
                      .filter((item) => {
                        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
                        const matchesCat = activeCategory === "All" || item.category === activeCategory || item.categoryId === activeCategory;
                        return matchesSearch && matchesCat && item.available !== false;
                      })
                      .map((item) => {
                        const applicableAddons = getApplicableAddonsForItem(item, allAddons);
                        const hasAddons = applicableAddons.length > 0;
                        const inCartCount = cartItems
                          .filter((c) => c.menuItemId === item.id)
                          .reduce((sum, c) => sum + c.quantity, 0);

                        return (
                          <div
                            key={item.id}
                            onClick={() => {
                              if (hasAddons && entryMode === "PREPARED") {
                                openModifierSheetForDish(item);
                              } else {
                                handleQuickAddItem(item);
                              }
                            }}
                            className="p-3.5 rounded-2xl border bg-card hover:border-primary/50 transition-all cursor-pointer flex flex-col justify-between space-y-3 relative shadow-sm hover:shadow-md group"
                          >
                            {inCartCount > 0 && (
                              <div className="absolute top-2.5 right-2.5 bg-primary text-primary-foreground font-black text-[10px] px-2 py-0.5 rounded-full shadow-md z-10">
                                {inCartCount}
                              </div>
                            )}

                            <div className="flex gap-3 items-start">
                              <img
                                src={getImageUrl(item.image)}
                                alt={item.name}
                                className="h-16 w-16 rounded-xl object-cover border shrink-0 shadow-xs group-hover:scale-105 transition-transform"
                              />
                              <div className="min-w-0 space-y-0.5">
                                <span className="text-[9px] font-bold uppercase text-muted-foreground block truncate">
                                  {entryMode === "SHOP" ? "🛒 Retail" : (item.category || "Main Dish")}
                                </span>
                                <h4 className="font-bold text-xs text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                                  {item.name}
                                </h4>
                                <span className="font-black text-sm text-primary block">
                                  {formatETB(item.price)}
                                </span>
                              </div>
                            </div>

                            <div className="pt-2 border-t flex items-center justify-between text-[11px] font-bold">
                              {hasAddons && entryMode === "PREPARED" ? (
                                <span className="text-primary/90 flex items-center gap-1">
                                  <Sparkles className="h-3 w-3" /> Options ({applicableAddons.length})
                                </span>
                              ) : (
                                <span className="text-muted-foreground">Standard Recipe</span>
                              )}

                              <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                <Plus className="h-4 w-4" />
                              </div>
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>

              </Card>
            </div>

            {/* PERSISTENT ORDER TICKET / CART COLUMN */}
            <div className="lg:col-span-4 space-y-3">
              <Card className="rounded-3xl border shadow-sm p-4 space-y-4 bg-card flex flex-col justify-between min-h-[580px]">
                
                <div className="space-y-3">
                  {/* Ticket Context Header */}
                  <div className="flex items-center justify-between border-b pb-3">
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="h-4 w-4 text-primary" />
                      <h3 className="font-black text-sm text-foreground">Current Order Ticket</h3>
                    </div>

                    {cartItems.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCartItems([])}
                        className="h-6 text-[10px] text-destructive hover:bg-destructive/10 px-2 rounded-lg font-bold"
                      >
                        Clear All
                      </Button>
                    )}
                  </div>

                  {/* Context Info Banner */}
                  <div className="p-3 bg-muted/40 rounded-2xl border text-xs space-y-1">
                    <div className="flex items-center justify-between font-bold">
                      <span>Type: {orderType}</span>
                      {orderType === "DINE_IN" ? (
                        selectedTable ? (
                          <Badge className="bg-primary/20 text-primary border border-primary/30 text-[10px] font-black">
                            Table #{selectedTable.id.replace("t", "")}
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-black">
                            No Table Selected
                          </Badge>
                        )
                      ) : (
                        <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-black">
                          Over the Counter
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Line Items List */}
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {cartItems.length === 0 ? (
                      <div className="py-12 text-center text-xs text-muted-foreground border-2 border-dashed rounded-2xl space-y-1">
                        <ShoppingBag className="h-8 w-8 text-muted-foreground mx-auto opacity-40" />
                        <p className="font-bold">Ticket is Empty</p>
                        <p className="text-[11px] opacity-70">
                          Click menu dishes or shop items to build ticket.
                        </p>
                      </div>
                    ) : (
                      cartItems.map((ci) => {
                        const unitPrice = getItemUnitPrice(ci);
                        return (
                          <div
                            key={ci.cartItemId}
                            className="p-3 rounded-2xl bg-muted/30 border border-border text-xs space-y-1.5 hover:border-primary/30 transition-all"
                          >
                            <div className="flex justify-between font-bold text-foreground">
                              <span>{ci.name}</span>
                              <span className="text-primary">{formatETB(unitPrice * ci.quantity)}</span>
                            </div>

                            {/* Modifiers List */}
                            {ci.selectedAddons.length > 0 && (
                              <div className="text-[10px] text-muted-foreground font-medium flex flex-wrap gap-1">
                                {ci.selectedAddons.map((a) => (
                                  <span key={a.id} className="bg-background border px-1.5 py-0.5 rounded text-[9px]">
                                    +{a.name} ({formatETB(a.price)})
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Kitchen Note */}
                            {ci.specialInstructions && (
                              <div className="text-[10px] text-primary font-medium italic">
                                "{ci.specialInstructions}"
                              </div>
                            )}

                            {/* Actions & Qty */}
                            <div className="flex items-center justify-between pt-1 border-t border-border/50">
                              <div className="flex items-center gap-1.5 bg-background border px-2 py-0.5 rounded-xl text-xs font-black">
                                <button
                                  onClick={() => updateCartQty(ci.cartItemId, -1)}
                                  className="px-1 text-muted-foreground hover:text-foreground"
                                >
                                  -
                                </button>
                                <span className="px-1">{ci.quantity}</span>
                                <button
                                  onClick={() => updateCartQty(ci.cartItemId, 1)}
                                  className="px-1 text-muted-foreground hover:text-foreground"
                                >
                                  +
                                </button>
                              </div>

                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => openModifierSheetForCartItem(ci)}
                                  className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                                  title="Edit Item Modifiers"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </button>

                                <button
                                  onClick={() => removeCartItem(ci.cartItemId)}
                                  className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                  title="Remove Item"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>

                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Calculation Totals & Actions */}
                <div className="pt-3 border-t space-y-3">
                  <div className="space-y-1.5 text-xs font-semibold text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span className="font-mono">{formatETB(subtotal)}</span>
                    </div>
                    {orderType === "DINE_IN" && (
                      <div className="flex justify-between text-[11px]">
                        <span>Service Charge (10%)</span>
                        <span className="font-mono">{formatETB(serviceCharge)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-foreground font-black text-base pt-1.5 border-t">
                      <span>Total Amount</span>
                      <span className="text-primary font-mono">{formatETB(grandTotal)}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Button
                      onClick={handleSendToKitchenOrSubmit}
                      disabled={
                        cartItems.length === 0 ||
                        createOrderMutation.isPending ||
                        appendItemsMutation.isPending
                      }
                      className="w-full h-12 rounded-2xl font-black text-xs bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
                    >
                      {createOrderMutation.isPending || appendItemsMutation.isPending
                        ? "Submitting Ticket..."
                        : activeOrderForSelectedTable && orderType === "DINE_IN"
                        ? `Append to Table #${selectedTable?.id.replace("t", "")} Ticket (${formatETB(grandTotal)})`
                        : `Send to Kitchen (${formatETB(grandTotal)})`}
                    </Button>
                  </div>
                </div>

              </Card>
            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. ORDERS QUEUE & HISTORY VIEW                                             */}
      {/* ========================================================================= */}
      {(activeView === "orders" || activeView === "history") && (
        <div className="space-y-4 animate-in fade-in duration-200">
          
          <div className="bg-card border rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
              <div>
                <h3 className="font-black text-lg text-foreground">
                  {activeView === "history" ? "Completed Orders History" : "Active Kitchen & Table Orders"}
                </h3>
                <p className="text-xs text-muted-foreground font-medium">
                  Track preparation status, unpaid tickets, and payment settlement
                </p>
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-1 bg-muted p-1 rounded-xl text-xs font-bold">
                <button
                  onClick={() => setOrdersFilterTab("ALL")}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    ordersFilterTab === "ALL"
                      ? "bg-background text-foreground font-black shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  All ({orders.length})
                </button>
                <button
                  onClick={() => setOrdersFilterTab("UNPAID")}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    ordersFilterTab === "UNPAID"
                      ? "bg-amber-500 text-white font-black shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Unpaid ({orders.filter((o) => o.paymentStatus !== "PAID").length})
                </button>
                <button
                  onClick={() => setOrdersFilterTab("READY")}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    ordersFilterTab === "READY"
                      ? "bg-emerald-600 text-white font-black shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Ready ({orders.filter((o) => o.status === "READY").length})
                </button>
                <button
                  onClick={() => setOrdersFilterTab("COMPLETED")}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    ordersFilterTab === "COMPLETED"
                      ? "bg-background text-foreground font-black shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Completed ({orders.filter((o) => o.status === "COMPLETED").length})
                </button>
              </div>
            </div>

            {/* Orders Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {orders
                .filter((order) => {
                  if (activeView === "history") return order.status === "COMPLETED" || order.status === "CANCELLED";
                  if (ordersFilterTab === "UNPAID") return order.paymentStatus !== "PAID";
                  if (ordersFilterTab === "READY") return order.status === "READY";
                  if (ordersFilterTab === "COMPLETED") return order.status === "COMPLETED";
                  return order.status !== "COMPLETED" && order.status !== "CANCELLED";
                })
                .map((order) => {
                  const isUnpaid = order.paymentStatus !== "PAID";
                  const isReady = order.status === "READY";

                  return (
                    <Card
                      key={order.id}
                      className={`p-4 rounded-2xl border-2 transition-all space-y-3 shadow-sm hover:shadow-md ${
                        isReady
                          ? "border-emerald-500/50 bg-emerald-500/5"
                          : isUnpaid
                          ? "border-amber-500/40 bg-card"
                          : "border-border bg-card"
                      }`}
                    >
                      <div className="flex items-start justify-between border-b pb-2.5">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-base text-foreground">
                              #{order.id.slice(-6).toUpperCase()}
                            </span>
                            <Badge variant="outline" className="text-[10px] font-mono">
                              {order.type || "DINE_IN"}
                            </Badge>
                          </div>
                          <p className="text-xs font-bold text-primary mt-0.5">
                            {order.tableId ? `Table #${order.tableId.replace("t", "")}` : "Takeaway / Counter"}
                          </p>
                        </div>

                        <div className="flex flex-col items-end gap-1">
                          <Badge
                            className={`text-[9px] font-black uppercase ${
                              isReady
                                ? "bg-emerald-600 text-white animate-pulse"
                                : "bg-primary/20 text-primary border border-primary/30"
                            }`}
                          >
                            {order.status}
                          </Badge>
                          <Badge
                            className={`text-[9px] font-black ${
                              order.paymentStatus === "PAID"
                                ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                                : "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                            }`}
                          >
                            {order.paymentStatus || "UNPAID"}
                          </Badge>
                        </div>
                      </div>

                      <div className="space-y-1 text-xs text-muted-foreground">
                        <div className="flex justify-between">
                          <span>Items Count:</span>
                          <span className="font-bold text-foreground">{order.items?.length || 0}</span>
                        </div>
                        <div className="flex justify-between text-foreground font-black text-sm pt-1 border-t">
                          <span>Total</span>
                          <span className="text-primary font-mono">{formatETB(order.total)}</span>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setInspectingOrder(order)}
                          className="flex-1 h-9 rounded-xl text-xs font-bold"
                        >
                          View Details
                        </Button>

                        {isUnpaid && (
                          <Button
                            size="sm"
                            onClick={() => setSelectedOrderForPayment(order)}
                            className="flex-1 h-9 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                          >
                            <CreditCard className="h-3.5 w-3.5" /> Settle
                          </Button>
                        )}
                      </div>
                    </Card>
                  );
                })}
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. MODAL: TABLE SELECTOR GRID (If Dine-in)                                */}
      {/* ========================================================================= */}
      {tableModalOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-card border rounded-3xl shadow-2xl max-w-xl w-full p-6 space-y-4 relative max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b pb-3">
              <div>
                <h3 className="font-black text-lg text-foreground">Select Floor Dining Table</h3>
                <p className="text-xs text-muted-foreground font-medium">
                  Choose a table to assign order ticket
                </p>
              </div>
              <button onClick={() => setTableModalOpen(false)} className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {tables.map((table) => {
                const ongoingOrder = orders.find(
                  (o) => o.tableId === table.id && o.status !== "COMPLETED" && o.status !== "CANCELLED"
                );
                const isSelected = selectedTable?.id === table.id;

                return (
                  <div
                    key={table.id}
                    onClick={() => handleSelectTable(table)}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all space-y-2 text-center relative ${
                      isSelected
                        ? "bg-primary/15 border-primary ring-2 ring-primary/30"
                        : ongoingOrder
                        ? "bg-amber-500/10 border-amber-500/40 hover:border-amber-500"
                        : "bg-card border-border hover:border-primary/50"
                    }`}
                  >
                    <span className="text-[10px] font-bold text-muted-foreground block uppercase">Table</span>
                    <h4 className="text-2xl font-black text-foreground">#{(table as any).number || table.id.replace("t", "")}</h4>
                    <p className="text-[11px] text-muted-foreground font-semibold">{table.capacity || 4} Seats</p>
                    
                    {ongoingOrder ? (
                      <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-400 text-[9px] font-bold">
                        Appending Session
                      </Badge>
                    ) : (
                      <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold">
                        Available
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. MODAL: DISH MODIFIER & ADDON SHEET                                      */}
      {/* ========================================================================= */}
      {configuringDish && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 relative animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-start justify-between border-b pb-3">
              <div>
                <h3 className="font-black text-lg text-foreground">{configuringDish.name}</h3>
                <span className="text-xs font-bold text-primary">{formatETB(configuringDish.price)} Base Price</span>
              </div>
              <button 
                onClick={() => { setConfiguringDish(null); setEditingCartItemId(null); }} 
                className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Applicable Addons Group */}
            {(() => {
              const applicableAddons = getApplicableAddonsForItem(configuringDish, allAddons);

              if (applicableAddons.length === 0) {
                return (
                  <div className="p-3 bg-muted/40 rounded-2xl border text-center text-xs text-muted-foreground font-medium">
                    No extra customization options for this item. Standard recipe will be prepared.
                  </div>
                );
              }

              return (
                <div className="space-y-2">
                  <span className="text-xs font-extrabold uppercase text-muted-foreground tracking-wider block">
                    Available Customization Options
                  </span>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {applicableAddons.map((addon) => {
                      const isSelected = modalAddons.some((a) => a.id === addon.id);
                      return (
                        <label
                          key={addon.id}
                          onClick={() => {
                            if (isSelected) {
                              setModalAddons((prev) => prev.filter((a) => a.id !== addon.id));
                            } else {
                              setModalAddons((prev) => [...prev, addon]);
                            }
                          }}
                          className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer text-xs transition-all ${
                            isSelected 
                              ? "bg-primary/10 border-primary font-bold text-primary shadow-sm" 
                              : "bg-muted/30 border-transparent hover:bg-muted/60"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span>{addon.name}</span>
                            <Badge variant="outline" className="text-[9px] font-mono uppercase">
                              {addon.scope || "ITEM"}
                            </Badge>
                          </div>
                          <span className="text-primary font-black">+ {formatETB(addon.price)}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Kitchen Special Notes & Presets */}
            <div className="space-y-2">
              <span className="text-xs font-extrabold uppercase text-muted-foreground tracking-wider block">
                Kitchen Special Notes
              </span>
              
              <div className="flex flex-wrap gap-1.5">
                {KITCHEN_NOTE_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleAddPresetNote(preset)}
                    className="px-2.5 py-1 rounded-xl bg-muted/60 text-[11px] font-bold text-muted-foreground hover:text-foreground hover:bg-primary/15 transition-all"
                  >
                    + {preset}
                  </button>
                ))}
              </div>

              <Textarea
                placeholder="Type kitchen instructions or select presets above..."
                value={modalNote}
                onChange={(e) => setModalNote(e.target.value)}
                className="text-xs h-16 rounded-xl bg-muted/30 resize-none border"
              />
            </div>

            {/* Quantity Controls */}
            <div className="flex items-center justify-between border-t pt-3">
              <span className="text-xs font-bold text-muted-foreground">Quantity</span>
              <div className="flex items-center gap-3 bg-muted p-1.5 rounded-xl text-xs font-black">
                <button onClick={() => setModalQty((q) => Math.max(1, q - 1))} className="px-2 py-0.5 text-muted-foreground hover:text-foreground">
                  -
                </button>
                <span className="px-2 text-sm">{modalQty}</span>
                <button onClick={() => setModalQty((q) => q + 1)} className="px-2 py-0.5 text-muted-foreground hover:text-foreground">
                  +
                </button>
              </div>
            </div>

            {/* Save Button */}
            <Button
              onClick={handleSaveModalDishToCart}
              className="w-full h-12 rounded-2xl font-black text-xs bg-primary text-primary-foreground shadow-lg shadow-primary/20"
            >
              {editingCartItemId ? "Update Ticket Line Item (" : "Add to Order Ticket ("}
              {formatETB(
                (configuringDish.price + modalAddons.reduce((acc, a) => acc + (a.price || 0), 0)) * modalQty
              )}
              )
            </Button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. MODAL: ORDER DETAILS INSPECTOR                                         */}
      {/* ========================================================================= */}
      {inspectingOrder && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-card border rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-4 relative max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b pb-3">
              <div>
                <h3 className="font-black text-lg flex items-center gap-2">
                  <span>Order #{inspectingOrder.id.slice(-6).toUpperCase()}</span>
                  <Badge className="bg-primary/20 text-primary border border-primary/30 text-[10px]">
                    {inspectingOrder.status}
                  </Badge>
                </h3>
                <p className="text-xs text-muted-foreground font-medium">
                  {inspectingOrder.tableId ? `Table #${inspectingOrder.tableId.replace("t", "")}` : "Takeaway / Counter"}
                </p>
              </div>
              <button onClick={() => setInspectingOrder(null)} className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-muted/40 rounded-2xl space-y-1.5 border">
                <div className="flex justify-between font-bold">
                  <span>Payment Status</span>
                  <Badge className={inspectingOrder.paymentStatus === "PAID" ? "bg-emerald-500 text-white" : "bg-amber-500 text-white"}>
                    {inspectingOrder.paymentStatus || "UNPAID"}
                  </Badge>
                </div>
                <div className="flex justify-between font-black text-sm pt-1 border-t">
                  <span>Total Amount:</span>
                  <span className="text-primary font-mono">{formatETB(inspectingOrder.total)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-black uppercase text-[10px] text-muted-foreground">Ordered Line Items</h4>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {inspectingOrder.items?.map((item: any, idx: number) => (
                    <div key={item.id || idx} className="p-3 rounded-xl bg-muted/30 border space-y-1">
                      <div className="flex justify-between font-bold">
                        <span>{item.quantity || item.qty}x {item.name}</span>
                        <span className="text-primary">{formatETB((item.price || 0) * (item.quantity || item.qty || 1))}</span>
                      </div>
                      {item.specialInstructions && (
                        <p className="text-[10px] text-muted-foreground italic">"{item.specialInstructions}"</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                {inspectingOrder.paymentStatus !== "PAID" && (
                  <Button
                    onClick={() => {
                      const ord = inspectingOrder;
                      setInspectingOrder(null);
                      setSelectedOrderForPayment(ord);
                    }}
                    className="flex-1 h-11 rounded-xl font-black text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                  >
                    <CreditCard className="h-4 w-4" /> Settle Payment ({formatETB(inspectingOrder.total)})
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. MODAL: PAYMENT SETTLEMENT                                              */}
      {/* ========================================================================= */}
      <PaymentSettlementModal
        order={selectedOrderForPayment}
        isOpen={!!selectedOrderForPayment}
        onClose={() => setSelectedOrderForPayment(null)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["orders"] });
          queryClient.invalidateQueries({ queryKey: ["tables"] });
        }}
      />

      {/* ========================================================================= */}
      {/* 8. FIXED BOTTOM NAVIGATION BAR FOR WAITER WORKSPACE                      */}
      {/* ========================================================================= */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t shadow-2xl p-2.5 flex items-center justify-around max-w-4xl mx-auto rounded-t-3xl">
        
        {/* Tab 1: Dashboard Home */}
        <button
          onClick={() => setActiveView("dashboard")}
          className={`flex flex-col items-center gap-1 px-4 py-1.5 rounded-2xl transition-all ${
            activeView === "dashboard"
              ? "text-primary font-black scale-105"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <LayoutDashboard className="h-5 w-5" />
          <span className="text-[10px]">Dashboard</span>
        </button>

        {/* Tab 2: NEW ORDER (PRIMARY HIGHLIGHTED BUTTON!) */}
        <button
          onClick={() => handleStartNewOrder("PREPARED")}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-primary text-primary-foreground font-black text-xs shadow-lg shadow-primary/30 -translate-y-2 transition-transform hover:scale-105 active:scale-95"
        >
          <Plus className="h-4 w-4 stroke-[3]" />
          <span>New Order</span>
        </button>

        {/* Tab 3: Active Orders */}
        <button
          onClick={() => setActiveView("orders")}
          className={`flex flex-col items-center gap-1 px-4 py-1.5 rounded-2xl transition-all relative ${
            activeView === "orders"
              ? "text-primary font-black scale-105"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Utensils className="h-5 w-5" />
          <span className="text-[10px]">Active Orders</span>
          {activeUnpaidOrders.length > 0 && (
            <span className="absolute top-0 right-3 bg-amber-500 text-white font-black text-[9px] h-4 w-4 rounded-full flex items-center justify-center shadow-xs">
              {activeUnpaidOrders.length}
            </span>
          )}
        </button>

        {/* Tab 4: History */}
        <button
          onClick={() => setActiveView("history")}
          className={`flex flex-col items-center gap-1 px-4 py-1.5 rounded-2xl transition-all ${
            activeView === "history"
              ? "text-primary font-black scale-105"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Clock className="h-5 w-5" />
          <span className="text-[10px]">History</span>
        </button>

      </div>

    </div>
  );
}
