"use client";

import { Filter } from "lucide-react";

export type KitchenCategoryFilter = "ALL" | "FOOD" | "DRINKS" | "COFFEE" | "BAKERY" | "DESSERT";

interface KitchenFiltersProps {
  selectedFilter: KitchenCategoryFilter;
  onSelectFilter: (filter: KitchenCategoryFilter) => void;
  categoryCounts?: Record<KitchenCategoryFilter, number>;
}

export function KitchenFilters({
  selectedFilter,
  onSelectFilter,
  categoryCounts,
}: KitchenFiltersProps) {
  const filters: Array<{ id: KitchenCategoryFilter; label: string; icon: string }> = [
    { id: "ALL", label: "All", icon: "🍳" },
    { id: "FOOD", label: "Food", icon: "🥩" },
    { id: "DRINKS", label: "Drinks", icon: "🥤" },
    { id: "COFFEE", label: "Coffee", icon: "☕" },
    { id: "BAKERY", label: "Bakery", icon: "🥐" },
    { id: "DESSERT", label: "Dessert", icon: "🍰" },
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[11px] font-bold text-zinc-400 uppercase tracking-wider px-1">
        <span className="flex items-center gap-1.5">
          <Filter className="h-3.5 w-3.5 text-amber-500" />
          Station Filters
        </span>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {filters.map((f) => {
          const isActive = selectedFilter === f.id;
          const count = categoryCounts?.[f.id];
          return (
            <button
              key={f.id}
              onClick={() => onSelectFilter(f.id)}
              className={`h-11 px-3 rounded-xl text-xs font-bold flex items-center justify-between transition-all active:scale-95 cursor-pointer border ${
                isActive
                  ? "bg-amber-500 text-amber-950 border-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.2)] font-black"
                  : "bg-zinc-900 text-zinc-300 border-zinc-800/80 hover:bg-zinc-850 hover:text-white"
              }`}
            >
              <span className="truncate flex items-center gap-1.5">
                <span className="text-sm">{f.icon}</span>
                <span>{f.label}</span>
              </span>
              {typeof count === "number" && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                    isActive
                      ? "bg-amber-950/20 text-amber-950 font-black"
                      : "bg-zinc-800 text-zinc-400"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
