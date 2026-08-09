"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { useShopCartStore } from "@/stores/shopCartStore";
import { useCartStore } from "@/stores/cartStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatETB } from "@/lib/currency";
import { computeOrderTotals } from "@/lib/order-totals";
import {
  CHECKOUT_STEP_LABELS,
  CheckoutStep,
  buildGuestPlacePayload,
  cashEnabled,
  parseDigitalMethods,
  placeOrderCtaLabel,
} from "@/lib/checkout-payment";
import type { OrderType } from "@/types";
import {
  ArrowLeft,
  Banknote,
  Check,
  Minus,
  Plus,
  ShoppingBag,
  Smartphone,
  Trash2,
  Truck,
} from "lucide-react";

export default function ShopCheckoutPage() {
  const router = useRouter();
  const {
    items,
    removeItem,
    updateQuantity,
    getTotal,
    clearCart,
  } = useShopCartStore();
  const setActiveOrderId = useCartStore((s) => s.setActiveOrderId);

  const [step, setStep] = useState<CheckoutStep>(1);
  const [fulfillment, setFulfillment] = useState<"SHOP_PICKUP" | "SHOP_DELIVERY">(
    "SHOP_PICKUP",
  );
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [paymentChoice, setPaymentChoice] = useState("cash");
  const [transactionReference, setTransactionReference] = useState("");
  const [formError, setFormError] = useState("");

  const { data: settings } = useQuery({
    queryKey: ["public-settings"],
    queryFn: () => api.settings.getPublic(),
    staleTime: 60_000,
  });
  const digitalMethods = parseDigitalMethods(settings);
  const showCash = cashEnabled(settings);
  const orderType = fulfillment as OrderType;

  useEffect(() => {
    if (!showCash && digitalMethods.length > 0 && paymentChoice === "cash") {
      setPaymentChoice(digitalMethods[0]);
    }
  }, [showCash, digitalMethods, paymentChoice]);

  const subtotal = getTotal();
  const { tax, deliveryFee, total } = computeOrderTotals({
    subtotal,
    orderType,
    serviceChargePercent: 0,
  });

  const createOrder = useMutation({
    mutationFn: api.orders.create,
    onSuccess: (order) => {
      setActiveOrderId(order.id);
      clearCart();
      router.push(`/order/${order.id}`);
    },
    onError: (err: Error) => {
      setFormError(err.message || "Could not place shop order.");
    },
  });

  const validateStep = (s: CheckoutStep): string | null => {
    if (s === 1 && items.length === 0) return "Add products before checkout.";
    if (s === 2) {
      if (!customerName.trim() || !customerPhone.trim()) {
        return "Name and phone are required.";
      }
      if (fulfillment === "SHOP_DELIVERY" && !deliveryAddress.trim()) {
        return "Delivery address is required.";
      }
    }
    if (s === 3) {
      if (!paymentChoice) return "Select a payment method.";
      if (paymentChoice !== "cash" && !transactionReference.trim()) {
        return "Enter your transaction reference for digital payment.";
      }
    }
    return null;
  };

  const goNext = () => {
    const err = validateStep(step);
    if (err) {
      setFormError(err);
      return;
    }
    setFormError("");
    setStep((s) => (s < 4 ? ((s + 1) as CheckoutStep) : s));
  };

  const goBack = () => {
    setFormError("");
    if (step === 1) {
      router.push("/shop");
      return;
    }
    setStep((s) => (s > 1 ? ((s - 1) as CheckoutStep) : s));
  };

  const handlePlace = () => {
    const err =
      validateStep(1) || validateStep(2) || validateStep(3);
    if (err) {
      setFormError(err);
      return;
    }
    try {
      const payload = buildGuestPlacePayload({
        orderType,
        customerName,
        customerPhone,
        deliveryAddress,
        items,
        total,
        paymentChoice,
        transactionReference,
      });
      createOrder.mutate(payload);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Invalid payment");
    }
  };

  if (items.length === 0) {
    return (
      <div className="p-8 text-center max-w-md mx-auto min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <ShoppingBag className="h-12 w-12 text-primary" />
        <h2 className="text-2xl font-black">Shop cart is empty</h2>
        <Link href="/shop">
          <Button className="rounded-full">Browse products</Button>
        </Link>
      </div>
    );
  }

  const isCash = paymentChoice === "cash";

  return (
    <div className="flex flex-col min-h-full pb-36">
      <div className="px-4 py-4 sticky top-0 bg-background/90 backdrop-blur-md z-20 border-b">
        <div className="max-w-3xl mx-auto space-y-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="rounded-full" onClick={goBack} type="button">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h2 className="text-xl font-black">Shop checkout</h2>
              <p className="text-xs text-muted-foreground">
                Step {step} of 4 · {CHECKOUT_STEP_LABELS[step - 1]}
              </p>
            </div>
          </div>
          <ol className="flex gap-1.5">
            {CHECKOUT_STEP_LABELS.map((label, i) => {
              const n = (i + 1) as CheckoutStep;
              return (
                <li key={label} className="flex-1">
                  <button
                    type="button"
                    disabled={n > step}
                    onClick={() => n < step && setStep(n)}
                    className={`w-full h-1.5 rounded-full ${n <= step ? "bg-primary" : "bg-muted"}`}
                    aria-label={label}
                  />
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      <div className="max-w-3xl mx-auto w-full p-4 space-y-5">
        {formError && (
          <div role="alert" className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
            {formError}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div className="bg-card p-1.5 rounded-2xl border flex gap-1.5">
              <Button
                variant={fulfillment === "SHOP_PICKUP" ? "default" : "ghost"}
                className="flex-1 rounded-xl font-bold py-5"
                type="button"
                onClick={() => setFulfillment("SHOP_PICKUP")}
              >
                <ShoppingBag className="h-4 w-4 mr-2" /> Pickup
              </Button>
              <Button
                variant={fulfillment === "SHOP_DELIVERY" ? "default" : "ghost"}
                className="flex-1 rounded-xl font-bold py-5"
                type="button"
                onClick={() => setFulfillment("SHOP_DELIVERY")}
              >
                <Truck className="h-4 w-4 mr-2" /> Delivery
              </Button>
            </div>
            {items.map((item) => (
              <Card key={item.id} className="rounded-2xl">
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h4 className="font-bold truncate">{item.name}</h4>
                    <p className="text-sm text-primary font-black">
                      {formatETB(item.price * item.quantity)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 bg-muted rounded-full p-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-full"
                      type="button"
                      onClick={() =>
                        item.quantity > 1
                          ? updateQuantity(item.id, item.quantity - 1)
                          : removeItem(item.id)
                      }
                    >
                      {item.quantity > 1 ? <Minus className="h-3.5 w-3.5" /> : <Trash2 className="h-3.5 w-3.5" />}
                    </Button>
                    <span className="w-5 text-center text-sm font-bold">{item.quantity}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-full"
                      type="button"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {step === 2 && (
          <Card className="rounded-3xl">
            <CardContent className="p-5 space-y-4">
              <h3 className="font-bold">Contact</h3>
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Full name"
                className="rounded-xl h-11"
              />
              <Input
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Phone"
                className="rounded-xl h-11"
                inputMode="tel"
              />
              {fulfillment === "SHOP_DELIVERY" && (
                <Input
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="Delivery address"
                  className="rounded-xl h-11"
                />
              )}
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card className="rounded-3xl">
            <CardContent className="p-5 space-y-3">
              <p className="text-xs text-muted-foreground">
                Shop orders wait for payment confirmation before staff pack them.
                Cash: pay at counter / on delivery. Digital: paste your transfer reference.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {showCash && (
                  <button
                    type="button"
                    onClick={() => setPaymentChoice("cash")}
                    className={`flex items-center gap-3 p-3.5 rounded-2xl border text-left ${
                      paymentChoice === "cash" ? "border-primary bg-primary/10 ring-1 ring-primary" : ""
                    }`}
                  >
                    <Banknote className="h-4 w-4" />
                    <span className="text-xs font-semibold">Cash</span>
                  </button>
                )}
                {digitalMethods.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPaymentChoice(m)}
                    className={`flex items-center gap-3 p-3.5 rounded-2xl border text-left ${
                      paymentChoice === m ? "border-primary bg-primary/10 ring-1 ring-primary" : ""
                    }`}
                  >
                    <Smartphone className="h-4 w-4" />
                    <span className="text-xs font-semibold">{m}</span>
                  </button>
                ))}
              </div>
              {paymentChoice !== "cash" && (
                <Input
                  value={transactionReference}
                  onChange={(e) => setTransactionReference(e.target.value)}
                  placeholder="Transaction reference"
                  className="rounded-xl h-11"
                />
              )}
            </CardContent>
          </Card>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <Card className="rounded-3xl">
              <CardContent className="p-5 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fulfillment</span>
                  <span className="font-semibold">{fulfillment}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Contact</span>
                  <span className="font-semibold text-right">
                    {customerName} · {customerPhone}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment</span>
                  <span className="font-semibold">
                    {isCash ? "Cash (pending confirm)" : `${paymentChoice} · ${transactionReference}`}
                  </span>
                </div>
              </CardContent>
            </Card>
            <div className="bg-card p-6 rounded-3xl border space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Subtotal</span>
                <span>{formatETB(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>VAT (15%)</span>
                <span>{formatETB(tax)}</span>
              </div>
              {fulfillment === "SHOP_DELIVERY" && (
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Delivery fee</span>
                  <span>{formatETB(deliveryFee)}</span>
                </div>
              )}
              <div className="flex justify-between font-black text-xl pt-2 border-t">
                <span>Total</span>
                <span className="text-primary">{formatETB(total)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 inset-x-0 p-4 border-t bg-background/95 z-40">
        <div className="max-w-3xl mx-auto">
          {step < 4 ? (
            <Button className="w-full h-14 rounded-full font-black" onClick={goNext} type="button">
              Continue
            </Button>
          ) : (
            <Button
              className="w-full h-14 rounded-full font-black"
              onClick={handlePlace}
              disabled={createOrder.isPending}
              type="button"
            >
              {createOrder.isPending ? (
                "Placing…"
              ) : (
                <span className="inline-flex items-center gap-2">
                  <Check className="h-5 w-5" />
                  {placeOrderCtaLabel(orderType, isCash)} · {formatETB(total)}
                </span>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
