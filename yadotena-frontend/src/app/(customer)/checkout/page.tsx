"use client";

import { useCartStore } from "@/stores/cartStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Trash2, ArrowLeft, Plus, Minus, Utensils, ShoppingBag, Truck, 
  Tag, HeartHandshake, CreditCard, Wallet, Smartphone, Banknote, CheckCircle2, MessageSquare
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/services/api";
import { useRouter } from "next/navigation";
import { OrderType } from "@/types";

const TIP_PERCENTAGES = [0, 5, 10, 15, 20];

const PAYMENT_METHODS = [
  { id: "card", name: "Credit Card", icon: CreditCard },
  { id: "applepay", name: "Apple / Google Pay", icon: Smartphone },
  { id: "chapa", name: "Chapa / Mobile Money", icon: Wallet },
  { id: "cash", name: "Cash on Delivery/Pickup", icon: Banknote },
];

export default function CheckoutPage() {
  const { items, removeItem, updateQuantity, getTotal, clearCart, tableId: sessionTableId, orderType: sessionOrderType, setActiveOrderId } = useCartStore();
  
  const [localOrderType, setLocalOrderType] = useState<OrderType>("TAKEAWAY");
  
  useEffect(() => {
    if (sessionOrderType) {
      setLocalOrderType(sessionOrderType);
    }
  }, [sessionOrderType]);

  const activeOrderType = sessionTableId ? "DINE_IN" : localOrderType;
  
  // Form fields
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  
  // Promo code state
  const [promoCode, setPromoCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discountPercent?: number; discountFixed?: number } | null>(null);
  const [promoError, setPromoError] = useState("");

  // Tip state
  const [tipPercent, setTipPercent] = useState<number>(10);

  // Payment method
  const [paymentMethod, setPaymentMethod] = useState("card");
  
  // Payment Simulation State
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const subtotal = getTotal();
  
  // Promo discount calculation
  let discountAmount = 0;
  if (appliedPromo?.discountPercent) {
    discountAmount = (subtotal * appliedPromo.discountPercent) / 100;
  } else if (appliedPromo?.discountFixed) {
    discountAmount = Math.min(subtotal, appliedPromo.discountFixed);
  }

  const discountedSubtotal = Math.max(0, subtotal - discountAmount);
  const tax = discountedSubtotal * 0.15;
  const serviceCharge = activeOrderType === "DINE_IN" ? discountedSubtotal * 0.10 : 0;
  const deliveryFee = activeOrderType === "DELIVERY" ? 3.00 : 0;
  const tipAmount = (discountedSubtotal * tipPercent) / 100;
  
  const finalTotal = discountedSubtotal + tax + serviceCharge + deliveryFee + tipAmount;

  const router = useRouter();

  const createOrder = useMutation({
    mutationFn: api.orders.create,
    onSuccess: (order) => {
      setActiveOrderId(order.id);
      clearCart();
      router.push(`/order/${order.id}`);
    }
  });

  const handleApplyPromo = () => {
    setPromoError("");
    const clean = promoCode.trim().toUpperCase();
    if (clean === "YADOTENA10") {
      setAppliedPromo({ code: "YADOTENA10", discountPercent: 10 });
    } else if (clean === "WELCOME5") {
      setAppliedPromo({ code: "WELCOME5", discountFixed: 5.00 });
    } else {
      setPromoError("Invalid code. Try 'YADOTENA10' for 10% off!");
    }
  };

  const handleCheckout = async () => {
    if (activeOrderType === "TAKEAWAY" && (!customerName || !customerPhone)) return alert("Name and phone are required for Takeaway");
    if (activeOrderType === "DELIVERY" && (!customerName || !customerPhone || !deliveryAddress)) return alert("Name, phone, and address are required for Delivery");

    const requiresPaymentFirst = activeOrderType === "TAKEAWAY" || activeOrderType === "DELIVERY";

    if (requiresPaymentFirst) {
      setIsProcessingPayment(true);
      await new Promise(resolve => setTimeout(resolve, 2000));
      setIsProcessingPayment(false);
    }

    createOrder.mutate({
      type: activeOrderType,
      status: "PENDING",
      paymentStatus: requiresPaymentFirst ? "PAID" : "PENDING",
      items: items,
      total: finalTotal,
      tableId: sessionTableId || undefined,
      customerName: requiresPaymentFirst ? customerName : undefined,
      customerPhone: requiresPaymentFirst ? customerPhone : undefined,
      deliveryAddress: activeOrderType === "DELIVERY" ? deliveryAddress : undefined,
    });
  };

  if (items.length === 0) {
    return (
      <div className="p-8 text-center flex flex-col items-center justify-center min-h-[70vh] max-w-md mx-auto space-y-4">
        <div className="h-28 w-28 bg-primary/10 rounded-full flex items-center justify-center mb-2 animate-bounce">
          <Utensils className="h-12 w-12 text-primary" />
        </div>
        <h2 className="text-3xl font-black tracking-tight">Your Tray is Empty</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Explore our artisanal culinary creations and craft beverages to fill your plate.
        </p>
        <Link href="/menu" className="pt-2">
          <Button size="lg" className="rounded-full px-8 font-bold shadow-lg shadow-primary/25">
            Browse Delicious Menu
          </Button>
        </Link>
      </div>
    );
  }

  const isCheckoutDisabled = createOrder.isPending || isProcessingPayment;

  return (
    <div className="flex flex-col min-h-full bg-muted/10 animate-in slide-in-from-right-4 duration-300 pb-36">
      
      {/* Top Header */}
      <div className="px-4 py-4 sticky top-0 bg-background/85 backdrop-blur-md z-20 border-b flex items-center shadow-sm">
        <div className="max-w-3xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/menu">
              <Button variant="ghost" size="icon" className="rounded-full hover:bg-muted">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h2 className="text-xl font-black">Your Current Order</h2>
              <p className="text-xs text-muted-foreground">{items.length} item{items.length > 1 ? "s" : ""} selected</p>
            </div>
          </div>
          
          <Badge variant="secondary" className="px-3 py-1 text-xs font-bold bg-primary/10 text-primary border border-primary/20">
            {activeOrderType === "DINE_IN" ? `Table ${sessionTableId?.replace("t","")}` : activeOrderType}
          </Badge>
        </div>
      </div>

      <div className="max-w-3xl mx-auto w-full p-4 md:p-6 space-y-6">
        
        {/* Order Type Selector (Only if not QR-scanned) */}
        {!sessionTableId && (
          <div className="bg-card p-1.5 rounded-2xl border flex gap-1.5 shadow-sm">
            <Button 
              variant={activeOrderType === "TAKEAWAY" ? "default" : "ghost"} 
              className="flex-1 rounded-xl font-bold py-5 text-sm"
              onClick={() => setLocalOrderType("TAKEAWAY")}
            >
              <ShoppingBag className="h-4 w-4 mr-2" /> Takeaway
            </Button>
            <Button 
              variant={activeOrderType === "DELIVERY" ? "default" : "ghost"} 
              className="flex-1 rounded-xl font-bold py-5 text-sm"
              onClick={() => setLocalOrderType("DELIVERY")}
            >
              <Truck className="h-4 w-4 mr-2" /> Delivery
            </Button>
          </div>
        )}

        {/* Customer & Location Details */}
        <Card className="border-muted-foreground/15 bg-card/70 backdrop-blur-sm shadow-sm rounded-3xl overflow-hidden">
          <CardContent className="p-5 md:p-6 space-y-4">
            {activeOrderType === "DINE_IN" ? (
              <div className="flex items-center gap-4 bg-primary/10 p-4 rounded-2xl border border-primary/20">
                <div className="h-12 w-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary flex-shrink-0">
                  <Utensils className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base">Dining Session • Table {sessionTableId?.replace('t', '')}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Orders are routed straight to the kitchen. Payment will be settled after your dining experience.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <h3 className="font-bold text-base flex items-center gap-2">
                  <span>Contact & Dispatch Details</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Full Name</label>
                    <Input 
                      value={customerName} 
                      onChange={(e) => setCustomerName(e.target.value)} 
                      placeholder="e.g. John Doe" 
                      className="rounded-xl bg-background/50 h-11"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Phone Number</label>
                    <Input 
                      value={customerPhone} 
                      onChange={(e) => setCustomerPhone(e.target.value)} 
                      placeholder="e.g. 091 123 4567" 
                      className="rounded-xl bg-background/50 h-11"
                    />
                  </div>
                </div>

                {activeOrderType === "DELIVERY" && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Delivery Address & Building</label>
                    <Input 
                      value={deliveryAddress} 
                      onChange={(e) => setDeliveryAddress(e.target.value)} 
                      placeholder="e.g. Bole Atlas, Sunrise Tower, 4th Floor, Apt 402" 
                      className="rounded-xl bg-background/50 h-11"
                    />
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Plate / Tray Items */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-extrabold text-lg">My Plate</h3>
            <Link href="/menu" className="text-xs font-bold text-primary hover:underline">
              + Add More Items
            </Link>
          </div>

          <div className="space-y-3">
            {items.map((item) => (
              <Card key={item.id} className="overflow-hidden border-muted-foreground/15 bg-card/80 backdrop-blur-sm rounded-2xl shadow-sm">
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-base truncate">{item.name}</h4>
                    <div className="text-primary font-black text-sm mt-0.5">
                      ${(item.price * item.quantity).toFixed(2)}
                      {item.quantity > 1 && (
                        <span className="text-xs text-muted-foreground font-normal ml-1.5">
                          (${item.price.toFixed(2)} each)
                        </span>
                      )}
                    </div>
                    {item.specialInstructions && (
                      <p className="text-xs text-muted-foreground mt-1.5 bg-muted/60 p-2 rounded-lg leading-snug">
                        {item.specialInstructions}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2.5 bg-muted/70 rounded-full p-1 border">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 rounded-full bg-background shadow-sm hover:bg-background/80"
                      onClick={() => item.quantity > 1 ? updateQuantity(item.id, item.quantity - 1) : removeItem(item.id)}
                    >
                      {item.quantity > 1 ? <Minus className="h-3.5 w-3.5" /> : <Trash2 className="h-3.5 w-3.5 text-destructive" />}
                    </Button>
                    <span className="w-5 text-center font-bold text-sm">{item.quantity}</span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 rounded-full bg-background shadow-sm hover:bg-background/80"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Kitchen / Order Note */}
        <Card className="border-muted-foreground/15 bg-card/70 backdrop-blur-sm rounded-3xl shadow-sm">
          <CardContent className="p-5 space-y-2">
            <label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5 text-primary" />
              General Order Note for Waiter & Kitchen
            </label>
            <Input
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
              placeholder="e.g. Please bring all food together, extra napkins..."
              className="rounded-xl bg-background/50 h-11"
            />
          </CardContent>
        </Card>

        {/* Promo Code Card */}
        <Card className="border-muted-foreground/15 bg-card/70 backdrop-blur-sm rounded-3xl shadow-sm">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-primary" />
                <span className="font-bold text-sm">Promo Code or Voucher</span>
              </div>
              <span className="text-xs text-muted-foreground font-mono">Use 'YADOTENA10'</span>
            </div>

            {appliedPromo ? (
              <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-2xl">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Coupon {appliedPromo.code} Applied ({appliedPromo.discountPercent ? `${appliedPromo.discountPercent}% OFF` : `$${appliedPromo.discountFixed} OFF`})</span>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-xs text-destructive hover:bg-destructive/10 rounded-lg"
                  onClick={() => setAppliedPromo(null)}
                >
                  Remove
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  placeholder="Enter coupon code"
                  className="rounded-xl uppercase font-bold bg-background/50 h-11 tracking-wider"
                />
                <Button 
                  variant="secondary" 
                  className="rounded-xl font-bold px-5 h-11 shadow-sm"
                  onClick={handleApplyPromo}
                >
                  Apply
                </Button>
              </div>
            )}
            {promoError && <p className="text-xs text-destructive font-medium">{promoError}</p>}
          </CardContent>
        </Card>

        {/* Staff Tip Selector */}
        <Card className="border-muted-foreground/15 bg-card/70 backdrop-blur-sm rounded-3xl shadow-sm">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HeartHandshake className="h-4 w-4 text-rose-500" />
                <span className="font-bold text-sm">Tip the Wonderful Staff</span>
              </div>
              <span className="text-xs font-bold text-primary">${tipAmount.toFixed(2)}</span>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {TIP_PERCENTAGES.map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setTipPercent(pct)}
                  className={`py-2.5 rounded-2xl text-xs font-bold border transition-all ${
                    tipPercent === pct
                      ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20 scale-105"
                      : "bg-background/60 border-muted hover:border-muted-foreground/30 text-muted-foreground"
                  }`}
                >
                  {pct === 0 ? "No Tip" : `${pct}%`}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Payment Method Selector (For Takeaway & Delivery) */}
        {(activeOrderType === "TAKEAWAY" || activeOrderType === "DELIVERY") && (
          <Card className="border-muted-foreground/15 bg-card/70 backdrop-blur-sm rounded-3xl shadow-sm">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />
                <span className="font-bold text-sm">Select Payment Method</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {PAYMENT_METHODS.map((pm) => {
                  const Icon = pm.icon;
                  const isSelected = paymentMethod === pm.id;
                  return (
                    <div
                      key={pm.id}
                      onClick={() => setPaymentMethod(pm.id)}
                      className={`flex items-center gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                        isSelected 
                          ? "border-primary bg-primary/10 font-bold text-foreground shadow-sm ring-1 ring-primary"
                          : "border-muted hover:border-muted-foreground/30 bg-background/50 text-muted-foreground"
                      }`}
                    >
                      <div className={`p-2 rounded-xl ${isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-semibold">{pm.name}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Bill Summary Breakdown */}
        <div className="bg-card/90 backdrop-blur-md p-6 rounded-3xl border border-muted-foreground/15 shadow-sm space-y-3">
          <h3 className="font-extrabold text-base pb-1 border-b border-muted">Payment Breakdown</h3>

          <div className="flex justify-between text-sm text-muted-foreground font-medium">
            <span>Item Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>

          {discountAmount > 0 && (
            <div className="flex justify-between text-sm text-emerald-600 dark:text-emerald-400 font-bold">
              <span>Promo Discount ({appliedPromo?.code})</span>
              <span>-${discountAmount.toFixed(2)}</span>
            </div>
          )}

          <div className="flex justify-between text-sm text-muted-foreground font-medium">
            <span>VAT & Sales Tax (15%)</span>
            <span>${tax.toFixed(2)}</span>
          </div>

          {activeOrderType === "DINE_IN" && (
            <div className="flex justify-between text-sm text-muted-foreground font-medium">
              <span>Service Charge (10%)</span>
              <span>${serviceCharge.toFixed(2)}</span>
            </div>
          )}

          {activeOrderType === "DELIVERY" && (
            <div className="flex justify-between text-sm text-muted-foreground font-medium">
              <span>Delivery Dispatch Fee</span>
              <span>${deliveryFee.toFixed(2)}</span>
            </div>
          )}

          {tipAmount > 0 && (
            <div className="flex justify-between text-sm text-muted-foreground font-medium">
              <span>Staff Gratuity Tip ({tipPercent}%)</span>
              <span>${tipAmount.toFixed(2)}</span>
            </div>
          )}

          <div className="border-t pt-4 mt-2 flex justify-between items-baseline font-black text-2xl">
            <span>Total Payable</span>
            <span className="text-primary tracking-tight">
              ${finalTotal.toFixed(2)}
            </span>
          </div>
        </div>

      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-md border-t shadow-[0_-20px_40px_-15px_rgba(0,0,0,0.15)] z-40">
        <div className="max-w-3xl mx-auto">
          <Button 
            className="w-full text-lg md:text-xl h-16 rounded-full font-black shadow-xl shadow-primary/30 tracking-wide hover:scale-[1.01] transition-transform"
            onClick={handleCheckout}
            disabled={isCheckoutDisabled}
          >
            {isProcessingPayment ? "Simulating Secure Payment..." : 
             createOrder.isPending ? "Routing Order to Kitchen..." : 
             activeOrderType === "DINE_IN" ? `Place Dine-In Order • $${finalTotal.toFixed(2)}` : 
             `Pay & Place Order • $${finalTotal.toFixed(2)}`}
          </Button>
        </div>
      </div>

    </div>
  );
}
