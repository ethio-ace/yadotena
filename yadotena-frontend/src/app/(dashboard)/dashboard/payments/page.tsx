"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";

export default function PaymentsPage() {
  const { data: orders, isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: api.orders.getAll,
  });

  if (isLoading) {
    return <div className="p-8 text-center animate-pulse">Loading payments...</div>;
  }

  const paidOrders = orders?.filter(o => o.paymentStatus === "PAID") || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Payments</h2>
          <p className="text-muted-foreground mt-1">Track processed payments and refunds.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card className="bg-emerald-500/5 border-emerald-500/20">
          <CardHeader className="py-4">
            <CardTitle className="text-sm text-emerald-600">Total Collected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              ${paidOrders.reduce((acc, order) => acc + order.total, 0).toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="py-4 px-6 border-b">
          <div className="flex items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search payment ID or customer..." className="pl-9" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                <tr>
                  <th className="px-6 py-3 font-medium">Order #</th>
                  <th className="px-6 py-3 font-medium">Customer/Table</th>
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {paidOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-bold">{order.id}</td>
                    <td className="px-6 py-4">
                      {order.type === "DINE_IN" ? `Table ${order.tableId?.replace('t', '')}` : order.customerName}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {format(new Date(order.updatedAt), "MMM d, yyyy h:mm a")}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="success">Paid</Badge>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-emerald-600">
                      ${order.total.toFixed(2)}
                    </td>
                  </tr>
                ))}
                {paidOrders.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                      No paid orders found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
