"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useCustomerDineIn } from "@/contexts/CustomerDineInContext";
import { formatETB } from "@/lib/currency";
import { api } from "@/services/api";
import { Order } from "@/types";
import { X, Plus, Minus, AlertCircle, Loader2, CheckCircle2, ChevronRight, Utensils } from "lucide-react";

/**
 * Guest cart: a bar at the bottom while browsing (never opens by itself),
 * a review sheet, and a "sent — your waiter will confirm" screen.
 * Orders go in as DRAFT; a waiter approves them before the kitchen sees them.
 */
export function CustomerDineInCart() {
  const {
    tableId, tableName, activeTableOrder, rememberOrder,
    cart, isCartOpen, setIsCartOpen, updateCartItemQty, removeFromCart, clearCart,
    itemCount, subtotal, lastAddedAt, setIsTablePickerOpen,
  } = useCustomerDineIn();

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
    if (!tableId) {
      setIsTablePickerOpen(true);
      return;
    }
    if (cart.length === 0 || isSubmitting) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    idemKey.current ||= crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    try {
      // The server merges into the table's open ticket as a new round.
      const order = await api.orders.create({
        type: "DINE_IN",
        tableId,
        customerName: customerName.trim() || undefined,
        paymentStatus: "PENDING",
        idempotencyKey: idemKey.current,
        items: cart.map((c) => ({
          menuItemId: c.menuItem.id,
          quantity: c.quantity,
          specialInstructions: c.specialInstructions,
          selectedAddons: c.selectedAddons.map((a) => a.id),
        })),
      });
      rememberOrder(order.id);
      clearCart();
      idemKey.current = null;
      setSentOrder(order);
    } catch (err: unknown) {
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
                    Your waiter will confirm it with you, then the kitchen starts cooking.
                  </p>
                </div>
                <div className="rounded-2xl border bg-muted/40 py-3">
                  <p className="text-xs font-bold text-muted-foreground">{tableName} · ticket</p>
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
                    <h3 className="text-lg font-black leading-tight">Your order</h3>
                    <button
                      type="button"
                      onClick={() => setIsTablePickerOpen(true)}
                      className="text-sm font-bold text-primary mt-0.5"
                    >
                      {tableId ? `${tableName} · change` : "Choose your table"}
                    </button>
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
                      <span className="text-muted-foreground">These items will be added to it.</span>
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

                  {cart.length > 0 && !activeTableOrder && (
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
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm font-bold">Items total</span>
                      <span className="text-xl font-black tabular-nums">{formatETB(subtotal)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">VAT and service charge are added on your bill. A waiter confirms your order before it goes to the kitchen.</p>
                    <button
                      onClick={submit}
                      disabled={isSubmitting}
                      className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-black text-base flex items-center justify-center gap-2 disabled:opacity-70 active:scale-[0.99] transition-transform"
                    >
                      {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                      {isSubmitting ? "Sending…" : tableId ? "Send order" : "Choose your table to send"}
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
