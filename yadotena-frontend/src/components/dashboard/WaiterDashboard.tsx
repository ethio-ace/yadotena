"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BellRing, Check, Coffee, Utensils } from "lucide-react";
import { OrderStatus } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { soundAlerts } from "@/lib/audioAlerts";
import { useStaffRealtime, ssePollInterval } from "@/lib/realtime";
import { tableLabel } from "@/lib/table-label";
import { ErrorState } from "@/components/ui/empty-state";
import { useState } from "react";

export default function WaiterDashboard() {
  const { connected } = useStaffRealtime();
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState("");

  const { data: orders, isLoading: loadingOrders, isError: ordersError, refetch: refetchOrders } = useQuery({
    queryKey: ["orders"],
    queryFn: api.orders.getAll,
    refetchInterval: ssePollInterval(connected),
  });

  const { data: serviceRequests = [], isLoading: loadingRequests, isError: requestsError, refetch: refetchRequests } = useQuery({
    queryKey: ["serviceRequests"],
    queryFn: api.serviceRequests.getAll,
    refetchInterval: ssePollInterval(connected),
  });

  const { data: tables = [] } = useQuery({
    queryKey: ["tables"],
    queryFn: api.tables.getAll,
    refetchInterval: ssePollInterval(connected),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) => 
      api.orders.updateStatus(id, status),
    onSuccess: () => {
      setActionError("");
      soundAlerts.playActionPing();
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (err: Error) => setActionError(err.message || "Could not update order status"),
  });

  const resolveRequest = useMutation({
    mutationFn: api.serviceRequests.resolve,
    onSuccess: () => {
      setActionError("");
      soundAlerts.playActionPing();
      queryClient.invalidateQueries({ queryKey: ["serviceRequests"] });
      queryClient.invalidateQueries({ queryKey: ["tables"] });
    },
    onError: (err: Error) => setActionError(err.message || "Could not resolve request"),
  });

  if (loadingOrders || loadingRequests) {
    return <div className="p-8 text-center animate-pulse text-muted-foreground font-medium">Loading Waiter Floor...</div>;
  }

  if (ordersError || requestsError) {
    return (
      <div className="p-8 max-w-lg mx-auto">
        <ErrorState
          title="Could not load floor console"
          description="Check your connection and try again."
          onRetry={() => {
            refetchOrders();
            refetchRequests();
          }}
        />
      </div>
    );
  }

  const readyOrders = orders?.filter(o => o.status === "READY" && o.type === "DINE_IN") || [];
  const newOrders = orders?.filter(o => o.status === "PENDING" && o.type === "DINE_IN") || [];
  const pendingRequests = serviceRequests.filter(r => r.status === "PENDING");

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tight">Waiter Floor Console</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time table calls, service requests, and kitchen pickup coordination.
          </p>
        </div>
      </div>

      {actionError ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {actionError}
        </div>
      ) : null}

      {/* Metric Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-primary">Floor Tables</CardTitle>
            <Utensils className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-primary">{tables.length}</div>
          </CardContent>
        </Card>

        <Card className={`border-rose-500/30 ${pendingRequests.length > 0 ? "bg-rose-500/10 animate-pulse ring-1 ring-rose-500/30" : "bg-rose-500/5"}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-rose-600 dark:text-rose-400">Table Assistance</CardTitle>
            <BellRing className="h-4 w-4 text-rose-600 dark:text-rose-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400">{pendingRequests.length}</div>
          </CardContent>
        </Card>

        <Card className="bg-emerald-500/5 border-emerald-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-emerald-600 dark:text-emerald-400">Ready to Serve</CardTitle>
            <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{readyOrders.length}</div>
          </CardContent>
        </Card>

        <Card className="bg-amber-500/5 border-amber-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-amber-600 dark:text-amber-400">Pending Orders</CardTitle>
            <Coffee className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400">{newOrders.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Urgent Table Calls Section */}
      {pendingRequests.length > 0 && (
        <Card className="border-2 border-rose-500/40 shadow-lg shadow-rose-500/5 bg-card rounded-2xl overflow-hidden animate-in slide-in-from-top duration-300">
          <CardHeader className="bg-rose-500/10 border-b py-3 px-5 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-black text-rose-600 dark:text-rose-400 flex items-center gap-2">
              <BellRing className="h-5 w-5 animate-pulse" />
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
                      {req.type === "BILL" ? "Request bill" : "Call waiter"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{req.notes}</p>
                  <p className="text-[11px] text-muted-foreground font-mono">
                    Called {formatDistanceToNow(new Date(req.createdAt))} ago
                  </p>
                </div>

                <Button 
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl h-10 px-5 shadow-sm text-xs gap-1.5"
                  onClick={() => resolveRequest.mutate(req.id)}
                  disabled={resolveRequest.isPending}
                >
                  <Check className="h-4 w-4" />
                  <span>Mark as Attended (Silence Chime)</span>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Orders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Ready to Serve */}
        <Card className="border-emerald-500/20 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="bg-emerald-500/5 border-b py-3">
            <CardTitle className="text-emerald-600 dark:text-emerald-400 font-black text-base flex items-center">
              <Check className="mr-2 h-5 w-5" /> Ready for Table Service
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {readyOrders.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No plated meals currently waiting for delivery.
              </div>
            ) : (
              <div className="divide-y">
                {readyOrders.map(order => (
                  <div key={order.id} className="p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-extrabold text-base">{tableLabel(order.tableId, tables, order.tableName)}</span>
                        <span className="text-[11px] bg-muted px-2 py-0.5 rounded-full border font-mono">#{order.id.slice(-6).toUpperCase()}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {order.items.reduce((acc, curr) => acc + curr.quantity, 0)} items • Plated {formatDistanceToNow(new Date(order.updatedAt))} ago
                      </p>
                    </div>
                    <Button 
                      className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 font-bold text-xs rounded-xl h-9 px-4"
                      onClick={() => updateStatus.mutate({ id: order.id, status: "SERVED" })}
                      disabled={updateStatus.isPending}
                    >
                      ✓ Served to Table
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Incoming Dine-In Orders */}
        <Card className="border-amber-500/20 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="bg-amber-500/5 border-b py-3">
            <CardTitle className="text-amber-600 dark:text-amber-400 font-black text-base flex items-center">
              <Coffee className="mr-2 h-5 w-5" /> Incoming Guest Orders
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {newOrders.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No new unconfirmed orders at this moment.
              </div>
            ) : (
              <div className="divide-y">
                {newOrders.map(order => (
                  <div key={order.id} className="p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-extrabold text-base">{tableLabel(order.tableId, tables, order.tableName)}</span>
                        <span className="text-[11px] bg-muted px-2 py-0.5 rounded-full border font-mono">#{order.id.slice(-6).toUpperCase()}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {order.items.map(i => `${i.quantity}x ${i.name}`).join(", ")}
                      </p>
                    </div>
                    <Button 
                      variant="outline"
                      className="border-amber-500 text-amber-600 hover:bg-amber-500 hover:text-white shrink-0 font-bold text-xs rounded-xl h-9 px-4"
                      onClick={() => updateStatus.mutate({ id: order.id, status: "CONFIRMED" })}
                      disabled={updateStatus.isPending}
                    >
                      Acknowledge
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
