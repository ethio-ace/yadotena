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
  ArrowRight, ArrowLeft, Utensils, CheckCircle2, Sparkles, Clock, 
  ChevronRight, Eye, Info, AlertTriangle, Users
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

const KITCHEN_NOTE_PRESETS = [
  "No Spicy",
  "Extra Hot",
  "No Onions",
  "Serve Warm",
  "Extra Sauce",
  "Separate Plate",
  "Well Done",
];

export default function WaiterDashboardPage() {
  const queryClient = useQueryClient();

  // Multi-Step State (Step 1: Select Table, Step 2: Select Menu & Addons)
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);

  // Table Details Modal State
  const [viewingTableDetails, setViewingTableDetails] = useState<Table | null>(null);

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

  // Identify active order for currently selected table
  const activeOrderForTable = orders.find(
    (o) => o.tableId === selectedTable?.id && o.status !== "COMPLETED" && o.status !== "CANCELLED"
  );

  // Identify active order for viewing details table
  const activeOrderForViewingTable = orders.find(
    (o) => o.tableId === viewingTableDetails?.id && o.status !== "COMPLETED" && o.status !== "CANCELLED"
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

  // Select Table Handler
  const handleSelectTable = (table: Table) => {
    setSelectedTable(table);
    setCurrentStep(2);
  };

  // Addon Modal Handlers
  const openDishModal = (item: MenuItem) => {
    setConfiguringDish(item);
    setModalAddons([]);
    setModalNote("");
    setModalQty(1);
  };

  const handleAddPresetNote = (preset: string) => {
    if (!modalNote) {
      setModalNote(preset);
    } else if (!modalNote.includes(preset)) {
      setModalNote(`${modalNote}, ${preset}`);
    }
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
      // Append items to existing session
      appendItemsMutation.mutate({
        id: activeOrderForTable.id,
        items: itemsPayload,
      });
    } else {
      // Create new order on free table
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

  // Food Ready & Active Orders
  const readyOrders = orders.filter((o) => o.status === "READY");
  const activeOrders = orders.filter((o) => o.status !== "COMPLETED" && o.status !== "CANCELLED");

  return (
    <div className="space-y-4 animate-in fade-in duration-200 pb-20">
      
      {/* Ready Counter Notification Strip */}
      {readyOrders.length > 0 && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 p-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping" />
            <span>{readyOrders.length} Order(s) Ready for Table Delivery:</span>
            {readyOrders.map((o) => (
              <Badge key={o.id} className="bg-emerald-600 text-white text-[10px] font-mono px-2 py-0.5">
                Table #{o.tableId?.replace("t", "") || o.id.slice(-4)}
              </Badge>
            ))}
          </div>
          <div className="flex gap-1.5">
            {readyOrders.map((o) => (
              <Button
                key={o.id}
                size="sm"
                onClick={() => updateOrderStatusMutation.mutate({ id: o.id, status: "SERVED" })}
                className="h-8 rounded-xl text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1 px-3"
              >
                <Check className="h-3.5 w-3.5" /> Mark Table #{o.tableId?.replace("t", "")} Served
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Multi-Step Stepper Bar */}
      <div className="bg-card border p-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-sm">
        
        {/* Step Navigation Buttons */}
        <div className="flex items-center gap-2">
          
          <button
            onClick={() => setCurrentStep(1)}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 border ${
              currentStep === 1
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-muted/40 border-transparent text-muted-foreground hover:bg-muted"
            }`}
          >
            <span className="h-5 w-5 rounded-full bg-background/20 flex items-center justify-center text-[10px] font-bold">
              1
            </span>
            <span>Step 1: Floor Table Selection</span>
          </button>

          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />

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
            <span className="h-5 w-5 rounded-full bg-background/20 flex items-center justify-center text-[10px] font-bold">
              2
            </span>
            <span>Step 2: Menus & Custom Addons</span>
          </button>

        </div>

        {/* Selected Table Active Badge */}
        {selectedTable && (
          <div className="flex items-center gap-2 text-xs font-bold bg-muted/50 px-3 py-1.5 rounded-xl border">
            <span className="text-muted-foreground">Selected:</span>
            <span className="font-black text-foreground">
              Table #{selectedTable.id.replace("t", "")}
            </span>
            {activeOrderForTable ? (
              <Badge className="bg-amber-500 text-amber-950 text-[9px] font-black">
                Ongoing Ticket (Append Mode)
              </Badge>
            ) : (
              <Badge className="bg-emerald-500 text-white text-[9px] font-black">
                Free Table (New Order)
              </Badge>
            )}
          </div>
        )}

      </div>

      {/* Main Grid: Left Step Content / Right Persistent Side Display */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Main Column (Step 1 or Step 2) */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* STEP 1: SELECT FLOOR TABLE */}
          {currentStep === 1 && (
            <Card className="rounded-2xl border shadow-sm p-4 space-y-4 bg-card">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h3 className="font-black text-base">Floor Tables Grid</h3>
                  <p className="text-xs text-muted-foreground">
                    Select a table to start a new order or append items to an ongoing session.
                  </p>
                </div>

                <Badge variant="outline" className="font-bold text-xs">
                  {tables.filter((t) => t.status === "AVAILABLE").length} / {tables.length} Available
                </Badge>
              </div>

              {/* Floor Table Cards Redesign */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {tables.map((table) => {
                  const isSelected = selectedTable?.id === table.id;
                  const ongoingOrder = orders.find(
                    (o) => o.tableId === table.id && o.status !== "COMPLETED" && o.status !== "CANCELLED"
                  );
                  const isOccupied = !!ongoingOrder || table.status !== "AVAILABLE";

                  return (
                    <div
                      key={table.id}
                      className={`p-4 rounded-2xl border-2 transition-all space-y-3 relative flex flex-col justify-between ${
                        isSelected
                          ? "bg-primary/10 border-primary shadow-md ring-2 ring-primary/20"
                          : isOccupied
                          ? "bg-amber-500/5 border-amber-500/30"
                          : "bg-card border-border hover:border-primary/40"
                      }`}
                    >
                      {/* Top Header */}
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] font-bold text-muted-foreground block uppercase">
                            Table Number
                          </span>
                          <h4 className="text-2xl font-black text-foreground">
                            #{(table as any).number || table.id.replace("t", "")}
                          </h4>
                        </div>

                        <div className="flex flex-col items-end gap-1">
                          <Badge
                            className={`text-[9px] font-black uppercase ${
                              isOccupied
                                ? "bg-amber-500 text-amber-950"
                                : "bg-emerald-500 text-white"
                            }`}
                          >
                            {isOccupied ? "Occupied" : "Free"}
                          </Badge>
                          {table.capacity && (
                            <span className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                              <Users className="h-3 w-3" /> {table.capacity} Seats
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Middle Status Content */}
                      {ongoingOrder ? (
                        <div className="bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl text-xs space-y-1">
                          <div className="flex justify-between font-bold text-amber-800 dark:text-amber-300">
                            <span>Ticket #{ongoingOrder.id.slice(-5).toUpperCase()}</span>
                            <span>{formatETB(ongoingOrder.total)}</span>
                          </div>
                          <div className="text-[10px] text-muted-foreground flex justify-between">
                            <span>Items: {ongoingOrder.items?.length || 0}</span>
                            <span className="font-semibold text-amber-600 dark:text-amber-400">
                              Status: {ongoingOrder.status}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-xl text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                          Ready for Guest Order
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="grid grid-cols-2 gap-2 pt-1 border-t">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setViewingTableDetails(table)}
                          className="h-8 rounded-xl text-[11px] font-bold gap-1 text-muted-foreground hover:text-foreground"
                        >
                          <Eye className="h-3.5 w-3.5" /> Details
                        </Button>

                        {isOccupied ? (
                          <Button
                            size="sm"
                            onClick={() => handleSelectTable(table)}
                            className="h-8 rounded-xl text-[11px] font-bold bg-amber-600 hover:bg-amber-700 text-white"
                          >
                            + Addons
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleSelectTable(table)}
                            className="h-8 rounded-xl text-[11px] font-bold bg-primary text-primary-foreground"
                          >
                            Start Order
                          </Button>
                        )}
                      </div>

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
                    className="h-8 text-xs font-bold rounded-xl gap-1 text-muted-foreground hover:text-foreground"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" /> Change Table
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
                    onChange={(e: any) => setSearchQuery(e.target.value)}
                    className="pl-8 text-xs h-8 rounded-xl bg-muted/30"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Category Filter Pills */}
              <div className="flex gap-1.5 overflow-x-auto text-xs pb-1 scrollbar-none">
                <button
                  onClick={() => setActiveCategory("All")}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap border transition-all ${
                    activeCategory === "All"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/30 border-transparent text-muted-foreground hover:bg-muted"
                  }`}
                >
                  All ({menu.length})
                </button>
                {categories.map((c) => {
                  const catCount = menu.filter((m) => m.category === c.name).length;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setActiveCategory(c.name)}
                      className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap border transition-all ${
                        activeCategory === c.name
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted/30 border-transparent text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {c.name} ({catCount})
                    </button>
                  );
                })}
              </div>

              {/* Menu Dishes Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[520px] overflow-y-auto pr-1">
                {menu
                  .filter((item) => {
                    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
                    const matchesCat = activeCategory === "All" || item.category === activeCategory;
                    return matchesSearch && matchesCat && item.available !== false;
                  })
                  .map((item) => {
                    const hasAddons = item.customAddons && item.customAddons.length > 0;
                    
                    // Count how many of this dish are in current cart
                    const inCartCount = cartItems
                      .filter((c) => c.menuItemId === item.id)
                      .reduce((sum, c) => sum + c.quantity, 0);

                    return (
                      <div
                        key={item.id}
                        className="p-3 rounded-2xl border bg-card hover:bg-muted/20 transition-all flex items-center justify-between space-x-2 relative"
                      >
                        {inCartCount > 0 && (
                          <div className="absolute top-2 right-2 bg-primary text-primary-foreground font-black text-[9px] px-2 py-0.5 rounded-full shadow-sm">
                            {inCartCount} in ticket
                          </div>
                        )}

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
                              <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 block mt-0.5">
                                ✨ {item.customAddons?.length} Custom Addons
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

        {/* Right Column: Persistent Side Ticket Summary */}
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

              {/* Table Mode Indicator */}
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
                        New Order Mode
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
                    <p className="font-bold">Order ticket is empty</p>
                    <p className="text-[11px] opacity-70">Select dishes from the catalog to build ticket.</p>
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
                  : `Confirm & Place Order (${formatETB(grandTotal)})`}
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

      {/* TABLE DETAILS MODAL */}
      {viewingTableDetails && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-card border rounded-2xl shadow-xl max-w-lg w-full p-5 space-y-4 relative max-h-[85vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b pb-3">
              <div>
                <h3 className="font-black text-lg flex items-center gap-2">
                  <span>Table #{(viewingTableDetails as any).number || viewingTableDetails.id.replace("t", "")} Details</span>
                </h3>
                <p className="text-xs text-muted-foreground">
                  Capacity: {viewingTableDetails.capacity || 4} Seats • Location: Main Dining Hall
                </p>
              </div>
              <button onClick={() => setViewingTableDetails(null)} className="p-1 text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Table Details Content */}
            {activeOrderForViewingTable ? (
              <div className="space-y-3">
                
                {/* Active Session Summary */}
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-black text-amber-800 dark:text-amber-300">
                      Ongoing Ticket #{activeOrderForViewingTable.id.slice(-6).toUpperCase()}
                    </span>
                    <Badge className="bg-amber-500 text-amber-950 font-bold uppercase text-[10px]">
                      {activeOrderForViewingTable.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-muted-foreground text-[11px] pt-1 border-t border-amber-500/20">
                    <div>Type: DINE-IN</div>
                    <div>Payment: {activeOrderForViewingTable.paymentStatus}</div>
                    <div>Created: {new Date(activeOrderForViewingTable.createdAt).toLocaleTimeString()}</div>
                    <div className="font-bold text-foreground">
                      Total: {formatETB(activeOrderForViewingTable.total)}
                    </div>
                  </div>
                </div>

                {/* Ordered Items Breakdown */}
                <div className="space-y-2">
                  <h4 className="font-black text-xs uppercase text-muted-foreground">Ordered Items & Addons</h4>
                  
                  <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                    {activeOrderForViewingTable.items?.map((item: any, idx: number) => (
                      <div key={item.id || idx} className="p-2.5 rounded-xl bg-muted/40 border text-xs space-y-1">
                        <div className="flex justify-between font-bold">
                          <span>{item.quantity}x {item.name}</span>
                          <span className="text-primary">{formatETB(item.price * item.quantity)}</span>
                        </div>

                        {item.selectedAddons && item.selectedAddons.length > 0 && (
                          <div className="text-[10px] text-muted-foreground flex flex-wrap gap-1">
                            <span>Addons:</span>
                            {item.selectedAddons.map((a: any, aIdx: number) => (
                              <Badge key={aIdx} variant="outline" className="text-[9px] px-1 py-0">
                                {typeof a === "string" ? a : a.name}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {item.specialInstructions && (
                          <div className="text-[10px] text-amber-600 dark:text-amber-400 italic">
                            "{item.specialInstructions}"
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Modal Quick Actions */}
                <div className="grid grid-cols-2 gap-2 pt-3 border-t">
                  <Button
                    onClick={() => {
                      const t = viewingTableDetails;
                      setViewingTableDetails(null);
                      handleSelectTable(t);
                    }}
                    className="h-10 rounded-xl font-black text-xs bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    + Add Items / Addons
                  </Button>

                  <Button
                    onClick={() => {
                      const ord = activeOrderForViewingTable;
                      setViewingTableDetails(null);
                      setSelectedOrderForPayment(ord);
                    }}
                    className="h-10 rounded-xl font-black text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                  >
                    <CreditCard className="h-4 w-4" /> Settle Bill ({formatETB(activeOrderForViewingTable.total)})
                  </Button>
                </div>

              </div>
            ) : (
              <div className="space-y-4 py-3 text-center">
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-700 dark:text-emerald-300 text-xs space-y-1">
                  <p className="font-bold text-sm">Table is Available</p>
                  <p className="opacity-80">This table currently has no ongoing active ticket. Ready for new guests.</p>
                </div>

                <Button
                  onClick={() => {
                    const t = viewingTableDetails;
                    setViewingTableDetails(null);
                    handleSelectTable(t);
                  }}
                  className="w-full h-11 rounded-xl font-black text-xs bg-primary text-primary-foreground shadow-md"
                >
                  🚀 Select Table & Start New Order
                </Button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Dish Addon & Presets Configuration Modal */}
      {configuringDish && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border rounded-2xl shadow-xl max-w-md w-full p-5 space-y-4 relative">
            
            <div className="flex items-start justify-between border-b pb-2">
              <div>
                <h3 className="font-black text-base">{configuringDish.name}</h3>
                <span className="text-xs text-primary font-bold">{formatETB(configuringDish.price)} Base Price</span>
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

            {/* Special Instructions & Presets */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-muted-foreground uppercase">Kitchen Special Notes</span>
              
              <div className="flex flex-wrap gap-1">
                {KITCHEN_NOTE_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => handleAddPresetNote(preset)}
                    className="px-2.5 py-1 rounded-lg bg-muted text-[10px] font-bold text-muted-foreground hover:text-foreground hover:bg-primary/15 transition-all"
                  >
                    + {preset}
                  </button>
                ))}
              </div>

              <Textarea
                placeholder="Type kitchen instructions or select presets above..."
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
