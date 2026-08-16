"use client";

import { useState } from "react";
import { Order } from "@/types";
import { Layers, ChevronRight } from "lucide-react";
import { orderDestination, orderTicketNumber, addonNames } from "@/lib/kitchen";

interface BatchViewProps {
  orders: Order[];
}

export function BatchView({ orders }: BatchViewProps) {
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const activeOrders = orders.filter((o) => ["PENDING", "PREPARING"].includes(o.status));

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
    const dest = orderDestination(o);
    o.items?.forEach((item) => {
      const key = item.name.toLowerCase();
      const existing = itemMap.get(key) || { name: item.name, totalQuantity: 0, tickets: [] };
      existing.totalQuantity += item.quantity;

      existing.tickets.push({
        orderId: o.id,
        destination: dest,
        quantity: item.quantity,
        addons: addonNames(item.selectedAddons),
        specialInstructions: item.specialInstructions,
      });

      itemMap.set(key, existing);
    });
  });

  const batchList = Array.from(itemMap.values()).sort((a, b) => b.totalQuantity - a.totalQuantity);
  const maxQuantity = Math.max(1, ...batchList.map((b) => b.totalQuantity));

  if (batchList.length === 0) {
    return (
      <div className="p-12 text-center text-zinc-500 my-10 max-w-xl mx-auto border border-dashed border-zinc-800 rounded-3xl bg-zinc-950/40">
        <Layers className="h-12 w-12 mx-auto text-zinc-600 mb-3 opacity-50" />
        <h3 className="text-lg font-black text-white">NO ACTIVE BATCH PRODUCTION</h3>
        <p className="text-xs text-zinc-400 mt-1">There are no items currently in queue or preparation.</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Batch Header */}
      <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
            <Layers className="h-6 w-6 text-amber-500" />
            <span>Today’s Batch Production Summary</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5 font-medium">
            Aggregated item counts across {activeOrders.length} active ticket(s). Tap any item to inspect table modifications.
          </p>
        </div>
      </div>

      {/* Aggregate Production List */}
      <div className="grid grid-cols-1 gap-4">
        {batchList.map((batch) => {
          const isExpanded = expandedItem === batch.name;
          return (
            <div
              key={batch.name}
              className={`rounded-2xl border transition-all duration-200 bg-zinc-950 overflow-hidden ${
                isExpanded ? "border-amber-500/60 shadow-lg shadow-amber-950/30" : "border-zinc-800 hover:border-zinc-700"
              }`}
            >
              {/* Main Summary Bar */}
              <div
                onClick={() => setExpandedItem(isExpanded ? null : batch.name)}
                className="p-4 flex items-center justify-between cursor-pointer select-none"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="h-12 w-14 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 font-black text-zinc-950 text-xl flex items-center justify-center shadow-md shrink-0">
                    {batch.totalQuantity}×
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-black text-white tracking-tight uppercase">
                      {batch.name}
                    </h3>
                    <p className="text-xs text-zinc-400 font-medium mt-0.5">
                      Distributed across {batch.tickets.length} active order ticket(s)
                    </p>
                    {/* Quantity bar — relative production volume at a glance */}
                    <div className="mt-2 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500"
                        style={{ width: `${(batch.totalQuantity / maxQuantity) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>

                <ChevronRight
                  className={`h-5 w-5 text-zinc-400 transition-transform shrink-0 ${isExpanded ? "rotate-90 text-amber-400" : ""}`}
                />
              </div>

              {/* Expanded Breakdown per Table / Order */}
              {isExpanded && (
                <div className="p-4 bg-zinc-900/80 border-t border-zinc-800/80 space-y-2">
                  <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">
                    Ticket Breakdown & Special Requests:
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {batch.tickets.map((t, idx) => (
                      <div key={idx} className="p-3 rounded-xl border border-zinc-800 bg-zinc-950/80 space-y-1 text-xs">
                        <div className="flex justify-between font-bold">
                          <span className="text-white">
                            {t.destination}{" "}
                            <span className="text-zinc-500">{orderTicketNumber({ id: t.orderId })}</span>
                          </span>
                          <span className="text-amber-400 font-black">{t.quantity}×</span>
                        </div>

                        {t.addons.length > 0 && (
                          <div className="text-zinc-300 font-medium">
                            {t.addons.map((a, i) => (
                              <span key={i} className="inline-block mr-2 text-amber-300/90">
                                + {a}
                              </span>
                            ))}
                          </div>
                        )}

                        {t.specialInstructions && (
                          <div className="text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded text-[11px]">
                            ⚠ {t.specialInstructions}
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
