"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { api } from "@/services/api";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OrderStatus } from "@/types";
import { formatETB } from "@/lib/currency";
import { Eye, Search, Plus, ChefHat } from "lucide-react";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { CreateOrderModal } from "@/components/dashboard/CreateOrderModal";
import { EmptyState, ErrorState } from "@/components/ui/empty-state";
import { useStaffRealtime, ssePollInterval } from "@/lib/realtime";
import { orderTypeLabel } from "@/lib/order-type-label";
import { tableLabel } from "@/lib/table-label";
import { paymentStatusLabel } from "@/lib/checkout-payment";

export default function OrdersPage() {
  const { connected } = useStaffRealtime();
  const searchParams = useSearchParams();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const q = searchParams.get("q");
    if (q) setSearch(q);
  }, [searchParams]);

  const { data: orders, isLoading, isError, refetch } = useQuery({
    queryKey: ["orders"],
    queryFn: api.orders.getAll,
    refetchInterval: ssePollInterval(connected),
  });

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case "PENDING": return <Badge variant="secondary">Pending</Badge>;
      case "CONFIRMED": return <Badge variant="outline" className="text-blue-500 border-blue-500">Confirmed</Badge>;
      case "PREPARING": return <Badge variant="outline" className="text-amber-500 border-amber-500">Preparing</Badge>;
      case "READY": return <Badge variant="success">Ready</Badge>;
      case "SERVED": return <Badge variant="outline">Served</Badge>;
      case "COMPLETED": return <Badge variant="default">Completed</Badge>;
      case "CANCELLED": return <Badge variant="destructive">Cancelled</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const filteredOrders = orders?.filter(o => {
    const term = search.toLowerCase();
    const matchesId = o.id.toLowerCase().includes(term);
    const matchesCustomer = o.customerName?.toLowerCase().includes(term);
    const matchesTable = o.tableId?.toLowerCase().includes(term);
    return !search || matchesId || matchesCustomer || matchesTable;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Orders</h2>
          <p className="text-muted-foreground mt-1">Manage, dispatch, and track live restaurant orders.</p>
        </div>
        <div className="flex gap-2">
          <Button 
            className="rounded-xl font-bold shadow-md shadow-primary/20 flex items-center gap-2"
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus className="h-4 w-4" />
            <span>+ New Order (Staff POS)</span>
          </Button>
        </div>
      </div>

      {isError ? (
        <ErrorState
          title="Could not load orders"
          description="Check your connection and try again."
          onRetry={() => refetch()}
        />
      ) : null}

      <Card className="rounded-3xl border-muted-foreground/15 shadow-sm overflow-hidden">
        <CardHeader className="py-4 px-6 border-b bg-card">
          <div className="flex items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search order ID, customer, table..." 
                className="pl-9 rounded-xl bg-background"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground animate-pulse">Loading live orders...</div>
          ) : isError ? null : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                  <tr>
                    <th className="px-6 py-3 font-medium">Order #</th>
                    <th className="px-6 py-3 font-medium">Type</th>
                    <th className="px-6 py-3 font-medium">Details</th>
                    <th className="px-6 py-3 font-medium">Items</th>
                    <th className="px-6 py-3 font-medium">Amount</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 font-medium">Payment</th>
                    <th className="px-6 py-3 font-medium">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredOrders?.map((order) => (
                    <tr key={order.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-xs">{order.id}</td>
                      <td className="px-6 py-4">
                        <Badge variant="outline">{orderTypeLabel(order.type)}</Badge>
                      </td>
                      <td className="px-6 py-4 font-semibold">
                        {order.type === "DINE_IN" ? (
                          <span className="font-bold text-primary">{tableLabel(order.tableId, undefined, order.tableName)}</span>
                        ) : (
                          <span>{order.customerName || "Guest"}</span>
                        )}
                      </td>
                      <td className="px-6 py-4">{order.items.reduce((acc, curr) => acc + curr.quantity, 0)} items</td>
                      <td className="px-6 py-4 font-bold text-foreground">{formatETB(order.total)}</td>
                      <td className="px-6 py-4">{getStatusBadge(order.status)}</td>
                      <td className="px-6 py-4">
                        <Badge variant={order.paymentStatus === "PAID" ? "success" : "secondary"}>
                          {paymentStatusLabel(order.paymentStatus)}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground text-xs">
                        {format(new Date(order.createdAt), "h:mm a")}
                      </td>
                    </tr>
                  ))}
                  {filteredOrders?.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-0">
                        <EmptyState
                          className="border-0 rounded-none"
                          title="No orders match your criteria"
                          description="Try clearing search or create a new order from the POS."
                        />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Staff POS Modal */}
      <CreateOrderModal 
        isOpen={isCreateOpen} 
        onClose={() => setIsCreateOpen(false)} 
      />
    </div>
  );
}
