import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { OrderType, MenuItem, OrderItem, Order, AddonItem, MenuItemAddon } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { formatETB } from "@/lib/currency";
import { ArrowLeft, Plus, Minus, Search, Utensils, ShoppingBag, Truck, CheckCircle2, Sparkles, X, Edit } from "lucide-react";
import { toOrderItemPayload, estimateOrderTotals, getApplicableAddonsForItem } from "@/lib/orderUtils";

interface FullPageMenuPOSProps {
  orderType?: OrderType;
  tableId?: string | null;
  existingOrder?: Order | null;
  initialCategory?: string;
  onCancel: () => void;
  onSuccess: () => void;
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

  const { data: allAddons = [] } = useQuery<AddonItem[]>({
    queryKey: ["addons"],
    queryFn: () => api.addons.getAll(),
  });

  const { data: dbCategories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: api.categories.getAll,
  });

  // Real table names (cached by react-query; instant when opened from the floor page).
  const { data: tables = [] } = useQuery({
    queryKey: ["tables"],
    queryFn: api.tables.getAll,
  });

  // Inline toast for action feedback — POS screens shouldn't block on alert().
  const [toast, setToast] = useState<{ message: string; kind: "error" | "success" } | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);
  const showToast = (message: string, kind: "error" | "success" = "error") => setToast({ message, kind });

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
    cartItemId: string;
    menuItemId: string;
    name: string;
    price: number;
    quantity: number;
    selectedAddons: MenuItemAddon[];
    specialInstructions?: string;
  }>>([]);

  // Dish customization modal state
  const [configuringDish, setConfiguringDish] = useState<MenuItem | null>(null);
  const [modalAddons, setModalAddons] = useState<MenuItemAddon[]>([]);
  const [modalNote, setModalNote] = useState<string>("");
  const [modalQty, setModalQty] = useState<number>(1);

  const activeOrderType = existingOrder?.type || orderType;
  const activeTableId = existingOrder?.tableId || tableId;
  const activeTableName = tables.find((t) => t.id === activeTableId)?.name;

  // Mutations
  const createOrder = useMutation({
    mutationFn: api.orders.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["tables"] });
      onSuccess();
    },
    onError: (err: Error) => showToast(err.message || "Failed to place order"),
  });

  const addItemsToOrder = useMutation({
    mutationFn: ({ id, items }: { id: string; items: ReturnType<typeof toOrderItemPayload> }) =>
      api.orders.addItems(id, items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      onSuccess();
    },
    onError: (err: Error) => showToast(err.message || "Failed to add items"),
  });

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

    const addonsSum = modalAddons.reduce((acc, a) => acc + (a.price || 0), 0);
    const unitPrice = configuringDish.price + addonsSum;

    setOrderItems(prev => [
      ...prev,
      {
        cartItemId: `c-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        menuItemId: configuringDish.id,
        name: configuringDish.name,
        price: unitPrice,
        quantity: modalQty,
        selectedAddons: [...modalAddons],
        specialInstructions: modalNote.trim(),
      }
    ]);

    setConfiguringDish(null);
  };

  const handleQuickAddItem = (item: MenuItem) => {
    const applicable = getApplicableAddonsForItem(item, allAddons);
    if (applicable.length > 0) {
      openDishModal(item);
      return;
    }

    setOrderItems(prev => [
      ...prev,
      {
        cartItemId: `c-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        menuItemId: item.id,
        name: item.name,
        price: item.price,
        quantity: 1,
        selectedAddons: [],
        specialInstructions: "",
      }
    ]);
  };

  const handleUpdateQuantity = (cartItemId: string, delta: number) => {
    setOrderItems(prev => {
      return prev
        .map(i => i.cartItemId === cartItemId ? { ...i, quantity: i.quantity + delta } : i)
        .filter(i => i.quantity > 0);
    });
  };

  const { subtotal, tax, serviceCharge, deliveryFee, total } = estimateOrderTotals(
    orderItems,
    activeOrderType,
    { includeDeliveryFee: activeOrderType === "DELIVERY" && !existingOrder }
  );

  const handleSubmit = () => {
    if (orderItems.length === 0) return showToast("Please select at least one item.");

    const payloadItems = toOrderItemPayload(
      orderItems.map((item) => ({
        id: item.cartItemId,
        menuItemId: item.menuItemId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        specialInstructions: item.specialInstructions,
        selectedAddons: item.selectedAddons,
      }))
    );

    if (existingOrder) {
      addItemsToOrder.mutate({
        id: existingOrder.id,
        items: payloadItems,
      });
    } else {
      if (orderType === "TAKEAWAY" && (!customerName || !customerPhone)) return showToast("Please enter customer name and phone.");
      if (orderType === "DELIVERY" && (!customerName || !customerPhone || !deliveryAddress)) return showToast("Please enter delivery details.");

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

  const handleQuickAddAddon = (addon: AddonItem) => {
    setOrderItems(prev => [
      ...prev,
      {
        cartItemId: `c-addon-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        menuItemId: addon.id,
        name: `[Extra] ${addon.name}`,
        price: addon.price,
        quantity: 1,
        selectedAddons: [],
        specialInstructions: "",
      }
    ]);
  };

  const dbCatNames = dbCategories.map(c => c.name);
  const categoriesFromMenu = Array.from(new Set(menu?.map(m => m.category || "Uncategorized") || []));
  const combinedCategoryNames = Array.from(new Set([...dbCatNames, ...categoriesFromMenu]));

  const categories = ["All", "🛒 Retail Shop Store", "✨ Standalone Add-ons", ...combinedCategoryNames];
  
  const filteredMenu = menu?.filter(m => {
    const itemName = m.name || "";
    const matchesSearch = itemName.toLowerCase().includes((menuSearch || "").toLowerCase());
    const itemCat = (m.category || "Uncategorized").toLowerCase();
    const itemCatId = m.categoryId || "";

    let matchesCategory = selectedCategory === "All" || m.category === selectedCategory;
    if (selectedCategory === "🛒 Retail Shop Store") {
      matchesCategory =
        m.id.startsWith("shop-") ||
        itemCatId.startsWith("cat-shop") ||
        itemCat.includes("dairy") || itemCat.includes("milk") || itemCat.includes("butter") || itemCat.includes("cheese") || itemCat.includes("honey") || itemCat.includes("coffee") || itemCat.includes("tea") || itemCat.includes("spice") || itemCat.includes("bakery") || itemCat.includes("shop") || itemCat.includes("retail");
    }

    return matchesSearch && matchesCategory && m.available !== false;
  });

  const filteredAddons = allAddons.filter(a => {
    const nameMatch = a.name.toLowerCase().includes((menuSearch || "").toLowerCase());
    const descMatch = (a.description || "").toLowerCase().includes((menuSearch || "").toLowerCase());
    return (nameMatch || descMatch) && a.isActive !== false;
  });

  return (
    <div className="flex flex-col lg:flex-row gap-6 animate-in slide-in-from-right-4 duration-300 w-full max-w-7xl mx-auto">
      {/* Non-blocking action feedback */}
      {toast && (
        <div
          role="alert"
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-[60] px-4 py-2.5 rounded-xl border text-xs font-bold shadow-xl animate-in fade-in slide-in-from-top-2 flex items-center gap-2 ${
            toast.kind === "error"
              ? "bg-destructive/10 border-destructive/30 text-destructive"
              : "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Left side: Menu Selection */}
      <div className="flex-1 space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={onCancel} className="rounded-xl px-2 text-muted-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <div className="font-bold bg-muted px-4 py-1.5 rounded-full text-sm flex items-center gap-2">
            {activeOrderType === "DINE_IN" ? <Utensils className="w-4 h-4"/> : activeOrderType === "TAKEAWAY" ? <ShoppingBag className="w-4 h-4"/> : <Truck className="w-4 h-4"/>}
            {existingOrder ? `Adding to ${(existingOrder?.id || '').slice(-6).toUpperCase()}` : 
             activeOrderType === "DINE_IN" ? (activeTableName || "Dine-in") : 
             activeOrderType === "TAKEAWAY" ? "Takeaway" : "Delivery"}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search dishes or standalone add-ons..." 
              value={menuSearch}
              onChange={e => setMenuSearch(e.target.value)}
              className="pl-9 h-12 rounded-2xl bg-card border-none shadow-sm"
            />
          </div>
        </div>

        <div className="flex overflow-x-auto pb-2 pr-3 gap-2 scrollbar-hide">
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
        ) : selectedCategory === "✨ Standalone Add-ons" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 pb-20">
            {filteredAddons.map(addon => (
              <Card key={addon.id} className="rounded-3xl border-primary/20 bg-card shadow-sm hover:shadow-md transition-all overflow-hidden p-4 space-y-3 flex flex-col justify-between">
                <div className="flex items-start justify-between">
                  <div>
                    <Badge className="bg-primary/10 text-primary border-primary/30 text-[10px] font-bold px-2 py-0.5 rounded-full mb-1">
                      ✨ Standalone Add-on
                    </Badge>
                    <h3 className="font-bold text-sm leading-tight">{addon.name}</h3>
                    {addon.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{addon.description}</p>
                    )}
                  </div>
                  <span className="font-black text-primary text-sm whitespace-nowrap">{formatETB(addon.price)}</span>
                </div>

                <Button 
                  className="w-full rounded-xl h-9 font-bold text-xs bg-primary text-primary-foreground gap-1"
                  onClick={() => handleQuickAddAddon(addon)}
                >
                  <Plus className="h-3.5 w-3.5" /> Add Extra to Order Ticket
                </Button>
              </Card>
            ))}
            {filteredAddons.length === 0 && (
              <div className="col-span-full py-12 text-center text-muted-foreground">
                No standalone add-ons found matching search.
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 pb-20">
            {filteredMenu?.map(item => {
              const applicableAddons = getApplicableAddonsForItem(item, allAddons);

              return (
                <Card key={item.id} className="rounded-3xl border-none shadow-sm hover:shadow-md transition-all overflow-hidden group">
                  <div className="h-32 bg-muted relative overflow-hidden cursor-pointer" onClick={() => openDishModal(item)}>
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full bg-primary/5 flex items-center justify-center text-primary/20">
                        <Utensils className="h-10 w-10" />
                      </div>
                    )}
                    
                    {applicableAddons.length > 0 && (
                      <Badge className="absolute top-2 left-2 bg-background/90 backdrop-blur-md text-primary border border-primary/30 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm gap-1">
                        <Sparkles className="h-3 w-3" />
                        <span>{applicableAddons.length} Addons</span>
                      </Badge>
                    )}

                    {item.dietaryTags && item.dietaryTags.includes("Chef's Special") && (
                      <Badge className="absolute top-2 right-2 bg-amber-500 hover:bg-amber-600 border-none shadow-sm text-[10px] uppercase font-black px-2 py-0.5 rounded-full">
                        Popular
                      </Badge>
                    )}
                  </div>

                  <CardContent className="p-4 space-y-2">
                    <div className="flex justify-between items-start gap-2 cursor-pointer" onClick={() => openDishModal(item)}>
                      <h3 className="font-bold text-sm leading-tight line-clamp-1">{item.name}</h3>
                      <span className="font-black text-primary text-sm whitespace-nowrap">{formatETB(item.price)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1 mb-2">{item.description}</p>
                    
                    <div className="flex gap-2">
                      <Button 
                        variant="outline"
                        className="flex-1 rounded-xl h-9 font-bold text-xs bg-card hover:bg-muted"
                        onClick={() => openDishModal(item)}
                      >
                        <Sparkles className="h-3 w-3 mr-1 text-primary" /> Customize
                      </Button>
                      <Button 
                        className="flex-1 rounded-xl h-9 font-bold text-xs bg-primary text-primary-foreground"
                        onClick={() => handleQuickAddItem(item)}
                      >
                        <Plus className="h-3 w-3 mr-1" /> Add Dish
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {filteredMenu?.length === 0 && (
              <div className="col-span-full py-12 text-center text-muted-foreground">
                No items found matching your filters.
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
                {orderItems.map((item) => (
                  <div key={item.cartItemId} className="p-3 rounded-2xl bg-muted/20 border space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm truncate">{item.name}</div>
                        <div className="text-xs text-primary font-bold">{formatETB(item.price)} each</div>
                      </div>
                      <div className="flex items-center gap-1.5 bg-card p-1 rounded-full border shadow-sm">
                        <Button size="icon" variant="ghost" className="h-6 w-6 rounded-full" onClick={() => handleUpdateQuantity(item.cartItemId, -1)}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                        <Button size="icon" variant="ghost" className="h-6 w-6 rounded-full" onClick={() => handleUpdateQuantity(item.cartItemId, 1)}>
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Selected Addons */}
                    {item.selectedAddons && item.selectedAddons.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1 border-t">
                        {item.selectedAddons.map((addon) => (
                          <Badge key={addon.id} variant="secondary" className="text-[10px] bg-primary/10 text-primary border border-primary/20 font-bold">
                            + {addon.name} ({formatETB(addon.price)})
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Special Instructions */}
                    {item.specialInstructions && (
                      <p className="text-[11px] italic text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg">
                        Note: {item.specialInstructions}
                      </p>
                    )}
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

      {/* Dish Addon & Presets Configuration Modal */}
      {configuringDish && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-card border rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 relative animate-in zoom-in-95 duration-200">
            
            <div className="flex items-start justify-between border-b pb-3">
              <div>
                <h3 className="font-black text-lg text-foreground">{configuringDish.name}</h3>
                <span className="text-xs text-primary font-bold">{formatETB(configuringDish.price)} Base Price</span>
              </div>
              <button onClick={() => setConfiguringDish(null)} className="p-1 text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Applicable Addons List */}
            {(() => {
              const applicableAddons = getApplicableAddonsForItem(configuringDish, allAddons);

              if (applicableAddons.length === 0) {
                return (
                  <div className="p-3.5 bg-muted/30 rounded-2xl border text-center text-xs text-muted-foreground font-medium">
                    No extra add-ons required for this dish. Standard recipe will be prepared.
                  </div>
                );
              }

              return (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                    Available Add-ons (Global, Category & Item)
                  </span>
                  <div className="space-y-2">
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
                          className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer text-xs transition-all ${
                            selected 
                              ? "bg-primary/10 border-primary font-bold text-primary shadow-sm" 
                              : "bg-muted/20 border-transparent hover:bg-muted/50 text-foreground"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-bold">{addon.name}</span>
                            <Badge variant="outline" className="text-[9px] font-mono px-1.5 py-0 uppercase">
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

            {/* Kitchen Notes */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                Kitchen Special Notes
              </span>
              
              <div className="flex flex-wrap gap-1.5">
                {KITCHEN_NOTE_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleAddPresetNote(preset)}
                    className="px-2.5 py-1 rounded-lg bg-muted text-[10px] font-bold text-muted-foreground hover:text-foreground hover:bg-primary/15 transition-all"
                  >
                    + {preset}
                  </button>
                ))}
              </div>

              <Textarea
                placeholder="Type custom instructions (e.g. Extra hot pepper on side)..."
                value={modalNote}
                onChange={(e: any) => setModalNote(e.target.value)}
                className="text-xs h-16 rounded-2xl bg-muted/20 resize-none"
              />
            </div>

            {/* Quantity */}
            <div className="flex items-center justify-between border-t pt-3">
              <span className="text-xs font-bold text-muted-foreground uppercase">Quantity</span>
              <div className="flex items-center gap-3 bg-muted/50 p-1.5 rounded-2xl border text-xs font-bold">
                <button onClick={() => setModalQty((q) => Math.max(1, q - 1))} className="px-2.5 py-0.5 text-foreground hover:text-primary">
                  -
                </button>
                <span className="w-4 text-center">{modalQty}</span>
                <button onClick={() => setModalQty((q) => q + 1)} className="px-2.5 py-0.5 text-foreground hover:text-primary">
                  +
                </button>
              </div>
            </div>

            <Button
              onClick={handleAddModalDishToCart}
              className="w-full h-12 rounded-2xl font-black text-xs bg-primary text-primary-foreground shadow-lg shadow-primary/25"
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
    </div>
  );
}
