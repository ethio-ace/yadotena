"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatETB } from "@/lib/currency";
import { getImageUrl } from "@/lib/utils";
import { 
  Search, Plus, Trash2, Check, CreditCard, X, ShoppingBag, 
  ArrowRight, ArrowLeft, Utensils, CheckCircle2, CornerDownRight
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

  // Multi-Step State (Step 1: Select Table, Step 2: Select Menu & Addons)
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);

  // Menu Search & Category
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Cart Items State (Persisted across step switches)
  const [cartItems, setCartItems] = useState<WaiterCartItem[]>([]);
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState<Order | null>(null);

  // Custom Dish Addon Modal State
  const [configuringDish, setConfiguringDish] = useState<MenuItem | null>(null);
  const [modalAddons, setModalAddons] = useState<MenuItemAddon[]>([]);
  const [modalNote, setModalNote] = useState<string>("");
  const [modalQty, setModalQty] = useState<number>(1);

  // Queries
  const { data: tables = [] } = useQuery<Table[]>({
    queryKey: ["tables"],
    queryFn: api.tables.getAll,
    refetchInterval: 3000,
  });

  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ["orders"],
    queryFn: api.orders.getAll,
    refetchInterval: 3000,
  });

  const { data: menu = [] } = useQuery<MenuItem[]>({
    queryKey: ["menu"],
    queryFn: api.menu.getAll,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: api.categories.getAll,
  });

  // Identify ongoing order for currently selected table
  const activeOrderForTable = orders.find(
    (o) => o.tableId === selectedTable?.id && o.status !== "COMPLETED" && o.status !== "CANCELLED"
  );

  // Order Mutations
  const createOrderMutation = useMutation({
    mutationFn: api.orders.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["tables"] });
      setCartItems([]);
      setCurrentStep(1);
    },
    onError: (err: any) => alert(err.message || "Order creation failed"),
  });

  const appendItemsMutation = useMutation({
    mutationFn: ({ id, items }: { id: string; items: any }) => api.orders.addItems(id, items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setCartItems([]);
      setCurrentStep(1);
    },
    onError: (err: any) => alert(err.message || "Failed to add items"),
  });

  const updateOrderStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: any }) => api.orders.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["tables"] });
    },
  });

  // Table selection handler
  const handleSelectTable = (table: Table) => {
    setSelectedTable(table);
    // Auto-advance to Step 2
    setCurrentStep(2);
  };

  // Addon Modal Handlers
  const openDishModal = (item: MenuItem) => {
    setConfiguringDish(item);
    setModalAddons([]);
    setModalNote("");
    setModalQty(1);
  };

  const handleAddModalDishToCart = () => {
    if (!configuringDish) return;
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
    setConfiguringDish(null);
  };

  const quickAddItem = (item: MenuItem) => {
    if (item.customAddons && item.customAddons.length > 0) {
      openDishModal(item);
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

  // Final Order Submission
  const handleConfirmOrder = () => {
    if (!selectedTable) return alert("Select a table first.");
    if (cartItems.length === 0) return alert("Add items to the order first.");

    const itemsPayload = cartItems.map((item) => ({
      menuItemId: item.menuItemId,
      quantity: item.quantity,
      qty: item.quantity,
      specialInstructions: item.specialInstructions,
      notes: item.specialInstructions,
      selectedAddons: item.selectedAddons,
      addons: item.selectedAddons,
    }));

    if (activeOrderForTable) {
      // Append items to ongoing active order
      appendItemsMutation.mutate({
        id: activeOrderForTable.id,
        items: itemsPayload,
      });
    } else {
      // Create new order
      createOrderMutation.mutate({
        type: "DINE_IN",
        status: "PENDING",
        paymentStatus: "PENDING",
        tableId: selectedTable.id,
        items: itemsPayload as any,
      });
    }
  };

  // Financial Calculations
  const getItemUnitPrice = (item: WaiterCartItem) => {
    const addonsSum = item.selectedAddons.reduce((acc, a) => acc + (a.price || 0), 0);
    return item.basePrice + addonsSum;
  };

  const subtotal = cartItems.reduce((acc, i) => acc + getItemUnitPrice(i) * i.quantity, 0);
  const tax = subtotal * 0.15;
  const service = subtotal * 0.10;
  const grandTotal = subtotal + tax + service;

  // Food Ready Alerts
  const readyOrders = orders.filter((o) => o.status === "READY");

  return (
    <div className="space-y-4 animate-in fade-in duration-200 pb-16">
      
      {/* Top Ready Food Alert Counter */}
      {readyOrders.length > 0 && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-2xl flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-300">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
            <span>{readyOrders.length} Order(s) Ready for Serving:</span>
            {readyOrders.map((o) => (
              <Badge key={o.id} className="bg-emerald-600 text-white text-[10px] font-mono">
                Table {o.tableId?.replace("t", "") || o.id.slice(-4)}
              </Badge>
            ))}
          </div>
          <div className="flex gap-1.5">
            {readyOrders.map((o) => (
              <Button
                key={o.id}
                size="sm"
                onClick={() => updateOrderStatusMutation.mutate({ id: o.id, status: "SERVED" })}
                className="h-7 rounded-xl text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Mark Table {o.tableId?.replace("t", "")} Served
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Multi-Step Stepper Header */}
      <div className="bg-card border p-3 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-sm">
        
        {/* Step Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentStep(1)}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 border ${
              currentStep === 1
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-muted/40 border-transparent text-muted-foreground hover:bg-muted"
            }`}
          >
            <span className="h-5 w-5 rounded-full bg-background/20 flex items-center justify-center text-[10px]">
              1
            </span>
            <span>Step 1: Select Free Table</span>
          </button>

          <ArrowRight className="h-4 w-4 text-muted-foreground" />

          <button
            onClick={() => {
              if (selectedTable) setCurrentStep(2);
            }}
            disabled={!selectedTable}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 border ${
              currentStep === 2
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : selectedTable
                ? "bg-muted/40 border-transparent text-foreground hover:bg-muted"
                : "bg-muted/20 border-transparent text-muted-foreground/40 cursor-not-allowed"
            }`}
          >
            <span className="h-5 w-5 rounded-full bg-background/20 flex items-center justify-center text-[10px]">
              2
            </span>
            <span>Step 2: Menus & Addons</span>
          </button>
        </div>

        {/* Selected Table Status Indicator */}
        {selectedTable && (
          <div className="flex items-center gap-2 text-xs font-bold bg-muted/50 px-3 py-1.5 rounded-xl border">
            <span className="text-muted-foreground">Active Table:</span>
            <span className="font-black text-foreground">
              Table #{selectedTable.id.replace("t", "")}
            </span>
            {activeOrderForTable ? (
              <Badge className="bg-amber-500 text-amber-950 text-[9px] font-black">
                Ongoing Ticket #{activeOrderForTable.id.slice(-5).toUpperCase()}
              </Badge>
            ) : (
              <Badge className="bg-emerald-500 text-white text-[9px] font-black">
                Free / Available
              </Badge>
            )}
          </div>
        )}

      </div>

      {/* Main Grid: Left Main Workflow / Right Side Summary Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Main Column (Step 1 or Step 2) */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* STEP 1: SELECT FREE TABLE */}
          {currentStep === 1 && (
            <Card className="rounded-2xl border shadow-sm p-4 space-y-4 bg-card">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h3 className="font-black text-base">Select Available Floor Table</h3>
                  <p className="text-xs text-muted-foreground">
                    Only free tables can start new orders. Occupied tables display ongoing tickets.
                  </p>
                </div>

                <Badge variant="outline" className="font-bold text-xs">
                  {tables.filter((t) => t.status === "AVAILABLE").length} Tables Free
                </Badge>
              </div>

              {/* Floor Table Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {tables.map((table) => {
                  const isSelected = selectedTable?.id === table.id;
                  const ongoingOrder = orders.find(
                    (o) => o.tableId === table.id && o.status !== "COMPLETED" && o.status !== "CANCELLED"
                  );
                  const isOccupied = !!ongoingOrder || table.status !== "AVAILABLE";

                  return (
                    <div
                      key={table.id}
                      onClick={() => handleSelectTable(table)}
                      className={`p-4 rounded-2xl border-2 transition-all cursor-pointer space-y-3 relative flex flex-col justify-between ${
                        isSelected
                          ? "bg-primary/10 border-primary shadow-md ring-2 ring-primary/20"
                          : isOccupied
                          ? "bg-amber-500/5 border-amber-500/30 hover:border-amber-500/60"
                          : "bg-card border-border hover:border-primary/40 hover:shadow-sm"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] font-bold text-muted-foreground block uppercase">
                            Table Number
                          </span>
                          <h4 className="text-2xl font-black text-foreground">
                            #{(table as any).number || table.id.replace("t", "")}
                          </h4>
                        </div>

                        <Badge
                          className={`text-[9px] font-black uppercase ${
                            isOccupied
                              ? "bg-amber-500 text-amber-950"
                              : "bg-emerald-500 text-white"
                          }`}
                        >
                          {isOccupied ? "Occupied" : "Free"}
                        </Badge>
                      </div>

                      {ongoingOrder ? (
                        <div className="text-[10px] font-bold text-amber-700 dark:text-amber-300 pt-1 border-t">
                          <span>Ongoing: {formatETB(ongoingOrder.total)}</span>
                          <span className="block text-muted-foreground font-medium">Click to add items</span>
                        </div>
                      ) : (
                        <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 pt-1 border-t">
                          <span>Ready for New Order</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* STEP 2: SELECT MENUS & ADDONS */}
          {currentStep === 2 && (
            <Card className="rounded-2xl border shadow-sm p-4 space-y-4 bg-card">
              
              {/* Header & Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setCurrentStep(1)}
                    className="h-8 text-xs font-bold rounded-xl gap-1 text-muted-foreground"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" /> Back to Tables
                  </Button>
                  <h3 className="font-black text-base">
                    Menu Catalog {selectedTable && `(Table #${selectedTable.id.replace("t", "")})`}
                  </h3>
                </div>

                <div className="relative w-full sm:w-60">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search dishes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 text-xs h-8 rounded-xl bg-muted/30"
                  />
                </div>
              </div>

              {/* Category Filter Pills */}
              <div className="flex gap-1.5 overflow-x-auto text-xs pb-1">
                <button
                  onClick={() => setActiveCategory("All")}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap border transition-all ${
                    activeCategory === "All"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/30 border-transparent text-muted-foreground hover:bg-muted"
                  }`}
                >
                  All Dishes
                </button>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setActiveCategory(c.name)}
                    className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap border transition-all ${
                      activeCategory === c.name
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/30 border-transparent text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>

              {/* Menu Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[520px] overflow-y-auto pr-1">
                {menu
                  .filter((item) => {
                    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
                    const matchesCat = activeCategory === "All" || item.category === activeCategory;
                    return matchesSearch && matchesCat && item.available !== false;
                  })
                  .map((item) => {
                    const hasAddons = item.customAddons && item.customAddons.length > 0;

                    return (
                      <div
                        key={item.id}
                        className="p-3 rounded-2xl border bg-card hover:bg-muted/20 transition-all flex items-center justify-between space-x-2"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={getImageUrl(item.image)}
                            alt={item.name}
                            className="h-12 w-12 rounded-xl object-cover border shrink-0"
                          />
                          <div className="min-w-0">
                            <h4 className="font-bold text-xs truncate">{item.name}</h4>
                            <span className="font-black text-xs text-primary block mt-0.5">
                              {formatETB(item.price)}
                            </span>
                            {hasAddons && (
                              <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 block">
                                + Custom Addons
                              </span>
                            )}
                          </div>
                        </div>

                        {hasAddons ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openDishModal(item)}
                            className="h-8 text-[11px] font-bold rounded-xl text-primary border-primary/30 hover:bg-primary/10 px-2.5"
                          >
                            + Option
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => quickAddItem(item)}
                            className="h-8 text-[11px] font-bold rounded-xl px-3 bg-primary text-primary-foreground"
                          >
                            + Add
                          </Button>
                        )}
                      </div>
                    );
                  })}
              </div>

            </Card>
          )}

        </div>

        {/* Right Column: Persistent Side Display Summary */}
        <div className="lg:col-span-4 space-y-3">
          
          <Card className="rounded-2xl border shadow-sm p-4 space-y-3 bg-card flex flex-col justify-between min-h-[500px]">
            
            <div>
              {/* Header */}
              <div className="flex items-center justify-between border-b pb-2.5">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4 text-primary" />
                  <h3 className="font-black text-sm">Selected Order Ticket</h3>
                </div>

                {selectedTable && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setCurrentStep(1)}
                    className="h-6 text-[10px] font-bold text-primary underline p-0"
                  >
                    Change Table
                  </Button>
                )}
              </div>

              {/* Table Status Badge */}
              <div className="mt-3 p-2.5 rounded-xl bg-muted/40 border text-xs space-y-1">
                {selectedTable ? (
                  <div className="flex items-center justify-between font-bold">
                    <span>Table #{selectedTable.id.replace("t", "")}</span>
                    {activeOrderForTable ? (
                      <Badge className="bg-amber-500 text-amber-950 text-[9px] font-bold">
                        Appending to Order #{activeOrderForTable.id.slice(-5).toUpperCase()}
                      </Badge>
                    ) : (
                      <Badge className="bg-emerald-500 text-white text-[9px] font-bold">
                        New Order
                      </Badge>
                    )}
                  </div>
                ) : (
                  <span className="text-muted-foreground italic font-medium">No table selected yet.</span>
                )}
              </div>

              {/* Cart Item Display */}
              <div className="mt-3 space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {cartItems.length === 0 ? (
                  <div className="py-10 text-center text-xs text-muted-foreground border border-dashed rounded-xl space-y-1">
                    <p className="font-bold">Order list is empty</p>
                    <p className="text-[11px] opacity-70">Select dishes from the menu to populate this ticket.</p>
                  </div>
                ) : (
                  cartItems.map((ci) => {
                    const unitPrice = getItemUnitPrice(ci);
                    return (
                      <div key={ci.cartItemId} className="p-2.5 rounded-xl bg-muted/40 border text-xs space-y-1">
                        <div className="flex justify-between font-bold">
                          <span>{ci.name}</span>
                          <span className="text-primary">{formatETB(unitPrice * ci.quantity)}</span>
                        </div>

                        {ci.selectedAddons.length > 0 && (
                          <div className="text-[10px] text-muted-foreground font-medium flex flex-wrap gap-1">
                            {ci.selectedAddons.map((a) => (
                              <span key={a.id} className="bg-background border px-1 rounded text-[9px]">
                                +{a.name} ({formatETB(a.price)})
                              </span>
                            ))}
                          </div>
                        )}

                        {ci.specialInstructions && (
                          <div className="text-[10px] text-amber-600 dark:text-amber-400 italic">
                            "{ci.specialInstructions}"
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-1 border-t border-border/50">
                          <div className="flex items-center gap-1.5 bg-background border px-1.5 py-0.5 rounded-lg text-xs font-bold">
                            <button onClick={() => updateCartQty(ci.cartItemId, -1)} className="px-1 text-muted-foreground hover:text-foreground">
                              -
                            </button>
                            <span>{ci.quantity}</span>
                            <button onClick={() => updateCartQty(ci.cartItemId, 1)} className="px-1 text-muted-foreground hover:text-foreground">
                              +
                            </button>
                          </div>

                          <button onClick={() => removeCartItem(ci.cartItemId)} className="text-rose-500 hover:text-rose-600 p-1">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Subtotal & Confirm Button */}
            <div className="pt-3 border-t space-y-2.5">
              <div className="space-y-1 text-xs text-muted-foreground font-semibold">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatETB(subtotal)}</span>
                </div>
                <div className="flex justify-between text-foreground font-black text-sm pt-1 border-t">
                  <span>Total (incl. VAT & Service)</span>
                  <span className="text-primary">{formatETB(grandTotal)}</span>
                </div>
              </div>

              <Button
                onClick={handleConfirmOrder}
                disabled={
                  !selectedTable ||
                  cartItems.length === 0 ||
                  createOrderMutation.isPending ||
                  appendItemsMutation.isPending
                }
                className="w-full h-11 rounded-xl font-black text-xs bg-primary text-primary-foreground shadow-md"
              >
                {createOrderMutation.isPending || appendItemsMutation.isPending
                  ? "Submitting..."
                  : activeOrderForTable
                  ? `Append Items to Order (${formatETB(grandTotal)})`
                  : `Confirm Order (${formatETB(grandTotal)})`}
              </Button>

              {activeOrderForTable && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedOrderForPayment(activeOrderForTable)}
                  className="w-full rounded-xl text-xs font-bold border-emerald-500/30 text-emerald-600 dark:text-emerald-400 gap-1.5"
                >
                  <CreditCard className="h-3.5 w-3.5" /> Settle Table #{selectedTable?.id.replace("t", "")} Bill ({formatETB(activeOrderForTable.total)})
                </Button>
              )}
            </div>

          </Card>

        </div>

      </div>

      {/* Dish Addon Configuration Modal */}
      {configuringDish && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border rounded-2xl shadow-xl max-w-md w-full p-5 space-y-4 relative">
            
            <div className="flex items-start justify-between border-b pb-2">
              <div>
                <h3 className="font-black text-base">{configuringDish.name}</h3>
                <span className="text-xs text-primary font-bold">{formatETB(configuringDish.price)}</span>
              </div>
              <button onClick={() => setConfiguringDish(null)} className="p-1 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Custom Addons Selection */}
            {configuringDish.customAddons && configuringDish.customAddons.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-muted-foreground uppercase">Select Addons</span>
                <div className="space-y-1.5">
                  {configuringDish.customAddons.map((addon) => {
                    const selected = modalAddons.some((a) => a.id === addon.id);
                    return (
                      <label
                        key={addon.id}
                        onClick={() => {
                          if (selected) {
                            setModalAddons((prev) => prev.filter((a) => a.id !== addon.id));
                          } else {
                            setModalAddons((prev) => [...prev, addon]);
                          }
                        }}
                        className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer text-xs transition-all ${
                          selected ? "bg-primary/10 border-primary font-bold" : "bg-muted/30 border-transparent hover:bg-muted"
                        }`}
                      >
                        <span>{addon.name}</span>
                        <span className="text-primary font-bold">+ {formatETB(addon.price)}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Special Instructions Note */}
            <div className="space-y-1">
              <span className="text-xs font-bold text-muted-foreground uppercase">Special Kitchen Note</span>
              <Textarea
                placeholder="e.g. Extra hot, no onions..."
                value={modalNote}
                onChange={(e: any) => setModalNote(e.target.value)}
                className="text-xs h-16 rounded-xl bg-muted/30 resize-none"
              />
            </div>

            {/* Quantity Controls */}
            <div className="flex items-center justify-between border-t pt-2">
              <span className="text-xs font-bold text-muted-foreground">Quantity</span>
              <div className="flex items-center gap-2 bg-muted p-1 rounded-xl text-xs font-bold">
                <button onClick={() => setModalQty((q) => Math.max(1, q - 1))} className="px-2 py-0.5">
                  -
                </button>
                <span>{modalQty}</span>
                <button onClick={() => setModalQty((q) => q + 1)} className="px-2 py-0.5">
                  +
                </button>
              </div>
            </div>

            <Button
              onClick={handleAddModalDishToCart}
              className="w-full h-10 rounded-xl font-black text-xs bg-primary text-primary-foreground"
            >
              Add to Ticket (
              {formatETB(
                (configuringDish.price + modalAddons.reduce((acc, a) => acc + (a.price || 0), 0)) * modalQty
              )}
              )
            </Button>

          </div>
        </div>
      )}

      {/* Bill Settlement Modal */}
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
