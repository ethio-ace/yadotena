"use client";

import { useCartStore } from "@/stores/cartStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatETB } from "@/lib/currency";
import {
  Trash2,
  ArrowLeft,
  Plus,
  Minus,
  Utensils,
  ShoppingBag,
  Truck,
  CreditCard,
  Banknote,
  Smartphone,
  Check,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { useRouter } from "next/navigation";
import { OrderType, Table } from "@/types";
import {
  computeOrderTotals,
  parseServiceChargePercent,
} from "@/lib/order-totals";
import {
  CHECKOUT_STEP_LABELS,
  CheckoutStep,
  buildGuestPlacePayload,
  cashEnabled,
  parseDigitalMethods,
  placeOrderCtaLabel,
} from "@/lib/checkout-payment";

function isTableFree(t: Table) {
  return t.status === "AVAILABLE" && !t.currentOrderId;
}

export default function CheckoutPage() {
  const {
    items,
    removeItem,
    updateQuantity,
    getTotal,
    clearCart,
    tableId: sessionTableId,
    orderType: sessionOrderType,
    setActiveOrderId,
    setTableId,
    setOrderType,
  } = useCartStore();

  const [step, setStep] = useState<CheckoutStep>(1);
  const [localOrderType, setLocalOrderType] = useState<OrderType>("TAKEAWAY");
  const [pickedTableId, setPickedTableId] = useState<string | null>(null);
  /** Lock type only when checkout opened with an existing QR table session. */
  const [fromQrSession] = useState(
    () =>
      Boolean(
        useCartStore.getState().tableId &&
          useCartStore.getState().orderType === "DINE_IN",
      ),
  );

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");

  const [paymentChoice, setPaymentChoice] = useState<string>("cash");
  const [transactionReference, setTransactionReference] = useState("");
  const [formError, setFormError] = useState("");

  const lockedFromQr = fromQrSession;

  useEffect(() => {
    if (lockedFromQr) {
      setLocalOrderType("DINE_IN");
      setPickedTableId(sessionTableId);
      return;
    }
    if (sessionOrderType === "TAKEAWAY" || sessionOrderType === "DELIVERY") {
      setLocalOrderType(sessionOrderType);
    }
  }, [lockedFromQr, sessionOrderType, sessionTableId]);

  const activeOrderType: OrderType = lockedFromQr ? "DINE_IN" : localOrderType;
  const effectiveTableId =
    activeOrderType === "DINE_IN"
      ? lockedFromQr
        ? sessionTableId
        : pickedTableId
      : null;

  const { data: settings } = useQuery({
    queryKey: ["public-settings"],
    queryFn: () => api.settings.getPublic(),
    staleTime: 60_000,
  });
  const serviceChargePercent = parseServiceChargePercent(settings);
  const digitalMethods = parseDigitalMethods(settings);
  const showCash = cashEnabled(settings);

  const { data: tables = [] } = useQuery({
    queryKey: ["public-tables"],
    queryFn: api.tables.getAll,
    enabled: activeOrderType === "DINE_IN" && !lockedFromQr,
  });
  const freeTables = useMemo(() => tables.filter(isTableFree), [tables]);
  const tableLabel =
    tables.find((t) => t.id === effectiveTableId)?.name ||
    (effectiveTableId ? `Table` : null);

  useEffect(() => {
    if (!showCash && digitalMethods.length > 0 && paymentChoice === "cash") {
      setPaymentChoice(digitalMethods[0]);
    }
  }, [showCash, digitalMethods, paymentChoice]);

  const subtotal = getTotal();
  const { tax, serviceCharge, deliveryFee, total: finalTotal } = computeOrderTotals({
    subtotal,
    orderType: activeOrderType,
    serviceChargePercent,
  });

  const router = useRouter();
  const createOrder = useMutation({
    mutationFn: api.orders.create,
    onSuccess: (order) => {
      setActiveOrderId(order.id);
      clearCart();
      router.push(`/order/${order.id}`);
    },
    onError: (err: Error) => {
      setFormError(err.message || "Could not place order. Please try again.");
    },
  });

  const selectOrderType = (type: OrderType) => {
    if (lockedFromQr) return;
    setLocalOrderType(type);
    setOrderType(type);
    if (type !== "DINE_IN") {
      setPickedTableId(null);
      setTableId(null);
    }
  };

  const selectTable = (id: string) => {
    setPickedTableId(id);
    setTableId(id);
    setOrderType("DINE_IN");
    setLocalOrderType("DINE_IN");
  };

  const validateStep = (s: CheckoutStep): string | null => {
    if (s === 1) {
      if (items.length === 0) return "Add items before checkout.";
      if (activeOrderType === "DINE_IN" && !effectiveTableId) {
        return "Select a free table for dine-in.";
      }
      return null;
    }
    if (s === 2) {
      if (!customerName.trim() || !customerPhone.trim()) {
        return "Name and phone are required.";
      }
      if (activeOrderType === "DELIVERY" && !deliveryAddress.trim()) {
        return "Delivery address is required.";
      }
      return null;
    }
    if (s === 3) {
      if (activeOrderType === "DINE_IN") return null;
      if (!paymentChoice) return "Select a payment method.";
      if (paymentChoice !== "cash" && !transactionReference.trim()) {
        return "Enter your transaction reference for digital payment.";
      }
      return null;
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
      router.push("/menu");
      return;
    }
    setStep((s) => (s > 1 ? ((s - 1) as CheckoutStep) : s));
  };

  const handlePlace = () => {
    const err =
      validateStep(1) || validateStep(2) || validateStep(3) || validateStep(4);
    if (err) {
      setFormError(err);
      return;
    }
    setFormError("");
    try {
      const payload = buildGuestPlacePayload({
        orderType: activeOrderType,
        tableId: effectiveTableId,
        customerName,
        customerPhone,
        deliveryAddress,
        items,
        total: finalTotal,
        paymentChoice: activeOrderType === "DINE_IN" ? "cash" : paymentChoice,
        transactionReference,
      });
      createOrder.mutate(payload);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Invalid payment details");
    }
  };

  if (items.length === 0) {
    return (
      <div className="p-8 text-center flex flex-col items-center justify-center min-h-[70vh] max-w-md mx-auto space-y-4">
        <div className="h-28 w-28 bg-primary/10 rounded-full flex items-center justify-center mb-2">
          <Utensils className="h-12 w-12 text-primary" />
        </div>
        <h2 className="text-3xl font-black tracking-tight">Your Tray is Empty</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Explore the menu and add items to continue to checkout.
        </p>
        <Link href="/menu" className="pt-2">
          <Button size="lg" className="rounded-full px-8 font-bold">
            Browse Menu
          </Button>
        </Link>
      </div>
    );
  }

  const isCash =
    activeOrderType === "DINE_IN" || paymentChoice === "cash";
  const cta = placeOrderCtaLabel(activeOrderType, isCash);

  return (
    <div className="flex flex-col min-h-full bg-muted/10 pb-36">
      <div className="px-4 py-4 sticky top-0 bg-background/90 backdrop-blur-md z-20 border-b">
        <div className="max-w-3xl mx-auto w-full space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full shrink-0"
                onClick={goBack}
                type="button"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="min-w-0">
                <h2 className="text-xl font-black truncate">Checkout</h2>
                <p className="text-xs text-muted-foreground">
                  Step {step} of 4 · {CHECKOUT_STEP_LABELS[step - 1]}
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="shrink-0 text-xs font-bold">
              {activeOrderType === "DINE_IN"
                ? tableLabel || "Dine-in"
                : activeOrderType}
            </Badge>
          </div>

          <ol className="flex gap-1.5" aria-label="Checkout progress">
            {CHECKOUT_STEP_LABELS.map((label, i) => {
              const n = (i + 1) as CheckoutStep;
              const done = n < step;
              const current = n === step;
              return (
                <li key={label} className="flex-1">
                  <button
                    type="button"
                    disabled={n > step}
                    onClick={() => {
                      if (n < step) {
                        setFormError("");
                        setStep(n);
                      }
                    }}
                    className={`w-full h-1.5 rounded-full transition-colors ${
                      done || current ? "bg-primary" : "bg-muted"
                    } ${n < step ? "cursor-pointer" : ""}`}
                    aria-current={current ? "step" : undefined}
                    aria-label={`${label}${done ? " (completed)" : ""}`}
                  />
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      <div className="max-w-3xl mx-auto w-full p-4 md:p-6 space-y-5">
        {formError && (
          <div
            role="alert"
            className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm font-medium"
          >
            {formError}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            {!lockedFromQr && (
              <div className="bg-card p-1.5 rounded-2xl border flex flex-wrap gap-1.5 shadow-sm">
                <Button
                  variant={activeOrderType === "TAKEAWAY" ? "default" : "ghost"}
                  className="flex-1 rounded-xl font-bold py-5 text-sm min-w-[30%]"
                  onClick={() => selectOrderType("TAKEAWAY")}
                  type="button"
                >
                  <ShoppingBag className="h-4 w-4 mr-2" /> Takeaway
                </Button>
                <Button
                  variant={activeOrderType === "DELIVERY" ? "default" : "ghost"}
                  className="flex-1 rounded-xl font-bold py-5 text-sm min-w-[30%]"
                  onClick={() => selectOrderType("DELIVERY")}
                  type="button"
                >
                  <Truck className="h-4 w-4 mr-2" /> Delivery
                </Button>
                <Button
                  variant={activeOrderType === "DINE_IN" ? "default" : "ghost"}
                  className="flex-1 rounded-xl font-bold py-5 text-sm min-w-[30%]"
                  onClick={() => selectOrderType("DINE_IN")}
                  type="button"
                >
                  <Utensils className="h-4 w-4 mr-2" /> Dine-in
                </Button>
              </div>
            )}

            {activeOrderType === "DINE_IN" && lockedFromQr && (
              <Card className="rounded-3xl border-primary/20 bg-primary/5">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary shrink-0">
                    <Utensils className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base">
                      Dining at {tableLabel || "your table"}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Table linked from your QR session. Payment after the meal.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeOrderType === "DINE_IN" && !lockedFromQr && (
              <div className="space-y-3">
                <h3 className="font-extrabold text-base px-1">Choose a free table</h3>
                {freeTables.length === 0 ? (
                  <p className="text-sm text-muted-foreground px-1">
                    No free tables right now. Try takeaway or delivery, or ask staff.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {freeTables.map((t) => {
                      const selected = pickedTableId === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => selectTable(t.id)}
                          className={`rounded-2xl border p-4 text-left transition-all ${
                            selected
                              ? "border-primary bg-primary/10 ring-1 ring-primary"
                              : "border-muted bg-card hover:border-muted-foreground/30"
                          }`}
                        >
                          <div className="font-bold text-sm">{t.name}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {t.capacity} seats
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="font-extrabold text-lg">My Tray</h3>
                <Link
                  href="/menu"
                  className="text-xs font-bold text-primary hover:underline"
                >
                  + Add more
                </Link>
              </div>
              {items.map((item) => (
                <Card
                  key={item.id}
                  className="overflow-hidden rounded-2xl border-muted-foreground/15"
                >
                  <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-base truncate">{item.name}</h4>
                      <div className="text-primary font-black text-sm mt-0.5">
                        {formatETB(item.price * item.quantity)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 bg-muted/70 rounded-full p-1 border">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-full bg-background"
                        type="button"
                        onClick={() =>
                          item.quantity > 1
                            ? updateQuantity(item.id, item.quantity - 1)
                            : removeItem(item.id)
                        }
                      >
                        {item.quantity > 1 ? (
                          <Minus className="h-3.5 w-3.5" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        )}
                      </Button>
                      <span className="w-5 text-center font-bold text-sm">
                        {item.quantity}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-full bg-background"
                        type="button"
                        onClick={() =>
                          updateQuantity(item.id, item.quantity + 1)
                        }
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <Card className="rounded-3xl border-muted-foreground/15">
            <CardContent className="p-5 md:p-6 space-y-4">
              <h3 className="font-bold text-base">Contact details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Full name
                  </label>
                  <Input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Abebe Kebede"
                    className="rounded-xl h-11"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Phone number
                  </label>
                  <Input
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="e.g. 0911234567"
                    className="rounded-xl h-11"
                    inputMode="tel"
                  />
                </div>
              </div>
              {activeOrderType === "DELIVERY" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Delivery address
                  </label>
                  <Input
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="Building, floor, landmark"
                    className="rounded-xl h-11"
                  />
                </div>
              )}
              {activeOrderType === "DINE_IN" && (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  We use your phone if staff need to find your table. You pay after
                  dining.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card className="rounded-3xl border-muted-foreground/15">
            <CardContent className="p-5 space-y-4">
              {activeOrderType === "DINE_IN" ? (
                <div className="flex items-start gap-4 bg-primary/10 p-4 rounded-2xl border border-primary/20">
                  <Banknote className="h-6 w-6 text-primary shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-extrabold text-base">Pay after dining</h3>
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                      Your order goes to the kitchen now. Settle cash or digital
                      with staff when you are ready — no transaction reference
                      needed at this step.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-primary" />
                    <span className="font-bold text-sm">Payment method</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Pickup and delivery start in the kitchen after payment is
                    confirmed. Cash: pay at the counter (or on delivery) — staff
                    mark it received. Digital: transfer first, then enter your
                    reference for staff to verify.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {showCash && (
                      <button
                        type="button"
                        onClick={() => setPaymentChoice("cash")}
                        className={`flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all ${
                          paymentChoice === "cash"
                            ? "border-primary bg-primary/10 ring-1 ring-primary"
                            : "border-muted bg-background/50"
                        }`}
                      >
                        <div
                          className={`p-2 rounded-xl ${
                            paymentChoice === "cash"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }`}
                        >
                          <Banknote className="h-4 w-4" />
                        </div>
                        <span className="text-xs font-semibold">
                          Cash at counter / on delivery
                        </span>
                      </button>
                    )}
                    {digitalMethods.map((method) => {
                      const selected = paymentChoice === method;
                      return (
                        <button
                          key={method}
                          type="button"
                          onClick={() => setPaymentChoice(method)}
                          className={`flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all ${
                            selected
                              ? "border-primary bg-primary/10 ring-1 ring-primary"
                              : "border-muted bg-background/50"
                          }`}
                        >
                          <div
                            className={`p-2 rounded-xl ${
                              selected
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                            }`}
                          >
                            <Smartphone className="h-4 w-4" />
                          </div>
                          <span className="text-xs font-semibold">{method}</span>
                        </button>
                      );
                    })}
                  </div>
                  {paymentChoice !== "cash" && (
                    <div className="space-y-1.5 pt-1">
                      <label className="text-xs font-semibold text-muted-foreground">
                        Transaction reference
                      </label>
                      <Input
                        value={transactionReference}
                        onChange={(e) => setTransactionReference(e.target.value)}
                        placeholder="Paste Telebirr / bank transfer ID"
                        className="rounded-xl h-11"
                        autoComplete="off"
                      />
                      <p className="text-xs text-muted-foreground">
                        Required. Staff will verify before the kitchen starts.
                      </p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {step === 4 && (
          <div className="space-y-5">
            <Card className="rounded-3xl border-muted-foreground/15">
              <CardContent className="p-5 space-y-3 text-sm">
                <h3 className="font-extrabold text-base">Review</h3>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <span className="font-semibold">{activeOrderType}</span>
                </div>
                {activeOrderType === "DINE_IN" && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Table</span>
                    <span className="font-semibold">{tableLabel}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Contact</span>
                  <span className="font-semibold text-right">
                    {customerName} · {customerPhone}
                  </span>
                </div>
                {activeOrderType === "DELIVERY" && (
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground shrink-0">Address</span>
                    <span className="font-semibold text-right">{deliveryAddress}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment</span>
                  <span className="font-semibold text-right">
                    {activeOrderType === "DINE_IN"
                      ? "Pay later"
                      : paymentChoice === "cash"
                        ? "Cash (pending staff confirm)"
                        : `${paymentChoice} · ref ${transactionReference}`}
                  </span>
                </div>
              </CardContent>
            </Card>

            <div className="bg-card p-6 rounded-3xl border border-muted-foreground/15 space-y-3">
              <h3 className="font-extrabold text-base pb-1 border-b border-muted">
                Bill
              </h3>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Subtotal</span>
                <span>{formatETB(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>VAT (15%)</span>
                <span>{formatETB(tax)}</span>
              </div>
              {activeOrderType === "DINE_IN" && (
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Service ({serviceChargePercent}%)</span>
                  <span>{formatETB(serviceCharge)}</span>
                </div>
              )}
              {activeOrderType === "DELIVERY" && (
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Delivery fee</span>
                  <span>{formatETB(deliveryFee)}</span>
                </div>
              )}
              <div className="border-t pt-4 flex justify-between items-baseline font-black text-2xl">
                <span>Total</span>
                <span className="text-primary">{formatETB(finalTotal)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-md border-t z-40">
        <div className="max-w-3xl mx-auto flex gap-3">
          {step < 4 ? (
            <Button
              className="w-full h-14 rounded-full font-black text-base"
              onClick={goNext}
              type="button"
            >
              Continue
            </Button>
          ) : (
            <Button
              className="w-full h-14 rounded-full font-black text-base"
              onClick={handlePlace}
              disabled={createOrder.isPending}
              type="button"
            >
              {createOrder.isPending ? (
                "Placing order…"
              ) : (
                <span className="inline-flex items-center gap-2">
                  <Check className="h-5 w-5" />
                  {cta} · {formatETB(finalTotal)}
                </span>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
