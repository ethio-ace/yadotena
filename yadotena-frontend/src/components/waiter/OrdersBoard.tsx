"use client";

import { useEffect, useMemo, useState } from "react";
import { Order } from "@/types";
import { formatETB } from "@/lib/currency";
import { formatTableRef, useTableLabels } from "@/hooks/useTableLabels";
import { formatWait, orderProgress, orderTicketNumber } from "@/lib/kitchen";
import { OrderProgressLine } from "@/components/waiter/OrderProgressLine";
import { DeliveryInfo } from "@/components/waiter/DeliveryInfo";
import { CheckCircle2, CreditCard, ClipboardList, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type OrdersTab = "APPROVE" | "READY" | "ACTIVE" | "UNPAID" | "DONE";

interface OrdersBoardProps {
  orders: Order[];
  tab: OrdersTab;
  busyOrderId?: string | null;
  onTabChange: (tab: OrdersTab) => void;
  onServe: (order: Order) => void;
  onComplete: (order: Order) => void;
  onSettle: (order: Order) => void;
  onViewOrder: (order: Order) => void;
  /** Guest orders from the public menu: send to the kitchen or turn down. */
  onApprove: (order: Order) => void;
  onReject: (order: Order) => void;
}

const DONE_LIMIT = 30;
const closed = (o: Order) => o.status === "COMPLETED" || o.status === "CANCELLED";
const hasOpenWork = (o: Order) => {
  const p = orderProgress(o);
  return p.approval + p.waiting + p.cooking + p.ready > 0;
};
const isToday = (iso: string) => new Date(iso).toDateString() === new Date().toDateString();
const byOldest = (a: Order, b: Order) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
const byNewest = (a: Order, b: Order) => -byOldest(a, b);

/** Which orders each tab shows — exported so the page can badge counts. */
export function ordersForTab(orders: Order[], tab: OrdersTab): Order[] {
  const live = orders.filter((o) => o.status !== "CANCELLED");
  switch (tab) {
    case "APPROVE":
      return live.filter((o) => orderProgress(o).approval > 0).sort(byOldest);
    case "READY":
      return live.filter((o) => orderProgress(o).ready > 0).sort(byOldest);
    case "ACTIVE":
      // A COMPLETED order can still carry a fresh round — it's active until that's served.
      return live.filter((o) => !closed(o) || hasOpenWork(o)).sort(byOldest);
    case "UNPAID":
      // A guest order nobody approved yet isn't a bill to chase.
      return live.filter((o) => o.paymentStatus !== "PAID" && o.status !== "DRAFT").sort(byNewest);
    case "DONE":
      return orders.filter((o) => closed(o) && !hasOpenWork(o) && isToday(o.updatedAt || o.createdAt)).sort(byNewest).slice(0, DONE_LIMIT);
  }
}

export function OrdersBoard({ orders, tab, busyOrderId, onTabChange, onServe, onComplete, onSettle, onViewOrder, onApprove, onReject }: OrdersBoardProps) {
  const tableLabels = useTableLabels();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const counts = useMemo(
    () => ({
      APPROVE: ordersForTab(orders, "APPROVE").length,
      READY: ordersForTab(orders, "READY").length,
      ACTIVE: ordersForTab(orders, "ACTIVE").length,
      UNPAID: ordersForTab(orders, "UNPAID").length,
    }),
    [orders]
  );
  const list = useMemo(() => ordersForTab(orders, tab), [orders, tab]);

  const tabs: { key: OrdersTab; label: string; count?: number; tone?: string }[] = [
    // Only while a guest order is waiting — keeps the bar short otherwise.
    ...(counts.APPROVE > 0 || tab === "APPROVE"
      ? [{ key: "APPROVE" as OrdersTab, label: "Guest orders", count: counts.APPROVE, tone: "bg-orange-500 text-white" }]
      : []),
    { key: "READY", label: "Ready to serve", count: counts.READY, tone: "bg-emerald-600 text-white" },
    { key: "ACTIVE", label: "Active", count: counts.ACTIVE },
    { key: "UNPAID", label: "Unpaid", count: counts.UNPAID },
    { key: "DONE", label: "Done today" },
  ];

  /** The single next step for a ticket, in the order a waiter would do them. */
  const nextAction = (o: Order) => {
    const p = orderProgress(o);
    if (p.ready > 0) return { label: `Mark ${p.ready} served`, icon: CheckCircle2, cls: "bg-emerald-600 hover:bg-emerald-700 text-white", run: () => onServe(o) };
    if (o.paymentStatus !== "PAID" && o.status !== "CANCELLED") return { label: "Settle bill", icon: CreditCard, cls: "border-2 hover:bg-muted", run: () => onSettle(o) };
    if (o.paymentStatus === "PAID" && !closed(o) && !hasOpenWork(o)) return { label: "Close order", icon: CheckCircle2, cls: "bg-foreground text-background", run: () => onComplete(o) };
    return null;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 sm:px-6 pt-4 pb-3 border-b bg-card shrink-0 space-y-3">
        <h1 className="text-xl font-black">Orders</h1>
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none -mx-1 px-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => onTabChange(t.key)}
              className={cn(
                "h-9 px-4 rounded-full text-sm font-bold whitespace-nowrap flex items-center gap-2 transition-colors",
                tab === t.key ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
              {!!t.count && (
                <span className={cn("h-5 min-w-5 px-1.5 rounded-full text-[11px] font-black flex items-center justify-center tabular-nums", t.tone || (tab === t.key ? "bg-background/20" : "bg-foreground/10"))}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto p-4 sm:p-6 pb-24 md:pb-6 space-y-2.5">
          {list.map((o) => {
            const action = nextAction(o);
            const paid = o.paymentStatus === "PAID";
            const where = o.tableId ? formatTableRef(o.tableId, tableLabels) : o.type === "DELIVERY" ? "Delivery" : "Takeaway";
            return (
              <div
                key={o.id}
                className={cn(
                  "rounded-2xl border-2 bg-card",
                  orderProgress(o).approval > 0 ? "border-orange-500/70" : tab === "READY" ? "border-emerald-500/60" : "border-border"
                )}
              >
                <button onClick={() => onViewOrder(o)} className="w-full text-left p-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-black text-base leading-tight truncate">
                      {where}
                      <span className="ml-2 font-mono text-xs font-bold text-muted-foreground">#{orderTicketNumber(o)}</span>
                    </p>
                    <p className="mt-1 truncate">
                      {o.status === "CANCELLED" ? (
                        <span className="text-xs font-bold text-red-500">Cancelled</span>
                      ) : (
                        <OrderProgressLine order={o} />
                      )}
                      <span className="text-xs text-muted-foreground"> · {formatWait(o.createdAt, now)}</span>
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-base font-black tabular-nums">{formatETB(o.total)}</p>
                    <p className={cn("text-[11px] font-black uppercase", paid ? "text-emerald-600 dark:text-emerald-400" : "text-red-500")}>
                      {paid ? "Paid" : "Unpaid"}
                    </p>
                  </div>
                </button>
                {o.type === "DELIVERY" && o.status !== "COMPLETED" && o.status !== "CANCELLED" && (
                  <div className="px-4 pb-3 -mt-1">
                    <DeliveryInfo order={o} />
                  </div>
                )}
                {orderProgress(o).approval > 0 ? (
                  // Guest order: show exactly what they asked for, then one decision.
                  <div className="px-4 pb-4 -mt-1 space-y-3">
                    {o.type === "DELIVERY" && (
                      <p className="text-xs font-bold text-violet-700 dark:text-violet-400">
                        Website delivery — call the customer to confirm the order and address, then approve.
                      </p>
                    )}
                    <ul className="rounded-xl bg-orange-50 dark:bg-orange-950/20 border border-orange-500/30 px-3 py-2 space-y-1">
                      {(o.items || []).filter((i) => i.status === "DRAFT").map((i, idx) => (
                        <li key={i.id || idx} className="text-sm">
                          <span className="font-black tabular-nums">{i.quantity}×</span> <span className="font-bold">{i.name}</span>
                          {i.specialInstructions && <span className="block text-xs text-orange-800 dark:text-orange-300">“{i.specialInstructions}”</span>}
                        </li>
                      ))}
                    </ul>
                    <div className="grid grid-cols-[auto_1fr] gap-2">
                      <button
                        onClick={() => onReject(o)}
                        disabled={busyOrderId === o.id}
                        className="h-11 px-4 rounded-xl border-2 text-sm font-bold text-red-600 dark:text-red-400 hover:bg-red-500/10 disabled:opacity-60 flex items-center gap-1.5"
                      >
                        <X className="h-4 w-4" /> Reject
                      </button>
                      <button
                        onClick={() => onApprove(o)}
                        disabled={busyOrderId === o.id}
                        className="h-11 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-black flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98] transition-all"
                      >
                        <Check className="h-4 w-4" strokeWidth={3} /> {o.type === "DELIVERY" ? "Confirmed · send to kitchen" : "Approve · send to kitchen"}
                      </button>
                    </div>
                  </div>
                ) : action && (
                  <div className="px-4 pb-4 -mt-1">
                    <button
                      onClick={action.run}
                      disabled={busyOrderId === o.id}
                      className={cn("w-full sm:w-auto h-11 px-5 rounded-xl text-sm font-black flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98] transition-all", action.cls)}
                    >
                      <action.icon className="h-4 w-4" />
                      {action.label}
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {list.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-bold">
                {tab === "APPROVE" ? "No guest orders waiting." : tab === "READY" ? "Nothing waiting to be served." : tab === "ACTIVE" ? "No active orders." : tab === "UNPAID" ? "Every bill is settled." : "No closed orders yet today."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
