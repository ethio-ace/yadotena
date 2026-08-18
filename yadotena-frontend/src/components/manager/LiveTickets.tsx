"use client";

import Link from "next/link";
import { CheckCircle2, ChevronRight } from "lucide-react";
import { Order } from "@/types";
import { formatETB } from "@/lib/currency";
import { cn } from "@/lib/utils";

interface LiveTicketsProps {
  orders: Order[];
  tableNameById: Record<string, string>;
}

const statusTone: Record<string, string> = {
  PENDING: "bg-amber-500",
  PREPARING: "bg-sky-500",
  READY: "bg-emerald-500",
  SERVED: "bg-violet-500",
  COMPLETED: "bg-zinc-400",
  CANCELLED: "bg-rose-400",
};

const statusLabel: Record<string, string> = {
  PENDING: "Pending",
  PREPARING: "Preparing",
  READY: "Ready",
  SERVED: "Served",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export function LiveTickets({ orders, tableNameById }: LiveTicketsProps) {
  const orderLabel = (order: Order) => {
    if (order.tableId) {
      return tableNameById[order.tableId] || (order.type === "DINE_IN" ? "Table" : order.type);
    }
    return order.type || "Takeaway";
  };

  return (
    <section aria-label="Live tickets today" className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-black text-sm uppercase tracking-wider text-foreground">
          Live Tickets <span className="text-muted-foreground">({orders.length})</span>
        </h2>
        <Link
          href="/dashboard/orders"
          className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
        >
          All Orders <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>

      <div className="rounded-2xl border bg-card overflow-hidden divide-y divide-border/60 shadow-xs">
        {orders.slice(0, 8).map((order) => {
          const itemCount = order.items?.reduce((sum, i) => sum + (i.quantity || 0), 0) ?? 0;
          const timeStr = order.createdAt
            ? new Date(order.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "";
          const isPaid = order.paymentStatus === "PAID";

          return (
            <Link
              key={order.id}
              href="/dashboard/orders"
              className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-muted/40 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className={cn("h-2 w-2 rounded-full shrink-0", statusTone[order.status] ?? "bg-zinc-300")}
                  title={`Status: ${statusLabel[order.status] ?? order.status}`}
                  aria-label={`Status: ${statusLabel[order.status] ?? order.status}`}
                />
                <div className="min-w-0">
                  <p className="text-sm font-black text-foreground truncate">
                    {orderLabel(order)}
                    <span className="ml-2 font-mono text-[11px] font-bold text-muted-foreground tabular-nums">
                      #{order.id.slice(-6).toUpperCase()}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {itemCount > 0
                      ? `${itemCount} item${itemCount === 1 ? "" : "s"} · ${order.items
                          .slice(0, 3)
                          .map((i) => i.name)
                          .join(", ")}${order.items.length > 3 ? "…" : ""}`
                      : "No items"}
                    {timeStr && <span className="text-muted-foreground/70"> · {timeStr}</span>}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs font-black text-muted-foreground tabular-nums">
                  {formatETB(order.total || 0)}
                </span>
                <span
                  className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-black uppercase border",
                    isPaid
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                      : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                  )}
                >
                  {isPaid ? "Paid" : "Unpaid"}
                </span>
              </div>
            </Link>
          );
        })}

        {orders.length === 0 && (
          <div className="py-10 text-center space-y-1.5">
            <CheckCircle2 className="h-6 w-6 mx-auto text-emerald-500 opacity-60" aria-hidden="true" />
            <p className="text-xs font-bold text-muted-foreground">No active tickets right now.</p>
            <p className="text-[11px] text-muted-foreground/80">
              New orders placed by waiters appear here in real time.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
