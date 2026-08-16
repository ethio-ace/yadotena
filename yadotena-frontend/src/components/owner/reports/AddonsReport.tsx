"use client";

import { useMemo } from "react";
import { DateRange, computeAddonPopularity } from "@/lib/owner";
import { Order } from "@/types";
import { formatETB } from "@/lib/currency";
import { Layers, Plus } from "lucide-react";

export function AddonsReport({ range, orders }: { range: DateRange; orders: Order[] }) {
  const rows = useMemo(() => computeAddonPopularity({ range, orders }), [range, orders]);
  const maxUnits = rows.length > 0 ? rows[0].units : 0;

  return (
    <div className="bg-card border rounded-2xl p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-black text-sm text-foreground flex items-center gap-1.5">
            <Layers className="h-4 w-4 text-amber-500" /> Add-on Popularity
          </h3>
          <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
            How often each add-on was sold with paid orders in this period
          </p>
        </div>
        <a
          href="/dashboard/addons"
          className="inline-flex h-8 items-center gap-1.5 rounded-xl border px-3 text-[11px] font-bold text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Manage Add-ons
        </a>
      </div>

      {rows.length === 0 ? (
        <div className="py-14 text-center border border-dashed rounded-2xl mt-4">
          <Layers className="h-6 w-6 mx-auto text-muted-foreground opacity-50" />
          <p className="text-xs font-bold text-muted-foreground mt-2">
            No add-ons were sold in this period.
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {rows.map((a) => {
            const pct = maxUnits > 0 ? (a.units / maxUnits) * 100 : 0;
            return (
              <div key={a.id || a.name}>
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-foreground">{a.name}</span>
                  <span className="text-muted-foreground">
                    {a.units} sold · {a.orderCount} orders · {formatETB(a.revenue)}
                  </span>
                </div>
                <div className="mt-1.5 h-2 rounded-full bg-muted overflow-hidden">
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
