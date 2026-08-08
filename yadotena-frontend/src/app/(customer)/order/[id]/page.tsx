"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, CheckCircle2, Clock, MapPin, Receipt, Utensils, 
  BellRing, Plus, Star, Sparkles, Check, ChevronRight, Phone, MessageSquare
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

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

  const { data: order, isLoading } = useQuery({
    queryKey: ["orders", id],
    queryFn: async () => {
      if (!id) return null;
      const foundOrder = await api.orders.getById(id as string);
      return foundOrder || null;
    },
    refetchInterval: 3000, 
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

  const handleCallWaiter = () => {
    setWaiterCalled(true);
    setTimeout(() => setWaiterCalled(false), 8000);
  };

  const handleRequestBill = () => {
    setBillRequested(true);
    setTimeout(() => setBillRequested(false), 8000);
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

          <Badge 
            variant="secondary" 
            className={`px-3 py-1 text-xs font-bold ${
              order.paymentStatus === "PAID" 
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" 
                : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20"
            }`}
          >
            {order.paymentStatus === "PAID" ? "✓ Paid" : "⏳ Pay After Dining"}
          </Badge>
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
                <div className="inline-flex items-center gap-2 bg-black/20 backdrop-blur-md rounded-full px-5 py-2.5 font-bold text-sm border border-white/15">
                  <Clock className="h-4 w-4" />
                  <span>Est. Prep: 15–20 minutes</span>
                </div>
                <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md rounded-full px-5 py-2.5 font-bold text-sm border border-white/15">
                  <span>Total: ${order.total.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dine-In Quick Action Bar */}
          {order.type === "DINE_IN" && !isCancelled && (
            <div className="grid grid-cols-3 gap-3">
              <Button
                variant="outline"
                className={`h-auto py-3.5 px-3 rounded-2xl flex flex-col items-center gap-1.5 border-muted-foreground/15 bg-card/80 backdrop-blur-sm transition-all ${
                  waiterCalled ? "border-primary bg-primary/10 text-primary" : "hover:border-primary/50"
                }`}
                onClick={handleCallWaiter}
              >
                <BellRing className={`h-5 w-5 ${waiterCalled ? "animate-bounce text-primary" : "text-muted-foreground"}`} />
                <span className="text-xs font-bold">{waiterCalled ? "Waiter Alerted!" : "Call Waiter"}</span>
              </Button>

              <Button
                variant="outline"
                className={`h-auto py-3.5 px-3 rounded-2xl flex flex-col items-center gap-1.5 border-muted-foreground/15 bg-card/80 backdrop-blur-sm transition-all ${
                  billRequested ? "border-primary bg-primary/10 text-primary" : "hover:border-primary/50"
                }`}
                onClick={handleRequestBill}
              >
                <Receipt className={`h-5 w-5 ${billRequested ? "animate-pulse text-primary" : "text-muted-foreground"}`} />
                <span className="text-xs font-bold">{billRequested ? "Bill Requested!" : "Request Bill"}</span>
              </Button>

              <Link href="/menu" className="w-full">
                <Button
                  variant="outline"
                  className="w-full h-auto py-3.5 px-3 rounded-2xl flex flex-col items-center gap-1.5 border-muted-foreground/15 bg-card/80 backdrop-blur-sm hover:border-primary/50"
                >
                  <Plus className="h-5 w-5 text-muted-foreground" />
                  <span className="text-xs font-bold">Order More</span>
                </Button>
              </Link>
            </div>
          )}

          {/* Live Preparation Timeline */}
          {!isCancelled && !isCompleted && (
            <Card className="rounded-3xl border-muted-foreground/15 bg-card/70 backdrop-blur-sm shadow-sm overflow-hidden">
              <CardContent className="p-6 md:p-8 space-y-6">
                <h3 className="font-extrabold text-lg flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <span>Live Progress</span>
                </h3>

                <div className="space-y-8 pl-2">
                  {statusSteps.map((step, idx) => {
                    const isActive = idx <= currentStepIndex;
                    const isCurrent = idx === currentStepIndex;
                    const Icon = step.icon;

                    return (
                      <div key={step.id} className="relative flex items-start gap-4">
                        {idx !== statusSteps.length - 1 && (
                          <div 
                            className={`absolute left-5 top-10 bottom-[-32px] w-0.5 transition-colors duration-500 ${
                              isActive && !isCurrent ? 'bg-primary' : 'bg-muted'
                            }`} 
                          />
                        )}

                        <div className={`
                          h-10 w-10 rounded-full flex items-center justify-center shrink-0 z-10 border-4 transition-all duration-500
                          ${isCurrent 
                            ? 'bg-primary border-primary/30 text-primary-foreground ring-4 ring-primary/20 scale-110 shadow-lg shadow-primary/30' 
                            : isActive 
                            ? 'bg-primary border-primary text-primary-foreground' 
                            : 'bg-card border-muted text-muted-foreground'}
                        `}>
                          <Icon className={`h-4 w-4 ${isCurrent ? 'animate-pulse' : ''}`} />
                        </div>

                        <div className="pt-0.5">
                          <div className="flex items-center gap-2">
                            <h4 className={`font-bold text-base ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                              {step.label}
                            </h4>
                            {isCurrent && (
                              <span className="h-2 w-2 rounded-full bg-primary inline-block animate-ping" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{step.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Feedback & Star Rating Box (Available once ready or completed) */}
          {(isCompleted || order.status === "READY") && (
            <Card className="rounded-3xl border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card shadow-sm p-6 text-center space-y-4">
              <h3 className="font-extrabold text-lg">How was your culinary experience?</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Your feedback helps Chef Yadotena perfect our artisanal recipes.
              </p>

              {feedbackSent ? (
                <div className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm bg-emerald-500/10 p-3 rounded-2xl border border-emerald-500/20">
                  <Check className="h-4 w-4" />
                  <span>Thank you for your warm review! ⭐</span>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className="p-1 transition-transform hover:scale-125 focus:outline-none"
                      >
                        <Star 
                          className={`h-8 w-8 transition-colors ${
                            star <= rating 
                              ? "text-amber-500 fill-amber-500" 
                              : "text-muted-foreground/30 hover:text-amber-400"
                          }`} 
                        />
                      </button>
                    ))}
                  </div>

                  {rating > 0 && (
                    <Button 
                      size="sm" 
                      className="rounded-full font-bold px-6 shadow-md"
                      onClick={() => setFeedbackSent(true)}
                    >
                      Submit Feedback
                    </Button>
                  )}
                </div>
              )}
            </Card>
          )}

          {/* Itemized Receipt Details */}
          <Card className="rounded-3xl border-muted-foreground/15 bg-card/70 backdrop-blur-sm shadow-sm overflow-hidden">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="font-extrabold text-base">Ticket Itemization</h3>
                <span className="text-xs font-bold text-muted-foreground">{order.items.length} items</span>
              </div>

              <div className="space-y-3 divide-y divide-muted/40">
                {order.items.map((item: any, i: number) => (
                  <div key={i} className="pt-3 first:pt-0 flex justify-between items-start gap-4">
                    <div className="space-y-0.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-primary text-sm">{item.quantity}x</span>
                        <span className="font-bold text-sm text-foreground truncate">{item.name}</span>
                      </div>
                      {item.specialInstructions && (
                        <p className="text-xs text-muted-foreground italic pl-6">
                          "{item.specialInstructions}"
                        </p>
                      )}
                    </div>
                    <span className="font-black text-sm text-foreground shrink-0">
                      ${(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4 mt-4 space-y-2">
                <div className="flex justify-between font-black text-xl">
                  <span>Grand Total</span>
                  <span className="text-primary">${order.total.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
