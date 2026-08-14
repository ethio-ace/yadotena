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
  ArrowLeft, Sparkles, ChevronRight, Users, Utensils, Zap
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

// Helper to determine if an item is a retail shop store product
export const isShopProductItem = (item: MenuItem): boolean => {
  const cat = (item.category || "").toLowerCase();
  const catId = item.categoryId || "";
  return (
    item.id.startsWith("shop-") ||
    catId.startsWith("cat-shop") ||
    cat.includes("shop") ||
    cat.includes("dairy") ||
    cat.includes("butter") ||
    cat.includes("coffee") ||
    cat.includes("honey") ||
    cat.includes("spice") ||
    cat.includes("bakery") ||
    cat.includes("retail")
  );
};

export default function WaiterDashboardPage() {
  const queryClient = useQueryClient();

  // POS Flow Mode: MENU (Restaurant Table Flow) vs SHOP (Retail Counter Flow - No Table Needed)
  const [posFlow, setPosFlow] = useState<"MENU" | "SHOP">("MENU");

  // Menu Flow Wizard state: 1 = Table Selection, 2 = Menu Dishes Selection
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);

  // Category & Search State
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Table Inspection Modal
  const [viewingTableDetails, setViewingTableDetails] = useState<Table | null>(null);

  // Ticket Cart State
  const [cartItems, setCartItems] = useState<WaiterCartItem[]>([]);

  // Customization Modal State
  const [configuringDish, setConfiguringDish] = useState<MenuItem | null>(null);
  const [modalAddons, setModalAddons] = useState<MenuItemAddon[]>([]);
  const [modalNote, setModalNote] = useState<string>("");
  const [modalQty, setModalQty] = useState<number>(1);

  // Settlement Modal State
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState<Order | null>(null);

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

  // Identify active order for selected table in MENU flow
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
    onSuccess: (newOrder) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["tables"] });
      setCartItems([]);

      if (posFlow === "SHOP") {
        // Automatically open settlement modal for quick retail counter checkout
        setSelectedOrderForPayment(newOrder);
      } else {
        setCurrentStep(1);
      }
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

  // Flow Navigation Handlers
  const handleSelectTable = (table: Table) => {
    setSelectedTable(table);
    setCurrentStep(2);
  };

  const switchPosFlow = (flow: "MENU" | "SHOP") => {
    setPosFlow(flow);
    setActiveCategory("All");
    setSearchQuery("");
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
    soundAlerts.playActionPing();
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

  // Order Submission Handler
  const handleConfirmOrder = () => {
    if (cartItems.length === 0) return alert("Add items to the order ticket first.");

    const itemsPayload = cartItems.map((item) => ({
      menuItemId: item.menuItemId,
      quantity: item.quantity,
      qty: item.quantity,
      specialInstructions: item.specialInstructions,
      notes: item.specialInstructions,
      selectedAddons: item.selectedAddons,
      addons: item.selectedAddons,
    }));

    if (posFlow === "SHOP") {
      // RETAIL SHOP FLOW: Counter sale, NO table required!
      createOrderMutation.mutate({
        type: "TAKEAWAY",
        status: "COMPLETED",
        paymentStatus: "PAID",
        items: itemsPayload as any,
        idempotencyKey: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
      });
    } else {
      // RESTAURANT MENU FLOW: Table order, table selection required!
      if (!selectedTable) return alert("Please select a floor table first for restaurant orders.");

      if (activeOrderForTable) {
        appendItemsMutation.mutate({
          id: activeOrderForTable.id,
          items: itemsPayload,
        });
      } else {
        createOrderMutation.mutate({
          type: "DINE_IN",
          status: "PENDING",
          paymentStatus: "PENDING",
          tableId: selectedTable.id,
          items: itemsPayload as any,
        });
      }
    }
  };

  // Calculations
  const getItemUnitPrice = (item: WaiterCartItem) => {
    const addonsSum = item.selectedAddons.reduce((acc, a) => acc + (a.price || 0), 0);
    return item.basePrice + addonsSum;
  };

  const subtotal = cartItems.reduce((acc, i) => acc + getItemUnitPrice(i) * i.quantity, 0);
  const tax = subtotal * 0.15;
  const service = posFlow === "MENU" ? subtotal * 0.10 : 0;
  const grandTotal = subtotal + tax + service;

  // Filter items for active flow
  const restaurantDishes = menu.filter((m) => !isShopProductItem(m));
  const retailShopProducts = menu.filter((m) => isShopProductItem(m));

  // Food Ready Orders
  const readyOrders = orders.filter((o) => o.status === "READY");

  return (
    <div className="space-y-4 animate-in fade-in duration-200 pb-24">
      
      {/* Ready Orders Alert Strip */}
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

      {/* POS FLOW SELECTOR BAR (Restaurant Menu vs Retail Shop) */}
      <div className="bg-card border p-2.5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => switchPosFlow("MENU")}
            className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center gap-2 border ${
              posFlow === "MENU"
                ? "bg-primary text-primary-foreground border-primary shadow-sm scale-102"
                : "bg-muted/40 border-transparent text-muted-foreground hover:bg-muted"
            }`}
          >
            <Utensils className="h-4 w-4" />
            <span>🍽️ Restaurant Menu POS (Table Required)</span>
          </button>

          <button
            onClick={() => switchPosFlow("SHOP")}
            className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center gap-2 border ${
              posFlow === "SHOP"
                ? "bg-emerald-600 text-white border-emerald-600 shadow-sm scale-102"
                : "bg-muted/40 border-transparent text-muted-foreground hover:bg-muted"
            }`}
          >
            <ShoppingBag className="h-4 w-4" />
            <span>🛒 Retail Shop Store POS (No Table Needed)</span>
          </button>
        </div>

        <Badge variant="outline" className="font-bold text-xs px-3 py-1 bg-muted/30">
          {posFlow === "MENU" ? (
            selectedTable ? `Active Table: #${selectedTable.id.replace("t", "")}` : "Select Table Below"
          ) : (
            "⚡ Direct Counter Sale Mode"
          )}
        </Badge>
      </div>

      {/* STEPPER BAR (Only shown in Restaurant Menu Flow) */}
      {posFlow === "MENU" && (
        <div className="bg-card border p-3 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentStep(1)}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 border ${
                currentStep === 1
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-muted/40 border-transparent text-muted-foreground hover:bg-muted"
              }`}
            >
              <span className="h-4 w-4 rounded-full bg-background/20 flex items-center justify-center text-[10px] font-bold">
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
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 border ${
                currentStep === 2
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : selectedTable
                  ? "bg-muted/40 border-transparent text-foreground hover:bg-muted"
                  : "bg-muted/20 border-transparent text-muted-foreground/40 cursor-not-allowed"
              }`}
            >
              <span className="h-4 w-4 rounded-full bg-background/20 flex items-center justify-center text-[10px] font-bold">
                2
              </span>
              <span>Step 2: Restaurant Dishes & Addons</span>
            </button>
          </div>

          {selectedTable && (
            <div className="flex items-center gap-2 text-xs font-bold bg-muted/50 px-3 py-1.5 rounded-xl border">
              <span className="text-muted-foreground">Active Table:</span>
              <span className="font-black text-foreground text-sm">
                Table #{selectedTable.id.replace("t", "")}
              </span>
              {activeOrderForTable ? (
                <Badge className="bg-primary/20 text-primary border border-primary/30 text-[10px] font-bold px-2 py-0.5">
                  Appending Session
                </Badge>
              ) : (
                <Badge className="bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5">
                  New Ticket
                </Badge>
              )}
            </div>
          )}
        </div>
      )}

      {/* MAIN POS LAYOUT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* LEFT COLUMN: Catalog / Table Grid */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* FLOW A: RESTAURANT MENU FLOW -> STEP 1: FLOOR TABLE GRID */}
          {posFlow === "MENU" && currentStep === 1 && (
            <Card className="rounded-2xl border shadow-sm p-5 space-y-4 bg-card">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h3 className="font-black text-base">Select Floor Dining Table</h3>
                  <p className="text-xs text-muted-foreground">
                    Click an available table to take order, or occupied table to view session.
                  </p>
                </div>

                <Badge variant="outline" className="font-bold text-xs px-2.5 py-1">
                  {tables.filter((t) => t.status === "AVAILABLE").length} / {tables.length} Available
                </Badge>
              </div>

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

          {/* FLOW A (Step 2) OR FLOW B (Retail Shop Store): CATALOG DISPLAY */}
          {((posFlow === "MENU" && currentStep === 2) || posFlow === "SHOP") && (
            <Card className="rounded-2xl border shadow-sm p-5 space-y-4 bg-card">
              
              {/* Header & Search Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
                <div className="flex items-center gap-2">
                  {posFlow === "MENU" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setCurrentStep(1)}
                      className="h-9 text-xs font-bold rounded-xl gap-1 text-muted-foreground hover:text-foreground border"
                    >
                      <ArrowLeft className="h-4 w-4" /> Change Table
                    </Button>
                  )}
                  <h3 className="font-black text-base">
                    {posFlow === "MENU" 
                      ? `Restaurant Menu Dishes ${selectedTable ? `(Table #${selectedTable.id.replace("t", "")})` : ""}`
                      : "🛒 Retail Shop Store Catalog (Direct Counter Sale)"}
                  </h3>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={posFlow === "MENU" ? "Search dishes..." : "Search milk, butter, coffee..."}
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

              {/* Dynamic Category Filter Bar */}
              <div className="flex gap-2 overflow-x-auto text-xs pb-1 scrollbar-none">
                <button
                  onClick={() => setActiveCategory("All")}
                  className={`px-4 py-2 rounded-xl font-extrabold whitespace-nowrap border transition-all ${
                    activeCategory === "All"
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-card border-muted text-muted-foreground hover:bg-muted"
                  }`}
                >
                  All {posFlow === "MENU" ? "Dishes" : "Products"} ({posFlow === "MENU" ? restaurantDishes.length : retailShopProducts.length})
                </button>

                {posFlow === "MENU" && (
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
                    return posFlow === "SHOP" ? isShopCat : !isShopCat;
                  })
                  .map((c) => {
                    const itemsInCat = (posFlow === "MENU" ? restaurantDishes : retailShopProducts).filter(
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
                        {c.icon || (posFlow === "SHOP" ? "🛒" : "🥘")} {c.name} ({itemsInCat.length})
                      </button>
                    );
                  })}
              </div>

              {/* Items Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[580px] overflow-y-auto pr-1">
                {activeCategory === "✨ Standalone Add-ons" && posFlow === "MENU" ? (
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

                          <div className="pt-2 border-t">
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
                        </div>
                      );
                    })
                ) : (
                  (posFlow === "MENU" ? restaurantDishes : retailShopProducts)
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
                          className="p-4 rounded-2xl border bg-card hover:border-primary/40 transition-all flex flex-col justify-between space-y-3 relative shadow-sm hover:shadow-md"
                        >
                          {inCartCount > 0 && (
                            <div className="absolute top-3 right-3 bg-primary text-primary-foreground font-black text-[10px] px-2 py-0.5 rounded-full shadow-md z-10 animate-pulse">
                              {inCartCount} IN TICKET
                            </div>
                          )}

                          <div className="flex gap-3.5 items-start">
                            <img
                              src={getImageUrl(item.image)}
                              alt={item.name}
                              className="h-20 w-20 rounded-2xl object-cover border shrink-0 shadow-sm"
                            />
                            <div className="min-w-0 space-y-1">
                              <Badge variant="outline" className="text-[9px] font-bold uppercase text-muted-foreground">
                                {posFlow === "SHOP" ? "🛒 Retail Product" : (item.category || "Main Dish")}
                              </Badge>
                              <h4 className="font-bold text-sm text-foreground leading-snug line-clamp-2">
                                {item.name}
                              </h4>
                              <span className="font-black text-base text-primary block">
                                {formatETB(item.price)}
                              </span>
                              {hasAddons && posFlow === "MENU" && (
                                <span className="text-[10px] font-bold text-primary/80 block">
                                  ✨ {applicableAddons.length} Options Available
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="pt-2 border-t flex gap-2">
                            {hasAddons && posFlow === "MENU" ? (
                              <Button
                                size="sm"
                                onClick={() => openDishModal(item)}
                                className="w-full h-9 text-xs font-bold rounded-xl bg-primary text-primary-foreground gap-1 shadow-sm"
                              >
                                <Sparkles className="h-3.5 w-3.5" /> Customize & Add
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => quickAddItem(item)}
                                className="w-full h-9 text-xs font-bold rounded-xl bg-primary text-primary-foreground gap-1 shadow-sm"
                              >
                                <Plus className="h-4 w-4" /> Quick Add
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </Card>
          )}

        </div>

        {/* RIGHT COLUMN: PERSISTENT ORDER TICKET DISPLAY */}
        <div className="lg:col-span-4 space-y-3">
          
          <Card className="rounded-2xl border shadow-sm p-4 space-y-3 bg-card flex flex-col justify-between min-h-[500px]">
            
            <div>
              <div className="flex items-center justify-between border-b pb-2.5">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4 text-primary" />
                  <h3 className="font-black text-sm">
                    {posFlow === "MENU" ? "Selected Table Order Ticket" : "🛒 Retail Counter Ticket"}
                  </h3>
                </div>

                {selectedTable && posFlow === "MENU" && (
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

              {/* Mode Specific Ticket Context Header */}
              <div className="mt-3 p-2.5 rounded-xl bg-muted/40 border text-xs space-y-1">
                {posFlow === "MENU" ? (
                  selectedTable ? (
                    <div className="flex items-center justify-between font-bold">
                      <span>Table #{selectedTable.id.replace("t", "")}</span>
                      {activeOrderForTable ? (
                        <Badge className="bg-primary/20 text-primary border border-primary/30 text-[9px] font-bold">
                          Appending to Order #{activeOrderForTable.id.slice(-5).toUpperCase()}
                        </Badge>
                      ) : (
                        <Badge className="bg-primary text-primary-foreground text-[9px] font-bold">
                          New Table Ticket
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground italic font-medium">Select a table in Step 1 to place order.</span>
                  )
                ) : (
                  <div className="flex items-center justify-between font-bold text-emerald-600 dark:text-emerald-400">
                    <span className="flex items-center gap-1.5">
                      <Zap className="h-3.5 w-3.5 fill-current" /> Direct Retail Counter Sale
                    </span>
                    <Badge className="bg-emerald-500 text-white text-[9px] font-bold">
                      No Table Required
                    </Badge>
                  </div>
                )}
              </div>

              {/* Cart Items List */}
              <div className="mt-3 space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {cartItems.length === 0 ? (
                  <div className="py-10 text-center text-xs text-muted-foreground border border-dashed rounded-xl space-y-1">
                    <p className="font-bold">Ticket is empty</p>
                    <p className="text-[11px] opacity-70">
                      {posFlow === "MENU" ? "Select dishes to build table order." : "Click retail products to build counter ticket."}
                    </p>
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

            {/* Calculations & Order Confirmation */}
            <div className="pt-3 border-t space-y-2.5">
              <div className="space-y-1 text-xs text-muted-foreground font-semibold">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatETB(subtotal)}</span>
                </div>
                {posFlow === "MENU" && (
                  <div className="flex justify-between text-[11px]">
                    <span>Service Charge (10%)</span>
                    <span>{formatETB(service)}</span>
                  </div>
                )}
                <div className="flex justify-between text-foreground font-black text-sm pt-1 border-t">
                  <span>Total</span>
                  <span className="text-primary">{formatETB(grandTotal)}</span>
                </div>
              </div>

              <Button
                onClick={handleConfirmOrder}
                disabled={
                  (posFlow === "MENU" && !selectedTable) ||
                  cartItems.length === 0 ||
                  createOrderMutation.isPending ||
                  appendItemsMutation.isPending
                }
                className={`w-full h-11 rounded-xl font-black text-xs ${
                  posFlow === "SHOP" 
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-md" 
                    : "bg-primary hover:bg-primary/90 text-primary-foreground shadow-md"
                }`}
              >
                {createOrderMutation.isPending || appendItemsMutation.isPending
                  ? "Submitting Order..."
                  : posFlow === "SHOP"
                  ? `⚡ Complete Counter Sale (${formatETB(grandTotal)})`
                  : activeOrderForTable
                  ? `Append to Table #${selectedTable?.id.replace("t", "")} (${formatETB(grandTotal)})`
                  : `Confirm Table #${selectedTable?.id.replace("t", "")} Ticket (${formatETB(grandTotal)})`}
              </Button>

              {activeOrderForTable && posFlow === "MENU" && (
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

      {/* TABLE DETAILS / OPERATIONS MODAL (Occupied Table inspection) */}
      {viewingTableDetails && activeOrderForViewingTable && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-card border rounded-2xl shadow-xl max-w-lg w-full p-5 space-y-4 relative max-h-[85vh] overflow-y-auto">
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
                    </div>
                  ))}
                </div>
              </div>

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

      {/* DISH CUSTOMIZATION MODAL */}
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

      {/* BILL SETTLEMENT MODAL */}
      <PaymentSettlementModal
        order={selectedOrderForPayment}
        isOpen={!!selectedOrderForPayment}
        onClose={() => setSelectedOrderForPayment(null)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["orders"] });
          queryClient.invalidateQueries({ queryKey: ["tables"] });
        }}
      />

      {/* FLOATING QUICK BAR FOR MOBILE */}
      {cartItems.length > 0 && (
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
                (posFlow === "MENU" && !selectedTable) ||
                createOrderMutation.isPending ||
                appendItemsMutation.isPending
              }
              className={`flex-1 h-11 rounded-xl font-black text-xs shadow-md gap-1 ${
                posFlow === "SHOP" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-primary text-primary-foreground"
              }`}
            >
              {createOrderMutation.isPending || appendItemsMutation.isPending
                ? "Submitting..."
                : posFlow === "SHOP"
                ? `⚡ Complete Counter Sale (${formatETB(grandTotal)})`
                : activeOrderForTable
                ? `Append Table #${selectedTable?.id.replace("t", "")}`
                : `Submit Table #${selectedTable?.id.replace("t", "")}`}
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={() => setCartItems([])}
              className="h-11 w-11 rounded-xl text-destructive hover:bg-destructive/10 shrink-0"
              title="Clear Ticket"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

    </div>
  );
}
