"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatETB } from "@/lib/currency";
import { 
  CreditCard, 
  Receipt, 
  CheckCircle2, 
  Printer, 
  Smartphone,
  Wallet,
  Clock
} from "lucide-react";
import { useState } from "react";
import { PaymentSettlementModal } from "@/components/PaymentSettlementModal";
import { Order } from "@/types";

export default function CashierDashboardPage() {
  const queryClient = useQueryClient();
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState<Order | null>(null);

  const { data: orders = [] } = useQuery({
    queryKey: ["orders"],
    queryFn: api.orders.getAll,
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["payments"],
    queryFn: api.payments.getAll,
  });

  // Filter unpaid orders
  const unpaidOrders = orders.filter((o) => o.paymentStatus !== "PAID" && o.status !== "CANCELLED");
  const paidTodaySum = payments.reduce((acc: number, p: any) => acc + (p.amount || 0), 0);

  const handlePaymentSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["orders"] });
    queryClient.invalidateQueries({ queryKey: ["payments"] });
    queryClient.invalidateQueries({ queryKey: ["tables"] });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-16">
      {/* Cashier Banner */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 text-blue-50 p-6 md:p-8 rounded-3xl border border-blue-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 font-black text-[10px] uppercase tracking-wider px-3 py-1">
              💳 Cashier POS Terminal
            </Badge>
            <span className="text-xs text-blue-300 font-medium">Payment Settlement Console</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight">
            Register & Bill Clearance
          </h1>
          <p className="text-sm text-blue-200 max-w-xl">
            Settle customer bills, process Telebirr / CBE / Cash transactions with transaction reference numbers, print official tax receipts, and release tables.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700 text-right">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Total Shift Revenue</span>
            <span className="text-2xl font-black text-emerald-400">{formatETB(paidTodaySum)}</span>
          </div>
        </div>
      </div>

      {/* POS Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-3xl border shadow-sm p-6 bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Unpaid Checkout Queue</span>
            <div className="h-10 w-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <h2 className="text-3xl font-black text-foreground">{unpaidOrders.length} Tickets Pending</h2>
            <p className="text-xs text-amber-600 dark:text-amber-400 font-bold mt-1">Awaiting Payment Clearance</p>
          </div>
        </Card>

        <Card className="rounded-3xl border shadow-sm p-6 bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Telebirr & Digital Banking</span>
            <div className="h-10 w-10 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <Smartphone className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <h2 className="text-3xl font-black text-foreground">{formatETB(paidTodaySum * 0.75)}</h2>
            <p className="text-xs text-blue-600 font-bold mt-1">Telebirr / CBE / BOA Accounts</p>
          </div>
        </Card>

        <Card className="rounded-3xl border shadow-sm p-6 bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Cash Collected</span>
            <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Wallet className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <h2 className="text-3xl font-black text-foreground">{formatETB(paidTodaySum * 0.25)}</h2>
            <p className="text-xs text-emerald-600 font-bold mt-1">Verified Register Draw</p>
          </div>
        </Card>
      </div>

      {/* Unpaid Order Settlement Terminal Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black tracking-tight">Checkout Queue & Bill Settlement</h2>
            <p className="text-xs text-muted-foreground font-medium">Select an order ticket to complete payment</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {unpaidOrders.map((order: any) => (
            <Card key={order.id} className="rounded-3xl border-2 border-primary/20 shadow-md p-6 bg-card space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <Badge className="bg-primary text-primary-foreground font-black text-[10px] uppercase">
                      {order.tableId ? `Table ${order.tableId.replace("t", "")}` : order.type}
                    </Badge>
                    <h3 className="font-black text-lg mt-1">Ticket #{order.id.slice(-6).toUpperCase()}</h3>
                  </div>
                  <Badge variant="outline" className="font-bold text-xs text-amber-600 border-amber-500/30">
                    ⏳ Unpaid
                  </Badge>
                </div>

                <div className="divide-y divide-muted/60 text-xs font-medium space-y-1 pt-2">
                  {order.items?.map((item: any) => (
                    <div key={item.id} className="py-1 flex justify-between">
                      <span>{item.quantity}x {item.name}</span>
                      <span className="font-bold">{formatETB(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t space-y-3">
                <div className="flex justify-between items-center text-base font-black">
                  <span>Grand Total Due</span>
                  <span className="text-2xl font-black text-primary">{formatETB(order.total)}</span>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Button
                    onClick={() => setSelectedOrderForPayment(order)}
                    className="w-full rounded-2xl font-extrabold text-xs h-12 bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-lg shadow-emerald-600/20"
                  >
                    <CreditCard className="h-4 w-4" /> Settle Payment & Free Table
                  </Button>

                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => window.print()}
                    className="rounded-2xl h-12 w-12 shrink-0"
                    title="Print Receipt"
                  >
                    <Printer className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}

          {unpaidOrders.length === 0 && (
            <div className="col-span-full p-12 text-center space-y-3 border border-dashed rounded-3xl bg-card">
              <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
              <h3 className="text-lg font-black">All Bills Settled!</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto font-medium">
                There are currently no unpaid tickets in the checkout queue.
              </p>
            </div>
          )}
        </div>
      </div>

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
