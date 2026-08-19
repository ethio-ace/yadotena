"use client";

import { useMemo } from "react";
import { DateRange } from "@/lib/owner";
import { Order, AddonItem } from "@/types";
import { formatETB } from "@/lib/currency";
import { Layers, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";

interface AddonRow {
  id: string;
  name: string;
  units: number;
  orderCount: number;
}

export function AddonsReport({ range, orders }: { range: DateRange; orders: Order[] }) {
  // Fetch addon master list to look up names by ID
  const { data: addons = [] } = useQuery<AddonItem[]>({
    queryKey: ["addons"],
    queryFn: () => api.addons.getAll(),
  });

  const addonMap = useMemo(() => {
    const m = new Map<string, { name: string; price: number }>();
    for (const a of addons) {
      m.set(a.id, { name: a.name, price: a.price ?? 0 });
    }
    return m;
  }, [addons]);

  const rows = useMemo(() => {
    const filtered = orders.filter(
      (o) =>
        (o.paymentStatus === "PAID" || o.status === "COMPLETED" || o.status === "SERVED") &&
        o.createdAt &&
        new Date(o.createdAt) >= new Date(range.fromInstant) &&
        new Date(o.createdAt) <= new Date(range.toInstant)
    );

    const map = new Map<string, AddonRow>();
    for (const o of filtered) {
      for (const item of o.items ?? []) {
        for (const addonId of item.selectedAddons ?? []) {
          // selectedAddons may be string IDs or objects with id field
          const id = typeof addonId === "string" ? addonId : (addonId as any).id || String(addonId);
          const cur = map.get(id) ?? {
            id,
            name: addonMap.get(id)?.name || id,
            units: 0,
            orderCount: 0,
          };
          cur.units += item.quantity || 1;
          cur.orderCount += 1;
          map.set(id, cur);
        }
      }
    }
    return [...map.values()].sort((a, b) => b.units - a.units);
  }, [range, orders, addonMap]);

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
              <div key={a.id}>
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-foreground">{a.name}</span>
                  <span className="text-muted-foreground">
                    {a.units} sold · {a.orderCount} order{a.orderCount === 1 ? "" : "s"}
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
