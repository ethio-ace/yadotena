"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { formatETB } from "@/lib/currency";
import { useMemo, useState } from "react";
import { useStaffRealtime, ssePollInterval } from "@/lib/realtime";
import { EmptyState, ErrorState } from "@/components/ui/empty-state";

function statusBadge(status: string) {
  switch (status) {
    case "PAID":
      return <Badge variant="success">Paid</Badge>;
    case "PENDING_VERIFICATION":
      return <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/30">Awaiting verify</Badge>;
    case "REJECTED":
      return <Badge variant="destructive">Rejected</Badge>;
    default:
      return <Badge variant="secondary">Pending</Badge>;
  }
}

export default function PaymentsPage() {
  const [search, setSearch] = useState("");
  const [actionError, setActionError] = useState("");
  const queryClient = useQueryClient();
  const { connected } = useStaffRealtime();

  const { data: orders = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["orders"],
    queryFn: api.orders.getAll,
    refetchInterval: ssePollInterval(connected),
  });

  const { data: tables = [] } = useQuery({
    queryKey: ["tables"],
    queryFn: api.tables.getAll,
    refetchInterval: ssePollInterval(connected),
  });

  const verify = useMutation({
    mutationFn: api.orders.verifyPayment,
    onSuccess: () => {
      setActionError("");
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (err: Error) => setActionError(err.message || "Could not verify payment"),
  });

  const reject = useMutation({
    mutationFn: api.orders.rejectPayment,
    onSuccess: () => {
      setActionError("");
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (err: Error) => setActionError(err.message || "Could not reject payment"),
  });

  const markCashPaid = useMutation({
    mutationFn: (id: string) => api.orders.updatePayment(id, "PAID", { method: "cash" }),
    onSuccess: () => {
      setActionError("");
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (err: Error) => setActionError(err.message || "Could not mark cash paid"),
  });

  const paidOrders = orders.filter((o) => o.paymentStatus === "PAID");
  const pendingVerify = orders.filter((o) => o.paymentStatus === "PENDING_VERIFICATION");
  const totalCollected = paidOrders.reduce((acc, order) => acc + order.total, 0);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = [...orders].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
    if (!term) return list;
    return list.filter(
      (o) =>
        o.id.toLowerCase().includes(term) ||
        (o.customerName || "").toLowerCase().includes(term) ||
        (o.customerPhone || "").includes(term),
    );
  }, [orders, search]);

  if (isLoading) {
    return <div className="p-8 text-center animate-pulse">Loading payments...</div>;
  }

  if (isError) {
    return (
      <div className="p-8 max-w-lg mx-auto">
        <ErrorState
          title="Could not load payments"
          description="Check your connection and try again."
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Payments</h2>
        <p className="text-muted-foreground mt-1">
          Collect cash, verify digital transfers, and review payment history.
        </p>
      </div>

      {actionError ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {actionError}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card className="bg-emerald-500/5 border-emerald-500/20 rounded-3xl">
          <CardHeader className="py-4">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-emerald-600">
              Total Collected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-emerald-600">{formatETB(totalCollected)}</div>
          </CardContent>
        </Card>
        <Card className="rounded-3xl">
          <CardHeader className="py-4">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Awaiting verification
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black">{pendingVerify.length}</div>
          </CardContent>
        </Card>
        <Card className="rounded-3xl">
          <CardHeader className="py-4">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Paid orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black">{paidOrders.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-3xl border-muted-foreground/15 shadow-sm overflow-hidden">
        <CardHeader className="py-4 px-6 border-b">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search order or customer..."
              className="pl-9 rounded-xl"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                <tr>
                  <th className="px-6 py-3 font-medium">Order</th>
                  <th className="px-6 py-3 font-medium">Customer/Table</th>
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium text-right">Amount</th>
                  <th className="px-6 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {visible.map((order) => {
                  const tableName =
                    order.tableName ||
                    tables.find((t) => t.id === order.tableId)?.name ||
                    order.tableId?.slice(0, 8);
                  return (
                    <tr key={order.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs font-bold">{order.id.slice(0, 8)}</td>
                      <td className="px-6 py-4">
                        {order.type === "DINE_IN"
                          ? tableName || "Table"
                          : order.customerName || "Guest"}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {format(new Date(order.updatedAt), "MMM d, yyyy h:mm a")}
                      </td>
                      <td className="px-6 py-4">{statusBadge(order.paymentStatus)}</td>
                      <td className="px-6 py-4 text-right font-bold text-emerald-600">
                        {formatETB(order.total)}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        {order.paymentStatus === "PENDING_VERIFICATION" && (
                          <>
                            <Button
                              size="sm"
                              className="rounded-xl"
                              disabled={verify.isPending}
                              onClick={() => verify.mutate(order.id)}
                            >
                              Verify
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-xl"
                              disabled={reject.isPending}
                              onClick={() => reject.mutate(order.id)}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                        {(order.paymentStatus === "PENDING" ||
                          order.paymentStatus === "REJECTED") && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-xl"
                            disabled={markCashPaid.isPending}
                            onClick={() => markCashPaid.mutate(order.id)}
                          >
                            Mark cash paid
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {visible.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-0">
                      <EmptyState
                        className="border-0 rounded-none"
                        title="No payments found"
                        description="Orders awaiting cash or digital verification will appear here."
                      />
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
