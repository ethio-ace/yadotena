"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Order } from "@/types";
import { api } from "@/services/api";
import { formatTableRef, useTableLabels } from "@/hooks/useTableLabels";
import { formatWait, orderTicketNumber } from "@/lib/kitchen";
import { soundAlerts } from "@/lib/audioAlerts";
import { DeliveryInfo } from "@/components/waiter/DeliveryInfo";
import { ordersForTab } from "@/components/waiter/OrdersBoard";
import { Check, X, BellRing } from "lucide-react";

/**
 * Guest orders (website / table QR) waiting for staff approval, shown on the
 * owner/manager Orders page so they don't depend on a waiter being on shift.
 * Same rule as the waiter workspace: approve sends the DRAFT round to the
 * kitchen, reject cancels it.
 */
export function GuestApprovalsPanel({ orders }: { orders: Order[] }) {
  const queryClient = useQueryClient();
  const tableLabels = useTableLabels();
  const [error, setError] = useState<string | null>(null);
  const waiting = ordersForTab(orders, "APPROVE");

  const review = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "approve" | "reject" }) =>
      api.orders.kitchenAction(id, { action }),
    onSuccess: () => {
      setError(null);
      soundAlerts.playActionConfirm();
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["tables"] });
    },
    onError: (err: Error) => setError(err?.message || "Couldn't update that order. Try again."),
  });

  if (waiting.length === 0) return null;

  const decide = (o: Order, action: "approve" | "reject") => {
    if (action === "reject" && !window.confirm(
      o.type === "DELIVERY" ? "Reject this delivery order? Call the customer to let them know." : "Reject the guest's order?"
    )) return;
    review.mutate({ id: o.id, action });
  };

  return (
    <section className="rounded-2xl border-2 border-amber-500/40 bg-amber-500/5 p-4 space-y-3 animate-in fade-in duration-200">
      <div className="flex items-center gap-2">
        <BellRing className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <h2 className="font-black text-sm">
          {waiting.length} guest order{waiting.length === 1 ? "" : "s"} waiting for approval
        </h2>
      </div>
      {error && <p className="text-xs font-bold text-red-600 dark:text-red-400">{error}</p>}
      <div className="grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
        {waiting.map((o) => {
          const drafts = (o.items || []).filter((i) => i.status === "DRAFT");
          const where = o.tableId ? formatTableRef(o.tableId, tableLabels) : o.type === "DELIVERY" ? "Delivery" : "Takeaway";
          const busy = review.isPending && review.variables?.id === o.id;
          return (
            <div key={o.id} className="rounded-xl border bg-card p-3 space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <p className="font-black text-sm truncate">
                  {where}
                  <span className="ml-2 font-mono text-xs text-muted-foreground">#{orderTicketNumber(o)}</span>
                </p>
                <span className="text-xs text-muted-foreground shrink-0">{formatWait(o.createdAt)}</span>
              </div>
              {o.type === "DELIVERY" && <DeliveryInfo order={o} />}
              <ul className="space-y-0.5">
                {drafts.map((i, idx) => (
                  <li key={i.id || idx} className="text-sm">
                    <span className="font-black tabular-nums">{i.quantity}×</span> <span className="font-bold">{i.name}</span>
                    {i.specialInstructions && <span className="block text-xs text-muted-foreground">“{i.specialInstructions}”</span>}
                  </li>
                ))}
              </ul>
              <div className="grid grid-cols-[auto_1fr] gap-2">
                <button
                  onClick={() => decide(o, "reject")}
                  disabled={busy}
                  className="h-10 px-3 rounded-lg border-2 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-500/10 disabled:opacity-60 flex items-center gap-1"
                >
                  <X className="h-4 w-4" /> Reject
                </button>
                <button
                  onClick={() => decide(o, "approve")}
                  disabled={busy}
                  className="h-10 rounded-lg bg-primary text-primary-foreground text-xs font-black flex items-center justify-center gap-1.5 disabled:opacity-60 active:scale-[0.98] transition-all"
                >
                  <Check className="h-4 w-4" strokeWidth={3} /> Approve · send to kitchen
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
