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
  ArrowLeft, Sparkles, ChevronRight, Users
} from "lucide-react";
import { PaymentSettlementModal } from "@/components/PaymentSettlementModal";
import { Order, MenuItem, MenuItemAddon, Table, AddonItem } from "@/types";
import { getApplicableAddonsForItem } from "@/lib/orderUtils";
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

export default function WaiterDashboardPage() {
  const queryClient = useQueryClient();

  // Wizard state: 1 = Table Floor selection, 2 = Menu item selection
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Table Details Inspection Modal (for occupied sessions)
  const [viewingTableDetails, setViewingTableDetails] = useState<Table | null>(null);

  // Cart state
  const [cartItems, setCartItems] = useState<WaiterCartItem[]>([]);

  // Dish customization modal state
  const [configuringDish, setConfiguringDish] = useState<MenuItem | null>(null);
  const [modalAddons, setModalAddons] = useState<MenuItemAddon[]>([]);
  const [modalNote, setModalNote] = useState<string>("");
  const [modalQty, setModalQty] = useState<number>(1);

  // Payment Settlement Modal
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState<Order | null>(null);

  // Queries
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
    },
  });

  // Navigation handlers
  const handleSelectTable = (table: Table) => {
    setSelectedTable(table);
    setCurrentStep(2);
  };

  const handleBackToTables = () => {
    setCurrentStep(1);
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
    const applicableAddons = getApplicableAddonsForItem(item, allAddons);
    if (applicableAddons.length > 0) {
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

  // Food Ready Orders
  const readyOrders = orders.filter((o) => o.status === "READY");

  return (
    <div className="space-y-4 animate-in fade-in duration-200 pb-20">
      
      {/* Ready Counter Notification Strip */}
      {readyOrders.length > 0 && (
        <div className="bg-primary/10 border border-primary/30 p-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2.5 text-xs font-bold text-primary">
            <span className="h-2.5 w-2.5 rounded-full bg-primary animate-ping" />
            <span>{readyOrders.length} Order(s) Ready for Table Delivery:</span>
            {readyOrders.map((o) => (
              <Badge key={o.id} className="bg-primary text-primary-foreground text-[10px] font-mono px-2 py-0.5">
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
                className="h-8 rounded-xl text-[11px] font-bold bg-primary hover:bg-primary/90 text-primary-foreground gap-1 px-3"
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
            className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 border ${
              currentStep === 1
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-muted/40 border-transparent text-muted-foreground hover:bg-muted"
            }`}
          >
            <span className="h-5 w-5 rounded-full bg-background/20 flex items-center justify-center text-[10px] font-bold">
              1
            </span>
            <span>Step 1: Select Floor Table</span>
          </button>

          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />

          <button
            onClick={() => {
              if (selectedTable) setCurrentStep(2);
            }}
            disabled={!selectedTable}
            className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 border ${
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
            <span>Step 2: Menus & Operations</span>
          </button>

        </div>

        {/* Selected Table Active Badge */}
        {selectedTable && (
          <div className="flex items-center gap-2 text-xs font-bold bg-muted/50 px-3.5 py-2 rounded-xl border">
            <span className="text-muted-foreground">Active Table:</span>
            <span className="font-black text-foreground text-sm">
              Table #{selectedTable.id.replace("t", "")}
            </span>
            {activeOrderForTable ? (
              <Badge className="bg-primary/20 text-primary border border-primary/30 text-[10px] font-black px-2 py-0.5">
                Ongoing Session (Append Mode)
              </Badge>
            ) : (
              <Badge className="bg-primary text-primary-foreground text-[10px] font-black px-2 py-0.5">
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
          
          {/* STEP 1: CLICK FLOOR TABLE GRID */}
          {currentStep === 1 && (
            <Card className="rounded-2xl border shadow-sm p-5 space-y-4 bg-card">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h3 className="font-black text-base">Select Floor Table</h3>
                  <p className="text-xs text-muted-foreground">
                    Click available tables to order directly, or occupied tables to view active session details.
                  </p>
                </div>

                <Badge variant="outline" className="font-bold text-xs px-2.5 py-1">
                  {tables.filter((t) => t.status === "AVAILABLE").length} / {tables.length} Available
                </Badge>
              </div>

              {/* Direct Click Table Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
                {tables.map((table) => {
                  const isSelected = selectedTable?.id === table.id;
                  const ongoingOrder = orders.find(
                    (o) => o.tableId === table.id && o.status !== "COMPLETED" && o.status !== "CANCELLED"
                  );
                  const isOccupied = !!ongoingOrder || table.status !== "AVAILABLE";

                  return (
                    <div
                      key={table.id}
                      onClick={() => {
                        if (isOccupied) {
                          setViewingTableDetails(table);
                        } else {
                          handleSelectTable(table);
                        }
                      }}
                      className={`p-4 rounded-2xl border-2 transition-all cursor-pointer space-y-3 relative flex flex-col justify-between hover:scale-[1.02] shadow-sm ${
                        isSelected
                          ? "bg-primary/10 border-primary shadow-md ring-2 ring-primary/30"
                          : isOccupied
                          ? "bg-primary/10 border-primary/40 hover:border-primary"
                          : "bg-card border-border hover:border-primary/50 hover:bg-primary/5"
                      }`}
                    >
                      {/* Top Table Info */}
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] font-bold text-muted-foreground block uppercase tracking-wider">
                            Table
                          </span>
                          <h4 className="text-2xl font-black text-foreground">
                            #{(table as any).number || table.id.replace("t", "")}
                          </h4>
                        </div>

                        <Badge
                          className={`text-[9px] font-black uppercase px-2 py-0.5 ${
                            isOccupied
                              ? "bg-primary/20 text-primary border border-primary/30"
                              : "bg-muted text-muted-foreground border"
                          }`}
                        >
                          {isOccupied ? "Occupied" : "Free"}
                        </Badge>
                      </div>

                      {/* Seat Count & Session Status */}
                      <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[11px] font-bold text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5 text-primary" /> {table.capacity || 4} Seats
                        </span>

                        {ongoingOrder ? (
                          <span className="text-primary font-black">
                            {formatETB(ongoingOrder.total)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground font-bold">
                            Available
                          </span>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* STEP 2: HIGH-VISIBILITY MENU CATALOG */}
          {currentStep === 2 && (
            <Card className="rounded-2xl border shadow-sm p-5 space-y-4 bg-card">
              
              {/* Header & Search */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setCurrentStep(1)}
                    className="h-9 text-xs font-bold rounded-xl gap-1 text-muted-foreground hover:text-foreground border"
                  >
                    <ArrowLeft className="h-4 w-4" /> Change Table
                  </Button>
                  <h3 className="font-black text-base">
                    Menu Items {selectedTable && `(Table #${selectedTable.id.replace("t", "")})`}
                  </h3>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search food & drinks..."
                    value={searchQuery}
                    onChange={(e: any) => setSearchQuery(e.target.value)}
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

              {/* Large Touch Category Filter Tabs */}
              <div className="flex gap-2 overflow-x-auto text-xs pb-1 scrollbar-none">
                <button
                  onClick={() => setActiveCategory("All")}
                  className={`px-4 py-2 rounded-xl font-black whitespace-nowrap border transition-all ${
                    activeCategory === "All"
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-muted/40 border-transparent text-muted-foreground hover:bg-muted"
                  }`}
                >
                  All Items ({menu.length})
                </button>

                <button
                  onClick={() => setActiveCategory("✨ Standalone Add-ons")}
                  className={`px-4 py-2 rounded-xl font-black whitespace-nowrap border transition-all ${
                    activeCategory === "✨ Standalone Add-ons"
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-muted/40 border-transparent text-muted-foreground hover:bg-muted"
                  }`}
                >
                  ✨ Standalone Add-ons ({allAddons.length})
                </button>

                {categories.map((c) => {
                  const catCount = menu.filter((m) => m.category === c.name).length;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setActiveCategory(c.name)}
                      className={`px-4 py-2 rounded-xl font-black whitespace-nowrap border transition-all ${
                        activeCategory === c.name
                          ? "bg-primary text-primary-foreground border-primary shadow-sm"
                          : "bg-muted/40 border-transparent text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {c.name} ({catCount})
                    </button>
                  );
                })}
              </div>

              {/* High-Visibility Larger Dish & Addon Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[580px] overflow-y-auto pr-1">
                {activeCategory === "✨ Standalone Add-ons" ? (
                  allAddons
                    .filter((addon) => {
                      const matchesSearch = addon.name.toLowerCase().includes(searchQuery.toLowerCase()) || (addon.description || "").toLowerCase().includes(searchQuery.toLowerCase());
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
                            <div className="absolute top-3 right-3 bg-primary text-primary-foreground font-black text-[10px] px-2.5 py-1 rounded-full shadow-md z-10 animate-pulse">
                              {inCartCount} IN TICKET
                            </div>
                          )}

                          <div className="space-y-1">
                            <Badge className="bg-primary/10 text-primary border-primary/30 text-[9px] font-bold uppercase">
                              ✨ Standalone Add-on
                            </Badge>
                            <h4 className="font-black text-sm text-foreground leading-snug">
                              {addon.name}
                            </h4>
                            <span className="font-black text-base text-primary block">
                              {formatETB(addon.price)}
                            </span>
                            {addon.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1">{addon.description}</p>
                            )}
                          </div>

                          <div className="pt-2 border-t">
                            <Button
                              size="lg"
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
                              className="w-full h-10 text-xs font-black rounded-xl bg-primary text-primary-foreground gap-1.5 shadow-sm"
                            >
                              <Plus className="h-4 w-4" /> Add Standalone Extra
                            </Button>
                          </div>

                        </div>
                      );
                    })
                ) : (
                  menu
                    .filter((item) => {
                      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
                      const matchesCat = activeCategory === "All" || item.category === activeCategory;
                      return matchesSearch && matchesCat && item.available !== false;
                    })
                    .map((item) => {
                      const hasAddons = item.customAddons && item.customAddons.length > 0;
                      
                      const inCartCount = cartItems
                        .filter((c) => c.menuItemId === item.id)
                        .reduce((sum, c) => sum + c.quantity, 0);

                      return (
                        <div
                          key={item.id}
                          className="p-4 rounded-2xl border bg-card hover:border-primary/40 transition-all flex flex-col justify-between space-y-3 relative shadow-sm hover:shadow-md"
                        >
                          {inCartCount > 0 && (
                            <div className="absolute top-3 right-3 bg-primary text-primary-foreground font-black text-[10px] px-2.5 py-1 rounded-full shadow-md z-10 animate-pulse">
                              {inCartCount} IN TICKET
                            </div>
                          )}

                          <div className="flex gap-3.5 items-start">
                            <img
                              src={getImageUrl(item.image)}
                              alt={item.name}
                              className="h-24 w-24 rounded-2xl object-cover border shrink-0 shadow-sm"
                            />
                            <div className="min-w-0 space-y-1">
                              <Badge variant="outline" className="text-[9px] font-bold uppercase text-muted-foreground">
                                {item.category || "Main"}
                              </Badge>
                              <h4 className="font-black text-sm text-foreground leading-snug line-clamp-2">
                                {item.name}
                              </h4>
                              <span className="font-black text-base text-primary block">
                                {formatETB(item.price)}
                              </span>
                              {hasAddons && (
                                <span className="text-[10px] font-bold text-primary/80 block">
                                  ✨ {item.customAddons?.length} Options Available
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="pt-2 border-t flex gap-2">
                            {hasAddons && (
                              <Button
                                size="lg"
                                variant="outline"
                                onClick={() => openDishModal(item)}
                                className="flex-1 h-10 text-xs font-black rounded-xl text-primary border-primary/40 hover:bg-primary/10 gap-1.5"
                              >
                                <Sparkles className="h-3.5 w-3.5" /> Customize
                              </Button>
                            )}
                            <Button
                              size="lg"
                              onClick={() => quickAddItem(item)}
                              className="flex-1 h-10 text-xs font-black rounded-xl bg-primary text-primary-foreground gap-1.5 shadow-sm"
                            >
                              <Plus className="h-4 w-4" /> Quick Add Dish
                            </Button>
                          </div>

                        </div>
                      );
                    })
                )}
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
                      <Badge className="bg-primary/20 text-primary border border-primary/30 text-[9px] font-bold">
                        Appending to Order #{activeOrderForTable.id.slice(-5).toUpperCase()}
                      </Badge>
                    ) : (
                      <Badge className="bg-primary text-primary-foreground text-[9px] font-bold">
                        New Order Mode
                      </Badge>
                    )}
                  </div>
                ) : (
                  <span className="text-muted-foreground italic font-medium">No table selected yet. Click a table in Step 1.</span>
                )}
              </div>

              {/* Cart Item Display */}
              <div className="mt-3 space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {cartItems.length === 0 ? (
                  <div className="py-10 text-center text-xs text-muted-foreground border border-dashed rounded-xl space-y-1">
                    <p className="font-bold">Order ticket is empty</p>
                    <p className="text-[11px] opacity-70">Pick dishes from the catalog to build ticket.</p>
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
                          <div className="text-[10px] text-primary/90 italic">
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

                          <button onClick={() => removeCartItem(ci.cartItemId)} className="text-destructive hover:opacity-80 p-1">
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
                  className="w-full rounded-xl text-xs font-bold border-primary/40 text-primary hover:bg-primary/10 gap-1.5"
                >
                  <CreditCard className="h-3.5 w-3.5" /> Settle Table #{selectedTable?.id.replace("t", "")} Bill ({formatETB(activeOrderForTable.total)})
                </Button>
              )}
            </div>

          </Card>

        </div>

      </div>

      {/* TABLE DETAILS / OPERATIONS MODAL (For Occupied Sessions) */}
      {viewingTableDetails && activeOrderForViewingTable && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-card border rounded-2xl shadow-xl max-w-lg w-full p-5 space-y-4 relative max-h-[85vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b pb-3">
              <div>
                <h3 className="font-black text-lg flex items-center gap-2">
                  <span>Table #{(viewingTableDetails as any).number || viewingTableDetails.id.replace("t", "")} Operations</span>
                </h3>
                <p className="text-xs text-muted-foreground">
                  Capacity: {viewingTableDetails.capacity || 4} Seats • Ongoing Session Details
                </p>
              </div>
              <button onClick={() => setViewingTableDetails(null)} className="p-1 text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Active Session Summary */}
            <div className="space-y-3">
              <div className="p-3.5 bg-primary/10 border border-primary/30 rounded-xl space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-black text-primary text-sm">
                    Ongoing Ticket #{activeOrderForViewingTable.id.slice(-6).toUpperCase()}
                  </span>
                  <Badge className="bg-primary text-primary-foreground font-bold uppercase text-[10px] px-2 py-0.5">
                    {activeOrderForViewingTable.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-muted-foreground text-[11px] pt-1.5 border-t border-primary/20">
                  <div>Type: DINE-IN</div>
                  <div>Payment: {activeOrderForViewingTable.paymentStatus}</div>
                  <div>Created: {new Date(activeOrderForViewingTable.createdAt).toLocaleTimeString()}</div>
                  <div className="font-bold text-foreground">
                    Running Total: {formatETB(activeOrderForViewingTable.total)}
                  </div>
                </div>
              </div>

              {/* Ordered Items Breakdown */}
              <div className="space-y-2">
                <h4 className="font-black text-xs uppercase text-muted-foreground">Ordered Dishes & Addons</h4>
                
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
                        <div className="text-[10px] text-primary/90 italic">
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
                  className="h-11 rounded-xl font-black text-xs bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  + Add Items / Addons
                </Button>

                <Button
                  variant="outline"
                  onClick={() => {
                    const ord = activeOrderForViewingTable;
                    setViewingTableDetails(null);
                    setSelectedOrderForPayment(ord);
                  }}
                  className="h-11 rounded-xl font-black text-xs border-primary/40 text-primary hover:bg-primary/10 gap-1"
                >
                  <CreditCard className="h-4 w-4" /> Settle Bill ({formatETB(activeOrderForViewingTable.total)})
                </Button>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* Dish Addon & Presets Configuration Modal */}
      {configuringDish && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border rounded-2xl shadow-xl max-w-md w-full p-5 space-y-4 relative animate-in zoom-in-95 duration-200">
            
            <div className="flex items-start justify-between border-b pb-2">
              <div>
                <h3 className="font-black text-base">{configuringDish.name}</h3>
                <span className="text-xs text-primary font-bold">{formatETB(configuringDish.price)} Base Price</span>
              </div>
              <button onClick={() => setConfiguringDish(null)} className="p-1 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Resolved Addons Selection */}
            {(() => {
              const applicableAddons = getApplicableAddonsForItem(configuringDish, allAddons);

              if (applicableAddons.length === 0) {
                return (
                  <div className="p-3 bg-muted/30 rounded-xl border text-center text-xs text-muted-foreground font-medium">
                    No extra add-ons required for this dish. Standard recipe will be prepared.
                  </div>
                );
              }

              return (
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  <span className="text-xs font-bold text-muted-foreground uppercase block">
                    Available Add-ons (Global, Category & Item)
                  </span>
                  <div className="space-y-1.5">
                    {applicableAddons.map((addon) => {
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
                            selected 
                              ? "bg-primary/10 border-primary font-bold text-primary shadow-sm" 
                              : "bg-muted/30 border-transparent hover:bg-muted"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span>{addon.name}</span>
                            <Badge variant="outline" className="text-[9px] font-mono px-1 py-0 uppercase">
                              {addon.scope || "ITEM"}
                            </Badge>
                          </div>
                          <span className="text-primary font-bold">+ {formatETB(addon.price)}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

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

      {/* FLOATING STICKY ACTION BAR FOR MOBILE & QUICK TICKET SUBMISSION */}
      {cartItems.length > 0 && currentStep === 2 && (
        <div className="fixed bottom-4 left-3 right-3 sm:left-auto sm:right-6 sm:w-96 z-50 bg-card border-2 border-primary/60 shadow-2xl p-3.5 rounded-2xl animate-in slide-in-from-bottom-5 duration-200 backdrop-blur-md space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-black text-foreground flex items-center gap-1.5">
              <ShoppingBag className="h-4 w-4 text-primary" />
              <span>{cartItems.reduce((acc, i) => acc + i.quantity, 0)} Items Selected</span>
            </span>
            <span className="font-black text-primary text-sm">{formatETB(grandTotal)}</span>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleConfirmOrder}
              disabled={
                !selectedTable ||
                createOrderMutation.isPending ||
                appendItemsMutation.isPending
              }
              className="flex-1 h-11 rounded-xl font-black text-xs bg-primary text-primary-foreground shadow-md gap-1"
            >
              {createOrderMutation.isPending || appendItemsMutation.isPending
                ? "Submitting Ticket..."
                : activeOrderForTable
                ? `Append to Table #${selectedTable?.id.replace("t", "")}`
                : `Submit Table #${selectedTable?.id.replace("t", "")} Ticket`}
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={() => setCartItems([])}
              className="h-11 w-11 rounded-xl text-destructive hover:bg-destructive/10 shrink-0"
              title="Clear Order"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

    </div>
  );
}
