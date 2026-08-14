"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatETB } from "@/lib/currency";
import { Order, OrderStatus } from "@/types";
import { 
  Truck, CheckCircle, Clock, ShoppingBag, Phone, MapPin, 
  Utensils, ArrowUpRight, Sparkles, Check, AlertCircle, RefreshCw
} from "lucide-react";

interface ReadyDeliveryPaneProps {
  onClose?: () => void;
}

export function ReadyDeliveryPane({ onClose }: ReadyDeliveryPaneProps) {
  const queryClient = useQueryClient();
  const [filterType, setFilterType] = useState<"ALL" | "DINE_IN" | "TAKEAWAY" | "DELIVERY">("ALL");

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ["orders"],
    queryFn: api.orders.getAll,
    refetchInterval: 10000,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) => 
      api.orders.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["tables"] });
    },
    onError: (err: any) => alert(err.message || "Status update failed"),
  });

  const readyOrders = orders.filter((o) => o.status === "READY");

  const filteredReadyOrders = readyOrders.filter((o) => {
    if (filterType === "ALL") return true;
    const typeUpper = (o.type || (o as any).orderType || "DINE_IN").toUpperCase();
    return typeUpper === filterType;
  });

  const dineInCount = readyOrders.filter((o) => (o.type || (o as any).orderType || "").toUpperCase() === "DINE_IN").length;
  const takeawayCount = readyOrders.filter((o) => (o.type || (o as any).orderType || "").toUpperCase() === "TAKEAWAY").length;
  const deliveryCount = readyOrders.filter((o) => (o.type || (o as any).orderType || "").toUpperCase() === "DELIVERY").length;

  return (
    <Card className="rounded-3xl border-primary/20 bg-card shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      
      {/* Pane Header */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary text-primary-foreground rounded-2xl shadow-sm">
            <Truck className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-black text-xl tracking-tight text-foreground flex items-center gap-2">
              <span>Ready Dishes & Delivery Dispatch Pane</span>
              {readyOrders.length > 0 && (
                <Badge className="bg-primary text-primary-foreground font-black text-xs px-2.5 py-0.5 rounded-full animate-pulse">
                  {readyOrders.length} Ready
                </Badge>
              )}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manage cooked dishes ready for table service, counter pick-up, or courier dispatch.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => queryClient.invalidateQueries({ queryKey: ["orders"] })}
            className="rounded-xl h-9 text-xs font-bold gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh</span>
          </Button>

          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose} className="rounded-xl h-9 text-xs font-bold">
              Close
            </Button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="p-4 bg-muted/30 border-b flex items-center gap-2 overflow-x-auto text-xs scrollbar-none">
        <button
          onClick={() => setFilterType("ALL")}
          className={`px-3.5 py-2 rounded-xl font-black transition-all whitespace-nowrap flex items-center gap-1.5 ${
            filterType === "ALL" 
              ? "bg-primary text-primary-foreground shadow-sm" 
              : "bg-card text-muted-foreground hover:bg-muted border"
          }`}
        >
          <span>All Ready Orders ({readyOrders.length})</span>
        </button>

        <button
          onClick={() => setFilterType("DINE_IN")}
          className={`px-3.5 py-2 rounded-xl font-black transition-all whitespace-nowrap flex items-center gap-1.5 ${
            filterType === "DINE_IN" 
              ? "bg-primary text-primary-foreground shadow-sm" 
              : "bg-card text-muted-foreground hover:bg-muted border"
          }`}
        >
          <Utensils className="h-3.5 w-3.5" />
          <span>Dine-In Tables ({dineInCount})</span>
        </button>

        <button
          onClick={() => setFilterType("TAKEAWAY")}
          className={`px-3.5 py-2 rounded-xl font-black transition-all whitespace-nowrap flex items-center gap-1.5 ${
            filterType === "TAKEAWAY" 
              ? "bg-primary text-primary-foreground shadow-sm" 
              : "bg-card text-muted-foreground hover:bg-muted border"
          }`}
        >
          <ShoppingBag className="h-3.5 w-3.5" />
          <span>Takeaway Counter ({takeawayCount})</span>
        </button>

        <button
          onClick={() => setFilterType("DELIVERY")}
          className={`px-3.5 py-2 rounded-xl font-black transition-all whitespace-nowrap flex items-center gap-1.5 ${
            filterType === "DELIVERY" 
              ? "bg-primary text-primary-foreground shadow-sm" 
              : "bg-card text-muted-foreground hover:bg-muted border"
          }`}
        >
          <Truck className="h-3.5 w-3.5" />
          <span>Delivery Courier ({deliveryCount})</span>
        </button>
      </div>

      {/* Orders List Grid */}
      <CardContent className="p-5">
        {isLoading ? (
          <div className="py-16 text-center text-muted-foreground text-xs font-bold animate-pulse">
            Checking ready order tickets...
          </div>
        ) : filteredReadyOrders.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground border-2 border-dashed rounded-3xl p-6 space-y-2">
            <CheckCircle className="h-10 w-10 text-muted-foreground/40 mx-auto" />
            <h4 className="font-black text-sm text-foreground">No orders currently waiting in this queue</h4>
            <p className="text-xs opacity-70 max-w-sm mx-auto">
              When kitchen staff marks cooked orders as READY, they will immediately show up here for delivery or serving.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredReadyOrders.map((order) => {
              const orderType = (order.type || (order as any).orderType || "DINE_IN").toUpperCase();
              const isDelivery = orderType === "DELIVERY";
              const isTakeaway = orderType === "TAKEAWAY";

              return (
                <div
                  key={order.id}
                  className="rounded-2xl border bg-card p-4 space-y-3.5 shadow-sm hover:shadow-md transition-all relative flex flex-col justify-between"
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between border-b pb-2.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-base text-foreground">
                          #{order.id.substring(0, 8)}
                        </span>
                        <Badge 
                          variant="outline" 
                          className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                            isDelivery 
                              ? "bg-blue-500/10 text-blue-600 border-blue-500/30" 
                              : isTakeaway 
                                ? "bg-amber-500/10 text-amber-600 border-amber-500/30" 
                                : "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                          }`}
                        >
                          {orderType}
                        </Badge>
                      </div>

                      <div className="text-xs font-bold text-muted-foreground mt-0.5">
                        {order.tableId ? (
                          <span className="text-primary font-black">Table #{order.tableId.substring(0, 6)}</span>
                        ) : order.customerName ? (
                          <span>Customer: {order.customerName}</span>
                        ) : (
                          <span>Counter Order</span>
                        )}
                      </div>
                    </div>

                    <span className="font-black text-sm text-primary">
                      {formatETB(order.total || 0)}
                    </span>
                  </div>

                  {/* Customer / Delivery Info */}
                  {(isDelivery || isTakeaway || order.customerPhone || order.deliveryAddress) && (
                    <div className="bg-muted/40 p-2.5 rounded-xl text-xs space-y-1">
                      {order.customerPhone && (
                        <div className="flex items-center gap-1.5 font-bold text-muted-foreground">
                          <Phone className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span>{order.customerPhone}</span>
                        </div>
                      )}
                      {order.deliveryAddress && (
                        <div className="flex items-start gap-1.5 font-medium text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{order.deliveryAddress}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Items List */}
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider block">
                      Dishes Ready to Pick Up ({order.items?.length || 0})
                    </span>
                    <div className="space-y-1">
                      {order.items?.map((item, idx) => (
                        <div key={idx} className="text-xs flex items-start justify-between bg-muted/20 p-2 rounded-lg">
                          <div>
                            <span className="font-bold text-foreground">
                              {item.quantity || (item as any).qty || 1}x {item.name || item.menuItemId}
                            </span>
                            {item.selectedAddons && item.selectedAddons.length > 0 && (
                              <div className="text-[10px] font-semibold text-primary/90 mt-0.5">
                                + {item.selectedAddons.map(a => typeof a === 'string' ? a : (a as any).name).join(", ")}
                              </div>
                            )}
                            {item.specialInstructions && (
                              <div className="text-[10px] italic text-amber-600 dark:text-amber-400 font-medium">
                                Note: {item.specialInstructions}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 border-t space-y-2">
                    <Button
                      size="sm"
                      onClick={() => updateStatusMutation.mutate({ id: order.id, status: "COMPLETED" })}
                      disabled={updateStatusMutation.isPending}
                      className="w-full h-9 text-xs font-black rounded-xl bg-primary text-primary-foreground gap-1.5 shadow-sm"
                    >
                      <Truck className="h-3.5 w-3.5" />
                      <span>Dispatch / Handed & Mark Complete</span>
                    </Button>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </CardContent>

    </Card>
  );
}
