"use client";

import { OwnerMetrics } from "@/lib/owner";
import { cn } from "@/lib/utils";
import { CreditCard } from "lucide-react";

interface PaymentMixProps {
  metrics: OwnerMetrics;
}

/**
 * Where paid orders were settled, by method. The backend reports method
 * *counts*, so percentages are shares of paid orders — never amounts.
 */
export function PaymentMix({ metrics }: PaymentMixProps) {
  const { paymentMix, range } = metrics;

  if (paymentMix.length === 0) {
    return (
      <div className="bg-card border rounded-2xl p-5 shadow-sm">
        <h3 className="font-black text-sm text-foreground">Payment Methods</h3>
        <p className="text-xs text-muted-foreground mt-3">No settled payments in this period.</p>
      </div>
    );
  }

  return (
    <div className="bg-card border rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-black text-sm text-foreground">Payment Methods</h3>
          <p className="text-[11px] text-muted-foreground font-medium">Share of paid orders · {range.display}</p>
        </div>
        <div className="h-9 w-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
          <CreditCard className="h-5 w-5" />
        </div>
      </div>

      <ul className="mt-4 space-y-3">
        {paymentMix.map((p) => (
          <li key={p.method}>
            <div className="flex items-baseline justify-between text-xs">
              <span className="font-bold text-foreground capitalize">{p.method.toLowerCase()}</span>
              <span className="font-black text-foreground">
                {p.percent}% <span className="text-[10px] font-semibold text-muted-foreground">· {p.count}</span>
              </span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full",
                  p.percent >= 40 ? "bg-emerald-500" : p.percent >= 15 ? "bg-amber-500" : "bg-muted-foreground/40"
                )}
                style={{ width: `${Math.max(p.percent, 2)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
