import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { OrderType, MenuItem, OrderItem, Order } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatETB } from "@/lib/currency";
import { ArrowLeft, Plus, Minus, Search, Utensils, ShoppingBag, Truck, CheckCircle2 } from "lucide-react";
import { toOrderItemPayload, estimateOrderTotals } from "@/lib/orderUtils";

interface FullPageMenuPOSProps {
  orderType?: OrderType;
  tableId?: string | null;
  existingOrder?: Order | null;
  initialCategory?: string;
  onCancel: () => void;
  onSuccess: () => void;
}

export function FullPageMenuPOS({
  orderType = "DINE_IN",
  tableId,
  existingOrder,
  initialCategory = "All",
  onCancel,
  onSuccess
}: FullPageMenuPOSProps) {
  const queryClient = useQueryClient();

  const { data: menu, isLoading: isLoadingMenu } = useQuery({
    queryKey: ["menu"],
    queryFn: api.menu.getAll,
  });

  // State
  const [menuSearch, setMenuSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  
  // Update category if modal passed a new one
  useEffect(() => {
    if (initialCategory) setSelectedCategory(initialCategory);
  }, [initialCategory]);

  const [customerName, setCustomerName] = useState(existingOrder?.customerName || "");
  const [customerPhone, setCustomerPhone] = useState(existingOrder?.customerPhone || "");
  const [deliveryAddress, setDeliveryAddress] = useState(existingOrder?.deliveryAddress || "");
  const [isPaid, setIsPaid] = useState(existingOrder?.paymentStatus === "PAID" || false);

  const [orderItems, setOrderItems] = useState<Array<{
    menuItemId: string;
    name: string;
    price: number;
    quantity: number;
    specialInstructions?: string;
  }>>([]);

  const activeOrderType = existingOrder?.type || orderType;
  const activeTableId = existingOrder?.tableId || tableId;

  // Mutations
  const createOrder = useMutation({
    mutationFn: api.orders.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["tables"] });
      onSuccess();
    },
    onError: (err: Error) => alert(err.message || "Failed to place order"),
  });

  const addItemsToOrder = useMutation({
    mutationFn: ({ id, items }: { id: string; items: ReturnType<typeof toOrderItemPayload> }) =>
      api.orders.addItems(id, items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      onSuccess();
    },
    onError: (err: Error) => alert(err.message || "Failed to add items"),
  });

  const handleAddItem = (item: MenuItem) => {
    setOrderItems(prev => {
      const exists = prev.find(i => i.menuItemId === item.id);
      if (exists) {
        return prev.map(i => i.menuItemId === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { menuItemId: item.id, name: item.name, price: item.price, quantity: 1 }];
    });
    
    // Provide visual feedback
    const btn = document.getElementById(`add-btn-${item.id}`);
    if (btn) {
      const originalText = btn.innerHTML;
      btn.innerHTML = "✓ Added";
      btn.classList.add("bg-green-500", "text-white");
      btn.classList.remove("bg-primary/10", "text-primary");
      setTimeout(() => {
        btn.innerHTML = originalText;
        btn.classList.remove("bg-green-500", "text-white");
        btn.classList.add("bg-primary/10", "text-primary");
      }, 1000);
    }
  };

  const handleUpdateQuantity = (menuItemId: string, delta: number) => {
    setOrderItems(prev => {
      return prev
        .map(i => i.menuItemId === menuItemId ? { ...i, quantity: i.quantity + delta } : i)
        .filter(i => i.quantity > 0);
    });
  };

  const { subtotal, tax, serviceCharge, deliveryFee, total } = estimateOrderTotals(
    orderItems,
    activeOrderType,
    { includeDeliveryFee: activeOrderType === "DELIVERY" && !existingOrder }
  );

  const handleSubmit = () => {
    if (orderItems.length === 0) return alert("Please select at least one item.");

    const payloadItems = toOrderItemPayload(
      orderItems.map((item) => ({
        ...item,
        id: item.menuItemId,
        menuItemId: item.menuItemId,
      }))
    );

    if (existingOrder) {
      addItemsToOrder.mutate({
        id: existingOrder.id,
        items: payloadItems,
      });
    } else {
      if (orderType === "TAKEAWAY" && (!customerName || !customerPhone)) return alert("Please enter customer name and phone.");
      if (orderType === "DELIVERY" && (!customerName || !customerPhone || !deliveryAddress)) return alert("Please enter delivery details.");

      createOrder.mutate({
        type: orderType,
        status: "PENDING",
        paymentStatus: isPaid ? "PAID" : "PENDING",
        items: payloadItems as any,
        tableId: orderType === "DINE_IN" ? tableId || undefined : undefined,
        customerName: orderType !== "DINE_IN" ? customerName : undefined,
        customerPhone: orderType !== "DINE_IN" ? customerPhone : undefined,
        deliveryAddress: orderType === "DELIVERY" ? deliveryAddress : undefined,
        idempotencyKey: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
      });
    }
  };

  const categories = ["All", ...Array.from(new Set(menu?.map(m => m.category || "Uncategorized") || []))];
  const filteredMenu = menu?.filter(m => {
    const itemName = m.name || "";
    const matchesSearch = itemName.toLowerCase().includes((menuSearch || "").toLowerCase());
    const itemCat = m.category || "Uncategorized";
    const matchesCategory = selectedCategory === "All" || itemCat === selectedCategory;
    return matchesSearch && matchesCategory && m.available !== false;
  });

  return (
    <div className="flex flex-col lg:flex-row gap-6 animate-in slide-in-from-right-4 duration-300">
      {/* Left side: Menu Selection */}
      <div className="flex-1 space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={onCancel} className="rounded-xl px-2 text-muted-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <div className="font-bold bg-muted px-4 py-1.5 rounded-full text-sm flex items-center gap-2">
            {activeOrderType === "DINE_IN" ? <Utensils className="w-4 h-4"/> : activeOrderType === "TAKEAWAY" ? <ShoppingBag className="w-4 h-4"/> : <Truck className="w-4 h-4"/>}
            {existingOrder ? `Adding to #${(existingOrder?.id || '').slice(-6).toUpperCase()}` : 
             activeOrderType === "DINE_IN" ? `Table ${String(activeTableId || '').replace('t','')}` : 
             activeOrderType === "TAKEAWAY" ? "Takeaway" : "Delivery"}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search menu items..." 
              value={menuSearch}
              onChange={e => setMenuSearch(e.target.value)}
              className="pl-9 h-12 rounded-2xl bg-card border-none shadow-sm"
            />
          </div>
        </div>

        <div className="flex overflow-x-auto pb-2 gap-2 scrollbar-hide">
          {categories.map(cat => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? "default" : "outline"}
              className={`rounded-xl shrink-0 h-10 px-5 font-bold transition-all ${
                selectedCategory === cat ? 'shadow-md scale-105' : 'bg-card border-none shadow-sm hover:bg-muted'
              }`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </Button>
          ))}
        </div>

        {isLoadingMenu ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-40 bg-muted/60 animate-pulse rounded-3xl"></div>)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 pb-20">
            {filteredMenu?.map(item => (
              <Card key={item.id} className="rounded-3xl border-none shadow-sm hover:shadow-md transition-all overflow-hidden group">
                <div className="h-32 bg-muted relative overflow-hidden">
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full bg-primary/5 flex items-center justify-center text-primary/20">
                      <Utensils className="h-10 w-10" />
                    </div>
                  )}
                  {item.dietaryTags && item.dietaryTags.includes("Chef's Special") && (
                    <Badge className="absolute top-2 right-2 bg-amber-500 hover:bg-amber-600 border-none shadow-sm text-[10px] uppercase font-black px-2 py-0.5 rounded-full">
                      Popular
                    </Badge>
                  )}
                </div>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-1 gap-2">
                    <h3 className="font-bold text-sm leading-tight line-clamp-1">{item.name}</h3>
                    <span className="font-black text-primary text-sm whitespace-nowrap">{formatETB(item.price)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1 mb-3">{item.description}</p>
                  
                  <Button 
                    id={`add-btn-${item.id}`}
                    className="w-full rounded-xl h-9 font-bold text-xs bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                    onClick={() => handleAddItem(item)}
                  >
                    <Plus className="h-3 w-3 mr-1" /> Add to Order
                  </Button>
                </CardContent>
              </Card>
            ))}
            {filteredMenu?.length === 0 && (
              <div className="col-span-full py-12 text-center text-muted-foreground">
                No items found.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right side: Cart & Details */}
      <div className="w-full lg:w-96 flex flex-col gap-4">
        <Card className="rounded-3xl border-muted-foreground/15 shadow-xl bg-card flex-1 sticky top-6 max-h-[85vh] flex flex-col overflow-hidden">
          <div className="p-5 border-b bg-muted/30">
            <h3 className="font-black text-lg flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              {existingOrder ? "New Extra Items" : "Order Summary"}
            </h3>
          </div>

          {/* Customer Details (If Delivery/Takeaway and not appending) */}
          {!existingOrder && activeOrderType !== "DINE_IN" && (
            <div className="p-5 border-b space-y-3 bg-card/50">
              <Input 
                placeholder="Customer Name" 
                className="h-10 rounded-xl"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
              />
              <Input 
                placeholder="Phone Number" 
                className="h-10 rounded-xl"
                value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value)}
              />
              {activeOrderType === "DELIVERY" && (
                <Input 
                  placeholder="Delivery Address" 
                  className="h-10 rounded-xl"
                  value={deliveryAddress}
                  onChange={e => setDeliveryAddress(e.target.value)}
                />
              )}
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-5">
            {orderItems.length === 0 ? (
              <div className="text-center text-muted-foreground text-sm py-8 font-medium">
                No new items selected. Add items from the menu.
              </div>
            ) : (
              <div className="space-y-4">
                {orderItems.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm truncate">{item.name}</div>
                      <div className="text-xs text-muted-foreground">{formatETB(item.price)}</div>
                    </div>
                    <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-full border">
                      <Button size="icon" variant="ghost" className="h-6 w-6 rounded-full" onClick={() => handleUpdateQuantity(item.menuItemId, -1)}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                      <Button size="icon" variant="ghost" className="h-6 w-6 rounded-full" onClick={() => handleUpdateQuantity(item.menuItemId, 1)}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-5 border-t bg-muted/10 space-y-3">
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal (New items)</span>
                <span className="font-medium text-foreground">{formatETB(subtotal)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Tax (15%)</span>
                <span>{formatETB(tax)}</span>
              </div>
              {activeOrderType === "DINE_IN" && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Service (10%)</span>
                  <span>{formatETB(serviceCharge)}</span>
                </div>
              )}
              {activeOrderType === "DELIVERY" && !existingOrder && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Delivery Fee</span>
                  <span>{formatETB(deliveryFee)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-black pt-2 border-t mt-2">
                <span>Total Additional</span>
                <span className="text-primary">{formatETB(total)}</span>
              </div>
            </div>

            <Button 
              className="w-full h-14 rounded-2xl text-base font-black shadow-lg shadow-primary/25 hover:scale-[1.02] transition-transform"
              onClick={handleSubmit}
              disabled={createOrder.isPending || addItemsToOrder.isPending || orderItems.length === 0}
            >
              {existingOrder 
                ? (addItemsToOrder.isPending ? "Adding..." : `Add to Ticket • ${formatETB(total)}`) 
                : (createOrder.isPending ? "Placing Order..." : `Place Order • ${formatETB(total)}`)
              }
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
