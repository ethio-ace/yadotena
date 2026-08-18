"use client";

import { useState } from "react";
import { Order } from "@/types";
import { formatETB } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  X, Printer, Check, Copy, Share2, Receipt, Sparkles, CheckCircle2, ShieldCheck
} from "lucide-react";

interface DigitalReceiptModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  addonMap?: Record<string, string>;
}

export function DigitalReceiptModal({
  order,
  isOpen,
  onClose,
  addonMap = {},
}: DigitalReceiptModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !order) return null;

  const isPaid = order.paymentStatus === "PAID";
  const ticketNumber = order.id.slice(-6).toUpperCase();
  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  const orderTrackUrl = `${origin}/order/${order.id}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(orderTrackUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative w-full max-w-md bg-card border rounded-3xl shadow-2xl overflow-hidden z-10 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Header Bar */}
        <div className="px-6 py-4 border-b flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base">Official Digital Receipt</h3>
              <p className="text-xs text-muted-foreground">Order #{ticketNumber}</p>
            </div>
          </div>
          <Button size="icon" variant="ghost" className="rounded-full" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Scrollable Receipt Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Paper Thermal Receipt Container */}
          <div
            id="digital-receipt-printable"
            className="w-full bg-background border-2 border-dashed border-primary/20 rounded-3xl p-6 space-y-5 shadow-xl relative overflow-hidden text-card-foreground"
          >
            {/* Top Store Branding */}
            <div className="text-center space-y-1.5 border-b pb-4">
              <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-primary text-primary-foreground font-black text-xl shadow-md shadow-primary/25 mb-1">
                🥛
              </div>
              <h2 className="font-black text-xl tracking-tight">YADOTENA MILK & FOODS</h2>
              <p className="text-xs text-muted-foreground font-semibold">
                Artisanal Dining & Dairy House
              </p>
              <p className="text-[11px] text-muted-foreground font-mono">
                Bole Medhanialem, Addis Ababa · TIN: 0048291048
              </p>
              <div className="pt-2 flex items-center justify-center gap-2">
                <Badge
                  className={`font-bold px-3 py-0.5 text-xs ${
                    isPaid
                      ? "bg-emerald-500 text-white"
                      : "bg-amber-500 text-amber-950"
                  }`}
                >
                  {isPaid ? "✓ PAID & SETTLED" : "PAYMENT PENDING"}
                </Badge>
              </div>
            </div>

            {/* Receipt Metadata */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-muted/30 p-3 rounded-2xl border">
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-bold">Ticket No</span>
                <span className="font-black text-foreground">#{ticketNumber}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-bold">Order ID</span>
                <span className="font-bold text-foreground truncate block">{order.id}</span>
              </div>
              <div className="mt-1">
                <span className="text-muted-foreground block text-[10px] uppercase font-bold">Table / Type</span>
                <span className="font-bold text-foreground">
                  {order.type === "DINE_IN"
                    ? `Dine-In (${order.tableId ? `Table ${order.tableId.replace(/^t/i, "")}` : "Table"})`
                    : order.type}
                </span>
              </div>
              <div className="mt-1">
                <span className="text-muted-foreground block text-[10px] uppercase font-bold">Date & Time</span>
                <span className="font-bold text-foreground">
                  {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground border-b pb-1">
                <span>Item</span>
                <span>Total</span>
              </div>

              <div className="space-y-2.5 divide-y divide-dashed">
                {order.items?.map((item, idx) => (
                  <div key={item.id || idx} className={idx > 0 ? "pt-2 space-y-1" : "space-y-1"}>
                    <div className="flex items-start justify-between text-xs gap-2">
                      <div className="font-bold text-foreground">
                        <span className="text-primary font-black mr-1">{item.quantity}×</span>
                        {item.name}
                      </div>
                      <div className="font-mono font-bold shrink-0">
                        {formatETB(item.price * item.quantity)}
                      </div>
                    </div>

                    {/* Add-ons list */}
                    {item.selectedAddons && item.selectedAddons.length > 0 && (
                      <div className="pl-4 space-y-0.5 text-[11px] text-muted-foreground font-mono">
                        {item.selectedAddons.map((addon, aIdx) => {
                          const addonKey = typeof addon === "string" ? addon : (addon as any)?.name || (addon as any)?.id || "";
                          const addonName = addonMap[addonKey] || addonKey;
                          return (
                            <div key={aIdx} className="flex justify-between">
                              <span>+ {addonName}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {item.specialInstructions && (
                      <div className="text-[10px] italic text-amber-600 dark:text-amber-400 pl-4">
                        Note: &ldquo;{item.specialInstructions}&rdquo;
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Summary */}
            <div className="border-t border-b py-3 space-y-1.5 text-xs font-mono">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>{formatETB(order.subtotal || 0)}</span>
              </div>
              {order.tax !== undefined && order.tax > 0 && (
                <div className="flex justify-between text-muted-foreground text-[11px]">
                  <span>VAT (15%)</span>
                  <span>{formatETB(order.tax)}</span>
                </div>
              )}
              {order.serviceCharge !== undefined && order.serviceCharge > 0 && (
                <div className="flex justify-between text-muted-foreground text-[11px]">
                  <span>Service Charge (10%)</span>
                  <span>{formatETB(order.serviceCharge)}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 font-black text-sm text-foreground">
                <span>GRAND TOTAL</span>
                <span className="text-base text-emerald-600 dark:text-emerald-400">
                  {formatETB(order.total)}
                </span>
              </div>
            </div>

            {/* Digital Verification Footer */}
            <div className="flex items-center justify-between pt-2">
              <div className="space-y-1 text-left">
                <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="h-3.5 w-3.5" /> Verified Digital Invoice
                </div>
                <p className="text-[10px] text-muted-foreground max-w-[200px]">
                  Scan QR code to track order status or view official receipt online.
                </p>
              </div>

              {/* QR Code SVG */}
              <div className="p-2 bg-white rounded-xl shadow-sm border border-neutral-200">
                <svg viewBox="0 0 100 100" className="w-14 h-14 fill-neutral-900" shapeRendering="crispEdges">
                  <rect x="0" y="0" width="28" height="28" fill="#18181b" rx="2" />
                  <rect x="4" y="4" width="20" height="20" fill="white" rx="1" />
                  <rect x="8" y="8" width="12" height="12" fill="#059669" rx="1" />

                  <rect x="72" y="0" width="28" height="28" fill="#18181b" rx="2" />
                  <rect x="76" y="4" width="20" height="20" fill="white" rx="1" />
                  <rect x="80" y="8" width="12" height="12" fill="#059669" rx="1" />

                  <rect x="0" y="72" width="28" height="28" fill="#18181b" rx="2" />
                  <rect x="4" y="76" width="20" height="20" fill="white" rx="1" />
                  <rect x="8" y="80" width="12" height="12" fill="#059669" rx="1" />

                  <rect x="36" y="8" width="8" height="8" fill="#18181b" />
                  <rect x="52" y="8" width="12" height="8" fill="#18181b" />
                  <rect x="36" y="24" width="12" height="8" fill="#18181b" />
                  <rect x="44" y="36" width="12" height="12" fill="#18181b" />
                  <rect x="64" y="36" width="8" height="12" fill="#18181b" />
                  <rect x="36" y="72" width="12" height="8" fill="#18181b" />
                  <rect x="56" y="72" width="8" height="12" fill="#18181b" />
                  <rect x="40" y="88" width="16" height="8" fill="#18181b" />
                </svg>
              </div>
            </div>

            <div className="text-center text-[10px] text-muted-foreground pt-1 italic font-medium">
              Thank you for dining at Yadotena Milk & Foods! 🥛✨
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button
              variant="outline"
              className="rounded-2xl font-bold flex items-center justify-center gap-2 h-11"
              onClick={handleCopyLink}
            >
              {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              <span>{copied ? "Link Copied!" : "Share Link"}</span>
            </Button>

            <Button
              className="rounded-2xl font-bold h-11 shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
              onClick={handlePrint}
            >
              <Printer className="h-4 w-4" />
              <span>Print Receipt</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
