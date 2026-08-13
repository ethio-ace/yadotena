"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatETB } from "@/lib/currency";
import { getImageUrl } from "@/lib/utils";
import { 
  Utensils, Plus, Check, CreditCard, Search, X, 
  ShoppingBag, Trash2, ChevronRight, Clock, Flame, 
  Sparkles, Layers, CheckCircle2, User, AlertTriangle, ArrowRight, CornerDownRight
} from "lucide-react";
import { PaymentSettlementModal } from "@/components/PaymentSettlementModal";
import { Order, MenuItem, MenuItemAddon, Table } from "@/types";

export interface WaiterCartItem {
  cartItemId: string;
  menuItemId: string;
  name: string;
  basePrice: number;
  quantity: number;
  selectedAddons: MenuItemAddon[];
  specialInstructions: string;
}

export default function WaiterDashboardPage() {
  const queryClient = useQueryClient();

  // State
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [existingOrderToAppend, setExistingOrderToAppend] = useState<Order | null>(null);
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState<Order | null>(null);
  const [tableFilter, setTableFilter] = useState<string>("ALL");

  // Menu Search & Category
  const [menuSearch, setMenuSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  // Addon Modal State for configuring a dish
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [modalSelectedAddons, setModalSelectedAddons] = useState<MenuItemAddon[]>([]);
  const [modalInstructions, setModalInstructions] = useState("");
  const [modalQuantity, setModalQuantity] = useState(1);

  // Active Cart Items queued for order submission
  const [cartItems, setCartItems] = useState<WaiterCartItem[]>([]);

  // Queries
  const { data: tables = [], isLoading: isTablesLoading } = useQuery<Table[]>({
    queryKey: ["tables"],
    queryFn: api.tables.getAll,
    refetchInterval: 3000,
  });

  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ["orders"],
    queryFn: api.orders.getAll,
    refetchInterval: 3000,
  });

  const { data: menu = [], isLoading: isMenuLoading } = useQuery<MenuItem[]>({
    queryKey: ["menu"],
    queryFn: api.menu.getAll,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: api.categories.getAll,
  });

  // Mutations
  const updateOrderStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: any }) => api.orders.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["tables"] });
    },
  });

  const updateTableStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: any }) => api.tables.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tables"] });
    },
  });

  const createOrderMutation = useMutation({
    mutationFn: api.orders.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["tables"] });
      resetOrderForm();
      alert("Order successfully submitted to kitchen!");
    },
    onError: (err: any) => alert(err.message || "Failed to place order"),
  });

  const appendOrderItemsMutation = useMutation({
    mutationFn: ({ id, items }: { id: string; items: any }) => api.orders.addItems(id, items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      resetOrderForm();
      alert("Items successfully added to existing ticket!");
    },
    onError: (err: any) => alert(err.message || "Failed to append items"),
  });

  // Open item customization modal
  const handleOpenCustomizeModal = (item: MenuItem) => {
    setCustomizingItem(item);
    setModalSelectedAddons([]);
    setModalInstructions("");
    setModalQuantity(1);
  };

  // Add customized item from modal to cart
  const handleConfirmAddToCart = () => {
    if (!customizingItem) return;

    const newCartItem: WaiterCartItem = {
      cartItemId: `cart-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      menuItemId: customizingItem.id,
      name: customizingItem.name,
      basePrice: customizingItem.price,
      quantity: modalQuantity,
      selectedAddons: [...modalSelectedAddons],
      specialInstructions: modalInstructions.trim(),
    };

    setCartItems((prev) => [...prev, newCartItem]);
    setCustomizingItem(null);
  };

  // Quick add item without modal (if no custom addons)
  const handleQuickAdd = (item: MenuItem) => {
    if (item.customAddons && item.customAddons.length > 0) {
      handleOpenCustomizeModal(item);
      return;
    }

    const newCartItem: WaiterCartItem = {
      cartItemId: `cart-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      menuItemId: item.id,
      name: item.name,
      basePrice: item.price,
      quantity: 1,
      selectedAddons: [],
      specialInstructions: "",
    };

    setCartItems((prev) => [...prev, newCartItem]);
  };

  const handleUpdateCartQty = (cartItemId: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((item) =>
          item.cartItemId === cartItemId
            ? { ...item, quantity: item.quantity + delta }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const handleRemoveCartItem = (cartItemId: string) => {
    setCartItems((prev) => prev.filter((i) => i.cartItemId !== cartItemId));
  };

  const resetOrderForm = () => {
    setCartItems([]);
    setExistingOrderToAppend(null);
  };

  const handleSelectTableForOrdering = (table: Table) => {
    setSelectedTable(table);
    // Check if table is occupied and has an active open order
    const activeOrder = orders.find(
      (o) => o.tableId === table.id && o.status !== "COMPLETED" && o.status !== "CANCELLED"
    );
    if (activeOrder) {
      setExistingOrderToAppend(activeOrder);
    } else {
      setExistingOrderToAppend(null);
    }
  };

  // Submit Order Handler
  const handleSubmitTableOrder = () => {
    if (!selectedTable) return alert("Please select a floor table first.");
    if (cartItems.length === 0) return alert("Please add at least one menu item to the order.");

    const formattedItems = cartItems.map((item) => ({
      menuItemId: item.menuItemId,
      quantity: item.quantity,
      qty: item.quantity,
      specialInstructions: item.specialInstructions,
      notes: item.specialInstructions,
      selectedAddons: item.selectedAddons,
      addons: item.selectedAddons,
    }));

    if (existingOrderToAppend) {
      appendOrderItemsMutation.mutate({
        id: existingOrderToAppend.id,
        items: formattedItems,
      });
    } else {
      createOrderMutation.mutate({
        type: "DINE_IN",
        status: "PENDING",
        paymentStatus: "PENDING",
        tableId: selectedTable.id,
        items: formattedItems as any,
      });
    }
  };

  // Calculations for current cart
  const calculateItemUnitPrice = (item: WaiterCartItem) => {
    const addonsTotal = item.selectedAddons.reduce((acc, a) => acc + (a.price || 0), 0);
    return item.basePrice + addonsTotal;
  };

  const cartSubtotal = cartItems.reduce(
    (acc, item) => acc + calculateItemUnitPrice(item) * item.quantity,
    0
  );
  const cartTax = cartSubtotal * 0.15;
  const cartService = cartSubtotal * 0.10;
  const cartTotal = cartSubtotal + cartTax + cartService;

  // Ready Food Alert Counter
  const readyOrders = orders.filter((o) => o.status === "READY");
  const activeOrders = orders.filter((o) => o.status !== "COMPLETED" && o.status !== "CANCELLED");

  const filteredTables = tables.filter((t) => {
    if (tableFilter === "AVAILABLE") return t.status === "AVAILABLE";
    if (tableFilter === "OCCUPIED") return t.status === "OCCUPIED" || t.status === "PREPARING" || t.status === "WAITING_FOR_SERVICE";
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-24">
      
      {/* Waiter Station Compact Banner */}
      <div className="bg-gradient-to-r from-amber-950 via-zinc-900 to-amber-950 text-amber-50 p-5 rounded-3xl border border-amber-800/60 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 font-black text-[10px] uppercase tracking-wider px-2.5 py-0.5">
              🤵 Waiter Floor POS
            </Badge>
            <span className="text-xs text-amber-200/80 font-medium">Take Customer Orders & Manage Tables</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight mt-1">
            Floor Order Console
          </h1>
        </div>

        {/* Selected Table Indicator Pill */}
        <div className="flex items-center gap-3">
          {selectedTable ? (
            <div className="bg-amber-500 text-amber-950 px-4 py-2 rounded-2xl font-black text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20">
              <Utensils className="h-4 w-4" />
              <span>Ordering for Table #{selectedTable.id.replace("t", "")}</span>
              <button onClick={() => setSelectedTable(null)} className="ml-1 opacity-70 hover:opacity-100">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="bg-zinc-800/80 border border-zinc-700/80 text-amber-200 px-4 py-2 rounded-2xl font-bold text-xs flex items-center gap-2">
              <span>⚠️ Select a table below to start ordering</span>
            </div>
          )}
        </div>
      </div>

      {/* High-Priority Ready Food Counter Notification */}
      {readyOrders.length > 0 && (
        <Card className="rounded-3xl border-2 border-emerald-500/50 bg-emerald-500/10 p-5 space-y-3 shadow-md animate-pulse">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                🛎️
              </div>
              <div>
                <h3 className="font-black text-base text-emerald-700 dark:text-emerald-300">
                  {readyOrders.length} Orders Cooked & Ready on Pickup Counter!
                </h3>
                <p className="text-xs text-muted-foreground font-semibold">Kitchen finished cooking. Deliver dishes to guests now.</p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {readyOrders.map((order) => (
              <div key={order.id} className="p-3.5 rounded-2xl bg-card border shadow-sm space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center">
                    <Badge className="bg-emerald-600 text-white font-black text-[10px]">
                      {order.tableId ? `Table ${order.tableId.replace("t", "")}` : order.type}
                    </Badge>
                    <span className="text-[11px] font-mono font-bold text-muted-foreground">Ticket #{order.id.slice(-6).toUpperCase()}</span>
                  </div>
                  <div className="text-xs font-medium text-foreground mt-2 space-y-0.5">
                    {order.items?.map((item: any) => (
                      <div key={item.id} className="flex justify-between">
                        <span>{item.quantity}x {item.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Button
                  size="sm"
                  onClick={() => updateOrderStatusMutation.mutate({ id: order.id, status: "SERVED" })}
                  disabled={updateOrderStatusMutation.isPending}
                  className="w-full rounded-xl font-black text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1 mt-2"
                >
                  <Check className="h-3.5 w-3.5" /> Mark Food Served
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Step 1: Floor Tables Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-black text-xs uppercase px-2.5 py-0.5">
              Step 1
            </Badge>
            <h2 className="text-lg font-black tracking-tight">Select Floor Table</h2>
          </div>

          <div className="flex gap-1 bg-muted/60 p-1 rounded-2xl border text-xs">
            <button
              onClick={() => setTableFilter("ALL")}
              className={`px-3 py-1 rounded-xl font-bold transition-all ${tableFilter === "ALL" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
            >
              All ({tables.length})
            </button>
            <button
              onClick={() => setTableFilter("AVAILABLE")}
              className={`px-3 py-1 rounded-xl font-bold transition-all ${tableFilter === "AVAILABLE" ? "bg-background text-emerald-600 shadow-sm" : "text-muted-foreground"}`}
            >
              Available ({tables.filter(t => t.status === "AVAILABLE").length})
            </button>
            <button
              onClick={() => setTableFilter("OCCUPIED")}
              className={`px-3 py-1 rounded-xl font-bold transition-all ${tableFilter === "OCCUPIED" ? "bg-background text-amber-600 shadow-sm" : "text-muted-foreground"}`}
            >
              Occupied ({tables.filter(t => t.status !== "AVAILABLE").length})
            </button>
          </div>
        </div>

        {isTablesLoading ? (
          <div className="p-8 text-center text-xs text-muted-foreground animate-pulse">Loading floor tables...</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {filteredTables.map((table) => {
              const isSelected = selectedTable?.id === table.id;
              const isOccupied = table.status !== "AVAILABLE";
              const activeOrder = orders.find(
                (o) => o.tableId === table.id && o.status !== "COMPLETED" && o.status !== "CANCELLED"
              );

              return (
                <div
                  key={table.id}
                  onClick={() => handleSelectTableForOrdering(table)}
                  className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-2 relative overflow-hidden ${
                    isSelected
                      ? "bg-primary/10 border-primary shadow-md ring-2 ring-primary/30"
                      : isOccupied
                      ? "bg-amber-500/10 border-amber-500/40 hover:border-amber-500"
                      : "bg-card border-muted hover:border-primary/40"
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[9px] font-black px-2 py-0.5 rounded-bl-xl uppercase">
                      Selected
                    </div>
                  )}

                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[9px] font-black uppercase text-muted-foreground block">Table</span>
                      <h3 className="text-xl font-black text-foreground">
                        #{(table as any).number || table.id.replace("t", "")}
                      </h3>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-bold">
                      {table.capacity || 4} Seats
                    </span>
                  </div>

                  {activeOrder ? (
                    <div className="text-[10px] font-bold text-amber-700 dark:text-amber-300">
                      <span>Ticket #{activeOrder.id.slice(-5).toUpperCase()}</span>
                      <span className="block text-foreground font-black">{formatETB(activeOrder.total)}</span>
                    </div>
                  ) : (
                    <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      Empty / Available
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Step 2 & 3 Split: Left Menu POS / Right Order Cart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Menu Item Selector */}
        <div className="lg:col-span-7 space-y-4">
          
          <Card className="rounded-3xl border shadow-sm p-4 space-y-4 bg-card">
            
            {/* Header & Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-black text-xs uppercase px-2.5 py-0.5">
                  Step 2
                </Badge>
                <h3 className="font-black text-base">Select Customer Menu & Addons</h3>
              </div>

              <div className="relative w-full sm:w-60">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search menu dishes..."
                  value={menuSearch}
                  onChange={(e) => setMenuSearch(e.target.value)}
                  className="pl-8 rounded-xl text-xs h-8 bg-muted/30"
                />
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
              <button
                onClick={() => setActiveCategory("All")}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors ${
                  activeCategory === "All" ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:bg-muted"
                }`}
              >
                All Dishes
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.name)}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors ${
                    activeCategory === cat.name ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Menu Dishes Grid */}
            {isMenuLoading ? (
              <div className="p-8 text-center text-xs text-muted-foreground animate-pulse">Loading menu items...</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[580px] overflow-y-auto pr-1">
                {menu
                  .filter((m) => {
                    const matchSearch = m.name.toLowerCase().includes(menuSearch.toLowerCase());
                    const matchCat = activeCategory === "All" || m.category === activeCategory;
                    return matchSearch && matchCat && m.available !== false;
                  })
                  .map((item) => {
                    const hasAddons = item.customAddons && item.customAddons.length > 0;

                    return (
                      <div
                        key={item.id}
                        className="p-3 rounded-2xl border bg-card hover:bg-muted/30 transition-all flex justify-between space-x-3 group relative shadow-sm"
                      >
                        <div className="flex gap-3 items-center min-w-0">
                          <img
                            src={getImageUrl(item.image)}
                            alt={item.name}
                            className="h-14 w-14 rounded-2xl object-cover shrink-0 border"
                          />
                          <div className="min-w-0">
                            <h4 className="font-bold text-xs truncate group-hover:text-primary transition-colors">
                              {item.name}
                            </h4>
                            <span className="font-black text-primary text-xs block mt-0.5">
                              {formatETB(item.price)}
                            </span>
                            
                            {hasAddons ? (
                              <Badge variant="outline" className="text-[9px] font-bold mt-1 text-amber-600 dark:text-amber-400 border-amber-500/30">
                                ✨ {item.customAddons?.length} Custom Addons
                              </Badge>
                            ) : (
                              <span className="text-[10px] text-muted-foreground block mt-0.5">Standard item</span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col justify-center shrink-0">
                          {hasAddons ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenCustomizeModal(item)}
                              className="rounded-xl text-[10px] font-bold h-8 px-2.5 text-primary border-primary/30 hover:bg-primary/10 gap-1"
                            >
                              <Plus className="h-3 w-3" /> Customize
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handleQuickAdd(item)}
                              className="rounded-xl text-[10px] font-bold h-8 px-3 bg-primary text-primary-foreground gap-1"
                            >
                              <Plus className="h-3 w-3" /> Add
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}

          </Card>

        </div>

        {/* Right Column: Customer Order Cart & Submission */}
        <div className="lg:col-span-5 space-y-4">
          
          <Card className="rounded-3xl border-2 border-primary/20 shadow-lg p-5 space-y-4 bg-card flex flex-col justify-between min-h-[500px]">
            
            {/* Header */}
            <div>
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <Badge className="bg-primary text-primary-foreground font-black text-xs">
                    Step 3
                  </Badge>
                  <h3 className="font-black text-base">Customer Table Ticket</h3>
                </div>

                {selectedTable && (
                  <Badge variant="outline" className="font-extrabold text-xs text-primary border-primary/40">
                    Table #{selectedTable.id.replace("t", "")}
                  </Badge>
                )}
              </div>

              {existingOrderToAppend && (
                <div className="mt-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs font-bold text-amber-700 dark:text-amber-300 flex items-center justify-between">
                  <span>Appending to Ticket #{existingOrderToAppend.id.slice(-6).toUpperCase()}</span>
                  <Badge className="bg-amber-500 text-amber-950 text-[9px]">Open Session</Badge>
                </div>
              )}

              {/* Cart Items List */}
              <div className="mt-4 space-y-3 max-h-[340px] overflow-y-auto pr-1">
                {cartItems.length === 0 ? (
                  <div className="py-12 text-center space-y-2 border-2 border-dashed rounded-2xl">
                    <ShoppingBag className="h-8 w-8 text-muted-foreground mx-auto opacity-40" />
                    <p className="text-xs font-bold text-muted-foreground">
                      No items selected yet. Tap menu items to build table order.
                    </p>
                  </div>
                ) : (
                  cartItems.map((cartItem) => {
                    const unitPrice = calculateItemUnitPrice(cartItem);
                    const itemTotal = unitPrice * cartItem.quantity;

                    return (
                      <div key={cartItem.cartItemId} className="p-3 rounded-2xl bg-muted/40 border space-y-2 text-xs">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-foreground">{cartItem.name}</h4>
                            <span className="text-[11px] text-muted-foreground font-semibold">
                              {formatETB(unitPrice)} each
                            </span>
                          </div>
                          <span className="font-black text-primary text-sm">{formatETB(itemTotal)}</span>
                        </div>

                        {/* Selected Addons List */}
                        {cartItem.selectedAddons.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {cartItem.selectedAddons.map((addon) => (
                              <Badge key={addon.id} variant="secondary" className="text-[9px] font-bold bg-background text-foreground border">
                                + {addon.name} ({formatETB(addon.price)})
                              </Badge>
                            ))}
                          </div>
                        )}

                        {/* Special Kitchen Notes */}
                        {cartItem.specialInstructions && (
                          <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium italic flex items-center gap-1">
                            <CornerDownRight className="h-3 w-3 shrink-0" />
                            <span>"{cartItem.specialInstructions}"</span>
                          </p>
                        )}

                        {/* Qty Controls */}
                        <div className="flex items-center justify-between pt-1 border-t">
                          <div className="flex items-center gap-1.5 bg-background border p-1 rounded-xl">
                            <button
                              onClick={() => handleUpdateCartQty(cartItem.cartItemId, -1)}
                              className="h-5 w-5 rounded-lg bg-muted flex items-center justify-center font-bold text-xs"
                            >
                              -
                            </button>
                            <span className="w-5 text-center font-bold text-xs">{cartItem.quantity}</span>
                            <button
                              onClick={() => handleUpdateCartQty(cartItem.cartItemId, 1)}
                              className="h-5 w-5 rounded-lg bg-muted flex items-center justify-center font-bold text-xs"
                            >
                              +
                            </button>
                          </div>

                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleRemoveCartItem(cartItem.cartItemId)}
                            className="h-7 w-7 rounded-xl text-rose-500 hover:bg-rose-500/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Financial Summary & Submit Button */}
            <div className="pt-4 border-t space-y-3">
              <div className="space-y-1.5 text-xs font-semibold">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{formatETB(cartSubtotal)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>VAT Tax (15%)</span>
                  <span>{formatETB(cartTax)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Service Charge (10%)</span>
                  <span>{formatETB(cartService)}</span>
                </div>
                <div className="flex justify-between font-black text-base pt-2 border-t text-foreground">
                  <span>Grand Total</span>
                  <span className="text-primary font-black">{formatETB(cartTotal)}</span>
                </div>
              </div>

              <Button
                onClick={handleSubmitTableOrder}
                disabled={
                  !selectedTable ||
                  cartItems.length === 0 ||
                  createOrderMutation.isPending ||
                  appendOrderItemsMutation.isPending
                }
                className="w-full h-12 rounded-2xl font-black text-xs bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 gap-2"
              >
                <Flame className="h-4 w-4" />
                <span>
                  {createOrderMutation.isPending || appendOrderItemsMutation.isPending
                    ? "Sending to Kitchen..."
                    : existingOrderToAppend
                    ? `Append Items to Order (${formatETB(cartTotal)})`
                    : `Send Order to Kitchen (${formatETB(cartTotal)})`}
                </span>
              </Button>
            </div>

          </Card>

        </div>

      </div>

      {/* Active Orders List & Settlement Actions */}
      <Card className="rounded-3xl border shadow-sm p-6 bg-card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-black text-lg flex items-center gap-2">
              <Utensils className="h-5 w-5 text-primary" />
              <span>Active Table Tickets</span>
            </h3>
            <p className="text-xs text-muted-foreground">Track order statuses and settle customer bills</p>
          </div>
          <Badge variant="outline" className="font-bold text-xs">
            {activeOrders.length} Active
          </Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {activeOrders.map((order) => (
            <div key={order.id} className="p-4 rounded-2xl bg-muted/30 border space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <Badge className="bg-primary/15 text-primary font-black text-[10px] uppercase">
                      {order.tableId ? `Table ${order.tableId.replace("t", "")}` : order.type}
                    </Badge>
                    <h4 className="font-black text-sm mt-1">Ticket #{order.id.slice(-6).toUpperCase()}</h4>
                  </div>
                  <Badge
                    className={`font-black text-[10px] uppercase ${
                      order.status === "READY"
                        ? "bg-emerald-500 text-white animate-pulse"
                        : order.status === "SERVED"
                        ? "bg-blue-500 text-white"
                        : "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    {order.status}
                  </Badge>
                </div>

                <div className="text-xs space-y-1 text-muted-foreground font-medium">
                  {order.items?.map((item: any) => (
                    <div key={item.id} className="flex justify-between">
                      <span>{item.quantity}x {item.name}</span>
                      <span className="font-bold">{formatETB(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t space-y-2">
                <div className="flex justify-between items-center text-xs font-black">
                  <span>Total: {formatETB(order.total)}</span>
                  <Badge variant="outline" className="text-[10px] font-bold">
                    {order.paymentStatus}
                  </Badge>
                </div>

                <div className="flex gap-2">
                  {order.status === "READY" && (
                    <Button
                      size="sm"
                      onClick={() => updateOrderStatusMutation.mutate({ id: order.id, status: "SERVED" })}
                      className="w-full rounded-xl text-xs font-black h-9 bg-emerald-600 text-white gap-1.5"
                    >
                      <Check className="h-3.5 w-3.5" /> Mark Served
                    </Button>
                  )}

                  <Button
                    size="sm"
                    onClick={() => setSelectedOrderForPayment(order)}
                    className="w-full rounded-xl text-xs font-black h-9 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                  >
                    <CreditCard className="h-3.5 w-3.5" /> Settle Bill
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Item Customization & Addon Modal */}
      {customizingItem && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-card border rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto relative">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b">
              <div className="flex items-center gap-3">
                <img
                  src={getImageUrl(customizingItem.image)}
                  alt={customizingItem.name}
                  className="h-12 w-12 rounded-2xl object-cover border"
                />
                <div>
                  <h3 className="text-xl font-black">{customizingItem.name}</h3>
                  <span className="text-xs text-primary font-black">{formatETB(customizingItem.price)} Base Price</span>
                </div>
              </div>
              <Button size="icon" variant="ghost" className="rounded-full" onClick={() => setCustomizingItem(null)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Custom Addons Selection */}
            {customizingItem.customAddons && customizingItem.customAddons.length > 0 && (
              <div className="space-y-3">
                <label className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                  Select Custom Addons
                </label>

                <div className="space-y-2">
                  {customizingItem.customAddons.map((addon) => {
                    const isChecked = modalSelectedAddons.some((a) => a.id === addon.id);

                    return (
                      <label
                        key={addon.id}
                        onClick={() => {
                          if (isChecked) {
                            setModalSelectedAddons((prev) => prev.filter((a) => a.id !== addon.id));
                          } else {
                            setModalSelectedAddons((prev) => [...prev, addon]);
                          }
                        }}
                        className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                          isChecked ? "bg-primary/10 border-primary font-bold text-foreground" : "bg-muted/30 border-muted hover:bg-muted/60"
                        }`}
                      >
                        <div className="flex items-center gap-2 text-xs">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="rounded h-4 w-4 text-primary"
                          />
                          <span>{addon.name}</span>
                        </div>
                        <span className="font-black text-xs text-primary">+ {formatETB(addon.price)}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Special Instructions Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                Kitchen Notes / Guest Special Instructions
              </label>
              <Textarea
                placeholder="e.g. Extra spicy, serve warm, no onions..."
                value={modalInstructions}
                onChange={(e) => setModalInstructions(e.target.value)}
                className="rounded-2xl text-xs bg-muted/30 resize-none h-20"
              />
            </div>

            {/* Quantity Selector */}
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-xs font-bold text-muted-foreground">Item Quantity</span>
              <div className="flex items-center gap-3 bg-muted p-1.5 rounded-2xl border">
                <button
                  onClick={() => setModalQuantity((q) => Math.max(1, q - 1))}
                  className="h-8 w-8 rounded-xl bg-background flex items-center justify-center font-bold text-sm"
                >
                  -
                </button>
                <span className="font-black text-sm w-6 text-center">{modalQuantity}</span>
                <button
                  onClick={() => setModalQuantity((q) => q + 1)}
                  className="h-8 w-8 rounded-xl bg-background flex items-center justify-center font-bold text-sm"
                >
                  +
                </button>
              </div>
            </div>

            {/* Confirm Add Button */}
            <Button
              onClick={handleConfirmAddToCart}
              className="w-full h-12 rounded-2xl font-black text-xs bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25"
            >
              Add to Table Order (
              {formatETB(
                (customizingItem.price + modalSelectedAddons.reduce((acc, a) => acc + (a.price || 0), 0)) * modalQuantity
              )}
              )
            </Button>

          </div>
        </div>
      )}

      {/* Payment Settlement Modal */}
      <PaymentSettlementModal
        order={selectedOrderForPayment}
        isOpen={!!selectedOrderForPayment}
        onClose={() => setSelectedOrderForPayment(null)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["orders"] });
          queryClient.invalidateQueries({ queryKey: ["tables"] });
        }}
      />

    </div>
  );
}
