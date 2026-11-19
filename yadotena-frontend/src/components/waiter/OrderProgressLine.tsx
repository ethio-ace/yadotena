"use client";

import { Order } from "@/types";
import { orderProgress } from "@/lib/kitchen";
import { cn } from "@/lib/utils";

/**
 * One-line kitchen progress for a ticket: "1 ready · 2 cooking · 1 waiting".
 * Ready leads because it is the only state that needs the waiter right now.
 */
export function OrderProgressLine({ order, className }: { order: Order; className?: string }) {
  const p = orderProgress(order);
  const parts: { n: number; label: string; cls: string }[] = [
    { n: p.approval, label: "to approve", cls: "text-orange-700 dark:text-orange-300 font-black" },
    { n: p.ready, label: "ready", cls: "text-emerald-600 dark:text-emerald-400 font-black" },
    { n: p.cooking, label: "cooking", cls: "text-amber-700 dark:text-amber-400 font-bold" },
    { n: p.waiting, label: "waiting", cls: "text-muted-foreground font-bold" },
  ].filter((x) => x.n > 0);

  if (parts.length === 0) {
    return (
      <span className={cn("text-xs font-bold text-muted-foreground", className)}>
        {p.served > 0 ? "All served" : "No items"}
      </span>
    );
  }

  return (
    <span className={cn("text-xs", className)}>
      {parts.map((x, i) => (
        <span key={x.label}>
          {i > 0 && <span className="text-muted-foreground/50 mx-1">·</span>}
          <span className={x.cls}>{x.n} {x.label}</span>
        </span>
      ))}
    </span>
  );
}
