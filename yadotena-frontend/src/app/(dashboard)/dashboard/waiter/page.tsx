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
  CheckCircle2, AlertCircle, FileText, ChevronDown, ListFilter, Copy, Save
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

  // Navigation Views: "dashboard" | "entry" | "orders" | "history"
  const [activeView, setActiveView] = useState<"dashboard" | "entry" | "orders" | "history">("dashboard");

  // Mode inside Order Entry workspace: "PREPARED" (Prepared Menu) vs "SHOP" (Retail Shop Store)
  const [entryMode, setEntryMode] = useState<"PREPARED" | "SHOP">("PREPARED");

  // Order Context & Meta
  const [orderType, setOrderType] = useState<"DINE_IN" | "TAKEAWAY" | "COUNTER">("DINE_IN");
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [tableModalOpen, setTableModalOpen] = useState<boolean>(false);
  const [orderLevelNote, setOrderLevelNote] = useState<string>("");

  // Category & Search State
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Ticket / Cart State
  const [cartItems, setCartItems] = useState<WaiterCartItem[]>([]);
  const [mobileCartDrawerOpen, setMobileCartDrawerOpen] = useState<boolean>(false);

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
  const [ordersFilterTab, setOrdersFilterTab] = useState<"ALL" | "ACTION_REQUIRED" | "IN_PROGRESS" | "COMPLETED">("ALL");

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

  // Ongoing order for selected table
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
      setOrderLevelNote("");

      if (orderType === "COUNTER" || entryMode === "SHOP") {
        setSelectedOrderForPayment(newOrder);
      } else {
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
      setOrderLevelNote("");
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

  // Navigation & Flow Handlers
  const handleStartNewOrder = (isQuickShop: boolean = false) => {
    if (isQuickShop) {
      setEntryMode("SHOP");
      setOrderType("COUNTER");
      setSelectedTable(null);
    } else {
      setEntryMode("PREPARED");
      setOrderType("DINE_IN");
    }
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

  // Repeat Order Handler (Duplicates an existing order's items into cart)
  const handleRepeatOrder = (orderToRepeat: Order) => {
    if (!orderToRepeat.items || orderToRepeat.items.length === 0) return;

    const newCartItems: WaiterCartItem[] = orderToRepeat.items.map((item: any) => ({
      cartItemId: `c-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      menuItemId: item.menuItemId || item.id,
      name: item.name,
      basePrice: item.price,
      quantity: item.quantity || item.qty || 1,
      selectedAddons: Array.isArray(item.selectedAddons)
        ? item.selectedAddons.map((a: any) => (typeof a === "string" ? { id: a, name: a, price: 0 } : a))
        : [],
      specialInstructions: item.specialInstructions || "",
    }));

    setCartItems(newCartItems);
    setInspectingOrder(null);
    setActiveView("entry");
    soundAlerts.playActionPing();
  };

  // Determine Composition of Ticket (Prepared items vs Retail-Only)
  const hasPreparedItems = cartItems.some((ci) => {
    const matched = menu.find((m) => m.id === ci.menuItemId);
    return !isShopProductItem(matched || { id: ci.menuItemId, name: ci.name } as any);
  });

  // Order Submission Logic
  const handleOrderSubmission = (isDraft: boolean = false) => {
    if (cartItems.length === 0) return alert("Please add items to ticket first.");

    if (orderType === "DINE_IN" && !selectedTable) {
      setTableModalOpen(true);
      return;
    }

    const itemsPayload = cartItems.map((item) => ({
      menuItemId: item.menuItemId,
      quantity: item.quantity,
      qty: item.quantity,
      specialInstructions: item.specialInstructions || orderLevelNote ? `${item.specialInstructions || ""} ${orderLevelNote ? `[Order Note: ${orderLevelNote}]` : ""}`.trim() : "",
      notes: item.specialInstructions,
      selectedAddons: item.selectedAddons.map((a) => a.id || a.name),
    }));

    if (orderType === "DINE_IN" && selectedTable && activeOrderForSelectedTable && !isDraft) {
      appendItemsMutation.mutate({
        id: activeOrderForSelectedTable.id,
        items: itemsPayload,
      });
    } else {
      const mappedType = orderType === "COUNTER" ? "TAKEAWAY" : orderType;
      const initialStatus = isDraft
        ? "DRAFT"
        : !hasPreparedItems
        ? "COMPLETED" // Retail-only items bypass kitchen queue!
        : "PENDING";

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

  // Filter catalog lists
  const preparedMenuItems = menu.filter((m) => !isShopProductItem(m));
  const retailShopItems = menu.filter((m) => isShopProductItem(m));

  // Categorized Order Queues (Dual Independent State Machines)
  const actionRequiredOrders = orders.filter(
    (o) => o.status === "READY" || (o.paymentStatus !== "PAID" && o.status !== "CANCELLED" && o.status !== "DRAFT")
  );

  const inProgressOrders = orders.filter(
    (o) => (o.status === "PENDING" || o.status === "PREPARING" || o.status === "DRAFT") && o.paymentStatus !== "PAID"
  );

  return (
    <div className="space-y-4 animate-in fade-in duration-200 pb-28 min-h-[calc(100vh-4rem)]">
      
      {/* ACTION REQUIRED ALERTS BAR */}
      {actionRequiredOrders.length > 0 && activeView === "dashboard" && (
        <div className="bg-amber-500/10 border-2 border-amber-500/30 p-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-sm backdrop-blur-md">
          <div className="flex items-center gap-2 text-xs font-black text-amber-600 dark:text-amber-400">
            <AlertCircle className="h-4 w-4 animate-bounce text-amber-500" />
            <span>ACTION REQUIRED: {actionRequiredOrders.length} Order(s) Need Delivery or Settlement</span>
          </div>
          <Button
            size="sm"
            onClick={() => { setActiveView("orders"); setOrdersFilterTab("ACTION_REQUIRED"); }}
            className="h-8 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-600 text-white gap-1 px-3 shadow-sm"
          >
            View Required Actions ({actionRequiredOrders.length}) →
          </Button>
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
                  Fast Order Taking • Combined Menu & Shop Ticket • Independent Payment Flow
                </p>
              </div>
            </div>

            <Badge variant="outline" className="text-xs font-bold px-3 py-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Online & Ready
            </Badge>
          </div>

          {/* DASHBOARD ACTION TILES */}
          <div className="space-y-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground px-1">
              Start Order Entry
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Tile 1: Primary + NEW ORDER */}
              <div
                onClick={() => handleStartNewOrder(false)}
                className="p-6 rounded-3xl border-2 border-primary/40 bg-card hover:border-primary transition-all cursor-pointer shadow-sm hover:shadow-lg group space-y-4 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-8 bg-primary/5 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />
                <div className="flex items-center justify-between">
                  <div className="h-14 w-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-md">
                    <Utensils className="h-7 w-7" />
                  </div>
                  <Badge className="bg-primary/20 text-primary border border-primary/30 text-xs font-bold px-3 py-1">
                    Primary CTA
                  </Badge>
                </div>

                <div>
                  <h4 className="text-xl font-black text-foreground group-hover:text-primary transition-colors">
                    + NEW ORDER
                  </h4>
                  <p className="text-xs text-muted-foreground font-medium mt-1">
                    Build ticket with Prepared Menu Dishes + Retail Shop Store Items
                  </p>
                </div>

                <div className="flex items-center text-xs font-black text-primary gap-1 group-hover:translate-x-1 transition-transform">
                  <span>Open Order Workspace</span>
                  <ChevronRight className="h-4 w-4" />
                </div>
              </div>

              {/* Tile 2: + QUICK SHOP SALE */}
              <div
                onClick={() => handleStartNewOrder(true)}
                className="p-6 rounded-3xl border-2 border-emerald-500/30 bg-card hover:border-emerald-500 transition-all cursor-pointer shadow-sm hover:shadow-lg group space-y-4 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-8 bg-emerald-500/5 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />
                <div className="flex items-center justify-between">
                  <div className="h-14 w-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
                    <Zap className="h-7 w-7" />
                  </div>
                  <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-bold px-3 py-1">
                    Counter Shortcut
                  </Badge>
                </div>

                <div>
                  <h4 className="text-xl font-black text-foreground group-hover:text-emerald-600 transition-colors">
                    + QUICK SHOP SALE
                  </h4>
                  <p className="text-xs text-muted-foreground font-medium mt-1">
                    Direct over-the-counter retail sale (Coffee Beans, Powders & Snacks)
                  </p>
                </div>

                <div className="flex items-center text-xs font-black text-emerald-600 dark:text-emerald-400 gap-1 group-hover:translate-x-1 transition-transform">
                  <span>Instant Counter Ticket</span>
                  <ChevronRight className="h-4 w-4" />
                </div>
              </div>

            </div>
          </div>

          {/* ACTION REQUIRED OPERATIONAL QUEUE (INVARIANT #11) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <span>Action Required Now</span>
                <Badge className="bg-amber-500 text-white text-[10px] font-bold">
                  {actionRequiredOrders.length}
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

            {actionRequiredOrders.length === 0 ? (
              <Card className="p-8 text-center rounded-3xl border border-dashed space-y-2 bg-card">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto opacity-80" />
                <h4 className="font-black text-sm text-foreground">No Pending Actions!</h4>
                <p className="text-xs text-muted-foreground">All table food is delivered and bills are settled.</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {actionRequiredOrders.map((order) => {
                  const isReady = order.status === "READY";
                  const isUnpaid = order.paymentStatus !== "PAID";

                  return (
                    <Card
                      key={order.id}
                      className={`p-4 rounded-2xl border-2 transition-all space-y-3 relative shadow-sm hover:shadow-md ${
                        isReady
                          ? "border-emerald-500/60 bg-emerald-500/5 ring-1 ring-emerald-500/30"
                          : "border-amber-500/50 bg-amber-500/5"
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

                        {/* Dual Independent State Display */}
                        <div className="flex flex-col items-end gap-1 text-[10px] font-black">
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">Kitchen:</span>
                            <Badge className={isReady ? "bg-emerald-600 text-white animate-pulse" : "bg-primary/20 text-primary"}>
                              {order.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">Payment:</span>
                            <Badge className={isUnpaid ? "bg-amber-500 text-white" : "bg-emerald-500 text-white"}>
                              {order.paymentStatus || "UNPAID"}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="text-xs text-muted-foreground font-medium border-t pt-2 flex justify-between items-center">
                        <span>{order.items?.length || 0} Item(s)</span>
                        <span className="font-black text-foreground text-sm font-mono">{formatETB(order.total)}</span>
                      </div>

                      <div className="flex gap-2 pt-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setInspectingOrder(order)}
                          className="flex-1 h-9 rounded-xl text-xs font-bold border"
                        >
                          View Details
                        </Button>

                        {isReady && (
                          <Button
                            size="sm"
                            onClick={() => updateOrderStatusMutation.mutate({ id: order.id, status: "SERVED" })}
                            className="flex-1 h-9 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                          >
                            <Check className="h-3.5 w-3.5" /> Serve Food
                          </Button>
                        )}

                        {isUnpaid && !isReady && (
                          <Button
                            size="sm"
                            onClick={() => setSelectedOrderForPayment(order)}
                            className="flex-1 h-9 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                          >
                            <CreditCard className="h-3.5 w-3.5" /> Settle Bill
                          </Button>
                        )}
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
      {/* 2. ORDER ENTRY WORKSPACE (WITH DUAL MENU/SHOP & COMPOSITION LOGIC)       */}
      {/* ========================================================================= */}
      {activeView === "entry" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          
          {/* Header & Mode Switch */}
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

              {/* Mode Switch inside workspace */}
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
                  <span>Shop Retail</span>
                </button>
              </div>
            </div>

            {/* Context Selector */}
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

          {/* MAIN WORKSPACE GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            
            {/* CATALOG COLUMN */}
            <div className="lg:col-span-8 space-y-4">
              <Card className="rounded-3xl border shadow-sm p-5 space-y-4 bg-card">
                
                {/* Search & Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
                  <h3 className="font-black text-base flex items-center gap-2">
                    {entryMode === "PREPARED" ? (
                      <>
                        <Coffee className="h-4 w-4 text-primary" />
                        <span>Prepared Kitchen Dishes & Drinks</span>
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

                {/* Category Selector Bar */}
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

                {/* Items Grid */}
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
                                <span className="font-black text-sm text-primary block font-mono">
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
                                <span className="text-muted-foreground">Standard Item</span>
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

            {/* PERSISTENT STICKY CART COLUMN (DESKTOP) */}
            <div className="hidden lg:block lg:col-span-4 space-y-3">
              <Card className="rounded-3xl border shadow-sm p-4 space-y-4 bg-card flex flex-col justify-between min-h-[580px] sticky top-20">
                
                <div className="space-y-3">
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

                  {/* Context Info */}
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

                  {/* Line Items */}
                  <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                    {cartItems.length === 0 ? (
                      <div className="py-12 text-center text-xs text-muted-foreground border-2 border-dashed rounded-2xl space-y-1">
                        <ShoppingBag className="h-8 w-8 text-muted-foreground mx-auto opacity-40" />
                        <p className="font-bold">Ticket is Empty</p>
                        <p className="text-[11px] opacity-70">Click items to build ticket.</p>
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
                              <span className="text-primary font-mono">{formatETB(unitPrice * ci.quantity)}</span>
                            </div>

                            {ci.selectedAddons.length > 0 && (
                              <div className="text-[10px] text-muted-foreground font-medium flex flex-wrap gap-1">
                                {ci.selectedAddons.map((a) => (
                                  <span key={a.id} className="bg-background border px-1.5 py-0.5 rounded text-[9px]">
                                    +{a.name} ({formatETB(a.price)})
                                  </span>
                                ))}
                              </div>
                            )}

                            {ci.specialInstructions && (
                              <div className="text-[10px] text-primary font-medium italic">
                                "{ci.specialInstructions}"
                              </div>
                            )}

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
                                  title="Edit Line Item"
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

                  {/* Order-Level Note Layer */}
                  {cartItems.length > 0 && (
                    <div className="space-y-1 pt-1 border-t">
                      <label className="text-[10px] font-extrabold uppercase text-muted-foreground">Order-Level Note (Optional)</label>
                      <Input
                        placeholder="e.g. Customer will collect at 6 PM..."
                        value={orderLevelNote}
                        onChange={(e) => setOrderLevelNote(e.target.value)}
                        className="text-xs h-8 rounded-xl bg-muted/20"
                      />
                    </div>
                  )}

                </div>

                {/* Calculation Totals & Composition-Based CTA */}
                <div className="pt-3 border-t space-y-3">
                  <div className="space-y-1 text-xs font-semibold text-muted-foreground">
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

                  {/* DYNAMIC CTA BUTTONS BASED ON TICKET COMPOSITION */}
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      onClick={() => handleOrderSubmission(true)}
                      disabled={cartItems.length === 0 || createOrderMutation.isPending}
                      className="h-11 rounded-2xl font-bold text-xs border gap-1"
                    >
                      <Save className="h-4 w-4" /> Draft
                    </Button>

                    <Button
                      onClick={() => handleOrderSubmission(false)}
                      disabled={
                        cartItems.length === 0 ||
                        createOrderMutation.isPending ||
                        appendItemsMutation.isPending
                      }
                      className={`h-11 rounded-2xl font-black text-xs shadow-md gap-1 ${
                        hasPreparedItems
                          ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/20"
                          : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20"
                      }`}
                    >
                      {createOrderMutation.isPending || appendItemsMutation.isPending ? (
                        "Submitting..."
                      ) : hasPreparedItems ? (
                        "Send to Kitchen"
                      ) : (
                        "Complete Sale"
                      )}
                    </Button>
                  </div>
                </div>

              </Card>
            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. ORDERS QUEUE & HISTORY VIEW (DUAL INDEPENDENT STATE MACHINES)         */}
      {/* ========================================================================= */}
      {(activeView === "orders" || activeView === "history") && (
        <div className="space-y-4 animate-in fade-in duration-200">
          
          <div className="bg-card border rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
              <div>
                <h3 className="font-black text-lg text-foreground">
                  {activeView === "history" ? "Completed Orders History" : "Active Orders Workspace"}
                </h3>
                <p className="text-xs text-muted-foreground font-medium">
                  Independent Kitchen & Payment Status Machines
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
                  onClick={() => setOrdersFilterTab("ACTION_REQUIRED")}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    ordersFilterTab === "ACTION_REQUIRED"
                      ? "bg-amber-500 text-white font-black shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Action Required ({actionRequiredOrders.length})
                </button>
                <button
                  onClick={() => setOrdersFilterTab("IN_PROGRESS")}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    ordersFilterTab === "IN_PROGRESS"
                      ? "bg-primary text-primary-foreground font-black shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  In Progress ({inProgressOrders.length})
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
                  if (ordersFilterTab === "ACTION_REQUIRED") {
                    return order.status === "READY" || (order.paymentStatus !== "PAID" && order.status !== "CANCELLED");
                  }
                  if (ordersFilterTab === "IN_PROGRESS") {
                    return (order.status === "PENDING" || order.status === "PREPARING" || order.status === "DRAFT") && order.paymentStatus !== "PAID";
                  }
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
                          ? "border-emerald-500/60 bg-emerald-500/5"
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

                        {/* Dual Independent State Display */}
                        <div className="flex flex-col items-end gap-1 text-[10px] font-black">
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">Kitchen:</span>
                            <Badge className={isReady ? "bg-emerald-600 text-white animate-pulse" : "bg-primary/20 text-primary"}>
                              {order.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">Payment:</span>
                            <Badge className={isUnpaid ? "bg-amber-500 text-white" : "bg-emerald-500 text-white"}>
                              {order.paymentStatus || "UNPAID"}
                            </Badge>
                          </div>
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
                          View Ticket
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
      {/* 4. MODAL: TABLE SELECTOR GRID                                             */}
      {/* ========================================================================= */}
      {tableModalOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-card border rounded-3xl shadow-2xl max-w-xl w-full p-6 space-y-4 relative max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b pb-3">
              <div>
                <h3 className="font-black text-lg text-foreground">Select Floor Dining Table</h3>
                <p className="text-xs text-muted-foreground font-medium">Choose table for order ticket</p>
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
                        Ongoing Ticket
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

            {/* Priced Modifiers Group */}
            {(() => {
              const applicableAddons = getApplicableAddonsForItem(configuringDish, allAddons);

              if (applicableAddons.length === 0) {
                return (
                  <div className="p-3 bg-muted/40 rounded-2xl border text-center text-xs text-muted-foreground font-medium">
                    No extra priced customization options for this item. Standard recipe will be prepared.
                  </div>
                );
              }

              return (
                <div className="space-y-2">
                  <span className="text-xs font-extrabold uppercase text-muted-foreground tracking-wider block">
                    Priced Addons & Options
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

            {/* Kitchen Instructions / Notes Layer */}
            <div className="space-y-2">
              <span className="text-xs font-extrabold uppercase text-muted-foreground tracking-wider block">
                Kitchen Instructions (Item Note)
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
                placeholder="Type kitchen instructions or select presets..."
                value={modalNote}
                onChange={(e) => setModalNote(e.target.value)}
                className="text-xs h-16 rounded-xl bg-muted/30 resize-none border"
              />
            </div>

            {/* Qty Controls */}
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
      {/* 6. MODAL: ORDER DETAILS & REPEAT ORDER FEATURE                           */}
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
                <h4 className="font-black uppercase text-[10px] text-muted-foreground">Ordered Items Breakdown</h4>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {inspectingOrder.items?.map((item: any, idx: number) => (
                    <div key={item.id || idx} className="p-3 rounded-xl bg-muted/30 border space-y-1">
                      <div className="flex justify-between font-bold">
                        <span>{item.quantity || item.qty}x {item.name}</span>
                        <span className="text-primary font-mono">{formatETB((item.price || 0) * (item.quantity || item.qty || 1))}</span>
                      </div>
                      {item.specialInstructions && (
                        <p className="text-[10px] text-muted-foreground italic">"{item.specialInstructions}"</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* REPEAT ORDER & SETTLE BUTTONS */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => handleRepeatOrder(inspectingOrder)}
                  className="h-11 rounded-xl font-black text-xs border gap-1.5 hover:bg-primary/10 hover:text-primary"
                >
                  <Copy className="h-4 w-4" /> Duplicate / Repeat Ticket
                </Button>

                {inspectingOrder.paymentStatus !== "PAID" ? (
                  <Button
                    onClick={() => {
                      const ord = inspectingOrder;
                      setInspectingOrder(null);
                      setSelectedOrderForPayment(ord);
                    }}
                    className="h-11 rounded-xl font-black text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                  >
                    <CreditCard className="h-4 w-4" /> Settle ({formatETB(inspectingOrder.total)})
                  </Button>
                ) : (
                  <Button
                    disabled
                    className="h-11 rounded-xl font-black text-xs bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 opacity-80"
                  >
                    Payment Settled ✓
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. PAYMENT SETTLEMENT MODAL                                              */}
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
      {/* 8. MOBILE COLLAPSIBLE FLOATING CART SLIDE-UP SHEET                       */}
      {/* ========================================================================= */}
      {cartItems.length > 0 && activeView === "entry" && (
        <div className="lg:hidden fixed bottom-16 left-3 right-3 z-40">
          <div className="bg-card border-2 border-primary/60 shadow-2xl p-3.5 rounded-2xl flex items-center justify-between backdrop-blur-md">
            <div>
              <span className="text-[10px] font-extrabold uppercase text-muted-foreground block">Current Ticket</span>
              <div className="flex items-center gap-2 font-black text-sm text-foreground">
                <span>{cartItems.reduce((acc, i) => acc + i.quantity, 0)} Items</span>
                <span>•</span>
                <span className="text-primary font-mono">{formatETB(grandTotal)}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => setMobileCartDrawerOpen(!mobileCartDrawerOpen)}
                className="h-10 rounded-xl text-xs font-black bg-primary text-primary-foreground gap-1"
              >
                View Ticket ({cartItems.length})
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Cart Drawer Overlay */}
      {mobileCartDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end justify-center p-3">
          <div className="bg-card border rounded-t-3xl shadow-2xl w-full p-5 space-y-4 relative max-h-[80vh] overflow-y-auto animate-in slide-in-from-bottom-5 duration-200">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-black text-base">Current Ticket ({cartItems.length} items)</h3>
              <button onClick={() => setMobileCartDrawerOpen(false)} className="p-1 text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {cartItems.map((ci) => (
                <div key={ci.cartItemId} className="p-2.5 rounded-xl bg-muted/40 border text-xs flex justify-between items-center">
                  <div>
                    <span className="font-bold">{ci.quantity}x {ci.name}</span>
                    {ci.selectedAddons.length > 0 && (
                      <p className="text-[10px] text-muted-foreground">+{ci.selectedAddons.map((a) => a.name).join(", ")}</p>
                    )}
                  </div>
                  <span className="font-black text-primary font-mono">{formatETB(getItemUnitPrice(ci) * ci.quantity)}</span>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t space-y-2">
              <div className="flex justify-between font-black text-sm">
                <span>Total Amount</span>
                <span className="text-primary font-mono">{formatETB(grandTotal)}</span>
              </div>
              <Button
                onClick={() => { setMobileCartDrawerOpen(false); handleOrderSubmission(false); }}
                className="w-full h-11 rounded-xl font-black text-xs bg-primary text-primary-foreground shadow-md"
              >
                {hasPreparedItems ? "Send to Kitchen" : "Complete Sale"} ({formatETB(grandTotal)})
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 9. FIXED BOTTOM NAVIGATION BAR                                            */}
      {/* ========================================================================= */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t shadow-2xl p-2.5 flex items-center justify-around max-w-4xl mx-auto rounded-t-3xl">
        
        {/* Tab 1: Dashboard */}
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

        {/* Tab 2: + NEW ORDER (PRIMARY HIGHLIGHTED CTA) */}
        <button
          onClick={() => handleStartNewOrder(false)}
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
          {actionRequiredOrders.length > 0 && (
            <span className="absolute top-0 right-3 bg-amber-500 text-white font-black text-[9px] h-4 w-4 rounded-full flex items-center justify-center shadow-xs animate-bounce">
              {actionRequiredOrders.length}
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
