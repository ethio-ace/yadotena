"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatETB } from "@/lib/currency";
import { addonNames, groupItemsByRound, roundStatus, roundTotal, roundCount } from "@/lib/kitchen";
import {
  ArrowLeft, BellRing, Check, CheckCircle2, CreditCard, Landmark,
  MapPin, Printer, Receipt, Sparkles, Copy, Utensils, QrCode, Layers
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { OrderProgressStepper } from "@/components/dashboard/OrderProgressStepper";
import { PaymentMethodsModal } from "@/components/customer/PaymentMethodsModal";
import { TrackOrderInput } from "@/components/customer/TrackOrderInput";
import { DigitalReceiptModal } from "@/components/customer/DigitalReceiptModal";
import { Order } from "@/types";

const getStatusColor = (status: string) => {
  switch (status) {
    case "COMPLETED": return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-transparent";
    case "READY": return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border-emerald-300";
    case "SERVED": return "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 border-blue-300";
    case "PREPARING": return "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400 border-purple-300";
    case "CANCELLED": return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 border-red-300";
    default: return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 border-amber-300";
  }
};

const getRoundCustomerStatus = (status: string) => {
  switch (status) {
    case "READY":
      return {
        label: "Ready to Serve",
        colorClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
        dotClass: "bg-emerald-500",
      };
    case "PREPARING":
      return {
        label: "Cooking in Kitchen",
        colorClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
        dotClass: "bg-amber-500 animate-pulse",
      };
    case "SERVED":
      return {
        label: "Served at Table",
        colorClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
        dotClass: "bg-blue-500",
      };
    case "CANCELLED":
      return {
        label: "Cancelled",
        colorClass: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30",
        dotClass: "bg-red-500",
      };
    default:
      return {
        label: "Kitchen Queue (Waiting)",
        colorClass: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/30",
        dotClass: "bg-zinc-400",
      };
  }
};

export default function OrderTrackingPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [waiterCalled, setWaiterCalled] = useState(false);
  const [billRequested, setBillRequested] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  // Resolve by full order id OR 6-character ticket number (public, no login).
  const { data: order, isLoading } = useQuery<Order | null>({
    queryKey: ["orders", id],
    queryFn: async () => {
      if (!id) return null;
      try {
        return await api.orders.lookup(id);
      } catch {
        try {
          return (await api.orders.getById(id)) || null;
        } catch {
          return null;
        }
      }
    },
    retry: false,
    refetchInterval: 5000, // Live poll every 5s for realtime order status updates!
  });

  // Item images + add-on name resolution
  const { data: menu = [] } = useQuery({
    queryKey: ["menu"],
    queryFn: api.menu.getAll,
    enabled: !!order && !isLoading,
  });
  // Public table roster
  const { data: tables = [] } = useQuery({
    queryKey: ["tables"],
    queryFn: api.tables.getAll,
    enabled: !!order && !isLoading,
  });
  const { data: addons = [] } = useQuery({
    queryKey: ["addons"],
    queryFn: () => api.addons.getAll(),
    enabled: !!order && !isLoading,
  });
  const addonMap = Object.fromEntries(addons.map(a => [a.id, a.name]));

  const sendServiceRequest = useMutation({
    mutationFn: api.serviceRequests.create,
  });

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-4 animate-pulse">
        <div className="h-16 bg-muted/60 rounded-2xl w-full" />
        <div className="h-40 bg-muted/60 rounded-2xl w-full" />
        <div className="h-48 bg-muted/60 rounded-2xl w-full" />
        <div className="h-32 bg-muted/60 rounded-2xl w-full" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[70vh] max-w-md mx-auto space-y-5">
        <div className="h-24 w-24 bg-muted rounded-full flex items-center justify-center mb-2">
          <Receipt className="h-10 w-10 text-muted-foreground opacity-50" />
        </div>
        <h2 className="text-3xl font-black text-center">Order Not Found</h2>
        <p className="text-muted-foreground text-sm text-center">
          We couldn&apos;t locate this order ticket. Double-check the number or look it up below.
        </p>
        <div className="w-full">
          <TrackOrderInput />
        </div>
        <Link href="/menu" className="pt-2">
          <Button size="lg" className="rounded-full px-8 font-bold">Back to Menu</Button>
        </Link>
      </div>
    );
  }

  const isPaid = order.paymentStatus === "PAID";
  const isCompleted = order.status === "COMPLETED";
  const isCancelled = order.status === "CANCELLED";
  const canRequestAssistance = order.type === "DINE_IN" && !isCompleted && !isCancelled;
  const payments = order.payments || [];
  const ticketNumber = order.id.slice(-6).toUpperCase();

  const handleCopyTicket = () => {
    navigator.clipboard.writeText(ticketNumber);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const getItemImage = (menuItemId: string) => {
    const mi = menu.find(m => m.id === menuItemId);
    const path = mi?.imageUrl || mi?.image;
    if (!path) return null;
    return path.startsWith("http") || path.startsWith("/") ? path : `/uploads/${path}`;
  };

  // Human table label for the alert ("Table 04 (VIP Lounge)" or "Table 4").
  const tableLabel = (() => {
    if (!order.tableId) return "the table";
    const named = tables.find(t => t.id === order.tableId)?.name;
    if (named) return named;
    return `Table ${order.tableId.replace(/^t/i, "")}`;
  })();

  const handleCallWaiter = () => {
    const effectiveTableId = order.tableId || "t1";
    sendServiceRequest.mutate({
      tableId: effectiveTableId,
      type: "WAITER",
      notes: `Guest requested waiter assistance at ${tableLabel}.`,
    });
    setWaiterCalled(true);
    setTimeout(() => setWaiterCalled(false), 12000);
  };

  const handleRequestBillSettlement = (methodName: string, methodCode: string) => {
    const effectiveTableId = order.tableId || "t1";
    const isCash = /cash/i.test(methodName) || /cash/i.test(methodCode);
    const notes = isCash
      ? `Guest is about to pay with Cash at ${tableLabel}. Please come and settle the bill.`
      : `Guest paid via ${methodName} (${methodCode}) at ${tableLabel}. Please verify and settle the bill.`;
    sendServiceRequest.mutate({
      tableId: effectiveTableId,
      type: "BILL",
      notes,
    });
    setBillRequested(true);
    setShowPaymentModal(false);
    setTimeout(() => setBillRequested(false), 12000);
  };

  const orderTypeLabel =
    order.type === "DINE_IN" ? `Dine-In • Table ${order.tableId?.replace(/^t/i, "")}` :
    order.type === "TAKEAWAY" ? "Takeaway Pickup" : "Doorstep Delivery";

  return (
    <div className="flex flex-col min-h-full bg-muted/10 animate-in fade-in duration-300">
      {/* Top Navigation Bar */}
      <div className="px-4 py-3 sticky top-0 bg-background/85 backdrop-blur-md z-20 border-b shadow-sm">
        <div className="max-w-2xl mx-auto w-full flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <Link href="/menu">
              <Button variant="ghost" size="icon" className="rounded-full hover:bg-muted shrink-0">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight leading-none">#{ticketNumber}</h2>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getStatusColor(order.status)}`}>
                  {order.status.replace(/_/g, " ")}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${isPaid ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" : "bg-amber-500/10 text-amber-600 border-amber-500/30"}`}>
                  {isPaid ? "PAID" : "UNPAID"}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground font-medium mt-1 truncate">
                {orderTypeLabel} • {new Date(order.createdAt).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              className="rounded-full text-xs font-bold gap-1.5 h-8 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
              onClick={() => setShowReceiptModal(true)}
            >
              <Receipt className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Digital Receipt</span>
            </Button>

            <Button
              size="sm"
              variant="outline"
              className="rounded-full text-xs font-bold gap-1.5 h-8"
              onClick={() => window.print()}
            >
              <Printer className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Print</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6 flex-1">
        <div className="max-w-2xl mx-auto space-y-4">

          {/* Prominent Order Tracking ID Header Banner */}
          <div className="bg-gradient-to-r from-primary/10 via-amber-500/10 to-primary/10 border-2 border-primary/20 rounded-3xl p-5 shadow-sm space-y-3 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-background/80 font-mono font-bold text-xs">
                    Tracking ID
                  </Badge>
                  <span className="text-xs text-muted-foreground font-medium">Order #{order.id}</span>
                </div>
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-black text-foreground tracking-tight font-mono">
                    #{ticketNumber}
                  </h1>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 rounded-full text-xs font-bold gap-1 bg-background/60 hover:bg-background border shadow-xs"
                    onClick={handleCopyTicket}
                  >
                    {copiedId ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copiedId ? "Copied!" : "Copy Code"}</span>
                  </Button>
                </div>
              </div>

              {/* Action Buttons inside banner */}
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  className="rounded-2xl font-bold text-xs h-10 px-4 shadow-md shadow-primary/20 gap-1.5"
                  onClick={() => setShowReceiptModal(true)}
                >
                  <Receipt className="h-4 w-4" />
                  <span>View Digital Receipt</span>
                </Button>

                {order.type === "DINE_IN" && order.tableId && !isCompleted && !isCancelled && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-2xl font-bold text-xs h-10 px-3.5 gap-1.5 bg-background/80 hover:bg-background"
                    onClick={() => router.push(`/menu?table=${encodeURIComponent(order.tableId!)}`)}
                  >
                    <Utensils className="h-4 w-4 text-primary" />
                    <span>Add More Dishes</span>
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Live Order Progress Stepper */}
          <div className="bg-card border rounded-2xl shadow-sm p-5">
            <OrderProgressStepper status={order.status} />
          </div>

          {/* Dine-In Assistance Hub */}
          {canRequestAssistance && (
            <div className="bg-card border border-primary/20 rounded-2xl shadow-sm p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm">Table Assistance</h3>
                  <p className="text-[11px] text-muted-foreground font-medium">
                    Call your waiter, check payment accounts, or request your bill.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  variant={waiterCalled ? "default" : "outline"}
                  className={`rounded-xl font-bold flex-1 sm:flex-none h-10 text-xs transition-all ${
                    waiterCalled ? "bg-emerald-600 text-white hover:bg-emerald-700 border-emerald-600" : "hover:border-primary"
                  }`}
                  onClick={handleCallWaiter}
                  disabled={waiterCalled}
                >
                  {waiterCalled ? (
                    <>
                      <Check className="h-4 w-4 mr-1.5" />
                      <span>Staff Alerted!</span>
                    </>
                  ) : (
                    <>
                      <BellRing className="h-4 w-4 mr-1.5 text-primary" />
                      <span>Call Waiter</span>
                    </>
                  )}
                </Button>
                {isPaid ? (
                  <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold text-xs px-4 h-10">
                    <CheckCircle2 className="h-4 w-4" />
                    Paid & Settled
                  </span>
                ) : (
                  <Button
                    variant={billRequested ? "default" : "secondary"}
                    className={`rounded-xl font-bold flex-1 sm:flex-none h-10 text-xs transition-all ${
                      billRequested ? "bg-emerald-600 text-white hover:bg-emerald-700" : ""
                    }`}
                    onClick={() => setShowPaymentModal(true)}
                  >
                    <Landmark className="h-4 w-4 mr-1.5" />
                    <span>{billRequested ? "Waiter on the way!" : "Payment & Bill"}</span>
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Order Items & Kitchen Rounds Breakdown */}
          <div className="bg-card border rounded-3xl shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Layers className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-foreground leading-none">
                    Order Items & Kitchen Rounds
                  </h3>
                  <p className="text-[11px] text-muted-foreground font-medium mt-1">
                    {order.items?.length || 0} items across {roundCount(order)} kitchen {roundCount(order) === 1 ? "round" : "rounds"}
                  </p>
                </div>
              </div>

              {roundCount(order) > 1 && (
                <Badge variant="secondary" className="bg-amber-500/15 text-amber-700 dark:text-amber-400 font-bold text-xs">
                  Multi-Round Order
                </Badge>
              )}
            </div>

            {/* Round Groups Loop */}
            <div className="space-y-4">
              {groupItemsByRound(order.items).map((rg) => {
                const rStatus = roundStatus(rg.items, order.status);
                const statusInfo = getRoundCustomerStatus(rStatus);
                const rSubtotal = roundTotal(rg.items);

                return (
                  <div key={rg.round} className="rounded-2xl border bg-muted/20 p-4 space-y-3">
                    {/* Round Header Bar */}
                    <div className="flex items-center justify-between gap-2 border-b pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="h-6 px-2.5 rounded-full bg-primary text-primary-foreground font-black text-xs flex items-center justify-center shadow-xs">
                          Round {rg.round}
                        </span>
                        <span className="font-extrabold text-sm text-foreground">
                          {rg.round === 1 ? "Initial Order" : "Added Later"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`font-bold text-[11px] px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 ${statusInfo.colorClass}`}>
                          <span className={`h-2 w-2 rounded-full ${statusInfo.dotClass}`} />
                          {statusInfo.label}
                        </Badge>
                        <span className="font-mono text-xs font-bold text-muted-foreground hidden sm:inline">
                          {formatETB(rSubtotal)}
                        </span>
                      </div>
                    </div>

                    {/* Items in this Round */}
                    <div className="space-y-2">
                      {rg.items.map((item, idx) => {
                        const img = getItemImage(item.menuItemId);
                        const aNames = addonNames(item.selectedAddons, addonMap);
                        const iStatus = item.status || rStatus;
                        const itemStatusInfo = getRoundCustomerStatus(iStatus);

                        return (
                          <div key={item.id || idx} className="p-3.5 rounded-xl border bg-card space-y-2 shadow-xs">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3 min-w-0">
                                {img ? (
                                  <img src={img} alt={item.name} className="h-11 w-11 rounded-xl object-cover shrink-0 border" />
                                ) : (
                                  <div className="h-11 w-11 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 font-black flex items-center justify-center text-xs shrink-0 border border-amber-500/20">
                                    {item.quantity}×
                                  </div>
                                )}
                                <div className="min-w-0 space-y-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-extrabold text-sm">{item.quantity}× {item.name}</span>
                                    {item.status && (
                                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${itemStatusInfo.colorClass}`}>
                                        <span className={`h-1.5 w-1.5 rounded-full ${itemStatusInfo.dotClass}`} />
                                        {itemStatusInfo.label}
                                      </span>
                                    )}
                                  </div>
                                  {item.specialInstructions && (
                                    <p className="text-xs text-amber-600 dark:text-amber-400 italic">
                                      &ldquo;{item.specialInstructions}&rdquo;
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="font-mono font-black text-sm shrink-0">
                                {formatETB(item.price * item.quantity)}
                              </div>
                            </div>

                            {aNames.length > 0 && (
                              <div className="pl-4 space-y-0.5 text-xs text-muted-foreground border-l-2 border-amber-500/40">
                                {aNames.map((aName, aIdx) => (
                                  <div key={aIdx} className="flex items-center gap-1 text-foreground font-medium">
                                    <span className="text-amber-500 font-bold">+</span>
                                    <span>{aName}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Financial Breakdown */}
            <div className="mt-4 p-4 rounded-xl border bg-muted/10 space-y-2 text-sm">
              {order.subtotal !== undefined && order.subtotal > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{formatETB(order.subtotal)}</span>
                </div>
              )}
              {order.tax !== undefined && order.tax > 0 && (
                <div className="flex justify-between text-muted-foreground text-xs">
                  <span>VAT (15%)</span>
                  <span>{formatETB(order.tax)}</span>
                </div>
              )}
              {order.serviceCharge !== undefined && order.serviceCharge > 0 && (
                <div className="flex justify-between text-muted-foreground text-xs">
                  <span>Service Charge (10%)</span>
                  <span>{formatETB(order.serviceCharge)}</span>
                </div>
              )}
              {order.deliveryFee !== undefined && order.deliveryFee > 0 && (
                <div className="flex justify-between text-muted-foreground text-xs">
                  <span>Delivery Fee</span>
                  <span>{formatETB(order.deliveryFee)}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t font-black text-base">
                <span>Total Amount</span>
                <span className="text-lg text-emerald-600 dark:text-emerald-400">{formatETB(order.total)}</span>
              </div>
            </div>

            {order.type === "DELIVERY" && order.deliveryAddress && (
              <p className="mt-3 text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                Delivering to: <span className="font-bold text-foreground truncate">{order.deliveryAddress}</span>
              </p>
            )}
          </div>

          {/* Payment Details */}
          <div className="bg-card border rounded-2xl shadow-sm p-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5" /> Payment Details
            </h3>

            {payments.length > 0 ? (
              <div className="space-y-3">
                {payments.map(p => (
                  <div key={p.id} className="p-4 rounded-xl border bg-emerald-500/5 dark:bg-emerald-950/20 border-emerald-500/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        <span className="font-bold text-sm uppercase tracking-wide">{p.method || "Settled"}</span>
                      </div>
                      <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                        {formatETB(p.amount || order.total)}
                      </span>
                    </div>
                    {p.transactionRef && (
                      <div className="flex items-center justify-between text-xs bg-background/80 p-2 rounded-lg border">
                        <span className="text-muted-foreground font-medium">Reference / TXN:</span>
                        <span className="font-mono font-bold text-foreground">{p.transactionRef}</span>
                      </div>
                    )}
                    {p.createdAt && (
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Paid At:</span>
                        <span>{new Date(p.createdAt).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : isPaid ? (
              <div className="p-4 rounded-xl border bg-emerald-500/5 dark:bg-emerald-950/20 border-emerald-500/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <div className="font-bold text-sm text-emerald-700 dark:text-emerald-400">Paid & Settled</div>
                    <div className="text-xs text-muted-foreground font-medium">Full bill of {formatETB(order.total)} cleared.</div>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-xs">Settled</span>
              </div>
            ) : (
              <div className="p-4 rounded-xl border bg-amber-500/5 border-amber-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-sm text-amber-700 dark:text-amber-400">Payment Pending</div>
                    <div className="text-xs text-muted-foreground font-medium">Amount due: {formatETB(order.total)}</div>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="rounded-xl font-bold text-xs h-9"
                    onClick={() => setShowPaymentModal(true)}
                  >
                    <Landmark className="h-3.5 w-3.5 mr-1.5" />
                    View Accounts
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {canRequestAssistance
                    ? "Send the amount digitally using the accounts shown, then call your waiter to confirm and settle. Cash can be paid directly to your waiter."
                    : "Send the amount digitally using the accounts shown, or pay cash at the counter — our staff will verify and settle your bill."}
                </p>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Read-only Payment Methods & Accounts modal */}
      <PaymentMethodsModal
        order={order}
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onRequestBillSettlement={handleRequestBillSettlement}
        isRequestingBill={sendServiceRequest.isPending}
        allowCallWaiter={canRequestAssistance}
      />

      {/* Digital Receipt Modal */}
      <DigitalReceiptModal
        order={order}
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        addonMap={addonMap}
      />
    </div>
  );
}
