import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, DollarSign, ListOrdered, CheckCircle2, XCircle } from "lucide-react";
import { formatETB } from "@/lib/currency";
import { format } from "date-fns";
import { OrderStatus } from "@/types";

export function OrderHistoryTab() {
  const [search, setSearch] = useState("");

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: api.orders.getAll,
  });

  const historyOrders = orders?.filter(o => o.status === "COMPLETED" || o.status === "CANCELLED") || [];
  const completedOrders = historyOrders.filter(o => o.status === "COMPLETED");
  const cancelledOrders = historyOrders.filter(o => o.status === "CANCELLED");
  const totalRevenue = completedOrders.reduce((sum, order) => sum + (order.total || 0), 0);

  const filteredHistory = historyOrders.filter(o => {
    const term = search.toLowerCase();
    const matchesId = o.id.toLowerCase().includes(term);
    const matchesCustomer = o.customerName?.toLowerCase().includes(term);
    const matchesTable = o.tableId?.toLowerCase().includes(term);
    return !search || matchesId || matchesCustomer || matchesTable;
  });

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case "COMPLETED": return <Badge variant="default">Completed</Badge>;
      case "CANCELLED": return <Badge variant="destructive">Cancelled</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-none shadow-sm bg-primary/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-bold text-muted-foreground">Total Revenue</CardTitle>
            <DollarSign className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black">{formatETB(totalRevenue)}</div>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-sm bg-muted/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-bold text-muted-foreground">Total Orders</CardTitle>
            <ListOrdered className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black">{historyOrders.length}</div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-emerald-500/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-bold text-emerald-700">Completed</CardTitle>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-emerald-700">{completedOrders.length}</div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-destructive/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-bold text-destructive">Cancelled</CardTitle>
            <XCircle className="w-4 h-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-destructive">{cancelledOrders.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-3xl border-muted-foreground/15 shadow-sm overflow-hidden">
        <CardHeader className="py-4 px-6 border-b bg-card">
          <div className="flex items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search history..." 
                className="pl-9 rounded-xl bg-background"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground animate-pulse">Loading history...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                  <tr>
                    <th className="px-6 py-3 font-medium">Order</th>
                    <th className="px-6 py-3 font-medium">Type</th>
                    <th className="px-6 py-3 font-medium">Details</th>
                    <th className="px-6 py-3 font-medium">Items</th>
                    <th className="px-6 py-3 font-medium">Amount</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 font-medium">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredHistory?.map((order) => (
                    <tr key={order.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-xs">{order.id.slice(-6).toUpperCase()}</td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className="capitalize">{order.type.replace("_", " ").toLowerCase()}</Badge>
                      </td>
                      <td className="px-6 py-4 font-semibold">
                        {order.type === "DINE_IN" ? (
                          <span className="font-bold text-primary">Table {order.tableId?.replace("t", "")}</span>
                        ) : (
                          <span>{order.customerName || "Guest"}</span>
                        )}
                      </td>
                      <td className="px-6 py-4">{order.items.reduce((acc, curr) => acc + curr.quantity, 0)} items</td>
                      <td className="px-6 py-4 font-bold text-foreground">{formatETB(order.total)}</td>
                      <td className="px-6 py-4">{getStatusBadge(order.status)}</td>
                      <td className="px-6 py-4 text-muted-foreground text-xs">
                        {format(new Date(order.createdAt), "h:mm a")}
                      </td>
                    </tr>
                  ))}
                  {filteredHistory?.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted-foreground">
                        No orders match your criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
