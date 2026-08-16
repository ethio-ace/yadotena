"use client";

import { OwnerMetrics } from "@/lib/owner";
import { formatETB } from "@/lib/currency";
import { CupSoda } from "lucide-react";

interface TopProductsProps {
  metrics: OwnerMetrics;
}

/**
 * Top sellers by units within the selected range — server-computed from
 * PAID orders. Revenue is shown per product; profitability is never
 * claimed because the system has no cost data (spec §39).
 */
export function TopProducts({ metrics }: TopProductsProps) {
  const { topProducts, range } = metrics;

  if (topProducts.length === 0) {
    return (
      <div className="bg-card border rounded-2xl p-5 shadow-sm">
        <h3 className="font-black text-sm text-foreground">Top Selling Products</h3>
        <p className="text-xs text-muted-foreground mt-3">No sales yet for {range.label.toLowerCase()}.</p>
      </div>
    );
  }

  return (
    <div className="bg-card border rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-black text-sm text-foreground">Top Selling Products</h3>
          <p className="text-[11px] text-muted-foreground font-medium">{range.display}</p>
        </div>
        <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
          <CupSoda className="h-5 w-5" />
        </div>
      </div>

      <ul className="mt-4 space-y-2.5">
        {topProducts.slice(0, 6).map((p, i) => (
          <li key={p.name} className="flex items-center gap-3">
            <span className="w-5 text-center text-xs font-black text-muted-foreground/60">
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-bold text-foreground truncate">{p.name}</span>
                <span className="text-xs font-black text-foreground shrink-0">{formatETB(p.revenue)}</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-amber-500/70"
                  style={{
                    width: `${Math.max(
                      (p.qty / Math.max(topProducts[0]?.qty, 1)) * 100,
                      p.qty > 0 ? 4 : 0
                    )}%`,
                  }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">
                {p.qty} sold
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
