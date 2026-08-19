"use client";

import { OrderItem } from "@/types";
import { addonNames } from "@/lib/kitchen";

interface KitchenModifiersProps {
  specialInstructions?: string;
}

export function KitchenModifiers({ specialInstructions }: KitchenModifiersProps) {
  if (!specialInstructions || !specialInstructions.trim()) return null;

  // Split comma or semicolon separated instructions into capitalized chips
  const chips = specialInstructions
    .split(/[,;\n]+/)
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-1.5">
      {chips.map((chip, idx) => (
        <span
          key={idx}
          className="px-2 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wider bg-red-950/60 border border-red-500/80 text-red-300 shadow-[0_0_8px_rgba(239,68,68,0.2)]"
        >
          {chip}
        </span>
      ))}
    </div>
  );
}

interface KitchenItemProps {
  item: OrderItem;
  addonMap?: Record<string, string>;
}

export function KitchenItem({ item, addonMap }: KitchenItemProps) {
  const addons = addonNames(item.addons || item.selectedAddons, addonMap);
  const qty = item.quantity || 1;

  return (
    <div className="py-2 border-b border-zinc-800/60 last:border-0">
      <div className="flex items-start gap-2.5">
        {/* Quantity Badge */}
        <span className="text-base font-black text-amber-500 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-lg shrink-0 leading-none">
          {qty}×
        </span>

        {/* Item Title & Customizations */}
        <div className="flex-1 min-w-0">
          <div className="text-[17px] font-extrabold text-zinc-50 leading-snug tracking-tight">
            {item.name}
          </div>

          {/* Add-ons (Indented) */}
          {addons.length > 0 && (
            <div className="mt-1 space-y-0.5">
              {addons.map((a, i) => (
                <div key={i} className="text-xs font-semibold text-zinc-400 flex items-center gap-1 pl-2 border-l-2 border-zinc-800">
                  <span className="text-amber-500/80">+</span>
                  <span>{a}</span>
                </div>
              ))}
            </div>
          )}

          {/* Special Instruction Chips */}
          <KitchenModifiers specialInstructions={item.specialInstructions} />
        </div>
      </div>
    </div>
  );
}
