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
import { Search, Plus, Trash2, Check, CreditCard, X, ShoppingBag } from "lucide-react";
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
  const [selectedTableId, setSelectedTableId] = useState<string>("");
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [cartItems, setCartItems] = useState<WaiterCartItem[]>([]);
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState<Order | null>(null);

  // Addon Modal State
  const [configuringDish, setConfiguringDish] = useState<MenuItem | null>(null);
  const [modalAddons, setModalAddons] = useState<MenuItemAddon[]>([]);
  const [modalNote, setModalNote] = useState<string>("");
  const [modalQty, setModalQty] = useState<number>(1);

  // Data Queries
  const { data: tables = [] } = useQuery<Table[]>({
    queryKey: ["tables"],
    queryFn: api.tables.getAll,
    refetchInterval: 4000,
  });

  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ["orders"],
    queryFn: api.orders.getAll,
    refetchInterval: 4000,
  });

  const { data: menu = [] } = useQuery<MenuItem[]>({
    queryKey: ["menu"],
    queryFn: api.menu.getAll,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: api.categories.getAll,
  });

  // Selected table object & open active ticket for this table (if any)
  const currentTable = tables.find((t) => t.id === selectedTableId);
  const currentOpenOrder = orders.find(
    (o) => o.tableId === selectedTableId && o.status !== "COMPLETED" && o.status !== "CANCELLED"
  );

  // Order Mutations
  const createOrderMutation = useMutation({
    mutationFn: api.orders.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["tables"] });
      setCartItems([]);
    },
    onError: (err: any) => alert(err.message || "Order placement failed"),
  });

  const appendItemsMutation = useMutation({
    mutationFn: ({ id, items }: { id: string; items: any }) => api.orders.addItems(id, items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setCartItems([]);
    },
    onError: (err: any) => alert(err.message || "Failed to add items to ticket"),
  });

  const updateOrderStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: any }) => api.orders.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["tables"] });
    },
  });

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
      cartItemId: `c-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
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
      cartItemId: `c-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
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

  // Submit Order Logic
  const handlePlaceOrder = () => {
    if (!selectedTableId) return alert("Select a table first.");
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

    if (currentOpenOrder) {
      appendItemsMutation.mutate({
        id: currentOpenOrder.id,
        items: itemsPayload,
      });
    } else {
      createOrderMutation.mutate({
        type: "DINE_IN",
        status: "PENDING",
        paymentStatus: "PENDING",
        tableId: selectedTableId,
        items: itemsPayload as any,
      });
    }
  };

  // Calculations
  const getItemUnitPrice = (item: WaiterCartItem) => {
    const addonsSum = item.selectedAddons.reduce((acc, a) => acc + (a.price || 0), 0);
    return item.basePrice + addonsSum;
  };

  const subtotal = cartItems.reduce((acc, i) => acc + getItemUnitPrice(i) * i.quantity, 0);
  const tax = subtotal * 0.15;
  const service = subtotal * 0.10;
  const grandTotal = subtotal + tax + service;

  // Food Ready Notifications
  const readyOrders = orders.filter((o) => o.status === "READY");

  return (
    <div className="space-y-4 animate-in fade-in duration-200">

      {/* Top Ready Food Pickup Strip (Compact Alert) */}
      {readyOrders.length > 0 && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-2xl flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-300">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
            <span>{readyOrders.length} Order(s) Cooked & Ready for Serving:</span>
            {readyOrders.map((o) => (
              <Badge key={o.id} className="bg-emerald-600 text-white text-[10px] font-mono">
                Table {o.tableId?.replace("t", "") || o.id.slice(-4)}
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
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

      {/* Table Selector Strip */}
      <div className="bg-card border p-3 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
          <span>Select Table:</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto">
          {tables.map((t) => {
            const isSelected = selectedTableId === t.id;
            const openTicket = orders.find(
              (o) => o.tableId === t.id && o.status !== "COMPLETED" && o.status !== "CANCELLED"
            );
            const isOccupied = !!openTicket;

            return (
              <button
                key={t.id}
                onClick={() => setSelectedTableId(t.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 border ${
                  isSelected
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : isOccupied
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300"
                    : "bg-muted/30 border-transparent text-muted-foreground hover:bg-muted"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    isOccupied ? "bg-amber-500" : "bg-emerald-500"
                  }`}
                />
                <span>Table #{t.id.replace("t", "")}</span>
                {openTicket && (
                  <span className="text-[10px] opacity-80">({formatETB(openTicket.total)})</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main 2-Pane Terminal Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Left Pane: Menu Catalog & Addon Trigger */}
        <div className="lg:col-span-7 space-y-3">
          
          <Card className="rounded-2xl border shadow-sm p-4 space-y-3 bg-card">
            
            {/* Search & Category Filter */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search dishes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 text-xs h-9 rounded-xl bg-muted/30"
                />
              </div>

              <div className="flex gap-1 overflow-x-auto text-xs">
                <button
                  onClick={() => setActiveCategory("All")}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap border transition-all ${
                    activeCategory === "All"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/30 border-transparent text-muted-foreground hover:bg-muted"
                  }`}
                >
                  All
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
            </div>

            {/* Menu Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[560px] overflow-y-auto pr-1">
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
                      className="p-2.5 rounded-xl border bg-card hover:bg-muted/20 transition-all flex items-center justify-between space-x-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
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
                              + Addons available
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

        </div>

        {/* Right Pane: Active Ticket / Cart */}
        <div className="lg:col-span-5 space-y-3">
          
          <Card className="rounded-2xl border shadow-sm p-4 space-y-3 bg-card flex flex-col justify-between min-h-[500px]">
            
            <div>
              {/* Header */}
              <div className="flex items-center justify-between border-b pb-2.5">
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-sm">
                    {currentTable ? `Table #${currentTable.id.replace("t", "")} Order` : "Select a Table"}
                  </h3>
                </div>

                {currentOpenOrder && (
                  <Badge variant="outline" className="text-[10px] font-bold text-amber-600 border-amber-500/30">
                    Existing Order #{currentOpenOrder.id.slice(-5).toUpperCase()}
                  </Badge>
                )}
              </div>

              {/* Cart List */}
              <div className="mt-3 space-y-2 max-h-[340px] overflow-y-auto pr-1">
                {cartItems.length === 0 ? (
                  <div className="py-12 text-center text-xs text-muted-foreground border border-dashed rounded-xl">
                    <ShoppingBag className="h-6 w-6 mx-auto opacity-30 mb-1" />
                    <span>No items added. Click menu items to build ticket.</span>
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
                          <div className="text-[10px] text-muted-foreground font-medium">
                            Addons: {ci.selectedAddons.map((a) => a.name).join(", ")}
                          </div>
                        )}

                        {ci.specialInstructions && (
                          <div className="text-[10px] text-amber-600 dark:text-amber-400 italic">
                            Note: "{ci.specialInstructions}"
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

            {/* Totals & Submit */}
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
                onClick={handlePlaceOrder}
                disabled={!selectedTableId || cartItems.length === 0 || createOrderMutation.isPending || appendItemsMutation.isPending}
                className="w-full h-11 rounded-xl font-black text-xs bg-primary text-primary-foreground shadow-md"
              >
                {createOrderMutation.isPending || appendItemsMutation.isPending
                  ? "Submitting..."
                  : currentOpenOrder
                  ? `Append Items to Order (${formatETB(grandTotal)})`
                  : `Place Order (${formatETB(grandTotal)})`}
              </Button>

              {currentOpenOrder && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedOrderForPayment(currentOpenOrder)}
                  className="w-full rounded-xl text-xs font-bold border-emerald-500/30 text-emerald-600 dark:text-emerald-400 gap-1.5"
                >
                  <CreditCard className="h-3.5 w-3.5" /> Settle Table #{currentTable?.id.replace("t", "")} Bill ({formatETB(currentOpenOrder.total)})
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

            {/* Custom Addons Options */}
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
                onChange={(e) => setModalNote(e.target.value)}
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
