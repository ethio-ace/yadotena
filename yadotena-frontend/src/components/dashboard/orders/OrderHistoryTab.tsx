import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, DollarSign, ListOrdered, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { formatETB } from "@/lib/currency";
import { format } from "date-fns";
import { Order, OrderStatus } from "@/types";
import { formatTableRef, useTableLabels } from "@/hooks/useTableLabels";

interface OrderHistoryTabProps {
  /** Page-level filtered orders (type / table / payment) from the Orders page. */
  ordersOverride?: Order[];
}

export function OrderHistoryTab({ ordersOverride }: OrderHistoryTabProps) {
  const tableLabels = useTableLabels();
  const [search, setSearch] = useState("");

  const { data: queriedOrders = [], isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: api.orders.getAll,
    enabled: ordersOverride === undefined,
  });

  const orders = ordersOverride ?? queriedOrders;

  // History = closed tickets. Settled ones are true history; unsettled closed
  // orders are flagged separately so unpaid bills never masquerade as revenue.
  const allHistory = (orders?.filter((o) => o.status === "COMPLETED" || o.status === "CANCELLED") || [])
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const completedOrders = allHistory.filter((o) => o.status === "COMPLETED");
  const cancelledOrders = allHistory.filter((o) => o.status === "CANCELLED");
  const unsettledOrders = completedOrders.filter((o) => o.paymentStatus !== "PAID");
  const settledOrders = allHistory.filter(
    (o) => o.status === "CANCELLED" || (o.status === "COMPLETED" && o.paymentStatus === "PAID")
  );
  const totalRevenue = settledOrders
    .filter((o) => o.status === "COMPLETED")
    .reduce((sum, order) => sum + (order.total || 0), 0);

  const matchesSearch = (o: Order) => {
    const term = search.toLowerCase();
    if (!term) return true;
    return (
      o.id.toLowerCase().includes(term) ||
      o.customerName?.toLowerCase().includes(term) ||
      o.tableId?.toLowerCase().includes(term)
    );
  };

  const filteredSettled = settledOrders.filter(matchesSearch);
  const filteredUnsettled = unsettledOrders.filter(matchesSearch);

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case "COMPLETED": return <Badge variant="default">Completed</Badge>;
      case "CANCELLED": return <Badge variant="destructive">Cancelled</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const renderRows = (list: Order[]) =>
    list.map((order) => (
      <tr key={order.id} className="hover:bg-muted/30 transition-colors">
        <td className="px-6 py-4 font-mono font-bold text-xs">{order.id.slice(-6).toUpperCase()}</td>
        <td className="px-6 py-4">
          <Badge variant="outline" className="capitalize">{order.type.replace("_", " ").toLowerCase()}</Badge>
        </td>
        <td className="px-6 py-4 font-semibold">
          {order.type === "DINE_IN" ? (
            <span className="font-bold text-primary">{formatTableRef(order.tableId, tableLabels)}</span>
          ) : (
            <span>{order.customerName || "Guest"}</span>
          )}
        </td>
        <td className="px-6 py-4">{order.items.reduce((acc, curr) => acc + curr.quantity, 0)} items</td>
        <td className="px-6 py-4 font-bold text-foreground">{formatETB(order.total)}</td>
        <td className="px-6 py-4">
          <div className="flex items-center gap-1.5">
            {getStatusBadge(order.status)}
            <Badge
              variant={order.paymentStatus === "PAID" ? "outline" : "destructive"}
              className={`text-[10px] ${order.paymentStatus === "PAID" ? "text-emerald-600 border-emerald-500/30 bg-emerald-500/10" : ""}`}
            >
              {order.paymentStatus === "PAID" ? "Paid" : "Unpaid"}
            </Badge>
          </div>
        </td>
        <td className="px-6 py-4 text-muted-foreground text-xs">
          {format(new Date(order.createdAt), "MMM d, h:mm a")}
        </td>
      </tr>
    ));

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-none shadow-sm bg-primary/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-bold text-muted-foreground">Settled Revenue</CardTitle>
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
            <div className="text-2xl font-black">{allHistory.length}</div>
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

        <Card className={`border-none shadow-sm ${unsettledOrders.length > 0 ? "bg-red-500/10" : "bg-destructive/10"}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className={`text-sm font-bold ${unsettledOrders.length > 0 ? "text-red-600" : "text-destructive"}`}>
              {unsettledOrders.length > 0 ? "Unsettled Bills" : "Cancelled"}
            </CardTitle>
            {unsettledOrders.length > 0 ? (
              <AlertTriangle className="w-4 h-4 text-red-600" />
            ) : (
              <XCircle className="w-4 h-4 text-destructive" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-black ${unsettledOrders.length > 0 ? "text-red-600" : "text-destructive"}`}>
              {unsettledOrders.length > 0 ? unsettledOrders.length : cancelledOrders.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Unsettled closed orders — never hidden, never counted as revenue */}
      {filteredUnsettled.length > 0 && (
        <div className="rounded-2xl border-2 border-red-500/30 bg-red-50/40 dark:bg-red-950/10 overflow-hidden animate-in fade-in duration-200">
          <div className="px-5 py-3 flex items-center gap-2 border-b border-red-500/20">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <h3 className="text-sm font-black text-red-600 dark:text-red-400">Closed but Unpaid — {filteredUnsettled.length} bill{filteredUnsettled.length !== 1 ? "s" : ""}</h3>
            <p className="text-[11px] text-muted-foreground ml-1 hidden sm:block">
              These tickets were closed before payment was recorded. Collect before writing them off.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <tbody className="divide-y divide-red-500/10">
                {renderRows(filteredUnsettled)}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Card className="rounded-3xl border-muted-foreground/15 shadow-sm overflow-hidden">
        <CardHeader className="py-4 px-6 border-b bg-card">
          <div className="flex items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search history..."
                className="pl-9 rounded-xl bg-background"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <span className="ml-auto text-xs text-muted-foreground font-bold hidden sm:block">
              Most recent first
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading && ordersOverride === undefined ? (
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
                  {renderRows(filteredSettled)}
                  {filteredSettled.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted-foreground">
                        No settled history matches your criteria.
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
