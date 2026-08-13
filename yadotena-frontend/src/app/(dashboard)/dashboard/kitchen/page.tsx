"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Order, OrderStatus } from "@/types";
import { Clock, Flame, Check, UtensilsCrossed, ArrowRight, ArrowLeft, ChevronRight } from "lucide-react";
import { soundAlerts } from "@/lib/audioAlerts";
import { KitchenOrderCard } from "@/components/dashboard/KitchenOrderCard";

export default function KitchenDashboard() {
  const queryClient = useQueryClient();

  // Multi-Step Kitchen Workflow State (Step 1: Incoming, Step 2: Cooking, Step 3: Ready)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

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
    <div className="space-y-5 animate-in fade-in duration-200 pb-20">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-4 rounded-2xl border shadow-sm">
        <div>
          <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <UtensilsCrossed className="h-6 w-6 text-primary" />
            <span>Kitchen Display Station (KDS)</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Follow the 3-step kitchen process to prepare and fulfill orders cleanly.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {newOrders.length > 0 && (
            <Badge className="bg-primary text-primary-foreground font-black text-xs px-3 py-1 animate-pulse">
              🔥 {newOrders.length} New Order(s)
            </Badge>
          )}

          <Badge variant="outline" className="font-bold text-xs px-3 py-1">
            {totalActiveCount} Active Ticket(s)
          </Badge>
        </div>
      </div>

      {/* 3-Step Guided Stepper Bar */}
      <div className="bg-card border p-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2 overflow-x-auto text-xs pb-0.5 scrollbar-none w-full sm:w-auto">
          
          {/* STEP 1: INCOMING ORDERS */}
          <button
            onClick={() => setCurrentStep(1)}
            className={`px-4 py-2.5 rounded-xl font-black transition-all flex items-center gap-2 border whitespace-nowrap ${
              currentStep === 1
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-muted/40 border-transparent text-muted-foreground hover:bg-muted"
            }`}
          >
            <span className="h-5 w-5 rounded-full bg-background/20 flex items-center justify-center text-[10px] font-bold">
              1
            </span>
            <span>Step 1: Incoming Orders ({newOrders.length})</span>
          </button>

          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />

          {/* STEP 2: COOKING IN PROGRESS */}
          <button
            onClick={() => setCurrentStep(2)}
            className={`px-4 py-2.5 rounded-xl font-black transition-all flex items-center gap-2 border whitespace-nowrap ${
              currentStep === 2
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-muted/40 border-transparent text-muted-foreground hover:bg-muted"
            }`}
          >
            <span className="h-5 w-5 rounded-full bg-background/20 flex items-center justify-center text-[10px] font-bold">
              2
            </span>
            <span>Step 2: Start Preparing ({preparingOrders.length})</span>
          </button>

          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />

          {/* STEP 3: READY FOR PICKUP */}
          <button
            onClick={() => setCurrentStep(3)}
            className={`px-4 py-2.5 rounded-xl font-black transition-all flex items-center gap-2 border whitespace-nowrap ${
              currentStep === 3
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-muted/40 border-transparent text-muted-foreground hover:bg-muted"
            }`}
          >
            <span className="h-5 w-5 rounded-full bg-background/20 flex items-center justify-center text-[10px] font-bold">
              3
            </span>
            <span>Step 3: Mark Complete ({readyOrders.length})</span>
          </button>

        </div>
      </div>

      {/* STEP 1 PAGE: INCOMING ORDERS */}
      {currentStep === 1 && (
        <Card className="rounded-2xl border p-5 space-y-4 bg-card shadow-sm">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h3 className="font-black text-lg flex items-center gap-2 text-foreground">
                <Flame className="h-5 w-5 text-primary" />
                <span>Step 1: New Incoming Orders Needed for Cooking</span>
              </h3>
              <p className="text-xs text-muted-foreground">
                Review new tickets below and tap "Start Preparing" to send them to the cooking line.
              </p>
            </div>

            <Badge className="bg-primary text-primary-foreground font-black text-xs px-3 py-1">
              {newOrders.length} New Ticket(s)
            </Badge>
          </div>

          {newOrders.length === 0 ? (
            <div className="py-20 text-center text-xs text-muted-foreground border border-dashed rounded-2xl space-y-2">
              <p className="font-bold text-sm">No new orders waiting for preparation</p>
              <p className="opacity-70">When waiters place new orders, they will appear here instantly.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {newOrders.map((order) => (
                <KitchenOrderCard 
                  key={order.id} 
                  order={order} 
                  isUrgent
                  actionText="🔥 Start Preparing Order"
                  onAction={() => {
                    updateStatus.mutate({ id: order.id, status: "PREPARING" });
                  }}
                  isLoading={updateStatus.isPending}
                />
              ))}
            </div>
          )}

          {/* Bottom Stepper Footer Navigation */}
          <div className="pt-4 border-t flex justify-end">
            <Button
              onClick={() => setCurrentStep(2)}
              className="h-11 rounded-xl text-xs font-black bg-primary text-primary-foreground gap-1.5 shadow-sm"
            >
              <span>Go to Step 2: Cooking Line ({preparingOrders.length})</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {/* STEP 2 PAGE: COOKING IN PROGRESS */}
      {currentStep === 2 && (
        <Card className="rounded-2xl border p-5 space-y-4 bg-card shadow-sm">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h3 className="font-black text-lg flex items-center gap-2 text-foreground">
                <Clock className="h-5 w-5 text-primary" />
                <span>Step 2: Dishes Currently Cooking in Progress</span>
              </h3>
              <p className="text-xs text-muted-foreground">
                Dishes currently on the stoves/line. Tap "Mark as Ready to Serve" when cooked.
              </p>
            </div>

            <Badge variant="outline" className="font-black text-xs px-3 py-1 border-primary/40 text-primary">
              {preparingOrders.length} Cooking Ticket(s)
            </Badge>
          </div>

          {preparingOrders.length === 0 ? (
            <div className="py-20 text-center text-xs text-muted-foreground border border-dashed rounded-2xl space-y-2">
              <p className="font-bold text-sm">No dishes currently in preparation</p>
              <p className="opacity-70">Start orders from Step 1 to move them into the cooking line.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {preparingOrders.map((order) => (
                <KitchenOrderCard 
                  key={order.id} 
                  order={order} 
                  actionText="🍽️ Mark as Ready to Serve"
                  onAction={() => {
                    updateStatus.mutate({ id: order.id, status: "READY" });
                  }}
                  isLoading={updateStatus.isPending}
                />
              ))}
            </div>
          )}

          {/* Bottom Stepper Footer Navigation */}
          <div className="pt-4 border-t flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(1)}
              className="h-11 rounded-xl text-xs font-bold gap-1.5"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Step 1: Incoming Orders</span>
            </Button>

            <Button
              onClick={() => setCurrentStep(3)}
              className="h-11 rounded-xl text-xs font-black bg-primary text-primary-foreground gap-1.5 shadow-sm"
            >
              <span>Go to Step 3: Pickup Counter ({readyOrders.length})</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {/* STEP 3 PAGE: READY FOR PICKUP & COMPLETION */}
      {currentStep === 3 && (
        <Card className="rounded-2xl border p-5 space-y-4 bg-card shadow-sm">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h3 className="font-black text-lg flex items-center gap-2 text-foreground">
                <Check className="h-5 w-5 text-primary" />
                <span>Step 3: Ready Orders & Final Order Completion</span>
              </h3>
              <p className="text-xs text-muted-foreground">
                Dishes sitting on the pickup counter ready for waiters. Tap "Mark as Complete" to archive ticket.
              </p>
            </div>

            <Badge variant="outline" className="font-black text-xs px-3 py-1">
              {readyOrders.length} Ready Ticket(s)
            </Badge>
          </div>

          {readyOrders.length === 0 ? (
            <div className="py-20 text-center text-xs text-muted-foreground border border-dashed rounded-2xl space-y-2">
              <p className="font-bold text-sm">No orders sitting on pickup counter</p>
              <p className="opacity-70">Mark cooked dishes as ready in Step 2 to move them here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {readyOrders.map((order) => (
                <KitchenOrderCard 
                  key={order.id} 
                  order={order} 
                  actionText="✓ Mark Order Complete / Delivered"
                  onAction={() => {
                    updateStatus.mutate({ id: order.id, status: "COMPLETED" });
                  }}
                  isLoading={updateStatus.isPending}
                />
              ))}
            </div>
          )}

          {/* Bottom Stepper Footer Navigation */}
          <div className="pt-4 border-t flex justify-start">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(2)}
              className="h-11 rounded-xl text-xs font-bold gap-1.5"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Step 2: Cooking Line</span>
            </Button>
          </div>
        </Card>
      )}

    </div>
  );
}
