"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Order, OrderStatus } from "@/types";
import { Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function KitchenDashboard() {
  const queryClient = useQueryClient();
  const { data: orders, isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: api.orders.getAll,
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) => 
      api.orders.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading kitchen orders...</div>;
  }

  const newOrders = orders?.filter(o => o.status === "PENDING" || o.status === "CONFIRMED") || [];
  const preparingOrders = orders?.filter(o => o.status === "PREPARING") || [];
  const readyOrders = orders?.filter(o => o.status === "READY") || [];

  return (
    <div className="h-full flex flex-col space-y-4 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Kitchen Display</h2>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-hidden">
        {/* New Column */}
        <div className="flex flex-col bg-muted/30 rounded-xl p-4 overflow-hidden border">
          <h3 className="font-semibold text-lg mb-4 flex items-center justify-between">
            <span>New / Confirmed</span>
            <span className="bg-primary/20 text-primary px-2 py-0.5 rounded-full text-xs">{newOrders.length}</span>
          </h3>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-thin">
            {newOrders.map(order => (
              <KitchenOrderCard 
                key={order.id} 
                order={order} 
                actionText="Start Preparing"
                onAction={() => updateStatus.mutate({ id: order.id, status: "PREPARING" })}
                isLoading={updateStatus.isPending}
              />
            ))}
          </div>
        </div>

        {/* Preparing Column */}
        <div className="flex flex-col bg-amber-500/5 rounded-xl p-4 overflow-hidden border border-amber-500/20">
          <h3 className="font-semibold text-lg mb-4 flex items-center justify-between text-amber-600 dark:text-amber-400">
            <span>Preparing</span>
            <span className="bg-amber-500/20 px-2 py-0.5 rounded-full text-xs">{preparingOrders.length}</span>
          </h3>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-thin">
            {preparingOrders.map(order => (
              <KitchenOrderCard 
                key={order.id} 
                order={order} 
                actionText="Mark as Ready"
                actionVariant="default"
                onAction={() => updateStatus.mutate({ id: order.id, status: "READY" })}
                isLoading={updateStatus.isPending}
              />
            ))}
          </div>
        </div>

        {/* Ready Column */}
        <div className="flex flex-col bg-emerald-500/5 rounded-xl p-4 overflow-hidden border border-emerald-500/20">
          <h3 className="font-semibold text-lg mb-4 flex items-center justify-between text-emerald-600 dark:text-emerald-400">
            <span>Ready for Pickup</span>
            <span className="bg-emerald-500/20 px-2 py-0.5 rounded-full text-xs">{readyOrders.length}</span>
          </h3>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-thin">
            {readyOrders.map(order => (
              <KitchenOrderCard 
                key={order.id} 
                order={order} 
                hideAction
              />
            ))}
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
  hideAction 
}: any) {
  return (
    <Card className="border-2 shadow-sm">
      <CardHeader className="p-4 pb-2 border-b bg-muted/10">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{order.id}</CardTitle>
            <p className="text-sm font-medium text-primary mt-1">
              {order.type === "DINE_IN" ? `Table ${order.tableId?.replace('t', '')}` : "Takeaway/Delivery"}
            </p>
          </div>
          <div className="flex items-center text-xs text-muted-foreground font-medium bg-background px-2 py-1 rounded-full border">
            <Clock className="h-3 w-3 mr-1" />
            {formatDistanceToNow(new Date(order.createdAt))} ago
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <ul className="space-y-3">
          {order.items.map((item: any, i: number) => (
            <li key={i} className="flex flex-col">
              <div className="flex items-start">
                <span className="font-bold text-lg w-8">{item.quantity}×</span>
                <span className="font-medium text-base">{item.name}</span>
              </div>
              {item.specialInstructions && (
                <div className="ml-8 mt-1 text-sm bg-destructive/10 text-destructive px-2 py-1 rounded-md inline-block self-start font-medium">
                  "{item.specialInstructions}"
                </div>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
      {!hideAction && (
        <CardFooter className="p-4 pt-0">
          <Button 
            className="w-full text-base font-bold py-6" 
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
