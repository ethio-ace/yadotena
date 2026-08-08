"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/services/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatETB } from "@/lib/currency";
import { 
  ArrowLeft, CheckCircle2, Clock, MapPin, Receipt, Utensils, 
  BellRing, Plus, Star, Sparkles, Check, ChevronRight, Phone, MessageSquare, Printer
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, useEffect } from "react";

const statusSteps = [
  { id: "PENDING", label: "Order Received", desc: "Kitchen received ticket", icon: Receipt },
  { id: "CONFIRMED", label: "Confirmed", desc: "Chef scheduled prep", icon: CheckCircle2 },
  { id: "PREPARING", label: "Preparing in Kitchen", desc: "Artisanal preparation in progress", icon: Utensils },
  { id: "READY", label: "Ready to Serve", desc: "Plated & ready for delivery/pickup", icon: Clock },
];

export default function OrderTrackingPage() {
  const { id } = useParams();
  
  const [waiterCalled, setWaiterCalled] = useState(false);
  const [billRequested, setBillRequested] = useState(false);
  const [rating, setRating] = useState<number>(0);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(720); // 12 mins

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const { data: order, isLoading } = useQuery({
    queryKey: ["orders", id],
    queryFn: async () => {
      if (!id) return null;
      const foundOrder = await api.orders.getById(id as string);
      return foundOrder || null;
    },
    refetchInterval: 3000, 
  });

  const [tableId, setTableId] = useState<string | null>(null);

  useEffect(() => {
    if (order?.tableId) {
      setTableId(order.tableId);
    } else if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem("yadotena_table_id");
      if (stored) setTableId(stored);
    }
  }, [order]);

  const sendServiceRequest = useMutation({
    mutationFn: api.serviceRequests.create,
    onError: (err: Error) => {
      alert(err.message || "Could not send request");
    },
  });

  const submitReview = useMutation({
    mutationFn: api.reviews.create,
    onSuccess: () => setFeedbackSent(true),
    onError: (err: Error) => alert(err.message || "Could not submit review"),
  });

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto p-8 space-y-6 animate-pulse">
        <div className="h-44 bg-muted/60 rounded-3xl w-full"></div>
        <div className="h-64 bg-muted/60 rounded-3xl w-full"></div>
        <div className="h-48 bg-muted/60 rounded-3xl w-full"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-8 text-center flex flex-col items-center justify-center min-h-[70vh] max-w-md mx-auto space-y-4">
        <div className="h-24 w-24 bg-muted rounded-full flex items-center justify-center mb-2">
          <Receipt className="h-10 w-10 text-muted-foreground opacity-50" />
        </div>
        <h2 className="text-3xl font-black">Order Not Found</h2>
        <p className="text-muted-foreground text-sm">
          We couldn't locate this order ticket. Please check your link or return to the menu.
        </p>
        <Link href="/menu" className="pt-2">
          <Button size="lg" className="rounded-full px-8 font-bold">Back to Menu</Button>
        </Link>
      </div>
    );
  }

  const currentStepIndex = statusSteps.findIndex(s => s.id === order.status);
  const isCompleted = order.status === "COMPLETED" || order.status === "SERVED";
  const isCancelled = order.status === "CANCELLED";

  const handleCallWaiter = (customNote?: string) => {
    const effectiveTableId = order.tableId || tableId || "t1";
    sendServiceRequest.mutate({
      tableId: effectiveTableId,
      type: "WAITER",
      notes: customNote || "Guest requested waiter assistance at table",
    });
    setWaiterCalled(true);
    setTimeout(() => setWaiterCalled(false), 12000);
  };

  const handleRequestBill = (method: string = "Telebirr / Cash") => {
    const effectiveTableId = order.tableId || tableId || "t1";
    sendServiceRequest.mutate({
      tableId: effectiveTableId,
      type: "BILL",
      notes: `Requested table bill via ${method} (Total: ${formatETB(order.total)})`,
    });
    setBillRequested(true);
    setTimeout(() => setBillRequested(false), 12000);
  };

  return (
    <div className="flex flex-col min-h-full bg-muted/10 animate-in fade-in duration-500 pb-24">
      
      {/* Top Bar */}
      <div className="px-4 py-4 sticky top-0 bg-background/85 backdrop-blur-md z-20 border-b flex items-center shadow-sm">
        <div className="max-w-3xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/menu">
              <Button variant="ghost" size="icon" className="rounded-full hover:bg-muted">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h2 className="text-xl font-black">Live Order Status</h2>
              <p className="text-xs text-muted-foreground font-mono">Ticket #{order.id.slice(-6).toUpperCase()}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              size="sm" 
              variant="outline" 
              className="rounded-full text-xs font-bold gap-1.5 h-8"
              onClick={() => window.print()}
            >
              <Printer className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Print Bill</span>
            </Button>

            <Badge 
              variant="secondary" 
              className={`px-3 py-1 text-xs font-bold ${
                order.paymentStatus === "PAID" 
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" 
                  : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20"
              }`}
            >
              {order.paymentStatus === "PAID" ? "✓ Paid" : "⏳ Pay on Departure"}
            </Badge>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6 flex-1">
        <div className="max-w-3xl mx-auto space-y-6">
          
          {/* Order Hero Status Card */}
          <Card className="border-none shadow-xl overflow-hidden bg-gradient-to-br from-primary via-primary/95 to-amber-600 text-primary-foreground rounded-3xl">
            <CardContent className="p-6 md:p-8 text-center relative">
              <div className="absolute top-0 right-0 transform translate-x-8 -translate-y-8 h-40 w-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
              
              <Badge className="bg-white/20 hover:bg-white/20 text-white font-bold backdrop-blur-md border border-white/25 px-4 py-1 text-xs mb-3">
                {order.type === "DINE_IN" ? `Dine-In • Table ${order.tableId?.replace("t", "")}` :
                 order.type === "TAKEAWAY" ? "Takeaway Pickup" : "Doorstep Delivery"}
              </Badge>

              <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2">
                {isCompleted ? "Order Complete! 🎉" : 
                 isCancelled ? "Order Cancelled" : 
                 order.status === "READY" ? "Your Meal is Ready! 🍽️" : 
                 order.status === "PREPARING" ? "Cooking with Passion 👨‍🍳" : "Ticket in Kitchen"}
              </h1>

              {order.type === "DELIVERY" && order.deliveryAddress && (
                <p className="text-sm text-primary-foreground/90 max-w-md mx-auto flex items-center justify-center gap-1.5 mt-1">
                  <MapPin className="h-4 w-4 shrink-0" />
                  <span className="truncate">{order.deliveryAddress}</span>
                </p>
              )}

              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <div className="inline-flex items-center gap-2 bg-black/25 backdrop-blur-md rounded-full px-5 py-2.5 font-bold text-sm border border-white/15">
                  <Clock className="h-4 w-4 text-amber-300 animate-pulse" />
                  <span>Est. Prep: {formatCountdown(secondsRemaining)} remaining</span>
                </div>
                <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md rounded-full px-5 py-2.5 font-bold text-sm border border-white/15">
                  <span>Total: {formatETB(order.total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dine-In Interactive Action Hub (Call Waiter / Bill) */}
          {order.type === "DINE_IN" && (
            <Card className="border-primary/20 bg-card rounded-3xl shadow-sm p-4 md:p-5">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="font-extrabold text-base flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span>Table Assistance & Quick Actions</span>
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Signal your waiter, request your check, or add more gourmet items to your table.
                  </p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button 
                    variant={waiterCalled ? "default" : "outline"} 
                    className={`rounded-2xl font-bold flex-1 sm:flex-none h-11 text-xs transition-all ${
                      waiterCalled ? "bg-emerald-600 text-white hover:bg-emerald-700" : "hover:border-primary"
                    }`}
                    onClick={() => handleCallWaiter()}
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

                  <Button 
                    variant={billRequested ? "default" : "secondary"}
                    className={`rounded-2xl font-bold flex-1 sm:flex-none h-11 text-xs transition-all ${
                      billRequested ? "bg-emerald-600 text-white hover:bg-emerald-700" : ""
                    }`}
                    onClick={() => handleRequestBill()}
                    disabled={billRequested}
                  >
                    {billRequested ? (
                      <>
                        <Check className="h-4 w-4 mr-1.5" />
                        <span>Bill Requested!</span>
                      </>
                    ) : (
                      <>
                        <Receipt className="h-4 w-4 mr-1.5" />
                        <span>Request Bill</span>
                      </>
                    )}
                  </Button>

                  <Link href="/menu">
                    <Button variant="outline" size="icon" className="rounded-2xl h-11 w-11 shrink-0" title="Order More">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          )}

          {/* Timeline Progress */}
          <Card className="rounded-3xl shadow-sm border-muted-foreground/15">
            <CardContent className="p-6 md:p-8">
              <h3 className="font-black text-lg mb-6 flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                <span>Kitchen Timeline</span>
              </h3>

              <div className="relative pl-6 sm:pl-8 space-y-8 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-muted">
                {statusSteps.map((step, idx) => {
                  const isPassed = currentStepIndex >= idx;
                  const isCurrent = currentStepIndex === idx;
                  const StepIcon = step.icon;

                  return (
                    <div key={step.id} className="relative flex items-start gap-4 group">
                      <div 
                        className={`absolute -left-6 sm:-left-8 top-0.5 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                          isPassed
                            ? "bg-primary text-primary-foreground shadow-md shadow-primary/30 ring-4 ring-background"
                            : "bg-muted text-muted-foreground border-2 border-background"
                        } ${isCurrent ? "scale-110 ring-primary/20 ring-4" : ""}`}
                      >
                        {isPassed && !isCurrent ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : <StepIcon className="h-3.5 w-3.5" />}
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h4 className={`font-extrabold text-sm ${isPassed ? "text-foreground" : "text-muted-foreground"}`}>
                            {step.label}
                          </h4>
                          {isCurrent && (
                            <Badge className="bg-primary/15 text-primary border-primary/20 text-[10px] font-bold animate-pulse">
                              In Progress
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {step.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Order Itemized Summary */}
          <Card className="rounded-3xl shadow-sm border-muted-foreground/15">
            <CardContent className="p-6 md:p-8 space-y-4">
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <h3 className="font-extrabold text-base">Ordered Items</h3>
                  <p className="text-xs text-muted-foreground">Detailed breakdown of your selection</p>
                </div>
                <Badge variant="secondary" className="font-bold">
                  {order.items.reduce((s, i) => s + i.quantity, 0)} Items
                </Badge>
              </div>

              <div className="divide-y">
                {order.items.map((item) => (
                  <div key={item.id} className="py-3.5 flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="h-6 w-6 rounded-lg bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">
                          {item.quantity}x
                        </span>
                        <span className="font-bold text-sm text-foreground">{item.name}</span>
                      </div>
                      {item.specialInstructions && (
                        <p className="text-xs text-muted-foreground italic pl-8">
                          "{item.specialInstructions}"
                        </p>
                      )}
                    </div>
                    <span className="font-extrabold text-sm text-foreground">
                      {formatETB(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Total calculation */}
              <div className="pt-4 border-t space-y-2 text-sm text-muted-foreground">
                <div className="flex justify-between font-black text-lg text-foreground pt-2 border-t">
                  <span>Grand Total</span>
                  <span className="text-primary">{formatETB(order.total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customer Satisfaction Feedback (After Meal) */}
          <Card className="rounded-3xl shadow-sm border-muted-foreground/15 bg-card/60 p-6 text-center space-y-3">
            <h4 className="font-bold text-base">How is your dining experience?</h4>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Your instant feedback helps our chef and floor staff deliver five-star service.
            </p>

            <div className="flex items-center justify-center gap-2 pt-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  disabled={feedbackSent || submitReview.isPending}
                  onClick={() => {
                    setRating(star);
                    submitReview.mutate({
                      orderId: order.id,
                      rating: star,
                      customerName: order.customerName,
                      comment: "Quick rating from order tracking",
                    });
                  }}
                  className="p-1.5 hover:scale-110 transition-transform"
                >
                  <Star 
                    className={`h-7 w-7 ${
                      rating >= star 
                        ? "fill-amber-400 text-amber-400" 
                        : "text-muted-foreground/30 hover:text-amber-400"
                    } transition-colors`} 
                  />
                </button>
              ))}
            </div>

            {feedbackSent && (
              <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 animate-in fade-in">
                ✓ Thank you for rating Yadotena Milk & Foods {rating} stars!
              </p>
            )}
          </Card>

        </div>
      </div>
    </div>
  );
}
