"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { PlaceOrderTab } from "@/components/dashboard/orders/PlaceOrderTab";
import { ActiveOrdersTab } from "@/components/dashboard/orders/ActiveOrdersTab";
import { ClipboardList, PlusCircle, BellRing, CheckCircle2, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { soundAlerts } from "@/lib/audioAlerts";

export default function WaiterDashboard() {
  const [activeTab, setActiveTab] = useState<"place_order" | "active_orders">("place_order");
  const queryClient = useQueryClient();

  const { data: serviceRequests = [] } = useQuery({
    queryKey: ["serviceRequests"],
    queryFn: api.serviceRequests.getAll,
  });

  const resolveRequest = useMutation({
    mutationFn: ({ id }: { id: string }) => api.serviceRequests.resolve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["serviceRequests"] });
      queryClient.invalidateQueries({ queryKey: ["tables"] });
    },
  });

  const pendingRequests = serviceRequests.filter(r => r.status === "PENDING");

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Waiter Floor Console</h2>
          <p className="text-muted-foreground mt-1">Manage table sessions, place orders, and track live tickets.</p>
        </div>
      </div>
      
      {/* Custom Tabs Navigation */}
      <div className="flex bg-muted/60 p-1.5 rounded-2xl w-full sm:w-fit overflow-x-auto shadow-inner">
        <button 
          className={`flex items-center justify-center gap-2 flex-1 sm:flex-none px-6 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${activeTab === "place_order" ? "bg-background text-foreground shadow-sm scale-100" : "text-muted-foreground hover:text-foreground scale-95"}`}
          onClick={() => setActiveTab("place_order")}
        >
          <PlusCircle className={`w-4 h-4 ${activeTab === "place_order" ? "text-primary" : ""}`} />
          Place Order
        </button>
        <button 
          className={`flex items-center justify-center gap-2 flex-1 sm:flex-none px-6 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${activeTab === "active_orders" ? "bg-background text-foreground shadow-sm scale-100" : "text-muted-foreground hover:text-foreground scale-95"}`}
          onClick={() => setActiveTab("active_orders")}
        >
          <ClipboardList className={`w-4 h-4 ${activeTab === "active_orders" ? "text-blue-500" : ""}`} />
          Active Orders
        </button>
      </div>

      {/* Urgent Table Calls Section */}
      {pendingRequests.length > 0 && (
        <Card className="border-2 border-rose-500/40 shadow-lg shadow-rose-500/5 bg-card rounded-2xl overflow-hidden animate-in slide-in-from-top duration-300 mt-6">
          <CardHeader className="bg-rose-500/10 border-b py-3 px-5 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-black text-rose-600 dark:text-rose-400 flex items-center gap-2">
              <BellRing className="h-5 w-5 animate-bounce" />
              <span>Active Table Assistance Calls ({pendingRequests.length})</span>
            </CardTitle>
            <Badge className="bg-rose-600 text-white font-bold text-xs">
              Alert Chime Ringing
            </Badge>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-border">
            {pendingRequests.map((req) => (
              <div key={req.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <span className="text-base font-black">{req.tableName}</span>
                    <Badge 
                      className={`text-xs font-bold ${
                        req.type === "BILL" 
                          ? "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/20" 
                          : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/20"
                      }`}
                    >
                      {req.type === "BILL" ? "Bill Request" : "Waiter Assistance"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    Requested {formatDistanceToNow(new Date(req.createdAt))} ago
                  </div>
                </div>
                <Button 
                  onClick={() => {
                    // Play the RIGHT sound for the request type, then resolve
                    if (req.type === "BILL") {
                      soundAlerts.playBillRequest();
                    } else {
                      soundAlerts.playWaiterCall();
                    }
                    resolveRequest.mutate({ id: req.id });
                  }}
                  disabled={resolveRequest.isPending}
                  className="rounded-xl h-10 px-5 font-bold bg-foreground text-background hover:bg-foreground/90 shadow-md w-full sm:w-auto"
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Mark as Resolved
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="mt-6">
        {activeTab === "place_order" && <PlaceOrderTab />}
        {activeTab === "active_orders" && <ActiveOrdersTab />}
      </div>
    </div>
  );
}
