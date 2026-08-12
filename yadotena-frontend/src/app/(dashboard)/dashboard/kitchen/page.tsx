"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Order, OrderStatus } from "@/types";
import { Clock, Flame, Check, UtensilsCrossed, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { soundAlerts } from "@/lib/audioAlerts";
import { AddExtraSelectionModal } from "@/components/dashboard/AddExtraSelectionModal";
import { KitchenOrderCard } from "@/components/dashboard/KitchenOrderCard";
import { FullPageMenuPOS } from "@/components/dashboard/FullPageMenuPOS";

export default function KitchenDashboard() {
  const [selectedOrderToEdit, setSelectedOrderToEdit] = useState<Order | null>(null);
  const [showExtraSelectionForOrder, setShowExtraSelectionForOrder] = useState<Order | null>(null);
  const [initialCategory, setInitialCategory] = useState<string>("All");

  const queryClient = useQueryClient();
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: api.orders.getAll,
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) => 
      api.orders.updateStatus(id, status),
    onSuccess: () => {
      soundAlerts.playActionPing();
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });

  if (selectedOrderToEdit) {
    return (
      <div className="h-full w-full">
        <FullPageMenuPOS 
          existingOrder={selectedOrderToEdit}
          initialCategory={initialCategory}
          onCancel={() => setSelectedOrderToEdit(null)}
          onSuccess={() => setSelectedOrderToEdit(null)}
        />
      </div>
    );
  }

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse font-medium">Loading kitchen orders...</div>;
  }

  const newOrders = orders?.filter(o => o.status === "PENDING") || [];
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

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-y-auto lg:overflow-hidden min-h-0 lg:min-h-[500px] pb-24 lg:pb-0">
        {/* New Orders Column */}
        <div className="flex flex-col bg-rose-500/5 rounded-2xl p-4 overflow-hidden border border-rose-500/20 lg:h-full h-[500px]">
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
                  onAddItems={() => setShowExtraSelectionForOrder(order as any)}
                />
              ))
            )}
          </div>
        </div>

        {/* Preparing Column */}
        <div className="flex flex-col bg-amber-500/5 rounded-2xl p-4 overflow-hidden border border-amber-500/20 lg:h-full h-[500px]">
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
                  onAddItems={() => setShowExtraSelectionForOrder(order as any)}
                />
              ))
            )}
          </div>
        </div>

        {/* Ready Column */}
        <div className="flex flex-col bg-emerald-500/5 rounded-2xl p-4 overflow-hidden border border-emerald-500/20 lg:h-full h-[500px]">
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
                  actionText="✓ Mark as Complete"
                  actionVariant="outline"
                  onAction={() => updateStatus.mutate({ id: order.id, status: "COMPLETED" })}
                  isLoading={updateStatus.isPending}
                  onAddItems={() => setShowExtraSelectionForOrder(order as any)}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {showExtraSelectionForOrder && (
        <AddExtraSelectionModal
          isOpen={!!showExtraSelectionForOrder}
          onClose={() => setShowExtraSelectionForOrder(null)}
          onSelectOption={(category) => {
            setInitialCategory(category);
            setSelectedOrderToEdit(showExtraSelectionForOrder);
            setShowExtraSelectionForOrder(null);
          }}
        />
      )}
    </div>
  );
}
