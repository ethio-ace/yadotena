"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCustomerDineIn } from "@/contexts/CustomerDineInContext";
import { formatETB } from "@/lib/currency";
import { api } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ShoppingBag, X, Plus, Minus, Trash2, UtensilsCrossed, Sparkles, AlertCircle, Loader2, ArrowRight
} from "lucide-react";

export function CustomerDineInCart() {
  const router = useRouter();
  const {
    tableId,
    tableName,
    cart,
    isCartOpen,
    setIsCartOpen,
    updateCartItemQty,
    removeFromCart,
    clearCart,
    itemCount,
    subtotal,
    serviceCharge,
    tax,
    total,
    setIsTablePickerOpen,
  } = useCustomerDineIn();

  const [customerName, setCustomerName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (itemCount === 0 && !isCartOpen) return null;

  const handleSubmitOrder = async () => {
    if (!tableId) {
      setErrorMsg("Please select your table before placing an order.");
      setIsTablePickerOpen(true);
      return;
    }

    if (cart.length === 0) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      // Map cart items into API wire format
      const payloadItems = cart.map((cItem) => {
        // Collect addon names or IDs
        const addonStrings = cItem.selectedAddons.map((a) => a.name || a.id);
        return {
          menuItemId: cItem.menuItem.id,
          quantity: cItem.quantity,
          specialInstructions: cItem.specialInstructions,
          selectedAddons: addonStrings,
        };
      });

      const newOrder = await api.orders.create({
        type: "DINE_IN",
        tableId: tableId,
        customerName: customerName.trim() || undefined,
        paymentStatus: "PENDING",
        items: payloadItems,
      });

      // Save recent order to localStorage for tracking history
      if (typeof window !== "undefined") {
        try {
          const recent = JSON.parse(localStorage.getItem("yadotena_recent_orders") || "[]");
          recent.unshift({ id: newOrder.id, date: new Date().toISOString(), total: newOrder.total });
          localStorage.setItem("yadotena_recent_orders", JSON.stringify(recent.slice(0, 10)));
        } catch (e) {
          console.error("Failed saving recent order", e);
        }
      }

      clearCart();
      setIsCartOpen(false);
      router.push(`/order/${encodeURIComponent(newOrder.id)}`);
    } catch (err: any) {
      console.error("Failed to place dine-in order:", err);
      setErrorMsg(err.message || "Could not submit your order. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating Bottom Bar (Sticky trigger) */}
      {!isCartOpen && itemCount > 0 && (
        <div className="fixed bottom-5 left-4 right-4 z-40 max-w-lg mx-auto animate-in slide-in-from-bottom-5 duration-300">
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="w-full bg-primary text-primary-foreground p-4 rounded-3xl shadow-2xl shadow-primary/40 flex items-center justify-between hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 border border-white/20"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center font-extrabold text-base">
                {itemCount}
              </div>
              <div className="text-left">
                <div className="font-black text-base leading-tight">Your Table Order</div>
                <div className="text-xs text-primary-foreground/80 font-medium">
                  {tableName || "Seated Dining"} · {cart.length} {cart.length === 1 ? "dish" : "dishes"}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-black text-lg">{formatETB(total)}</span>
              <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
                <ArrowRight className="h-4 w-4" />
              </div>
            </div>
          </button>
        </div>
      )}

      {/* Cart Full Drawer / Modal */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="fixed inset-0" onClick={() => !isSubmitting && setIsCartOpen(false)} />

          <div className="relative w-full max-w-lg bg-card border rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden z-10 animate-in slide-in-from-bottom duration-300 flex flex-col max-h-[92vh]">
            
            {/* Header */}
            <div className="px-6 py-4 border-b flex items-center justify-between bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                  <ShoppingBag className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-black text-lg leading-tight">Review Table Order</h3>
                  <p className="text-xs text-muted-foreground font-medium">
                    {tableName ? `Seated at ${tableName}` : "Select a table to submit"}
                  </p>
                </div>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="rounded-full"
                onClick={() => setIsCartOpen(false)}
                disabled={isSubmitting}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Scrollable Item List */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {!tableId && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs text-amber-700 dark:text-amber-400">
                  <span>No table connected yet. Select your table to order.</span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full text-xs font-bold bg-amber-500 text-white hover:bg-amber-600 border-none shrink-0 ml-2"
                    onClick={() => setIsTablePickerOpen(true)}
                  >
                    Select Table
                  </Button>
                </div>
              )}

              {errorMsg && (
                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 text-xs text-red-600 dark:text-red-400">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {cart.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground space-y-3">
                  <UtensilsCrossed className="h-12 w-12 mx-auto text-muted-foreground/40" />
                  <p className="font-bold text-base">Your table cart is empty</p>
                  <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                    Browse the Yadotena menu and add delicious dishes to your table order!
                  </p>
                </div>
              ) : (
                <div className="space-y-3 divide-y divide-muted/50">
                  {cart.map((item) => (
                    <div key={item.id} className="pt-3 first:pt-0 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h4 className="font-bold text-sm text-foreground truncate">
                            {item.menuItem.name}
                          </h4>
                          <span className="text-xs font-black text-primary">
                            {formatETB(item.unitPrice)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 bg-muted/50 border rounded-2xl p-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => updateCartItemQty(item.id, item.quantity - 1)}
                            className="h-7 w-7 rounded-xl bg-card border flex items-center justify-center hover:bg-muted text-foreground transition-colors"
                          >
                            {item.quantity === 1 ? (
                              <Trash2 className="h-3.5 w-3.5 text-red-500" />
                            ) : (
                              <Minus className="h-3.5 w-3.5" />
                            )}
                          </button>
                          <span className="font-black text-xs w-5 text-center">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateCartItemQty(item.id, item.quantity + 1)}
                            className="h-7 w-7 rounded-xl bg-card border flex items-center justify-center hover:bg-muted text-foreground transition-colors"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Selected add-ons */}
                      {item.selectedAddons.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {item.selectedAddons.map((addon) => (
                            <Badge
                              key={addon.id || addon.name}
                              variant="secondary"
                              className="text-[10px] bg-primary/10 text-primary border border-primary/20 font-bold px-2 py-0.5"
                            >
                              + {addon.name} ({formatETB(addon.price)})
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Special instructions note */}
                      {item.specialInstructions && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 italic">
                          &ldquo;{item.specialInstructions}&rdquo;
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Customer Name Input */}
              {cart.length > 0 && (
                <div className="pt-3 border-t space-y-1.5">
                  <label className="text-xs font-bold text-foreground block">
                    Guest Name (Optional)
                  </label>
                  <Input
                    placeholder="e.g. Abebe"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="rounded-2xl h-11 text-sm bg-muted/20"
                  />
                </div>
              )}

              {/* Financial Summary */}
              {cart.length > 0 && (
                <div className="p-4 rounded-2xl bg-muted/30 border space-y-2 text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal ({itemCount} items)</span>
                    <span>{formatETB(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>VAT (15%)</span>
                    <span>{formatETB(tax)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Dine-In Service Charge (10%)</span>
                    <span>{formatETB(serviceCharge)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t font-black text-sm text-foreground">
                    <span>TOTAL DUE</span>
                    <span className="text-lg text-emerald-600 dark:text-emerald-400">
                      {formatETB(total)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Submit Button */}
            {cart.length > 0 && (
              <div className="p-4 border-t bg-muted/20">
                <Button
                  onClick={handleSubmitOrder}
                  disabled={isSubmitting || !tableId}
                  className="w-full rounded-2xl font-black h-13 shadow-xl shadow-primary/25 text-base flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Sending Order to Kitchen...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5" />
                      <span>Place Order for {tableName || "Table"} ({formatETB(total)})</span>
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
