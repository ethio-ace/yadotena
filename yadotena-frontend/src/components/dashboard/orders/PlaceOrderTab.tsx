import { useEffect, useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { OrderType, MenuItem, OrderItem, Table, Order, AddonItem } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatETB } from "@/lib/currency";
import { addonNames } from "@/lib/kitchen";
import { findActiveOrderForTable } from "@/lib/tableUtils";
import { 
  ArrowLeft, Plus, Minus, Search, Utensils, 
  ShoppingBag, Truck, CheckCircle2, ChevronRight, X, CreditCard, Eye, AlertTriangle 
} from "lucide-react";
import { FullPageMenuPOS } from "@/components/dashboard/FullPageMenuPOS";
import { OrderProgressStepper } from "@/components/dashboard/OrderProgressStepper";
import { PaymentSettlementModal } from "@/components/PaymentSettlementModal";

export function PlaceOrderTab() {
  const queryClient = useQueryClient();

  // Queries
  const { data: menu, isLoading: isLoadingMenu } = useQuery({
    queryKey: ["menu"],
    queryFn: api.menu.getAll,
  });

  const { data: tables, isLoading: isLoadingTables } = useQuery({
    queryKey: ["tables"],
    queryFn: api.tables.getAll,
  });

  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ["orders"],
    queryFn: api.orders.getAll,
  });

  const { data: addons = [] } = useQuery<AddonItem[]>({
    queryKey: ["addons"],
    queryFn: () => api.addons.getAll(),
  });

  const addonMap = useMemo(() => Object.fromEntries(addons.map(a => [a.id, a.name])), [addons]);

  // Wizard & Modal State
  const [step, setStep] = useState<1 | 2>(1);
  const [retailOpen, setRetailOpen] = useState(false);
  const [activeTableModal, setActiveTableModal] = useState<{ table: Table; order: Order } | null>(null);
  const [paymentOrder, setPaymentOrder] = useState<Order | null>(null);
  const [appendExistingOrder, setAppendExistingOrder] = useState<Order | null>(null);

  // Inline success feedback
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  // Form State
  const [orderType, setOrderType] = useState<OrderType>("DINE_IN");
  const [selectedTable, setSelectedTable] = useState<string | null>(null);

  const handleTableClick = async (table: Table) => {
    let activeOrder = findActiveOrderForTable(table, orders);

    // If order was not in current orders list but table has a currentOrderId, fetch directly
    if (!activeOrder && table.currentOrderId) {
      try {
        const fetched = await api.orders.getById(table.currentOrderId);
        if (fetched && fetched.status !== "COMPLETED" && fetched.status !== "CANCELLED") {
          activeOrder = fetched;
        }
      } catch (err) {
        console.warn("Failed to fetch order by currentOrderId:", err);
      }
    }

    if (activeOrder) {
      setActiveTableModal({ table, order: activeOrder });
    } else {
      setOrderType("DINE_IN");
      setSelectedTable(table.id);
      setAppendExistingOrder(null);
      setStep(2);
    }
  };

  const handleStartAddItems = (table: Table, order: Order) => {
    setOrderType("DINE_IN");
    setSelectedTable(table.id);
    setAppendExistingOrder(order);
    setActiveTableModal(null);
    setStep(2);
  };

  const handleTypeSelect = (type: "TAKEAWAY" | "DELIVERY") => {
    setOrderType(type);
    setSelectedTable(null);
    setAppendExistingOrder(null);
    setStep(2);
  };

  // -------------------------------------------------------------
  // STEP 1: Table & Type Selection
  // -------------------------------------------------------------
  if (step === 1 && !retailOpen) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        {toast && (
          <div
            role="status"
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] px-4 py-2.5 rounded-xl border bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold shadow-xl animate-in fade-in slide-in-from-top-2 flex items-center gap-2"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            {toast}
          </div>
        )}
        <div className="text-center max-w-lg mx-auto mt-4 mb-8">
          <h3 className="text-2xl font-black mb-2">Select a Table or Order Type</h3>
          <p className="text-muted-foreground text-sm">Choose where to place this order or check active table progress.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto mb-8">
          <Button 
            variant="outline" 
            className="h-24 justify-start px-6 rounded-2xl hover:bg-amber-500/10 hover:border-amber-500/30 transition-all group"
            onClick={() => handleTypeSelect("TAKEAWAY")}
          >
            <div className="bg-amber-500/20 p-3 rounded-full mr-4 group-hover:scale-110 transition-transform">
              <ShoppingBag className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="text-left">
              <div className="font-bold text-lg text-foreground">Takeaway</div>
              <div className="text-xs text-muted-foreground font-medium">Customer picks up</div>
            </div>
            <ChevronRight className="ml-auto text-muted-foreground opacity-50" />
          </Button>

          <Button 
            variant="outline" 
            className="h-24 justify-start px-6 rounded-2xl hover:bg-blue-500/10 hover:border-blue-500/30 transition-all group"
            onClick={() => handleTypeSelect("DELIVERY")}
          >
            <div className="bg-blue-500/20 p-3 rounded-full mr-4 group-hover:scale-110 transition-transform">
              <Truck className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="text-left">
              <div className="font-bold text-lg text-foreground">Delivery</div>
              <div className="text-xs text-muted-foreground font-medium">Send to address</div>
            </div>
            <ChevronRight className="ml-auto text-muted-foreground opacity-50" />
          </Button>
        </div>

        <Button
          variant="outline"
          className="w-full max-w-4xl mx-auto mb-8 h-16 justify-center px-6 rounded-2xl border-dashed hover:bg-emerald-500/10 hover:border-emerald-500/40 transition-all group"
          onClick={() => {
            setOrderType("TAKEAWAY");
            setSelectedTable(null);
            setAppendExistingOrder(null);
            setRetailOpen(true);
          }}
        >
          <div className="bg-emerald-500/15 p-3 rounded-full mr-4 group-hover:scale-110 transition-transform">
            <ShoppingBag className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-left">
            <div className="font-bold text-lg text-foreground">Retail Shop Sale</div>
            <div className="text-xs text-muted-foreground font-medium">Dairy, bakery & pantry over the counter</div>
          </div>
          <ChevronRight className="ml-auto text-muted-foreground opacity-50" />
        </Button>

        <div className="max-w-4xl mx-auto">
          <h4 className="font-bold text-muted-foreground mb-4 flex items-center gap-2">
            <Utensils className="h-4 w-4" /> Dine-In Floor Tables
          </h4>
          {isLoadingTables ? (
            <div className="p-8 text-center animate-pulse">Loading tables...</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {tables?.map(table => {
                const activeOrder = findActiveOrderForTable(table, orders);
                const isOccupied = table.status !== "AVAILABLE" || !!activeOrder;

                return (
                  <Button
                    key={table.id}
                    variant="outline"
                    className={`h-28 flex-col justify-between p-3 rounded-2xl border-2 transition-all hover:border-primary/50 relative overflow-hidden ${
                      isOccupied 
                        ? "border-amber-500/50 bg-amber-500/5 hover:bg-amber-500/10" 
                        : "border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10"
                    }`}
                    onClick={() => handleTableClick(table)}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xl font-black text-foreground">{table.name}</span>
                      <Badge 
                        className={`text-[10px] font-bold ${
                          isOccupied 
                            ? "bg-amber-500 text-zinc-950" 
                            : "bg-emerald-600 text-white"
                        }`}
                      >
                        {isOccupied ? "Occupied" : "Open"}
                      </Badge>
                    </div>

                    {activeOrder ? (
                      <div className="w-full text-left pt-1 border-t border-border/50">
                        <div className="flex justify-between items-center text-xs font-bold">
                          <span className="text-amber-600 dark:text-amber-400">{activeOrder.status}</span>
                          <span className="font-mono text-foreground">{formatETB(activeOrder.total)}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate">{activeOrder.items?.length || 0} items ordered</p>
                      </div>
                    ) : (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium text-left w-full">Ready for new guest</p>
                    )}
                  </Button>
                );
              })}
            </div>
          )}
        </div>

        {/* OCCUPIED TABLE PROGRESS & ADD EXTRA ITEMS MODAL */}
        {activeTableModal && (
          <div 
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setActiveTableModal(null)}
          >
            <div 
              className="bg-card w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-5 border-b bg-muted/20 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black tracking-tight">{activeTableModal.table.name}</h2>
                    <Badge className="bg-amber-500 text-zinc-950 font-bold text-xs">
                      {activeTableModal.order.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                    Order #{activeTableModal.order.id.slice(-6).toUpperCase()} • {activeTableModal.table.capacity} seats
                  </p>
                </div>
                <button 
                  onClick={() => setActiveTableModal(null)}
                  className="p-1.5 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-5 space-y-6 max-h-[70vh] overflow-y-auto">
                {/* Live Progress Stepper */}
                <OrderProgressStepper status={activeTableModal.order.status} />

                {/* Items & Resolved Add-ons List */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                    <span>Ordered Items ({activeTableModal.order.items?.length || 0})</span>
                    <span className="font-mono text-foreground font-black text-sm">{formatETB(activeTableModal.order.total)}</span>
                  </h3>

                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {activeTableModal.order.items?.map((item, idx) => {
                      const addonsList = addonNames(item.selectedAddons, addonMap);
                      return (
                        <div key={item.id || idx} className="p-3 rounded-2xl border bg-background space-y-1">
                          <div className="flex items-start justify-between text-sm font-bold">
                            <span>
                              <span className="text-amber-500 font-extrabold mr-1.5">{item.quantity}×</span>
                              {item.name}
                            </span>
                            <span className="font-mono text-xs text-muted-foreground">{formatETB(item.price * item.quantity)}</span>
                          </div>

                          {/* Selected Addons */}
                          {addonsList.length > 0 && (
                            <div className="pl-4 space-y-0.5 text-xs text-muted-foreground border-l-2 border-amber-500/40">
                              {addonsList.map((aName, aIdx) => (
                                <div key={aIdx} className="flex items-center gap-1 text-foreground">
                                  <span className="text-amber-500 font-bold">+</span>
                                  <span>{aName}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Special Instructions */}
                          {item.specialInstructions && (
                            <div className="mt-1 bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 px-2.5 py-1 rounded-md text-xs font-bold flex items-center gap-1.5">
                              <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                              <span>⚠ {item.specialInstructions}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-5 border-t bg-muted/10 space-y-2.5">
                <Button
                  className="w-full h-13 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-black text-sm gap-2 shadow-lg shadow-amber-600/20"
                  onClick={() => handleStartAddItems(activeTableModal.table, activeTableModal.order)}
                >
                  <Plus className="h-5 w-5" />
                  <span>+ ADD EXTRA MENU ITEMS & ADD-ONS</span>
                </Button>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    className="h-11 rounded-xl font-bold text-xs gap-1.5 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                    onClick={() => {
                      setPaymentOrder(activeTableModal.order);
                      setActiveTableModal(null);
                    }}
                  >
                    <CreditCard className="h-4 w-4" />
                    <span>Settle Bill</span>
                  </Button>

                  <Button
                    variant="outline"
                    className="h-11 rounded-xl font-bold text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setOrderType("DINE_IN");
                      setSelectedTable(activeTableModal.table.id);
                      setAppendExistingOrder(null);
                      setActiveTableModal(null);
                      setStep(2);
                    }}
                  >
                    <Utensils className="h-4 w-4" />
                    <span>New Ticket</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PAYMENT MODAL */}
        <PaymentSettlementModal
          order={paymentOrder}
          isOpen={!!paymentOrder}
          onClose={() => setPaymentOrder(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["orders"] });
            queryClient.invalidateQueries({ queryKey: ["tables"] });
            setPaymentOrder(null);
            setToast("Payment settled successfully!");
          }}
        />
      </div>
    );
  }

  if (step === 2 || retailOpen) {
    return (
      <FullPageMenuPOS 
        orderType={orderType}
        tableId={selectedTable}
        existingOrder={appendExistingOrder}
        initialCategory={retailOpen ? "🛒 Retail Shop Store" : "All"}
        onCancel={() => {
          setStep(1);
          setRetailOpen(false);
          setAppendExistingOrder(null);
        }}
        onSuccess={() => {
          setStep(1);
          setSelectedTable(null);
          setRetailOpen(false);
          setAppendExistingOrder(null);
          setToast(appendExistingOrder ? "Extra items added to ticket!" : "Order placed successfully!");
        }}
      />
    );
  }

  return null;
}
