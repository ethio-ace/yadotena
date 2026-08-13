"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatETB } from "@/lib/currency";
import { 
  BellRing, 
  Plus, 
  Utensils, 
  Check,
  CreditCard
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { PaymentSettlementModal } from "@/components/PaymentSettlementModal";
import { Order } from "@/types";

export default function WaiterDashboardPage() {
  const queryClient = useQueryClient();
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState<Order | null>(null);

  const { data: tables = [] } = useQuery({
    queryKey: ["tables"],
    queryFn: api.tables.getAll,
  });

  const { data: orders = [] } = useQuery({
    queryKey: ["orders"],
    queryFn: api.orders.getAll,
  });

  const { data: serviceRequests = [] } = useQuery({
    queryKey: ["serviceRequests"],
    queryFn: api.serviceRequests.getAll,
  });

  const resolveRequestMutation = useMutation({
    mutationFn: (id: string) => api.serviceRequests.resolve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["serviceRequests"] });
    },
  });

  const updateTableStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: any }) => api.tables.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tables"] });
    },
  });

  const handlePaymentSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["orders"] });
    queryClient.invalidateQueries({ queryKey: ["payments"] });
    queryClient.invalidateQueries({ queryKey: ["tables"] });
  };

  const pendingRequests = serviceRequests.filter((r) => r.status === "PENDING");
  const activeOrders = orders.filter((o) => o.status !== "COMPLETED" && o.status !== "CANCELLED");

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-16">
      {/* Waiter Banner */}
      <div className="bg-gradient-to-r from-amber-950 via-amber-900 to-amber-950 text-amber-50 p-6 md:p-8 rounded-3xl border border-amber-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 font-black text-[10px] uppercase tracking-wider px-3 py-1">
              🤵 Floor Waiter Console
            </Badge>
            <span className="text-xs text-amber-200 font-medium">Table & Order Management</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight">
            Floor Waiter Station
          </h1>
          <p className="text-sm text-amber-200 max-w-xl">
            Select table, place menu orders, respond to guest service calls, track kitchen preparation, and settle payments via Cash/Digital transfers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/menu">
            <Button size="lg" className="rounded-2xl font-black text-xs bg-amber-500 hover:bg-amber-400 text-amber-950 gap-2 shadow-lg shadow-amber-500/20">
              <Plus className="h-4 w-4" /> Create New Table Order
            </Button>
          </Link>
        </div>
      </div>

      {/* Urgent Waiter Service Calls Banner */}
      {pendingRequests.length > 0 && (
        <Card className="rounded-3xl border-2 border-rose-500/40 bg-rose-500/10 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-rose-500 text-white flex items-center justify-center animate-bounce">
                <BellRing className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-black text-lg text-rose-600 dark:text-rose-400">
                  {pendingRequests.length} Urgent Table Calls Requiring Waiter Action
                </h3>
                <p className="text-xs text-muted-foreground font-medium">Guests requesting waiter assistance or table bills</p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {pendingRequests.map((req: any) => (
              <div key={req.id} className="p-4 rounded-2xl bg-card border shadow-sm flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className="bg-primary text-primary-foreground font-black text-[10px] uppercase">
                      Table {req.tableId?.replace("t", "")}
                    </Badge>
                    <span className="font-extrabold text-xs">
                      {req.type === "WAITER" ? "🔔 Call Waiter" : "💳 Request Bill"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground italic font-medium">"{req.notes}"</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => resolveRequestMutation.mutate(req.id)}
                  disabled={resolveRequestMutation.isPending}
                  className="rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                >
                  <Check className="h-3.5 w-3.5" /> Resolve
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Floor Table Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black tracking-tight">Floor Tables Status</h2>
            <p className="text-xs text-muted-foreground font-medium">Tap any table to start order or release session</p>
          </div>
          <Badge variant="outline" className="font-bold text-xs">
            {tables.filter((t) => t.status === "OCCUPIED").length} Occupied / {tables.length} Total
          </Badge>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {tables.map((table) => {
            const isOccupied = table.status === "OCCUPIED";

            return (
              <Card
                key={table.id}
                className={`p-5 rounded-3xl border-2 transition-all flex flex-col justify-between space-y-4 cursor-pointer hover:shadow-lg ${
                  isOccupied
                    ? "bg-amber-500/10 border-amber-500/30"
                    : "bg-card border-muted/60 hover:border-primary/40"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-black uppercase text-muted-foreground block">Table</span>
                    <h3 className="text-2xl font-black text-foreground">
                      #{(table as any).number || table.id.replace("t", "")}
                    </h3>
                  </div>
                  <Badge
                    className={`font-black text-[9px] uppercase rounded-xl px-2 py-0.5 ${
                      isOccupied ? "bg-amber-500 text-amber-950" : "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                    }`}
                  >
                    {isOccupied ? "Occupied" : "Available"}
                  </Badge>
                </div>

                <div className="text-[11px] font-bold text-muted-foreground">
                  Seats: {table.capacity || 4} Guests
                </div>

                <div className="pt-2 border-t flex flex-col gap-1.5">
                  {isOccupied ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateTableStatusMutation.mutate({ id: table.id, status: "AVAILABLE" })}
                      className="w-full rounded-xl text-[11px] font-bold h-8 border-amber-500/40 text-amber-700 dark:text-amber-300"
                    >
                      Clear & Release
                    </Button>
                  ) : (
                    <Link href={`/menu?table=${table.id}`}>
                      <Button
                        size="sm"
                        className="w-full rounded-xl text-[11px] font-bold h-8 bg-primary hover:bg-primary/90 text-primary-foreground"
                      >
                        Start Order
                      </Button>
                    </Link>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Active Kitchen Tickets for Waiters */}
      <Card className="rounded-3xl border shadow-sm p-6 bg-card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-black text-lg flex items-center gap-2">
              <Utensils className="h-5 w-5 text-primary" />
              <span>Active Kitchen Tickets & Bill Settlement</span>
            </h3>
            <p className="text-xs text-muted-foreground">Track order preparation and settle bill once served</p>
          </div>
          <Badge variant="outline" className="font-bold text-xs">
            {activeOrders.length} Active Tickets
          </Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {activeOrders.map((order: any) => (
            <div key={order.id} className="p-4 rounded-2xl bg-muted/40 border space-y-3 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <Badge className="bg-primary/20 text-primary font-black text-[10px] uppercase">
                      {order.tableId ? `Table ${order.tableId.replace("t", "")}` : order.type}
                    </Badge>
                    <h4 className="font-black text-sm mt-1">Ticket #{order.id.slice(-6).toUpperCase()}</h4>
                  </div>
                  <Badge
                    className={`font-black text-[10px] uppercase ${
                      order.status === "SERVED" || order.status === "READY"
                        ? "bg-emerald-500 text-white animate-pulse"
                        : "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    {order.status}
                  </Badge>
                </div>

                <div className="text-xs space-y-1 text-muted-foreground font-medium">
                  {order.items?.map((item: any) => (
                    <div key={item.id} className="flex justify-between">
                      <span>{item.quantity}x {item.name}</span>
                      <span className="font-bold">{formatETB(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t space-y-2">
                <div className="flex justify-between items-center text-xs font-black">
                  <span>Total: {formatETB(order.total)}</span>
                  <Badge variant="outline" className="text-[10px] font-bold">
                    {order.paymentStatus}
                  </Badge>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => setSelectedOrderForPayment(order)}
                    className="w-full rounded-xl text-xs font-black h-9 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                  >
                    <CreditCard className="h-3.5 w-3.5" /> Settle Payment
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Payment Settlement Modal */}
      <PaymentSettlementModal
        order={selectedOrderForPayment}
        isOpen={!!selectedOrderForPayment}
        onClose={() => setSelectedOrderForPayment(null)}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  );
}
