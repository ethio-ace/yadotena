"use client";

import { useState } from "react";
import { Order } from "@/types";
import { Layers, ChevronRight } from "lucide-react";
import { orderDestination, orderTicketNumber, addonNames } from "@/lib/kitchen";

interface BatchViewProps {
  orders: Order[];
  addonMap?: Record<string, string>;
  tableLabels?: Record<string, string>;
}

export function BatchView({ orders, addonMap, tableLabels }: BatchViewProps) {
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  // Aggregate only items that still need kitchen work — rounds are independent,
  // so an order with one round READY and another PREPARING still counts its
  // PREPARING items here (legacy rows without item status default to PENDING).
  const activeOrders = orders.filter((o) =>
    (o.items || []).some((i) => ["PENDING", "PREPARING"].includes((i.status || "PENDING") as string))
  );

  // Aggregate items across active orders
  const itemMap = new Map<string, {
    name: string;
    totalQuantity: number;
    tickets: Array<{
      orderId: string;
      destination: string;
      quantity: number;
      addons: string[];
      specialInstructions?: string;
    }>;
  }>();

  activeOrders.forEach((o) => {
    const dest = orderDestination(o, tableLabels);
    o.items?.forEach((item) => {
      const key = item.name.toLowerCase();
      const existing = itemMap.get(key) || { name: item.name, totalQuantity: 0, tickets: [] };
      existing.totalQuantity += item.quantity;

      existing.tickets.push({
        orderId: o.id,
        destination: dest,
        quantity: item.quantity,
        addons: addonNames(item.selectedAddons, addonMap),
        specialInstructions: item.specialInstructions,
      });

      itemMap.set(key, existing);
    });
  });

  const batchList = Array.from(itemMap.values()).sort((a, b) => b.totalQuantity - a.totalQuantity);
  const maxQuantity = Math.max(1, ...batchList.map((b) => b.totalQuantity));

  if (batchList.length === 0) {
    return (
      <div className="p-12 text-center text-zinc-500 my-10 max-w-xl mx-auto border border-dashed border-zinc-800 rounded-2xl">
        <Layers className="h-8 w-8 mx-auto text-zinc-700 mb-3" />
        <h3 className="text-base font-black text-white">No active batch production</h3>
        <p className="text-xs text-zinc-500 mt-1">There are no items currently in queue or preparation.</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-4 animate-in fade-in duration-200">
      {/* Batch header */}
      <div>
        <h2 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
          <Layers className="h-5 w-5 text-zinc-400" />
          <span>Batch Production</span>
        </h2>
        <p className="text-xs text-zinc-500 mt-0.5 font-medium">
          Aggregated item counts across {activeOrders.length} active ticket(s). Tap an item to see which tables need it.
        </p>
      </div>

      {/* Aggregate production list */}
      <div className="grid grid-cols-1 gap-3">
        {batchList.map((batch) => {
          const isExpanded = expandedItem === batch.name;
          return (
            <div
              key={batch.name}
              className={`rounded-xl border transition-colors bg-zinc-950 overflow-hidden ${
                isExpanded ? "border-zinc-600" : "border-zinc-800 hover:border-zinc-700"
              }`}
            >
              {/* Main summary bar */}
              <div
                onClick={() => setExpandedItem(isExpanded ? null : batch.name)}
                className="px-4 py-3.5 flex items-center justify-between cursor-pointer select-none gap-4"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <span className="text-2xl font-black text-white tabular-nums shrink-0">
                    {batch.totalQuantity}×
                  </span>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-white tracking-tight truncate">
                      {batch.name}
                    </h3>
                    <p className="text-[11px] text-zinc-500 font-medium mt-0.5">
                      {batch.tickets.length} ticket{batch.tickets.length === 1 ? "" : "s"}
                    </p>
                    {/* Relative production volume */}
                    <div className="mt-2 h-1 rounded-full bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-zinc-400 transition-all duration-500"
                        style={{ width: `${(batch.totalQuantity / maxQuantity) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>

                <ChevronRight
                  className={`h-4 w-4 text-zinc-500 transition-transform shrink-0 ${isExpanded ? "rotate-90" : ""}`}
                />
              </div>

              {/* Expanded breakdown per table / order */}
              {isExpanded && (
                <div className="px-4 py-3.5 bg-zinc-900/60 border-t border-zinc-800 space-y-2">
                  <h4 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
                    Ticket breakdown & special requests
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {batch.tickets.map((t, idx) => (
                      <div key={idx} className="p-3 rounded-lg border border-zinc-800 bg-zinc-950 space-y-1.5 text-xs">
                        <div className="flex justify-between font-bold">
                          <span className="text-white">
                            {t.destination} <span className="text-zinc-500">#{orderTicketNumber({ id: t.orderId })}</span>
                          </span>
                          <span className="text-zinc-300 font-black tabular-nums">{t.quantity}×</span>
                        </div>

                        {t.addons.length > 0 && (
                          <div className="text-zinc-400 font-medium">
                            {t.addons.map((a, i) => (
                              <span key={i} className="inline-block mr-2">
                                + {a}
                              </span>
                            ))}
                          </div>
                        )}

                        {t.specialInstructions && (
                          <div className="text-amber-300/90 font-semibold flex items-center gap-1">
                            <span>⚠</span>
                            {t.specialInstructions}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
