"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BellRing, Check, Clock, Coffee, Utensils } from "lucide-react";
import { OrderStatus } from "@/types";
import { formatDistanceToNow } from "date-fns";

export default function WaiterDashboard() {
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
    return <div className="p-8 text-center animate-pulse">Loading Waiter Dashboard...</div>;
  }

  const readyOrders = orders?.filter(o => o.status === "READY" && o.type === "DINE_IN") || [];
  const newOrders = orders?.filter(o => o.status === "PENDING" && o.type === "DINE_IN") || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Waiter Dashboard</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">My Tables</CardTitle>
            <Utensils className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">8</div>
          </CardContent>
        </Card>
        <Card className="bg-amber-500/5 border-amber-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-amber-600">New Orders</CardTitle>
            <Coffee className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{newOrders.length}</div>
          </CardContent>
        </Card>
        <Card className="bg-emerald-500/5 border-emerald-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-emerald-600">Ready to Serve</CardTitle>
            <Check className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{readyOrders.length}</div>
          </CardContent>
        </Card>
        <Card className="bg-rose-500/5 border-rose-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-rose-600">Requests</CardTitle>
            <BellRing className="h-4 w-4 text-rose-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600">2</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-emerald-500/20 shadow-sm">
          <CardHeader className="bg-emerald-500/5 border-b">
            <CardTitle className="text-emerald-600 flex items-center">
              <Check className="mr-2 h-5 w-5" /> Orders Ready to Serve
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {readyOrders.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">No orders ready to serve right now.</div>
            ) : (
              <div className="divide-y">
                {readyOrders.map(order => (
                  <div key={order.id} className="p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-lg">Table {order.tableId?.replace('t', '')}</span>
                        <span className="text-xs bg-muted px-2 py-0.5 rounded-full border">{order.id}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {order.items.reduce((acc, curr) => acc + curr.quantity, 0)} items • {formatDistanceToNow(new Date(order.updatedAt))} ago
                      </p>
                    </div>
                    <Button 
                      className="bg-emerald-500 hover:bg-emerald-600 text-white shrink-0 font-bold"
                      onClick={() => updateStatus.mutate({ id: order.id, status: "SERVED" })}
                      disabled={updateStatus.isPending}
                    >
                      Mark as Served
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-amber-500/20 shadow-sm">
          <CardHeader className="bg-amber-500/5 border-b">
            <CardTitle className="text-amber-600 flex items-center">
              <Coffee className="mr-2 h-5 w-5" /> New Orders
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {newOrders.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">No new orders waiting for confirmation.</div>
            ) : (
              <div className="divide-y">
                {newOrders.map(order => (
                  <div key={order.id} className="p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-lg">Table {order.tableId?.replace('t', '')}</span>
                        <span className="text-xs bg-muted px-2 py-0.5 rounded-full border">{order.id}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {order.items.map(i => i.name).join(", ")}
                      </p>
                    </div>
                    <Button 
                      variant="outline"
                      className="border-amber-500 text-amber-600 hover:bg-amber-500 hover:text-white shrink-0 font-bold"
                      onClick={() => updateStatus.mutate({ id: order.id, status: "CONFIRMED" })}
                      disabled={updateStatus.isPending}
                    >
                      Confirm Order
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
