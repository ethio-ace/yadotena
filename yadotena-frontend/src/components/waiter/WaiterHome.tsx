"use client";

import { Order, ServiceRequest } from "@/types";
import { formatETB } from "@/lib/currency";
import { Coffee, ShoppingBag, ChevronRight, Bell, CreditCard, UtensilsCrossed } from "lucide-react";

interface WaiterHomeProps {
  orders: Order[];
  serviceRequests: ServiceRequest[];
  onCafeOrder: () => void;
  onShopSale: () => void;
  onViewReady: () => void;
  onViewUnpaid: () => void;
  onViewAlerts: () => void;
}

export function WaiterHome({
  orders, serviceRequests, onCafeOrder, onShopSale,
  onViewReady, onViewUnpaid, onViewAlerts,
}: WaiterHomeProps) {
  const readyOrders = orders.filter(o => o.status === "READY");
  const unpaidOrders = orders.filter(o =>
    o.paymentStatus !== "PAID" && o.status !== "CANCELLED" && o.status !== "DRAFT"
  );
  const pendingRequests = serviceRequests.filter(r => r.status === "PENDING");

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 max-w-2xl mx-auto animate-in fade-in duration-300">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          What do you need to do?
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Start an order or check on your tables.</p>
      </div>

      {/* Primary CTAs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={onCafeOrder}
          className="group relative flex flex-col items-start gap-3 p-6 rounded-2xl border-2 border-amber-600/30 bg-amber-50/50 dark:bg-amber-950/20 hover:border-amber-600 hover:shadow-lg transition-all text-left active:scale-[0.98]"
        >
          <div className="h-12 w-12 rounded-xl bg-amber-600 text-white flex items-center justify-center">
            <Coffee className="h-6 w-6" />
          </div>
          <div>
            <span className="text-lg font-bold text-foreground block">+ Café Order</span>
            <span className="text-sm text-muted-foreground">Food & drinks · Dine-in / Takeaway</span>
          </div>
          <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-hover:text-amber-600 group-hover:translate-x-1 transition-all" />
        </button>

        <button
          onClick={onShopSale}
          className="group relative flex flex-col items-start gap-3 p-6 rounded-2xl border-2 border-emerald-600/30 bg-emerald-50/50 dark:bg-emerald-950/20 hover:border-emerald-600 hover:shadow-lg transition-all text-left active:scale-[0.98]"
        >
          <div className="h-12 w-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
            <ShoppingBag className="h-6 w-6" />
          </div>
          <div>
            <span className="text-lg font-bold text-foreground block">+ Shop Sale</span>
            <span className="text-sm text-muted-foreground">Beans, powder & packaged goods</span>
          </div>
          <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
        </button>
      </div>

      {/* Service Snapshot */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
          Needs Attention
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Ready */}
          <button
            onClick={onViewReady}
            className="flex items-center gap-3 p-4 rounded-xl border bg-card hover:bg-accent/50 transition-colors text-left active:scale-[0.98]"
          >
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center text-sm font-bold ${
              readyOrders.length > 0 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" : "bg-muted text-muted-foreground"
            }`}>
              <UtensilsCrossed className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-bold text-foreground block">Ready to Serve</span>
              <span className="text-xs text-muted-foreground">{readyOrders.length} order{readyOrders.length !== 1 ? "s" : ""}</span>
            </div>
            {readyOrders.length > 0 && (
              <span className="h-6 w-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center animate-pulse">
                {readyOrders.length}
              </span>
            )}
          </button>

          {/* Unpaid */}
          <button
            onClick={onViewUnpaid}
            className="flex items-center gap-3 p-4 rounded-xl border bg-card hover:bg-accent/50 transition-colors text-left active:scale-[0.98]"
          >
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center text-sm font-bold ${
              unpaidOrders.length > 0 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400" : "bg-muted text-muted-foreground"
            }`}>
              <CreditCard className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-bold text-foreground block">Unpaid</span>
              <span className="text-xs text-muted-foreground">{unpaidOrders.length} bill{unpaidOrders.length !== 1 ? "s" : ""}</span>
            </div>
            {unpaidOrders.length > 0 && (
              <span className="h-6 w-6 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center">
                {unpaidOrders.length}
              </span>
            )}
          </button>

          {/* Requests */}
          <button
            onClick={onViewAlerts}
            className="flex items-center gap-3 p-4 rounded-xl border bg-card hover:bg-accent/50 transition-colors text-left active:scale-[0.98]"
          >
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center text-sm font-bold ${
              pendingRequests.length > 0 ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400" : "bg-muted text-muted-foreground"
            }`}>
              <Bell className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-bold text-foreground block">Requests</span>
              <span className="text-xs text-muted-foreground">{pendingRequests.length} table{pendingRequests.length !== 1 ? "s" : ""}</span>
            </div>
            {pendingRequests.length > 0 && (
              <span className="h-6 w-6 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center animate-bounce">
                {pendingRequests.length}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
