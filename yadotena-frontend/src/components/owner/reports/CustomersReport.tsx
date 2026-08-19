"use client";

import { useMemo } from "react";
import { DateRange, computeCustomers } from "@/lib/owner";
import { Order } from "@/types";
import { formatETB } from "@/lib/currency";
import { UserRound } from "lucide-react";

export function CustomersReport({ range, orders }: { range: DateRange; orders: Order[] }) {
  const rows = useMemo(() => computeCustomers({ range, orders }), [range, orders]);
  const maxRevenue = rows.length > 0 ? rows[0].revenue : 0;

  return (
    <div className="bg-card border rounded-2xl p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-black text-sm text-foreground flex items-center gap-1.5">
            <UserRound className="h-4 w-4 text-amber-500" /> Customer Sales Attribution
          </h3>
          <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
            Customer names &amp; phones are optionally entered by staff during takeaway/delivery orders. Orders without recorded staff details default to &ldquo;Walk-in&rdquo;.
          </p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="py-14 text-center border border-dashed rounded-2xl mt-4">
          <UserRound className="h-6 w-6 mx-auto text-muted-foreground opacity-50" />
          <p className="text-xs font-bold text-muted-foreground mt-2">No paid orders in this period.</p>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {rows.map((c, idx) => {
            const pct = maxRevenue > 0 ? (c.revenue / maxRevenue) * 100 : 0;
            return (
              <div key={c.name} className="rounded-xl border bg-background/50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-black truncate">
                      <span className="text-muted-foreground/60 mr-1.5">{idx + 1}.</span>
                      {c.name}
                    </p>
                    {c.phone && (
                      <p className="text-[11px] text-muted-foreground font-medium">{c.phone}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <span className="block text-sm font-black">{formatETB(c.revenue)}</span>
                    <span className="text-[11px] text-muted-foreground font-semibold">
                      {c.orders} order{c.orders === 1 ? "" : "s"}
                    </span>
                  </div>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-amber-500/70 rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
