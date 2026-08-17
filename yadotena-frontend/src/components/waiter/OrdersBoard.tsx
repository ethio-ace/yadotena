"use client";

import { useEffect, useState } from "react";
import { Order } from "@/types";
import { formatETB } from "@/lib/currency";
import { formatTableRef, useTableLabels } from "@/hooks/useTableLabels";
import { ArrowLeft, Check, CreditCard, UtensilsCrossed, ShoppingBag, Bike, Clock3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface OrdersBoardProps {
  orders: Order[];
  defaultTab?: string;
  onBack: () => void;
  onServe: (orderId: string) => void;
  onSettle: (order: Order) => void;
  onViewOrder: (order: Order) => void;
}

type Tab = "ACTIVE" | "READY" | "UNPAID" | "HISTORY";

const TYPE_META: Record<string, { label: string; icon: React.ElementType; cls: string }> = {
  DINE_IN: { label: "Dine-in", icon: UtensilsCrossed, cls: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  TAKEAWAY: { label: "Takeaway", icon: ShoppingBag, cls: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20" },
  DELIVERY: { label: "Delivery", icon: Bike, cls: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20" },
};

export function OrdersBoard({ orders, defaultTab, onBack, onServe, onSettle, onViewOrder }: OrdersBoardProps) {
  const tableLabels = useTableLabels();
  const [tab, setTab] = useState<Tab>((defaultTab as Tab) || "ACTIVE");

  const filtered = orders.filter(o => {
    switch (tab) {
      case "ACTIVE": return !["COMPLETED", "CANCELLED"].includes(o.status);
      case "READY": return o.status === "READY";
      case "UNPAID": return o.paymentStatus !== "PAID" && o.status !== "CANCELLED" && o.status !== "DRAFT";
      case "HISTORY": return o.status === "COMPLETED" || o.status === "CANCELLED";
      default: return true;
    }
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const statusStyle = (s: string) => {
    switch (s) {
      case "PENDING": return "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400";
      case "PREPARING": return "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400";
      case "READY": return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400";
      case "SERVED": return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400";
      case "COMPLETED": return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
      case "CANCELLED": return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const nextAction = (o: Order) => {
    if (o.status === "READY") return { label: "Mark Served", action: () => onServe(o.id), color: "bg-emerald-600 hover:bg-emerald-700 text-white" };
    if (o.paymentStatus !== "PAID" && ["SERVED", "COMPLETED"].includes(o.status)) return { label: "Settle Bill", action: () => onSettle(o), color: "bg-amber-600 hover:bg-amber-700 text-white" };
    if (o.paymentStatus !== "PAID" && o.status !== "CANCELLED") return { label: "Settle", action: () => onSettle(o), color: "bg-amber-600 hover:bg-amber-700 text-white" };
    return null;
  };

  // "Now" lives in state (lazy init runs once) and refreshes every 30s so
  // relative timestamps stay honest without impure calls during render.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  const ago = (d: string) => {
    const mins = Math.floor((now - new Date(d).getTime()) / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ago`;
  };

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "ACTIVE", label: "Active", count: orders.filter(o => !["COMPLETED", "CANCELLED"].includes(o.status)).length },
    { key: "READY", label: "Ready", count: orders.filter(o => o.status === "READY").length },
    { key: "UNPAID", label: "Unpaid", count: orders.filter(o => o.paymentStatus !== "PAID" && o.status !== "CANCELLED" && o.status !== "DRAFT").length },
    { key: "HISTORY", label: "History", count: 0 },
  ];

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto animate-in fade-in duration-200">
      <button onClick={onBack} className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Home
      </button>

      <div className="flex items-end justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Orders</h1>
          <p className="text-xs text-muted-foreground font-medium mt-0.5">Live tickets, ready plates & unsettled bills</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/70">On the floor</p>
          <p className="text-lg font-black leading-tight">
            {orders.filter(o => !["COMPLETED", "CANCELLED"].includes(o.status)).length}
          </p>
        </div>
      </div>

      <div className="flex gap-2 mb-5 overflow-x-auto scrollbar-none">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2 border",
              tab === t.key
                ? "bg-foreground text-background border-foreground shadow-sm"
                : "bg-card text-muted-foreground border-border hover:text-foreground"
            )}>
            {t.label}
            {t.count > 0 && t.key !== "HISTORY" && (
              <span className={cn(
                "h-5 min-w-5 px-1 rounded-full text-xs font-bold flex items-center justify-center",
                tab === t.key ? "bg-background/20 text-background" : "bg-foreground/10"
              )}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map(o => {
          const action = nextAction(o);
          const typeMeta = TYPE_META[o.type || "TAKEAWAY"] || TYPE_META.TAKEAWAY;
          const TypeIcon = typeMeta.icon;
          const unpaid = o.paymentStatus !== "PAID" && o.status !== "CANCELLED";
          return (
            <div
              key={o.id}
              onClick={() => onViewOrder(o)}
              className="p-4 rounded-2xl border bg-card space-y-3 cursor-pointer hover:border-primary/50 hover:shadow-md transition-all active:scale-[0.995]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-black tracking-tight">{o.id.slice(-6).toUpperCase()}</span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${statusStyle(o.status)}`}>{o.status}</span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${typeMeta.cls}`}>
                      <TypeIcon className="h-3 w-3" /> {typeMeta.label}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                    {o.tableId ? formatTableRef(o.tableId, tableLabels) : "Counter"}
                    <span className="opacity-50">·</span>
                    <span className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3" /> {ago(o.createdAt)}</span>
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-base font-black">{formatETB(o.total)}</p>
                  <p className={cn(
                    "text-[10px] font-black uppercase tracking-wide mt-0.5",
                    unpaid ? "text-rose-500" : "text-emerald-600 dark:text-emerald-400"
                  )}>
                    {unpaid ? "Unpaid" : "Paid"}
                  </p>
                </div>
              </div>
              <div className="text-xs text-muted-foreground leading-relaxed">
                {o.items?.slice(0, 3).map(i => `${i.quantity}× ${i.name}`).join(", ")}
                {(o.items?.length || 0) > 3 && <span className="font-bold text-foreground/70"> +{(o.items?.length || 0) - 3} more</span>}
              </div>
              {action && (
                <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                  <button onClick={action.action} className={`h-9 px-4 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all ${action.color}`}>
                    {action.label === "Mark Served" ? <Check className="h-3.5 w-3.5" /> : <CreditCard className="h-3.5 w-3.5" />}
                    {action.label}
                  </button>
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground bg-card border rounded-2xl">
            <p className="font-bold text-foreground">{tab === "HISTORY" ? "No completed orders yet." : "No orders in this view."}</p>
            <p className="text-sm mt-1">New orders will appear here automatically.</p>
          </div>
        )}
      </div>
    </div>
  );
}
