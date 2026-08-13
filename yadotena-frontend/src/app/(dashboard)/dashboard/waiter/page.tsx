"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatETB } from "@/lib/currency";
import { getImageUrl } from "@/lib/utils";
import { 
  BellRing, Plus, Utensils, Check, CreditCard, Search, 
  Sparkles, CheckCircle2, Clock, Flame, X, RefreshCw, 
  ShoppingBag, UserCheck, AlertCircle, Trash2, ChevronRight, User
} from "lucide-react";
import { PaymentSettlementModal } from "@/components/PaymentSettlementModal";
import { Order, MenuItem, Table } from "@/types";

export default function WaiterDashboardPage() {
  const queryClient = useQueryClient();

  // State
  const [selectedTableForOrder, setSelectedTableForOrder] = useState<Table | null>(null);
  const [existingOrderToAppend, setExistingOrderToAppend] = useState<Order | null>(null);
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState<Order | null>(null);
  const [tableFilter, setTableFilter] = useState<string>("ALL");

  // In-Console Order Drawer State
  const [isOrderDrawerOpen, setIsOrderDrawerOpen] = useState(false);
  const [menuSearch, setMenuSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [cartItems, setCartItems] = useState<Array<{
    menuItemId: string;
    name: string;
    price: number;
    quantity: number;
    specialInstructions: string;
  }>>([]);

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

  const { data: menu = [] } = useQuery<MenuItem[]>({
    queryKey: ["menu"],
    queryFn: api.menu.getAll,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: api.categories.getAll,
  });

  const { data: serviceRequests = [] } = useQuery({
    queryKey: ["serviceRequests"],
    queryFn: api.serviceRequests.getAll,
    refetchInterval: 3000,
  });

  // Mutations
  const resolveRequestMutation = useMutation({
    mutationFn: (id: string) => api.serviceRequests.resolve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["serviceRequests"] });
    },
  });

  const updateTableStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: any }) => api.tables.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tables"] });
    },
  });

  const updateOrderStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: any }) => api.orders.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["tables"] });
    },
  });

  const createOrderMutation = useMutation({
    mutationFn: api.orders.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["tables"] });
      closeOrderDrawer();
    },
    onError: (err: any) => alert(err.message || "Failed to place order"),
  });

  const appendOrderItemsMutation = useMutation({
    mutationFn: ({ id, items }: { id: string; items: any }) => api.orders.addItems(id, items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      closeOrderDrawer();
    },
    onError: (err: any) => alert(err.message || "Failed to append items"),
  });

  // Handlers for Order Drawer
  const openOrderDrawerForTable = (table: Table) => {
    setSelectedTableForOrder(table);
    setExistingOrderToAppend(null);
    setCartItems([]);
    setIsOrderDrawerOpen(true);
  };

  const openAppendDrawerForOrder = (order: Order, table?: Table) => {
    setExistingOrderToAppend(order);
    setSelectedTableForOrder(table || null);
    setCartItems([]);
    setIsOrderDrawerOpen(true);
  };

  const closeOrderDrawer = () => {
    setIsOrderDrawerOpen(false);
    setSelectedTableForOrder(null);
    setExistingOrderToAppend(null);
    setCartItems([]);
    setMenuSearch("");
  };

  const handleAddToCart = (item: MenuItem) => {
    setCartItems((prev) => {
      const existing = prev.find((i) => i.menuItemId === item.id);
      if (existing) {
        return prev.map((i) =>
          i.menuItemId === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          menuItemId: item.id,
          name: item.name,
          price: item.price,
          quantity: 1,
          specialInstructions: "",
        },
      ];
    });
  };

  const handleUpdateCartQty = (menuItemId: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((i) => (i.menuItemId === menuItemId ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0)
    );
  };

  const handleUpdateInstructions = (menuItemId: string, text: string) => {
    setCartItems((prev) =>
      prev.map((i) => (i.menuItemId === menuItemId ? { ...i, specialInstructions: text } : i))
    );
  };

  const handleSubmitOrder = () => {
    if (cartItems.length === 0) return alert("Select at least one dish.");

    const formattedItems = cartItems.map((i) => ({
      menuItemId: i.menuItemId,
      quantity: i.quantity,
      qty: i.quantity,
      specialInstructions: i.specialInstructions,
    }));

    if (existingOrderToAppend) {
      appendOrderItemsMutation.mutate({
        id: existingOrderToAppend.id,
        items: formattedItems,
      });
    } else if (selectedTableForOrder) {
      createOrderMutation.mutate({
        type: "DINE_IN",
        status: "PENDING",
        paymentStatus: "PENDING",
        tableId: selectedTableForOrder.id,
        items: formattedItems as any,
      });
    }
  };

  // Calculations for active order drawer
  const drawerSubtotal = cartItems.reduce((acc, i) => acc + i.price * i.quantity, 0);
  const drawerTax = drawerSubtotal * 0.15;
  const drawerService = drawerSubtotal * 0.10;
  const drawerTotal = drawerSubtotal + drawerTax + drawerService;

  // Filtered requests & tables
  const pendingRequests = serviceRequests.filter((r) => r.status === "PENDING");
  const activeOrders = orders.filter((o) => o.status !== "COMPLETED" && o.status !== "CANCELLED");

  // Orders that are cooked and ready to be served to tables
  const readyOrdersToServe = activeOrders.filter((o) => o.status === "READY");

  const filteredTables = tables.filter((t) => {
    if (tableFilter === "AVAILABLE") return t.status === "AVAILABLE";
    if (tableFilter === "OCCUPIED") return t.status === "OCCUPIED" || t.status === "PREPARING";
    if (tableFilter === "READY") return t.status === "WAITING_FOR_SERVICE";
    return true;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* Waiter Console Banner Header */}
      <div className="bg-gradient-to-r from-amber-950 via-amber-900 to-amber-950 text-amber-50 p-6 md:p-8 rounded-3xl border border-amber-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 font-black text-[10px] uppercase tracking-wider px-3 py-1">
              🤵 Floor Waiter Station
            </Badge>
            <span className="text-xs text-amber-200 font-medium">In-Person Table & Order Operations</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight">
            Floor Waiter Console
          </h1>
          <p className="text-sm text-amber-200 max-w-xl">
            Select floor tables, place kitchen orders with special guest notes, pick up ready food from counter, and settle bills via Cash or Digital transfers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            size="lg"
            onClick={() => {
              const freeTable = tables.find((t) => t.status === "AVAILABLE") || tables[0];
              if (freeTable) openOrderDrawerForTable(freeTable);
            }}
            className="rounded-2xl font-black text-xs bg-amber-500 hover:bg-amber-400 text-amber-950 gap-2 shadow-lg shadow-amber-500/20"
          >
            <Plus className="h-4 w-4" /> Start Table Order
          </Button>
        </div>
      </div>

      {/* High-Priority Ready Food Pickup Counter Alert */}
      {readyOrdersToServe.length > 0 && (
        <Card className="rounded-3xl border-2 border-emerald-500/40 bg-emerald-500/10 p-6 space-y-4 shadow-lg animate-pulse">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center">
                <Utensils className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-black text-lg text-emerald-700 dark:text-emerald-300">
                  🛎️ {readyOrdersToServe.length} Dishes Cooked & Ready for Pickup Counter
                </h3>
                <p className="text-xs text-muted-foreground font-semibold">Kitchen has prepared these dishes. Serve them to the table now.</p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {readyOrdersToServe.map((order) => (
              <div key={order.id} className="p-4 rounded-2xl bg-card border shadow-md space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <Badge className="bg-emerald-600 text-white font-black text-[10px] uppercase">
                      {order.tableId ? `Table ${order.tableId.replace("t", "")}` : order.type}
                    </Badge>
                    <span className="text-xs font-mono font-bold text-muted-foreground">Ticket #{order.id.slice(-6).toUpperCase()}</span>
                  </div>
                  <div className="space-y-1 mt-2 text-xs font-medium text-foreground">
                    {order.items?.map((item: any) => (
                      <div key={item.id} className="flex justify-between">
                        <span>{item.quantity}x {item.name}</span>
                        <span className="font-bold text-primary">{formatETB(item.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Button
                  size="sm"
                  onClick={() => updateOrderStatusMutation.mutate({ id: order.id, status: "SERVED" })}
                  disabled={updateOrderStatusMutation.isPending}
                  className="w-full rounded-xl font-black text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-md"
                >
                  <Check className="h-4 w-4" /> Mark Food Served to Table
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Urgent Waiter Call Notifications */}
      {pendingRequests.length > 0 && (
        <Card className="rounded-3xl border-2 border-rose-500/40 bg-rose-500/10 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-rose-500 text-white flex items-center justify-center animate-bounce">
                <BellRing className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-black text-lg text-rose-600 dark:text-rose-400">
                  {pendingRequests.length} Urgent Table Calls Requiring Waiter Action
                </h3>
                <p className="text-xs text-muted-foreground font-medium">Guests requesting waiter assistance or table bills</p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {pendingRequests.map((req: any) => (
              <div key={req.id} className="p-4 rounded-2xl bg-card border shadow-sm flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className="bg-primary text-primary-foreground font-black text-[10px] uppercase">
                      Table {req.tableId?.replace("t", "")}
                    </Badge>
                    <span className="font-extrabold text-xs">
                      {req.type === "WAITER" ? "🔔 Call Waiter" : "💳 Request Bill"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground italic font-medium">"{req.notes}"</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => resolveRequestMutation.mutate(req.id)}
                  disabled={resolveRequestMutation.isPending}
                  className="rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                >
                  <Check className="h-3.5 w-3.5" /> Resolve
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Floor Table Grid */}
      <div className="space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black tracking-tight">Floor Tables Layout</h2>
            <p className="text-xs text-muted-foreground font-medium">Tap any table card to take menu orders or settle active bills.</p>
          </div>

          {/* Table Filter Pills */}
          <div className="flex gap-1.5 bg-muted/60 p-1 rounded-2xl border text-xs overflow-x-auto">
            <button
              onClick={() => setTableFilter("ALL")}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${tableFilter === "ALL" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
            >
              All ({tables.length})
            </button>
            <button
              onClick={() => setTableFilter("AVAILABLE")}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${tableFilter === "AVAILABLE" ? "bg-background shadow-sm text-emerald-600" : "text-muted-foreground"}`}
            >
              Available ({tables.filter(t => t.status === "AVAILABLE").length})
            </button>
            <button
              onClick={() => setTableFilter("OCCUPIED")}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${tableFilter === "OCCUPIED" ? "bg-background shadow-sm text-amber-600" : "text-muted-foreground"}`}
            >
              Occupied ({tables.filter(t => t.status === "OCCUPIED" || t.status === "PREPARING").length})
            </button>
          </div>
        </div>

        {isTablesLoading ? (
          <div className="p-12 text-center text-muted-foreground animate-pulse">Loading floor tables...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredTables.map((table) => {
              const isOccupied = table.status === "OCCUPIED" || table.status === "PREPARING" || table.status === "WAITING_FOR_SERVICE";
              
              // Find matching active order for this table
              const activeOrder = orders.find(
                (o) => o.tableId === table.id && o.status !== "COMPLETED" && o.status !== "CANCELLED"
              );

              return (
                <Card
                  key={table.id}
                  className={`p-5 rounded-3xl border-2 transition-all flex flex-col justify-between space-y-4 shadow-sm hover:shadow-md ${
                    isOccupied
                      ? "bg-amber-500/10 border-amber-500/30"
                      : "bg-card border-muted/60 hover:border-primary/40"
                  }`}
                >
                  
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-black uppercase text-muted-foreground block">Table</span>
                      <h3 className="text-2xl font-black text-foreground">
                        #{(table as any).number || table.id.replace("t", "")}
                      </h3>
                      <span className="text-[11px] text-muted-foreground font-semibold">
                        Seats {table.capacity || 4} Guests
                      </span>
                    </div>

                    <Badge
                      className={`font-black text-[9px] uppercase rounded-xl px-2.5 py-1 ${
                        isOccupied 
                          ? "bg-amber-500 text-amber-950 shadow-sm" 
                          : "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      {isOccupied ? "Occupied" : "Available"}
                    </Badge>
                  </div>

                  {/* Active Ticket Summary if occupied */}
                  {activeOrder ? (
                    <div className="bg-card p-3 rounded-2xl border space-y-1.5 text-xs">
                      <div className="flex justify-between font-bold text-muted-foreground">
                        <span>Ticket #{activeOrder.id.slice(-6).toUpperCase()}</span>
                        <Badge variant="outline" className="text-[9px] font-bold">
                          {activeOrder.status}
                        </Badge>
                      </div>
                      <div className="flex justify-between font-black text-foreground pt-1 border-t">
                        <span>Items: {activeOrder.items?.length || 0}</span>
                        <span className="text-primary">{formatETB(activeOrder.total)}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="py-2 text-xs text-muted-foreground font-medium italic">
                      Table is currently empty and ready for guests.
                    </div>
                  )}

                  {/* Actions */}
                  <div className="pt-2 border-t flex flex-col gap-2">
                    {isOccupied ? (
                      <div className="grid grid-cols-2 gap-2">
                        {activeOrder && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openAppendDrawerForOrder(activeOrder, table)}
                            className="rounded-xl text-[11px] font-bold h-8 gap-1"
                          >
                            <Plus className="h-3 w-3" /> Add Items
                          </Button>
                        )}

                        {activeOrder && (
                          <Button
                            size="sm"
                            onClick={() => setSelectedOrderForPayment(activeOrder)}
                            className="rounded-xl text-[11px] font-bold h-8 bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                          >
                            <CreditCard className="h-3 w-3" /> Settle Bill
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => updateTableStatusMutation.mutate({ id: table.id, status: "AVAILABLE" })}
                          className="col-span-2 rounded-xl text-[11px] font-bold h-7 text-muted-foreground hover:text-destructive"
                        >
                          Clear Table
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => openOrderDrawerForTable(table)}
                        className="w-full rounded-xl text-xs font-black h-9 bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 shadow-sm"
                      >
                        <Plus className="h-3.5 w-3.5" /> Start Table Order
                      </Button>
                    )}
                  </div>

                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Active Ticket List */}
      <Card className="rounded-3xl border shadow-sm p-6 bg-card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-black text-lg flex items-center gap-2">
              <Utensils className="h-5 w-5 text-primary" />
              <span>Active Orders & Kitchen Line</span>
            </h3>
            <p className="text-xs text-muted-foreground">Monitor dish preparation and settle payments</p>
          </div>
          <Badge variant="outline" className="font-bold text-xs">
            {activeOrders.length} Active Tickets
          </Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {activeOrders.map((order) => (
            <div key={order.id} className="p-4 rounded-2xl bg-muted/40 border space-y-3 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <Badge className="bg-primary/20 text-primary font-black text-[10px] uppercase">
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
                    <CreditCard className="h-3.5 w-3.5" /> Settle Payment
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* In-Console POS Order Drawer */}
      {isOrderDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex justify-end animate-in fade-in duration-200">
          <div className="fixed inset-0" onClick={closeOrderDrawer} />

          <div className="relative w-full max-w-2xl bg-card border-l h-full shadow-2xl z-10 flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
            
            {/* Drawer Header */}
            <div className="p-5 border-b flex items-center justify-between bg-muted/30">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-xl tracking-tight">
                    {existingOrderToAppend ? `Add Items to Ticket #${existingOrderToAppend.id.slice(-6).toUpperCase()}` : "Create New Table Order"}
                  </h3>
                  {selectedTableForOrder && (
                    <Badge className="bg-primary text-primary-foreground font-bold">
                      Table {selectedTableForOrder.id.replace("t", "")}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">Select menu items and submit directly to kitchen</p>
              </div>

              <Button size="icon" variant="ghost" className="rounded-full" onClick={closeOrderDrawer}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Content: Left Menu / Right Cart Split */}
            <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
              
              {/* Menu Column */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4 border-r">
                
                {/* Search & Category Filter */}
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search dishes..."
                      value={menuSearch}
                      onChange={(e) => setMenuSearch(e.target.value)}
                      className="pl-9 rounded-xl text-xs h-9"
                    />
                  </div>

                  <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
                    <button
                      onClick={() => setActiveCategory("All")}
                      className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors ${activeCategory === "All" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                    >
                      All
                    </button>
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setActiveCategory(cat.name)}
                        className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors ${activeCategory === cat.name ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Items List */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {menu
                    .filter((m) => {
                      const matchSearch = m.name.toLowerCase().includes(menuSearch.toLowerCase());
                      const matchCat = activeCategory === "All" || m.category === activeCategory;
                      return matchSearch && matchCat && m.available !== false;
                    })
                    .map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handleAddToCart(item)}
                        className="p-3 rounded-2xl border bg-card hover:bg-muted/40 cursor-pointer transition-all flex items-center justify-between group shadow-sm"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={getImageUrl(item.image)}
                            alt={item.name}
                            className="h-10 w-10 rounded-xl object-cover"
                          />
                          <div>
                            <h4 className="font-bold text-xs group-hover:text-primary transition-colors">{item.name}</h4>
                            <span className="font-black text-primary text-xs">{formatETB(item.price)}</span>
                          </div>
                        </div>
                        <Button size="icon" variant="ghost" className="h-7 w-7 rounded-xl text-primary shrink-0">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                </div>

              </div>

              {/* Cart Column */}
              <div className="w-full md:w-72 bg-muted/20 p-4 flex flex-col justify-between overflow-y-auto space-y-4">
                <div>
                  <h4 className="font-black text-xs uppercase tracking-wider text-muted-foreground mb-3">Selected Cart Items</h4>

                  {cartItems.length === 0 ? (
                    <div className="py-8 text-center text-xs text-muted-foreground italic">
                      Tap menu items to add to order
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {cartItems.map((cartItem) => (
                        <div key={cartItem.menuItemId} className="p-3 rounded-xl bg-card border space-y-2 text-xs">
                          <div className="flex justify-between items-start font-bold">
                            <span>{cartItem.name}</span>
                            <span className="text-primary">{formatETB(cartItem.price * cartItem.quantity)}</span>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 bg-muted p-1 rounded-lg">
                              <button
                                onClick={() => handleUpdateCartQty(cartItem.menuItemId, -1)}
                                className="h-5 w-5 rounded bg-background flex items-center justify-center font-bold"
                              >
                                -
                              </button>
                              <span className="w-4 text-center font-bold">{cartItem.quantity}</span>
                              <button
                                onClick={() => handleUpdateCartQty(cartItem.menuItemId, 1)}
                                className="h-5 w-5 rounded bg-background flex items-center justify-center font-bold"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          <Input
                            placeholder="Kitchen notes (e.g. extra spicy)"
                            value={cartItem.specialInstructions}
                            onChange={(e) => handleUpdateInstructions(cartItem.menuItemId, e.target.value)}
                            className="text-[11px] h-7 rounded-lg"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Totals & Submit */}
                <div className="pt-3 border-t space-y-3 bg-card p-3 rounded-2xl border">
                  <div className="space-y-1 text-xs font-semibold">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Subtotal</span>
                      <span>{formatETB(drawerSubtotal)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>VAT Tax (15%)</span>
                      <span>{formatETB(drawerTax)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Service (10%)</span>
                      <span>{formatETB(drawerService)}</span>
                    </div>
                    <div className="flex justify-between font-black text-sm pt-2 border-t text-foreground">
                      <span>Total Due</span>
                      <span className="text-primary">{formatETB(drawerTotal)}</span>
                    </div>
                  </div>

                  <Button
                    onClick={handleSubmitOrder}
                    disabled={cartItems.length === 0 || createOrderMutation.isPending || appendOrderItemsMutation.isPending}
                    className="w-full h-12 rounded-xl font-black text-xs bg-primary hover:bg-primary/90 shadow-md"
                  >
                    {createOrderMutation.isPending || appendOrderItemsMutation.isPending
                      ? "Submitting..."
                      : `Submit Order • ${formatETB(drawerTotal)}`}
                  </Button>
                </div>

              </div>

            </div>

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
