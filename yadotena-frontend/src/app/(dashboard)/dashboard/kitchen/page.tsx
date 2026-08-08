"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Order, OrderStatus } from "@/types";
import { Clock, Flame, Check, UtensilsCrossed, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { soundAlerts } from "@/lib/audioAlerts";

export default function KitchenDashboard() {
  const queryClient = useQueryClient();
  const { data: orders, isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: api.orders.getAll,
    refetchInterval: 3000,
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) => 
      api.orders.updateStatus(id, status),
    onSuccess: () => {
      soundAlerts.playActionPing();
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse font-medium">Loading kitchen orders...</div>;
  }

  const newOrders = orders?.filter(o => o.status === "PENDING" || o.status === "CONFIRMED") || [];
  const preparingOrders = orders?.filter(o => o.status === "PREPARING") || [];
  const readyOrders = orders?.filter(o => o.status === "READY") || [];

  return (
    <div className="h-full flex flex-col space-y-4 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-3xl font-black tracking-tight flex items-center gap-2">
            <UtensilsCrossed className="h-7 w-7 text-primary" />
            <span>Kitchen Display System</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Active chef line • Incoming orders chime repeatedly until marked "Start Preparing".
          </p>
        </div>

        {newOrders.length > 0 && (
          <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 px-3 py-1.5 rounded-full text-xs font-bold animate-pulse">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{newOrders.length} New Orders Alerting</span>
          </div>
        )}
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-hidden min-h-[500px]">
        {/* New Orders Column */}
        <div className="flex flex-col bg-rose-500/5 rounded-2xl p-4 overflow-hidden border border-rose-500/20">
          <h3 className="font-extrabold text-base mb-4 flex items-center justify-between text-rose-600 dark:text-rose-400">
            <span className="flex items-center gap-1.5">
              <Flame className="h-4 w-4" />
              <span>New / Needs Prep</span>
            </span>
            <span className="bg-rose-500 text-white px-2.5 py-0.5 rounded-full text-xs font-bold">
              {newOrders.length}
            </span>
          </h3>
          <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
            {newOrders.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground/70 text-xs">
                No new orders waiting. System will chime when an order arrives.
              </div>
            ) : (
              newOrders.map(order => (
                <KitchenOrderCard 
                  key={order.id} 
                  order={order} 
                  isUrgent
                  actionText="🔥 Start Preparing"
                  actionVariant="default"
                  onAction={() => updateStatus.mutate({ id: order.id, status: "PREPARING" })}
                  isLoading={updateStatus.isPending}
                />
              ))
            )}
          </div>
        </div>

        {/* Preparing Column */}
        <div className="flex flex-col bg-amber-500/5 rounded-2xl p-4 overflow-hidden border border-amber-500/20">
          <h3 className="font-extrabold text-base mb-4 flex items-center justify-between text-amber-600 dark:text-amber-400">
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              <span>Cooking in Progress</span>
            </span>
            <span className="bg-amber-500/20 px-2.5 py-0.5 rounded-full text-xs font-bold">
              {preparingOrders.length}
            </span>
          </h3>
          <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
            {preparingOrders.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground/70 text-xs">
                No dishes currently in preparation.
              </div>
            ) : (
              preparingOrders.map(order => (
                <KitchenOrderCard 
                  key={order.id} 
                  order={order} 
                  actionText="🍽️ Mark as Ready to Serve"
                  actionVariant="secondary"
                  onAction={() => updateStatus.mutate({ id: order.id, status: "READY" })}
                  isLoading={updateStatus.isPending}
                />
              ))
            )}
          </div>
        </div>

        {/* Ready Column */}
        <div className="flex flex-col bg-emerald-500/5 rounded-2xl p-4 overflow-hidden border border-emerald-500/20">
          <h3 className="font-extrabold text-base mb-4 flex items-center justify-between text-emerald-600 dark:text-emerald-400">
            <span className="flex items-center gap-1.5">
              <Check className="h-4 w-4" />
              <span>Ready for Waiter Pickup</span>
            </span>
            <span className="bg-emerald-500/20 px-2.5 py-0.5 rounded-full text-xs font-bold">
              {readyOrders.length}
            </span>
          </h3>
          <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
            {readyOrders.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground/70 text-xs">
                No orders waiting on pickup counter.
              </div>
            ) : (
              readyOrders.map(order => (
                <KitchenOrderCard 
                  key={order.id} 
                  order={order} 
                  hideAction
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function KitchenOrderCard({ 
  order, 
  actionText, 
  actionVariant = "secondary", 
  onAction,
  isLoading,
  hideAction,
  isUrgent
}: any) {
  return (
    <Card className={`shadow-sm rounded-2xl transition-all ${
      isUrgent 
        ? "border-2 border-rose-500/60 shadow-lg shadow-rose-500/10 ring-2 ring-rose-500/10 animate-in fade-in" 
        : "border"
    }`}>
      <CardHeader className={`p-4 pb-2 border-b rounded-t-2xl ${isUrgent ? "bg-rose-500/10" : "bg-muted/10"}`}>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-base font-black flex items-center gap-1.5">
              <span>#{order.id.slice(-6).toUpperCase()}</span>
              {isUrgent && (
                <span className="text-[10px] font-extrabold bg-rose-500 text-white px-2 py-0.5 rounded-full">
                  NEW
                </span>
              )}
            </CardTitle>
            <p className="text-xs font-bold text-primary mt-0.5">
              {order.type === "DINE_IN" ? `Table ${order.tableId?.replace('t', '')}` : "Takeaway / Delivery"}
            </p>
          </div>
          <div className="flex items-center text-[11px] text-muted-foreground font-semibold bg-background px-2 py-0.5 rounded-full border">
            <Clock className="h-3 w-3 mr-1 text-primary" />
            {formatDistanceToNow(new Date(order.createdAt))} ago
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-2">
        <ul className="space-y-2">
          {order.items.map((item: any, i: number) => (
            <li key={i} className="flex flex-col">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-black text-sm text-primary bg-primary/10 px-2 py-0.5 rounded-lg">
                    {item.quantity}×
                  </span>
                  <span className="font-bold text-sm text-foreground">{item.name}</span>
                </div>
              </div>
              {item.specialInstructions && (
                <div className="ml-8 mt-1 text-xs bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 px-2 py-1 rounded-lg font-medium">
                  Note: "{item.specialInstructions}"
                </div>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
      {!hideAction && (
        <CardFooter className="p-3 pt-0">
          <Button 
            className={`w-full text-xs font-black h-10 rounded-xl shadow-sm ${
              isUrgent ? "bg-rose-600 hover:bg-rose-700 text-white" : ""
            }`}
            variant={actionVariant as any}
            onClick={onAction}
            disabled={isLoading}
          >
            {actionText}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
