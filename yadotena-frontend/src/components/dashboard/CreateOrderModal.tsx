"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { OrderType, MenuItem, OrderItem } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatETB } from "@/lib/currency";
import {
  computeOrderTotals,
  parseServiceChargePercent,
} from "@/lib/order-totals";
import { 
  X, Plus, Minus, Search, Utensils, ShoppingBag, Truck, 
  CheckCircle2, ChefHat, Sparkles
} from "lucide-react";

interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTableId?: string;
}

export function CreateOrderModal({ isOpen, onClose, initialTableId }: CreateOrderModalProps) {
  const queryClient = useQueryClient();

  const { data: menu } = useQuery({
    queryKey: ["menu"],
    queryFn: api.menu.getAll,
  });

  const { data: tables } = useQuery({
    queryKey: ["tables"],
    queryFn: api.tables.getAll,
  });

  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: api.settings.get,
    staleTime: 60_000,
  });
  const serviceChargePercent = parseServiceChargePercent(settings);

  const [orderType, setOrderType] = useState<OrderType>("DINE_IN");
  const [tableId, setTableId] = useState<string>(initialTableId || "");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [isPaid, setIsPaid] = useState(false);
  const [menuSearch, setMenuSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const [orderItems, setOrderItems] = useState<Array<{
    menuItemId: string;
    name: string;
    price: number;
    quantity: number;
    specialInstructions?: string;
  }>>([]);

  useEffect(() => {
    if (initialTableId) {
      setTableId(initialTableId);
      return;
    }
    if (!tableId && tables?.length) {
      const available = tables.find((t) => t.status === "AVAILABLE") || tables[0];
      setTableId(available.id);
    }
  }, [initialTableId, tables, tableId]);

  const createOrder = useMutation({
    mutationFn: api.orders.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["tables"] });
      onClose();
      // Reset form
      setOrderItems([]);
      setCustomerName("");
      setCustomerPhone("");
      setDeliveryAddress("");
    },
    onError: (err: Error) => {
      alert(err.message || "Failed to create order");
    },
  });

  if (!isOpen) return null;

  const categories = ["All", ...Array.from(new Set(menu?.map(m => m.category) || []))];

  const filteredMenu = menu?.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(menuSearch.toLowerCase());
    const matchesCategory = selectedCategory === "All" || m.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleAddItem = (item: MenuItem) => {
    setOrderItems(prev => {
      const exists = prev.find(i => i.menuItemId === item.id);
      if (exists) {
        return prev.map(i => i.menuItemId === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { menuItemId: item.id, name: item.name, price: item.price, quantity: 1 }];
    });
  };

  const handleUpdateQuantity = (menuItemId: string, delta: number) => {
    setOrderItems(prev => {
      return prev
        .map(i => i.menuItemId === menuItemId ? { ...i, quantity: i.quantity + delta } : i)
        .filter(i => i.quantity > 0);
    });
  };

  const subtotal = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const { tax, serviceCharge, deliveryFee, total } = computeOrderTotals({
    subtotal,
    orderType,
    serviceChargePercent,
  });

  const handleSubmit = () => {
    if (orderItems.length === 0) return alert("Please select at least one item.");
    if (orderType === "DINE_IN" && !tableId) return alert("Please select a table.");
    if (orderType === "TAKEAWAY" && (!customerName || !customerPhone)) return alert("Please enter customer name and phone.");
    if (orderType === "DELIVERY" && (!customerName || !customerPhone || !deliveryAddress)) return alert("Please enter delivery details.");

    const selectedTable = tables?.find((t) => t.id === tableId);

    createOrder.mutate({
      type: orderType,
      status: "PENDING",
      paymentStatus: isPaid ? "PAID" : "PENDING",
      paymentMethod: "cash",
      items: orderItems.map(i => ({ ...i, id: Math.random().toString(36).substring(7) })) as OrderItem[],
      total,
      tableId: orderType === "DINE_IN" ? tableId : undefined,
      customerName:
        orderType === "DINE_IN"
          ? customerName || `Guest ${selectedTable?.name || "Table"}`
          : customerName,
      customerPhone:
        orderType === "DINE_IN"
          ? customerPhone || "0911000000"
          : customerPhone,
      deliveryAddress: orderType === "DELIVERY" ? deliveryAddress : undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={onClose} />
      
      <div className="relative w-full max-w-4xl bg-card border rounded-3xl shadow-2xl overflow-hidden z-10 max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between bg-muted/40">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <ChefHat className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Staff POS • Create New Order</h2>
              <p className="text-xs text-muted-foreground">Punch order for dine-in guests, takeout, or phone dispatch</p>
            </div>
          </div>
          <Button size="icon" variant="ghost" className="rounded-full" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 flex-1 overflow-hidden">
          
          {/* Left: Menu Browser (7 cols) */}
          <div className="md:col-span-7 p-6 border-r flex flex-col space-y-4 overflow-y-auto max-h-[70vh]">
            
            {/* Order Type Tabs */}
            <div className="grid grid-cols-3 gap-2 bg-muted/50 p-1.5 rounded-2xl border">
              <Button
                type="button"
                size="sm"
                variant={orderType === "DINE_IN" ? "default" : "ghost"}
                className="rounded-xl font-bold text-xs"
                onClick={() => setOrderType("DINE_IN")}
              >
                <Utensils className="h-3.5 w-3.5 mr-1.5" /> Dine-In
              </Button>
              <Button
                type="button"
                size="sm"
                variant={orderType === "TAKEAWAY" ? "default" : "ghost"}
                className="rounded-xl font-bold text-xs"
                onClick={() => setOrderType("TAKEAWAY")}
              >
                <ShoppingBag className="h-3.5 w-3.5 mr-1.5" /> Takeaway
              </Button>
              <Button
                type="button"
                size="sm"
                variant={orderType === "DELIVERY" ? "default" : "ghost"}
                className="rounded-xl font-bold text-xs"
                onClick={() => setOrderType("DELIVERY")}
              >
                <Truck className="h-3.5 w-3.5 mr-1.5" /> Delivery
              </Button>
            </div>

            {/* Dine-in Table Selector */}
            {orderType === "DINE_IN" && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground">Assign Seated Table</label>
                <div className="grid grid-cols-4 gap-2">
                  {tables?.map((tbl) => (
                    <button
                      key={tbl.id}
                      type="button"
                      onClick={() => setTableId(tbl.id)}
                      className={`p-2 rounded-xl text-xs font-bold border transition-all ${
                        tableId === tbl.id
                          ? "bg-primary text-primary-foreground border-primary shadow-sm"
                          : "bg-background border-muted hover:border-muted-foreground/30 text-muted-foreground"
                      }`}
                    >
                      {tbl.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Takeaway / Delivery Fields */}
            {(orderType === "TAKEAWAY" || orderType === "DELIVERY") && (
              <div className="grid grid-cols-2 gap-3 bg-muted/20 p-3 rounded-2xl border">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Customer Name</label>
                  <Input 
                    value={customerName} 
                    onChange={e => setCustomerName(e.target.value)} 
                    placeholder="e.g. Michael" 
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Phone</label>
                  <Input 
                    value={customerPhone} 
                    onChange={e => setCustomerPhone(e.target.value)} 
                    placeholder="091 123 4567" 
                    className="h-9 text-xs"
                  />
                </div>
                {orderType === "DELIVERY" && (
                  <div className="col-span-2 space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">Delivery Address</label>
                    <Input 
                      value={deliveryAddress} 
                      onChange={e => setDeliveryAddress(e.target.value)} 
                      placeholder="Street, Building, Floor" 
                      className="h-9 text-xs"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Search & Category Filter */}
            <div className="space-y-2 pt-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search dishes to add..."
                  className="pl-9 h-10 rounded-xl text-xs bg-background"
                  value={menuSearch}
                  onChange={e => setMenuSearch(e.target.value)}
                />
              </div>
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {categories.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                      selectedCategory === cat
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Menu Items List */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              {filteredMenu?.map(item => (
                <div
                  key={item.id}
                  onClick={() => handleAddItem(item)}
                  className="p-3 rounded-2xl border bg-card hover:border-primary/50 cursor-pointer transition-all flex items-center justify-between group shadow-sm"
                >
                  <div className="min-w-0 pr-2">
                    <h4 className="font-bold text-xs group-hover:text-primary transition-colors truncate">{item.name}</h4>
                    <span className="text-xs font-black text-primary">{formatETB(item.price)}</span>
                  </div>
                  <Button size="icon" variant="secondary" className="h-7 w-7 rounded-lg shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>

          </div>

          {/* Right: Order Ticket Summary (5 cols) */}
          <div className="md:col-span-5 p-6 flex flex-col justify-between bg-muted/10 overflow-y-auto max-h-[70vh]">
            
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="font-bold text-sm">Ticket Items ({orderItems.reduce((s, i) => s + i.quantity, 0)})</h3>
                {orderItems.length > 0 && (
                  <Button variant="ghost" size="sm" className="h-6 text-xs text-destructive" onClick={() => setOrderItems([])}>
                    Clear
                  </Button>
                )}
              </div>

              {orderItems.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-xs space-y-2">
                  <Utensils className="h-8 w-8 mx-auto opacity-40" />
                  <p>Click menu items on the left to add them to this ticket.</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                  {orderItems.map(item => (
                    <div key={item.menuItemId} className="flex items-center justify-between p-2.5 rounded-xl border bg-card">
                      <div className="min-w-0 flex-1 pr-2">
                        <h5 className="font-bold text-xs truncate">{item.name}</h5>
                        <span className="text-xs font-semibold text-primary">{formatETB(item.price * item.quantity)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-muted/60 rounded-full p-0.5 border">
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-6 w-6 rounded-full" 
                          onClick={() => handleUpdateQuantity(item.menuItemId, -1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-6 w-6 rounded-full" 
                          onClick={() => handleUpdateQuantity(item.menuItemId, 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Payment & Totals */}
            <div className="pt-4 border-t space-y-3">
              
              {/* Payment toggle — cash only; unpaid takeaway/delivery kitchen-hidden until paid */}
              <div
                onClick={() => setIsPaid(!isPaid)}
                className={`p-3 rounded-2xl border cursor-pointer flex flex-col gap-1 transition-colors ${
                  isPaid
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "border-muted bg-card text-muted-foreground"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">
                    {isPaid ? "Cash marked paid" : "Cash not yet received"}
                  </span>
                  <Badge variant={isPaid ? "success" : "secondary"} className="text-[10px]">
                    {isPaid ? "Paid" : "Unpaid"}
                  </Badge>
                </div>
                {!isPaid && orderType !== "DINE_IN" && (
                  <p className="text-[10px] leading-snug opacity-80">
                    Kitchen waits until cash is marked paid for takeaway/delivery.
                  </p>
                )}
              </div>

              {/* Price Breakdown */}
              <div className="space-y-1.5 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatETB(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax (15%)</span>
                  <span>{formatETB(tax)}</span>
                </div>
                {orderType === "DINE_IN" && (
                  <div className="flex justify-between">
                    <span>Service ({serviceChargePercent}%)</span>
                    <span>{formatETB(serviceCharge)}</span>
                  </div>
                )}
                {orderType === "DELIVERY" && (
                  <div className="flex justify-between">
                    <span>Delivery Fee</span>
                    <span>{formatETB(deliveryFee)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-black text-foreground pt-2 border-t">
                  <span>Total</span>
                  <span className="text-primary">{formatETB(total)}</span>
                </div>
              </div>

              {/* Submit CTA */}
              <Button
                className="w-full h-12 rounded-2xl font-bold shadow-lg shadow-primary/20 text-sm"
                onClick={handleSubmit}
                disabled={createOrder.isPending || orderItems.length === 0}
              >
                {createOrder.isPending
                  ? "Placing order…"
                  : isPaid || orderType === "DINE_IN"
                    ? "Dispatch order to kitchen"
                    : "Place order (kitchen after cash)"}
              </Button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
