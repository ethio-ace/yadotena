"use client";

import { useEffect, useState } from "react";
import { Order } from "@/types";
import { formatETB } from "@/lib/currency";
import { formatTableRef, useTableLabels } from "@/hooks/useTableLabels";
import { readyItems, hasItemStatuses, groupItemsByRound, roundStatus, roundLabel, roundTotal, roundCount, statusChipClass, statusLabel } from "@/lib/kitchen";
import { ArrowLeft, Check, CheckCircle2, CreditCard, Clock, X, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

interface OrdersBoardProps {
  orders: Order[];
  defaultTab?: string;
  onBack: () => void;
  onServe: (orderId: string) => void;
  onComplete: (orderId: string) => void;
  onSettle: (order: Order) => void;
  onViewOrder: (order: Order) => void;
  onAcceptOrder?: (orderId: string) => void;
  onRejectOrder?: (orderId: string) => void;
}

type Tab = "NEW" | "ACTIVE" | "READY" | "UNPAID" | "HISTORY";

export function OrdersBoard({ orders, defaultTab, onBack, onServe, onComplete, onSettle, onViewOrder, onAcceptOrder, onRejectOrder }: OrdersBoardProps) {
  const tableLabels = useTableLabels();
  const [tab, setTab] = useState<Tab>((defaultTab as Tab) || "ACTIVE");

  const isNewOrder = (o: Order) => o.status === "DRAFT" || o.status === "PENDING";

  const filtered = orders.filter(o => {
    switch (tab) {
      case "NEW": return isNewOrder(o);
      case "ACTIVE": return !["COMPLETED", "CANCELLED"].includes(o.status) && !isNewOrder(o);
      case "READY": return readyItems(o).length > 0 && !["COMPLETED", "CANCELLED"].includes(o.status);
      case "UNPAID": return o.paymentStatus !== "PAID" && o.status !== "CANCELLED";
      case "HISTORY": return o.status === "COMPLETED" || o.status === "CANCELLED";
      default: return true;
    }
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const nextAction = (o: Order) => {
    const ready = readyItems(o).length || (o.status === "READY" && !hasItemStatuses(o.items) ? (o.items?.length || 0) : 0);
    if (ready > 0) return { label: `Serve (${ready})`, action: () => onServe(o.id), color: "bg-emerald-600 hover:bg-emerald-700 text-white" };
    if (o.paymentStatus !== "PAID" && ["SERVED", "COMPLETED"].includes(o.status)) return { label: "Settle", action: () => onSettle(o), color: "bg-amber-600 hover:bg-amber-700 text-white" };
    if (o.paymentStatus !== "PAID" && o.status !== "CANCELLED") return { label: "Settle", action: () => onSettle(o), color: "bg-amber-600 hover:bg-amber-700 text-white" };
    if (o.paymentStatus === "PAID" && o.status === "SERVED") return { label: "Complete", action: () => onComplete(o.id), color: "bg-zinc-800 hover:bg-zinc-900 text-white" };
    return null;
  };

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  const ago = (d: string) => {
    const mins = Math.floor((now - new Date(d).getTime()) / 60000);
    if (mins < 1) return "now";
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h`;
  };

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "NEW", label: "New / Pending", count: orders.filter(isNewOrder).length },
    { key: "ACTIVE", label: "In Kitchen", count: orders.filter(o => !["COMPLETED", "CANCELLED"].includes(o.status) && !isNewOrder(o)).length },
    { key: "READY", label: "Ready", count: orders.filter(o => readyItems(o).length > 0 && !["COMPLETED", "CANCELLED"].includes(o.status)).length },
    { key: "UNPAID", label: "Unpaid", count: orders.filter(o => o.paymentStatus !== "PAID" && o.status !== "CANCELLED").length },
    { key: "HISTORY", label: "History", count: 0 },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 sm:px-6 pt-4 pb-3 border-b bg-card shrink-0">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Home
          </button>
        </div>

        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-black">Orders</h1>
          <span className="text-xs text-muted-foreground font-medium">
            {filtered.length} ticket{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5",
                tab === t.key
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
              {t.count > 0 && t.key !== "HISTORY" && (
                <span className={cn(
                  "h-4 min-w-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center",
                  tab === t.key ? "bg-background/20" : "bg-foreground/10"
                )}>{t.count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Order list */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2">
        {filtered.map(o => {
          const action = nextAction(o);
          const unpaid = o.paymentStatus !== "PAID" && o.status !== "CANCELLED";
          const isPendingReview = isNewOrder(o);

          return (
            <div
              key={o.id}
              onClick={() => onViewOrder(o)}
              className={cn(
                "p-3.5 rounded-xl border bg-card cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all active:scale-[0.995]",
                isPendingReview && "border-amber-500/40 bg-amber-500/5 dark:bg-amber-950/20"
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-black text-sm tracking-wide">
                      #{o.id.slice(-6).toUpperCase()}
                    </span>
                    {roundCount(o) > 1 && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-500/10 text-amber-700 dark:text-amber-400">
                        {roundCount(o)} rounds
                      </span>
                    )}
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${statusChipClass(o.status)}`}>
                      {isPendingReview ? "PENDING REVIEW" : statusLabel(o.status)}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
                    {o.tableId ? formatTableRef(o.tableId, tableLabels) : "Counter"}
                    <span className="mx-1">·</span>
                    <Clock className="h-2.5 w-2.5 inline" />
                    <span className="ml-0.5">{ago(o.createdAt)}</span>
                    <span className="mx-1">·</span>
                    {o.items?.length || 0} items
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-black">{formatETB(o.total)}</p>
                  <p className={cn(
                    "text-[10px] font-black uppercase mt-0.5",
                    unpaid ? "text-red-500" : "text-emerald-600 dark:text-emerald-400"
                  )}>
                    {unpaid ? "Unpaid" : "Paid"}
                  </p>
                </div>
              </div>

              {/* Pending orders get Accept/Reject buttons */}
              {isPendingReview && onAcceptOrder && onRejectOrder && (
                <div className="mt-2.5 pt-2 border-t border-amber-500/20 flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => onRejectOrder(o.id)}
                    className="h-8 px-3.5 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 text-[11px] font-bold flex items-center gap-1.5 active:scale-95 transition-all border border-red-500/20"
                  >
                    <X className="h-3 w-3" /> Reject
                  </button>
                  <button
                    onClick={() => onAcceptOrder(o.id)}
                    className="h-8 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1.5 active:scale-95 transition-all shadow-sm"
                  >
                    <Check className="h-3 w-3" /> Accept & Send to Kitchen
                  </button>
                </div>
              )}

              {/* Regular action buttons for approved active orders */}
              {!isPendingReview && action && (
                <div className="mt-2 flex justify-end" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={action.action}
                    className={`h-8 px-3.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 active:scale-95 transition-all ${action.color}`}
                  >
                    {action.label.startsWith("Serve") ? <Check className="h-3 w-3" /> : action.label === "Complete" ? <CheckCircle2 className="h-3 w-3" /> : <CreditCard className="h-3 w-3" />}
                    {action.label}
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-sm font-medium">
              {tab === "HISTORY" ? "No completed orders yet." : "No orders in this view."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
