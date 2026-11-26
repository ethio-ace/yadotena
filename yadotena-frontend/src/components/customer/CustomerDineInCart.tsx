"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useCustomerDineIn } from "@/contexts/CustomerDineInContext";
import { formatETB } from "@/lib/currency";
import { api } from "@/services/api";
import { Order, PaymentPreference } from "@/types";
import { cn } from "@/lib/utils";
import { X, Plus, Minus, AlertCircle, Loader2, CheckCircle2, ChevronRight, Utensils, Bike, Banknote, Landmark, Clock } from "lucide-react";

/**
 * Guest cart: a bar at the bottom while browsing (never opens by itself),
 * a review sheet, and a "sent — your waiter will confirm" screen.
 * Orders go in as DRAFT; a waiter approves them before the kitchen sees them.
 * In delivery mode the sheet also collects name / phone / address and how the
 * customer will pay; staff call that number to confirm before approving.
 */
export function CustomerDineInCart() {
  const {
    tableId, tableKey, tableName, activeTableOrder, rememberOrder,
    cart, isCartOpen, setIsCartOpen, updateCartItemQty, removeFromCart, clearCart,
    itemCount, subtotal, lastAddedAt, setIsTablePickerOpen,
    orderMode, deliveryOpenNow, deliveryHours, deliveryFee, deliveryDetails, setDeliveryDetails,
  } = useCustomerDineIn();
  const isDelivery = orderMode === "DELIVERY";
  const [deliveryNote, setDeliveryNote] = useState("");
  const [payPref, setPayPref] = useState<PaymentPreference>("ON_DELIVERY");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const setDetail = (field: keyof typeof deliveryDetails, value: string) => {
    setDeliveryDetails({ ...deliveryDetails, [field]: value });
    setFieldErrors((e) => ({ ...e, [field === "name" ? "customerName" : field === "phone" ? "customerPhone" : "deliveryAddress"]: "" }));
  };
  const phoneDigits = deliveryDetails.phone.replace(/\D/g, "");
  const deliveryFormOk =
    deliveryDetails.name.trim().length >= 2 && phoneDigits.length >= 9 && deliveryDetails.address.trim().length >= 5;
  const orderTotal = isDelivery ? subtotal + deliveryFee : subtotal;

  const [customerName, setCustomerName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sentOrder, setSentOrder] = useState<Order | null>(null);
  // One key per cart submission so a double tap / retry never double-orders.
  const idemKey = useRef<string | null>(null);


  const close = () => {
    if (isSubmitting) return;
    setIsCartOpen(false);
    setSentOrder(null);
    setErrorMsg(null);
  };

  const submit = async () => {
    if (!isDelivery && !tableId) {
      setIsTablePickerOpen(true);
      return;
    }
    if (cart.length === 0 || isSubmitting) return;
    if (isDelivery && (!deliveryOpenNow || !deliveryFormOk)) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    setFieldErrors({});
    idemKey.current ||= crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const items = cart.map((c) => ({
      menuItemId: c.menuItem.id,
      quantity: c.quantity,
      specialInstructions: c.specialInstructions,
      selectedAddons: c.selectedAddons.map((a) => a.id),
    }));
    try {
      const order = isDelivery
        ? await api.orders.create({
            type: "DELIVERY",
            customerName: deliveryDetails.name.trim(),
            customerPhone: deliveryDetails.phone.trim(),
            deliveryAddress: deliveryDetails.address.trim(),
            notes: deliveryNote.trim() || undefined,
            paymentPreference: payPref,
            paymentStatus: "PENDING",
            idempotencyKey: idemKey.current,
            items,
          })
        : // The server merges into the table's open ticket as a new round.
          await api.orders.create({
            type: "DINE_IN",
            tableId: tableId!,
            tableKey: tableKey || undefined,
            customerName: customerName.trim() || undefined,
            paymentStatus: "PENDING",
            idempotencyKey: idemKey.current,
            items,
          });
      rememberOrder(order.id);
      clearCart();
      idemKey.current = null;
      setDeliveryNote("");
      setSentOrder(order);
    } catch (err: unknown) {
      // Field-level messages from the server (name / phone / address).
      const body = (err as { body?: Record<string, unknown> })?.body;
      if (body && typeof body === "object") {
        const fe: Record<string, string> = {};
        for (const k of ["customerName", "customerPhone", "deliveryAddress"]) {
          const v = body[k];
          if (v) fe[k] = Array.isArray(v) ? String(v[0]) : String(v);
        }
        setFieldErrors(fe);
      }
      setErrorMsg(err instanceof Error && err.message ? err.message : "We couldn't send your order. Please try again or call a waiter.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const ticket = (o: Order) => o.id.slice(-6).toUpperCase();

  return (
    <>
      {/* Bottom bar — only appears once something is in the cart */}
      {!isCartOpen && itemCount > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-40 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-background via-background/90 to-transparent pointer-events-none">
          {/* Keyed on the last add: re-mounting replays the pop-in so guests see it worked. */}
          <button
            key={lastAddedAt}
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="pointer-events-auto w-full max-w-lg mx-auto h-14 rounded-2xl bg-primary text-primary-foreground shadow-xl shadow-primary/30 flex items-center gap-3 px-4 font-black animate-in zoom-in-95 duration-300 active:scale-[0.99]"
          >
            <span className="h-8 min-w-8 px-2 rounded-xl bg-white/20 flex items-center justify-center tabular-nums">{itemCount}</span>
            <span className="flex-1 text-left">View your order</span>
            <span className="tabular-nums">{formatETB(subtotal)}</span>
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}

      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 animate-in fade-in duration-150" onClick={close}>
          <div
            className="w-full sm:max-w-md bg-background rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-4 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {sentOrder ? (
              /* ── Sent ─────────────────────────────────────────── */
              <div className="p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-center space-y-4">
                <div className="h-16 w-16 mx-auto rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="h-9 w-9" />
                </div>
                <div>
                  <h3 className="text-xl font-black">Order sent</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {sentOrder.type === "DELIVERY"
                      ? `We'll call you on ${deliveryDetails.phone.trim()} to confirm, then the kitchen starts cooking.`
                      : "Your waiter will confirm it with you, then the kitchen starts cooking."}
                  </p>
                </div>
                {sentOrder.type === "DELIVERY" && sentOrder.paymentPreference === "TRANSFER" && (
                  <p className="rounded-2xl bg-violet-500/10 text-sm px-4 py-3 text-left">
                    <span className="font-bold">Paying by transfer?</span> Open “Track my order” for our account numbers. Send{" "}
                    <span className="font-black tabular-nums">{formatETB(sentOrder.total)}</span> after we call to confirm.
                  </p>
                )}
                <div className="rounded-2xl border bg-muted/40 py-3">
                  <p className="text-xs font-bold text-muted-foreground">{sentOrder.type === "DELIVERY" ? "Delivery" : tableName} · ticket</p>
                  <p className="text-2xl font-black font-mono tracking-wider">#{ticket(sentOrder)}</p>
                </div>
                <div className="grid gap-2">
                  <Link
                    href={`/order/${encodeURIComponent(sentOrder.id)}`}
                    onClick={() => { setIsCartOpen(false); setSentOrder(null); }}
                    className="h-12 rounded-2xl bg-primary text-primary-foreground font-black flex items-center justify-center"
                  >
                    Track my order
                  </Link>
                  <button onClick={close} className="h-12 rounded-2xl border font-bold">
                    Order something else
                  </button>
                </div>
              </div>
            ) : (
              /* ── Review ───────────────────────────────────────── */
              <>
                <div className="px-5 pt-5 pb-3 flex items-start justify-between gap-3 shrink-0">
                  <div>
                    <h3 className="text-lg font-black leading-tight">{isDelivery ? "Your delivery order" : "Your order"}</h3>
                    {isDelivery ? (
                      <p className="text-sm font-bold text-violet-700 dark:text-violet-400 mt-0.5 flex items-center gap-1.5">
                        <Bike className="h-4 w-4" /> Delivered to you
                      </p>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsTablePickerOpen(true)}
                        className="text-sm font-bold text-primary mt-0.5"
                      >
                        {tableId ? `${tableName} · change` : "Choose your table"}
                      </button>
                    )}
                  </div>
                  <button onClick={close} aria-label="Close" className="h-10 w-10 rounded-xl flex items-center justify-center hover:bg-muted">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto px-5 space-y-3">
                  {activeTableOrder && (
                    <Link
                      href={`/order/${encodeURIComponent(activeTableOrder.id)}`}
                      onClick={() => setIsCartOpen(false)}
                      className="block rounded-2xl bg-muted/50 border px-4 py-3 text-sm"
                    >
                      <span className="font-bold">You already ordered (#{ticket(activeTableOrder)}).</span>{" "}
                      <span className="text-muted-foreground">
                        {isDelivery ? "This will be sent as a new delivery order." : "These items will be added to it."}
                      </span>
                    </Link>
                  )}

                  {cart.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground">
                      <Utensils className="h-10 w-10 mx-auto mb-2 opacity-40" />
                      <p className="font-bold text-foreground">Nothing here yet</p>
                      <p className="text-sm">Tap + next to a dish to add it.</p>
                    </div>
                  ) : (
                    <ul className="divide-y">
                      {cart.map((c) => (
                        <li key={c.id} className="py-3 flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-bold leading-tight">{c.menuItem.name}</p>
                            {c.selectedAddons.length > 0 && (
                              <p className="text-xs text-muted-foreground">+ {c.selectedAddons.map((a) => a.name).join(", ")}</p>
                            )}
                            {c.specialInstructions && (
                              <p className="text-xs text-amber-700 dark:text-amber-400">“{c.specialInstructions}”</p>
                            )}
                            <p className="text-sm font-black mt-1 tabular-nums">{formatETB(c.itemTotal)}</p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => (c.quantity <= 1 ? removeFromCart(c.id) : updateCartItemQty(c.id, c.quantity - 1))}
                              aria-label={`One less ${c.menuItem.name}`}
                              className="h-10 w-10 rounded-xl border flex items-center justify-center hover:bg-muted"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <span className="w-7 text-center font-black tabular-nums">{c.quantity}</span>
                            <button
                              onClick={() => updateCartItemQty(c.id, c.quantity + 1)}
                              aria-label={`One more ${c.menuItem.name}`}
                              className="h-10 w-10 rounded-xl border flex items-center justify-center hover:bg-muted"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}

                  {cart.length > 0 && isDelivery && (
                    <div className="space-y-3 pb-1">
                      {!deliveryOpenNow && (
                        <div className="rounded-2xl bg-amber-500/15 px-3 py-2.5 text-sm font-bold flex gap-2">
                          <Clock className="h-4 w-4 shrink-0 mt-0.5" />
                          <span>Delivery is closed right now{deliveryHours ? ` — we deliver ${deliveryHours}` : ""}.</span>
                        </div>
                      )}
                      <p className="text-xs font-black uppercase tracking-wider text-muted-foreground pt-1">Delivery details</p>
                      {([
                        { field: "name", key: "customerName", label: "Your name", placeholder: "Who should we ask for?", type: "text", auto: "name" },
                        { field: "phone", key: "customerPhone", label: "Phone number", placeholder: "09xx xxx xxx", type: "tel", auto: "tel" },
                      ] as const).map((f) => (
                        <label key={f.field} className="block">
                          <span className="text-xs font-bold text-muted-foreground">{f.label}</span>
                          <input
                            type={f.type}
                            inputMode={f.type === "tel" ? "tel" : undefined}
                            autoComplete={f.auto}
                            value={deliveryDetails[f.field]}
                            onChange={(e) => setDetail(f.field, e.target.value)}
                            placeholder={f.placeholder}
                            aria-invalid={!!fieldErrors[f.key]}
                            className={cn("mt-1 w-full h-11 px-3 rounded-xl border bg-background text-sm", fieldErrors[f.key] && "border-red-500")}
                          />
                          {fieldErrors[f.key] && <span className="text-xs text-red-600 dark:text-red-400">{fieldErrors[f.key]}</span>}
                        </label>
                      ))}
                      <label className="block">
                        <span className="text-xs font-bold text-muted-foreground">Delivery address</span>
                        <textarea
                          rows={2}
                          autoComplete="street-address"
                          value={deliveryDetails.address}
                          onChange={(e) => setDetail("address", e.target.value)}
                          placeholder="Area, street, building, floor, landmark"
                          aria-invalid={!!fieldErrors.deliveryAddress}
                          className={cn("mt-1 w-full px-3 py-2.5 rounded-xl border bg-background text-sm resize-none", fieldErrors.deliveryAddress && "border-red-500")}
                        />
                        {fieldErrors.deliveryAddress && <span className="text-xs text-red-600 dark:text-red-400">{fieldErrors.deliveryAddress}</span>}
                      </label>
                      <label className="block">
                        <span className="text-xs font-bold text-muted-foreground">Note for the rider (optional)</span>
                        <input
                          value={deliveryNote}
                          onChange={(e) => setDeliveryNote(e.target.value)}
                          placeholder="e.g. call when you arrive at the gate"
                          className="mt-1 w-full h-11 px-3 rounded-xl border bg-background text-sm"
                        />
                      </label>

                      <p className="text-xs font-black uppercase tracking-wider text-muted-foreground pt-1">How will you pay?</p>
                      <div role="radiogroup" aria-label="How will you pay?" className="grid gap-2">
                        {([
                          { value: "ON_DELIVERY", title: "Pay on delivery", hint: "Cash or mobile money to the rider", Icon: Banknote },
                          { value: "TRANSFER", title: "Transfer now", hint: "Bank or mobile transfer after we call — accounts on the next screen", Icon: Landmark },
                        ] as const).map(({ value, title, hint, Icon }) => (
                          <button
                            key={value}
                            type="button"
                            role="radio"
                            aria-checked={payPref === value}
                            onClick={() => setPayPref(value)}
                            className={cn(
                              "rounded-2xl border-2 px-3 py-2.5 flex items-start gap-3 text-left transition-colors",
                              payPref === value ? "border-primary bg-primary/5" : "hover:bg-muted"
                            )}
                          >
                            <Icon className={cn("h-5 w-5 mt-0.5 shrink-0", payPref === value ? "text-primary" : "text-muted-foreground")} />
                            <span>
                              <span className="block text-sm font-black">{title}</span>
                              <span className="block text-xs text-muted-foreground">{hint}</span>
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {cart.length > 0 && !isDelivery && !activeTableOrder && (
                    <label className="block pb-1">
                      <span className="text-xs font-bold text-muted-foreground">Your name (optional)</span>
                      <input
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="So the waiter knows who ordered"
                        className="mt-1 w-full h-11 px-3 rounded-xl border bg-background text-sm"
                      />
                    </label>
                  )}

                  {errorMsg && (
                    <div className="rounded-2xl bg-red-500/10 border border-red-500/30 px-3 py-2.5 text-sm text-red-700 dark:text-red-400 flex gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>{errorMsg}</span>
                    </div>
                  )}
                </div>

                {cart.length > 0 && (
                  <div className="p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] border-t space-y-2 shrink-0">
                    {isDelivery && (
                      <div className="space-y-0.5 text-sm text-muted-foreground">
                        <div className="flex justify-between"><span>Items</span><span className="tabular-nums">{formatETB(subtotal)}</span></div>
                        <div className="flex justify-between"><span>Delivery fee</span><span className="tabular-nums">{formatETB(deliveryFee)}</span></div>
                      </div>
                    )}
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm font-bold">{isDelivery ? "Total" : "Items total"}</span>
                      <span className="text-xl font-black tabular-nums">{formatETB(orderTotal)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {isDelivery
                        ? "We call you to confirm before the kitchen starts cooking."
                        : "Dine-in service charge is added on your bill. A waiter confirms your order before it goes to the kitchen."}
                    </p>
                    <button
                      onClick={submit}
                      disabled={isSubmitting || (isDelivery && (!deliveryOpenNow || !deliveryFormOk))}
                      className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-black text-base flex items-center justify-center gap-2 disabled:opacity-70 active:scale-[0.99] transition-transform"
                    >
                      {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                      {isSubmitting
                        ? "Sending…"
                        : isDelivery
                        ? !deliveryOpenNow ? "Delivery is closed now" : deliveryFormOk ? "Send delivery order" : "Fill in your details"
                        : tableId ? "Send order" : "Choose your table to send"}
                    </button>
                    <button onClick={close} className="w-full h-10 text-sm font-bold text-muted-foreground">
                      Add more dishes
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
