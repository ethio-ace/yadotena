"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Order, OrderStatus } from "@/types";
import { Clock, Flame, Check, UtensilsCrossed, Volume2, VolumeX, AlertTriangle, Layers, ChevronRight } from "lucide-react";
import { soundAlerts } from "@/lib/audioAlerts";
import { KitchenOrderCard } from "@/components/dashboard/KitchenOrderCard";

export default function KitchenDashboard() {
  const queryClient = useQueryClient();

  // Tab Filter State ('ALL' | 'PENDING' | 'PREPARING' | 'READY')
  const [activeTab, setActiveTab] = useState<"ALL" | "PENDING" | "PREPARING" | "READY">("ALL");

  const { data: orders = [], isLoading } = useQuery({
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
      queryClient.invalidateQueries({ queryKey: ["tables"] });
    },
    onError: (err: any) => alert(err.message || "Failed to update order status"),
  });

  if (isLoading) {
    return (
      <div className="p-12 text-center text-muted-foreground animate-pulse font-bold text-sm">
        Loading kitchen order tickets...
      </div>
    );
  }

  const newOrders = orders?.filter((o) => o.status === "PENDING") || [];
  const preparingOrders = orders?.filter((o) => o.status === "PREPARING") || [];
  const readyOrders = orders?.filter((o) => o.status === "READY") || [];
  const totalActiveCount = newOrders.length + preparingOrders.length + readyOrders.length;

  return (
    <div className="space-y-4 animate-in fade-in duration-200 pb-20">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-4 rounded-2xl border shadow-sm">
        <div>
          <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <UtensilsCrossed className="h-6 w-6 text-primary" />
            <span>Kitchen Display Station (KDS)</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Active Chef Line • Tap tickets to progress order statuses in real time.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {newOrders.length > 0 && (
            <Badge className="bg-primary text-primary-foreground font-black text-xs px-3 py-1 animate-pulse">
              🔥 {newOrders.length} New Unprepared Ticket(s)
            </Badge>
          )}

          <Badge variant="outline" className="font-bold text-xs px-3 py-1">
            {totalActiveCount} Active Session(s)
          </Badge>
        </div>
      </div>

      {/* Stepper / Tab Station Selector */}
      <div className="bg-card border p-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2 overflow-x-auto text-xs pb-0.5 scrollbar-none">
          
          {/* ALL ACTIVE STATIONS */}
          <button
            onClick={() => setActiveTab("ALL")}
            className={`px-4 py-2.5 rounded-xl font-black transition-all flex items-center gap-2 border whitespace-nowrap ${
              activeTab === "ALL"
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-muted/40 border-transparent text-muted-foreground hover:bg-muted"
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>All Active Stations ({totalActiveCount})</span>
          </button>

          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 hidden sm:inline" />

          {/* NEW ORDERS TAB */}
          <button
            onClick={() => setActiveTab("PENDING")}
            className={`px-4 py-2.5 rounded-xl font-black transition-all flex items-center gap-2 border whitespace-nowrap ${
              activeTab === "PENDING"
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-muted/40 border-transparent text-muted-foreground hover:bg-muted"
            }`}
          >
            <span className="h-5 w-5 rounded-full bg-background/20 flex items-center justify-center text-[10px] font-bold">
              1
            </span>
            <span>🔥 New Orders ({newOrders.length})</span>
          </button>

          {/* IN PREPARATION TAB */}
          <button
            onClick={() => setActiveTab("PREPARING")}
            className={`px-4 py-2.5 rounded-xl font-black transition-all flex items-center gap-2 border whitespace-nowrap ${
              activeTab === "PREPARING"
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-muted/40 border-transparent text-muted-foreground hover:bg-muted"
            }`}
          >
            <span className="h-5 w-5 rounded-full bg-background/20 flex items-center justify-center text-[10px] font-bold">
              2
            </span>
            <span>🍳 Cooking in Progress ({preparingOrders.length})</span>
          </button>

          {/* READY FOR PICKUP TAB */}
          <button
            onClick={() => setActiveTab("READY")}
            className={`px-4 py-2.5 rounded-xl font-black transition-all flex items-center gap-2 border whitespace-nowrap ${
              activeTab === "READY"
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-muted/40 border-transparent text-muted-foreground hover:bg-muted"
            }`}
          >
            <span className="h-5 w-5 rounded-full bg-background/20 flex items-center justify-center text-[10px] font-bold">
              3
            </span>
            <span>🍽️ Ready for Pickup ({readyOrders.length})</span>
          </button>

        </div>
      </div>

      {/* VIEW MODE 1: ALL STATIONS (3-COLUMN KANBAN GRID) */}
      {activeTab === "ALL" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          
          {/* COLUMN 1: NEW ORDERS */}
          <Card className="rounded-2xl border p-4 space-y-4 bg-card flex flex-col min-h-[500px]">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2 font-black text-sm text-foreground">
                <Flame className="h-4 w-4 text-primary" />
                <span>New / Needs Cooking</span>
              </div>
              <Badge className="bg-primary text-primary-foreground font-black text-xs px-2.5 py-0.5">
                {newOrders.length}
              </Badge>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto pr-1">
              {newOrders.length === 0 ? (
                <div className="py-16 text-center text-xs text-muted-foreground border border-dashed rounded-2xl">
                  No new incoming orders.
                </div>
              ) : (
                newOrders.map((order) => (
                  <KitchenOrderCard 
                    key={order.id} 
                    order={order} 
                    isUrgent
                    actionText="🔥 Start Cooking"
                    onAction={() => updateStatus.mutate({ id: order.id, status: "PREPARING" })}
                    isLoading={updateStatus.isPending}
                  />
                ))
              )}
            </div>
          </Card>

          {/* COLUMN 2: COOKING IN PROGRESS */}
          <Card className="rounded-2xl border p-4 space-y-4 bg-card flex flex-col min-h-[500px]">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2 font-black text-sm text-foreground">
                <Clock className="h-4 w-4 text-primary" />
                <span>Cooking in Progress</span>
              </div>
              <Badge variant="outline" className="font-black text-xs px-2.5 py-0.5 border-primary/40 text-primary">
                {preparingOrders.length}
              </Badge>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto pr-1">
              {preparingOrders.length === 0 ? (
                <div className="py-16 text-center text-xs text-muted-foreground border border-dashed rounded-2xl">
                  No dishes currently cooking.
                </div>
              ) : (
                preparingOrders.map((order) => (
                  <KitchenOrderCard 
                    key={order.id} 
                    order={order} 
                    actionText="🍽️ Mark Ready for Pickup"
                    onAction={() => updateStatus.mutate({ id: order.id, status: "READY" })}
                    isLoading={updateStatus.isPending}
                  />
                ))
              )}
            </div>
          </Card>

          {/* COLUMN 3: READY FOR PICKUP */}
          <Card className="rounded-2xl border p-4 space-y-4 bg-card flex flex-col min-h-[500px]">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2 font-black text-sm text-foreground">
                <Check className="h-4 w-4 text-primary" />
                <span>Ready on Pickup Counter</span>
              </div>
              <Badge variant="outline" className="font-black text-xs px-2.5 py-0.5 border-muted-foreground/30">
                {readyOrders.length}
              </Badge>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto pr-1">
              {readyOrders.length === 0 ? (
                <div className="py-16 text-center text-xs text-muted-foreground border border-dashed rounded-2xl">
                  No orders waiting for pickup.
                </div>
              ) : (
                readyOrders.map((order) => (
                  <KitchenOrderCard 
                    key={order.id} 
                    order={order} 
                    actionText="✓ Mark Delivered / Complete"
                    onAction={() => updateStatus.mutate({ id: order.id, status: "COMPLETED" })}
                    isLoading={updateStatus.isPending}
                  />
                ))
              )}
            </div>
          </Card>

        </div>
      )}

      {/* VIEW MODE 2: FILTERED TAB VIEW (FOCUS GRID) */}
      {activeTab !== "ALL" && (
        <Card className="rounded-2xl border p-5 space-y-4 bg-card">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="font-black text-base uppercase tracking-wider">
              {activeTab === "PENDING" && "🔥 New Incoming Orders"}
              {activeTab === "PREPARING" && "🍳 Dishes Cooking Line"}
              {activeTab === "READY" && "🍽️ Ready for Pickup Counter"}
            </h3>

            <Badge className="bg-primary text-primary-foreground font-black text-xs px-3 py-1">
              {activeTab === "PENDING" && `${newOrders.length} Ticket(s)`}
              {activeTab === "PREPARING" && `${preparingOrders.length} Ticket(s)`}
              {activeTab === "READY" && `${readyOrders.length} Ticket(s)`}
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeTab === "PENDING" && (
              newOrders.length === 0 ? (
                <div className="col-span-full py-16 text-center text-xs text-muted-foreground border border-dashed rounded-2xl">
                  No new incoming orders.
                </div>
              ) : (
                newOrders.map((order) => (
                  <KitchenOrderCard 
                    key={order.id} 
                    order={order} 
                    isUrgent
                    actionText="🔥 Start Cooking"
                    onAction={() => updateStatus.mutate({ id: order.id, status: "PREPARING" })}
                    isLoading={updateStatus.isPending}
                  />
                ))
              )
            )}

            {activeTab === "PREPARING" && (
              preparingOrders.length === 0 ? (
                <div className="col-span-full py-16 text-center text-xs text-muted-foreground border border-dashed rounded-2xl">
                  No dishes currently cooking.
                </div>
              ) : (
                preparingOrders.map((order) => (
                  <KitchenOrderCard 
                    key={order.id} 
                    order={order} 
                    actionText="🍽️ Mark Ready for Pickup"
                    onAction={() => updateStatus.mutate({ id: order.id, status: "READY" })}
                    isLoading={updateStatus.isPending}
                  />
                ))
              )
            )}

            {activeTab === "READY" && (
              readyOrders.length === 0 ? (
                <div className="col-span-full py-16 text-center text-xs text-muted-foreground border border-dashed rounded-2xl">
                  No orders waiting for pickup.
                </div>
              ) : (
                readyOrders.map((order) => (
                  <KitchenOrderCard 
                    key={order.id} 
                    order={order} 
                    actionText="✓ Mark Delivered / Complete"
                    onAction={() => updateStatus.mutate({ id: order.id, status: "COMPLETED" })}
                    isLoading={updateStatus.isPending}
                  />
                ))
              )
            )}
          </div>
        </Card>
      )}

    </div>
  );
}
