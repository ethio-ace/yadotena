"use client";

import { useEffect, useState } from "react";
import { Order } from "@/types";
import { formatETB } from "@/lib/currency";
import { formatTableRef, useTableLabels } from "@/hooks/useTableLabels";
import { ArrowLeft, Check, CreditCard } from "lucide-react";

interface OrdersBoardProps {
  orders: Order[];
  defaultTab?: string;
  onBack: () => void;
  onServe: (orderId: string) => void;
  onSettle: (order: Order) => void;
  onViewOrder: (order: Order) => void;
}

type Tab = "ACTIVE" | "READY" | "UNPAID" | "HISTORY";

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
      <h1 className="text-xl font-bold mb-4">Orders</h1>

      <div className="flex gap-2 mb-5 overflow-x-auto scrollbar-none">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-colors flex items-center gap-2 ${
              tab === t.key ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-foreground"
            }`}>
            {t.label}
            {t.count > 0 && t.key !== "HISTORY" && (
              <span className={`h-5 min-w-5 px-1 rounded-full text-xs font-bold flex items-center justify-center ${
                tab === t.key ? "bg-background/20 text-background" : "bg-foreground/10"
              }`}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map(o => {
          const action = nextAction(o);
          return (
            <div
              key={o.id}
              onClick={() => onViewOrder(o)}
              className="p-4 rounded-xl border bg-card space-y-3 cursor-pointer hover:border-primary/50 hover:shadow-sm transition-all active:scale-[0.995]"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{o.id.slice(-6).toUpperCase()}</span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${statusStyle(o.status)}`}>{o.status}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {o.tableId ? formatTableRef(o.tableId, tableLabels) : o.type || "Takeaway"} · {ago(o.createdAt)}
                  </p>
                </div>
                <span className="text-base font-bold">{formatETB(o.total)}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {o.items?.slice(0, 3).map(i => `${i.quantity}× ${i.name}`).join(", ")}
                {(o.items?.length || 0) > 3 && ` +${(o.items?.length || 0) - 3} more`}
              </div>
              {action && (
                <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                  <button onClick={action.action} className={`h-9 px-4 rounded-lg text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all ${action.color}`}>
                    {action.label === "Mark Served" ? <Check className="h-3.5 w-3.5" /> : <CreditCard className="h-3.5 w-3.5" />}
                    {action.label}
                  </button>
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <p className="font-medium">{tab === "HISTORY" ? "No completed orders yet." : "No orders in this view."}</p>
            <p className="text-sm mt-1">New orders will appear here automatically.</p>
          </div>
        )}
      </div>
    </div>
  );
}
