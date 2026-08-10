"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { api } from "@/services/api";
import { formatETB } from "@/lib/currency";
import { format } from "date-fns";
import { EmptyState, ErrorState } from "@/components/ui/empty-state";

export default function CustomersPage() {
  const [search, setSearch] = useState("");
  const { data: customers = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["customers"],
    queryFn: api.customers.getAll,
  });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return customers;
    return customers.filter(
      (c) => c.name.toLowerCase().includes(term) || c.phone.toLowerCase().includes(term),
    );
  }, [customers, search]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Customer Intelligence</h2>
          <p className="text-muted-foreground mt-1">
            Derived from order history — frequency, spend in ETB, and loyalty tiers.
          </p>
        </div>
      </div>

      {isError && (
        <ErrorState
          title="Could not load customers"
          description="Check your connection and try again."
          onRetry={() => refetch()}
        />
      )}

      <Card className="rounded-3xl border-muted-foreground/15 shadow-sm overflow-hidden">
        <CardHeader className="py-4 px-6 border-b">
          <div className="flex items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search customers by name or phone..."
                className="pl-9 rounded-xl"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading customers…</div>
          ) : filtered.length === 0 ? (
            <EmptyState
              className="border-0 rounded-none"
              title={search.trim() ? "No matches" : "No customers yet"}
              description={
                search.trim()
                  ? "Try another name or phone."
                  : "Customers appear here after guest or staff orders."
              }
            />
          ) : (
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
                  {filtered.map((customer) => (
                    <tr key={customer.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 font-bold text-foreground">{customer.name}</td>
                      <td className="px-6 py-4 text-muted-foreground font-mono text-xs">{customer.phone}</td>
                      <td className="px-6 py-4">{customer.totalOrders} visits</td>
                      <td className="px-6 py-4 font-black text-primary">{formatETB(customer.totalSpent)}</td>
                      <td className="px-6 py-4">
                        <Badge variant="secondary">{customer.type}</Badge>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground text-xs">
                        {customer.lastOrder
                          ? format(new Date(customer.lastOrder), "MMM d, yyyy")
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
