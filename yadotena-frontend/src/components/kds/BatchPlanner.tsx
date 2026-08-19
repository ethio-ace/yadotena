"use client";

import { useMemo } from "react";
import { Order, OrderItem } from "@/types";
import { addonNames, orderDestination } from "@/lib/kitchen";
import { AlertTriangle, Coffee, Utensils, CheckCircle2 } from "lucide-react";

interface BatchPlannerProps {
  orders: Order[];
  addonMap?: Record<string, string>;
  tableLabels?: Record<string, string>;
}

interface BatchDishGroup {
  menuItemId: string;
  name: string;
  category?: string;
  totalQuantity: number;
  tables: string[];
  addons: Record<string, number>;
  specialInstructions: Record<string, number>;
}

export function BatchPlanner({ orders, addonMap, tableLabels }: BatchPlannerProps) {
  // Aggregate active pending & preparing dishes
  const batchGroups = useMemo(() => {
    const map = new Map<string, BatchDishGroup>();

    orders.forEach((o) => {
      if (["SERVED", "COMPLETED", "CANCELLED"].includes(o.status)) return;

      const destination = orderDestination(o, tableLabels);

      (o.items || []).forEach((item) => {
        const itemStatus = item.status || "PENDING";
        if (["READY", "SERVED", "CANCELLED"].includes(itemStatus)) return;

        const key = item.menuItemId || item.name;
        if (!map.has(key)) {
          map.set(key, {
            menuItemId: key,
            name: item.name,
            totalQuantity: 0,
            tables: [],
            addons: {},
            specialInstructions: {},
          });
        }

        const group = map.get(key)!;
        const qty = item.quantity || 1;
        group.totalQuantity += qty;

        if (!group.tables.includes(destination)) {
          group.tables.push(destination);
        }

        // Aggregate addons
        const addonsList = addonNames(item.addons || item.selectedAddons, addonMap);
        addonsList.forEach((a) => {
          group.addons[a] = (group.addons[a] || 0) + qty;
        });

        // Aggregate special instructions
        if (item.specialInstructions && item.specialInstructions.trim()) {
          const notes = item.specialInstructions.trim().toUpperCase();
          group.specialInstructions[notes] = (group.specialInstructions[notes] || 0) + qty;
        }
      });
    });

    return Array.from(map.values()).sort((a, b) => b.totalQuantity - a.totalQuantity);
  }, [orders, addonMap, tableLabels]);

  // Categorize into Coffee/Drinks vs Food
  const drinkKeywords = ["coffee", "latte", "cappuccino", "tea", "macchiato", "espresso", "juice", "drink", "water", "soda"];

  const drinks = batchGroups.filter((g) =>
    drinkKeywords.some((k) => g.name.toLowerCase().includes(k))
  );

  const food = batchGroups.filter(
    (g) => !drinkKeywords.some((k) => g.name.toLowerCase().includes(k))
  );

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 select-none animate-in fade-in duration-200">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header Title Banner */}
        <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
              <Utensils className="h-5 w-5 text-amber-500" />
              <span>Production Batch Sheet</span>
            </h2>
            <p className="text-xs text-zinc-400 font-medium mt-0.5">
              Consolidated kitchen prep quantities across all active tickets.
            </p>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono font-bold text-xs">
            {batchGroups.reduce((sum, g) => sum + g.totalQuantity, 0)} Items Total
          </div>
        </div>

        {/* SECTION: DRINKS / COFFEE */}
        {drinks.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-500 border-b border-zinc-800 pb-2">
              <Coffee className="h-4 w-4" />
              <span>Beverages & Coffee Station</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {drinks.map((g) => (
                <div
                  key={g.menuItemId}
                  className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700 transition-colors space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-lg font-extrabold text-zinc-50 flex items-center gap-2">
                      <span className="text-amber-500 font-mono font-black text-xl">
                        {g.totalQuantity}×
                      </span>
                      <span>{g.name}</span>
                    </div>
                  </div>

                  {/* Destination Tables */}
                  <div className="text-xs text-zinc-400 font-medium">
                    <span className="text-zinc-500 uppercase font-bold text-[10px] block">
                      Destinations:
                    </span>
                    <span className="font-mono text-zinc-300">
                      {g.tables.join(" · ")}
                    </span>
                  </div>

                  {/* Addon / Customization Aggregations */}
                  {Object.keys(g.addons).length > 0 && (
                    <div className="pt-2 border-t border-zinc-800/60 space-y-1">
                      {Object.entries(g.addons).map(([addon, count]) => (
                        <div key={addon} className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                          <span className="text-amber-500">+</span>
                          <span>{count}× {addon}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Special Instruction Warnings */}
                  {Object.keys(g.specialInstructions).length > 0 && (
                    <div className="pt-2 border-t border-zinc-800/60 space-y-1">
                      {Object.entries(g.specialInstructions).map(([note, count]) => (
                        <div key={note} className="text-xs font-black text-red-400 flex items-center gap-1.5 bg-red-950/40 border border-red-500/40 p-1.5 rounded-lg">
                          <AlertTriangle className="h-3.5 w-3.5 text-red-400 shrink-0" />
                          <span>⚠ {count} require {note}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SECTION: FOOD & MEALS */}
        {food.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-500 border-b border-zinc-800 pb-2">
              <Utensils className="h-4 w-4" />
              <span>Main Kitchen & Cooked Food</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {food.map((g) => (
                <div
                  key={g.menuItemId}
                  className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700 transition-colors space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-lg font-extrabold text-zinc-50 flex items-center gap-2">
                      <span className="text-amber-500 font-mono font-black text-xl">
                        {g.totalQuantity}×
                      </span>
                      <span>{g.name}</span>
                    </div>
                  </div>

                  {/* Destination Tables */}
                  <div className="text-xs text-zinc-400 font-medium">
                    <span className="text-zinc-500 uppercase font-bold text-[10px] block">
                      Destinations:
                    </span>
                    <span className="font-mono text-zinc-300">
                      {g.tables.join(" · ")}
                    </span>
                  </div>

                  {/* Addon Aggregations */}
                  {Object.keys(g.addons).length > 0 && (
                    <div className="pt-2 border-t border-zinc-800/60 space-y-1">
                      {Object.entries(g.addons).map(([addon, count]) => (
                        <div key={addon} className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                          <span className="text-amber-500">+</span>
                          <span>{count}× {addon}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Special Instruction Warning Badges */}
                  {Object.keys(g.specialInstructions).length > 0 && (
                    <div className="pt-2 border-t border-zinc-800/60 space-y-1">
                      {Object.entries(g.specialInstructions).map(([note, count]) => (
                        <div key={note} className="text-xs font-black text-red-400 flex items-center gap-1.5 bg-red-950/40 border border-red-500/40 p-1.5 rounded-lg">
                          <AlertTriangle className="h-3.5 w-3.5 text-red-400 shrink-0" />
                          <span>⚠ {count} require {note}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {batchGroups.length === 0 && (
          <div className="py-16 text-center text-zinc-500 border border-dashed border-zinc-800 rounded-3xl space-y-2">
            <CheckCircle2 className="h-8 w-8 text-zinc-600 mx-auto" />
            <div className="text-sm font-bold text-zinc-400">Batch Sheet Clear</div>
            <div className="text-xs text-zinc-600">No active kitchen prep required at this moment.</div>
          </div>
        )}
      </div>
    </div>
  );
}
