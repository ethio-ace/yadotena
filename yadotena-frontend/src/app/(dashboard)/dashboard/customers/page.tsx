"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { mockCustomers } from "@/mocks";
import { formatETB } from "@/lib/currency";
import { format } from "date-fns";

export default function CustomersPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Customer Intelligence</h2>
          <p className="text-muted-foreground mt-1">View customer order frequency, total spend in ETB, and loyalty tiers.</p>
        </div>
      </div>

      <Card className="rounded-3xl border-muted-foreground/15 shadow-sm overflow-hidden">
        <CardHeader className="py-4 px-6 border-b">
          <div className="flex items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search customers by name or phone..." className="pl-9 rounded-xl" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                <tr>
                  <th className="px-6 py-3 font-medium">Customer</th>
                  <th className="px-6 py-3 font-medium">Phone</th>
                  <th className="px-6 py-3 font-medium">Orders</th>
                  <th className="px-6 py-3 font-medium">Total Spent</th>
                  <th className="px-6 py-3 font-medium">Loyalty Tier</th>
                  <th className="px-6 py-3 font-medium">Last Order</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {mockCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-bold text-foreground">{customer.name}</td>
                    <td className="px-6 py-4 text-muted-foreground font-mono text-xs">{customer.phone}</td>
                    <td className="px-6 py-4">{customer.totalOrders} visits</td>
                    <td className="px-6 py-4 font-black text-primary">{formatETB(customer.totalSpent)}</td>
                    <td className="px-6 py-4">
                      {customer.type === "VIP" ? (
                        <Badge variant="default" className="bg-purple-500 hover:bg-purple-600 font-bold">VIP Gold</Badge>
                      ) : customer.type === "REGULAR" ? (
                        <Badge variant="outline" className="border-blue-500 text-blue-500 font-bold">Regular</Badge>
                      ) : (
                        <Badge variant="secondary" className="font-bold">Occasional</Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground text-xs">
                      {format(new Date(customer.lastOrder), "MMM d, yyyy")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
