"use client";

import { KitchenHealth } from "./KitchenHealth";
import { KitchenFilters, KitchenCategoryFilter } from "./KitchenFilters";
import { KitchenAlerts } from "./KitchenAlerts";
import { RoundCard } from "@/lib/kitchen";
import { Layers, Kanban } from "lucide-react";

export type KitchenWorkspaceMode = "QUEUE" | "BATCH";

interface KitchenSidebarProps {
  cards: RoundCard[];
  workspaceMode: KitchenWorkspaceMode;
  onWorkspaceModeChange: (mode: KitchenWorkspaceMode) => void;
  selectedFilter: KitchenCategoryFilter;
  onSelectFilter: (filter: KitchenCategoryFilter) => void;
  onInspectCard?: (card: RoundCard) => void;
  categoryCounts?: Record<KitchenCategoryFilter, number>;
}

export function KitchenSidebar({
  cards,
  workspaceMode,
  onWorkspaceModeChange,
  selectedFilter,
  onSelectFilter,
  onInspectCard,
  categoryCounts,
}: KitchenSidebarProps) {
  // Compute health stats
  const activeCount = cards.length;
  const cookingCount = cards.filter((c) => c.status === "PREPARING").length;
  const readyCount = cards.filter((c) => c.status === "READY").length;

  const now = Date.now();
  const waitTimes = cards
    .filter((c) => c.status === "PENDING" || c.status === "PREPARING")
    .map((c) => Math.max(0, Math.floor((now - new Date(c.createdAt).getTime()) / 60000)));

  const avgPrepMin = waitTimes.length
    ? Math.round(waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length)
    : 0;
  const longestWaitMin = waitTimes.length ? Math.max(...waitTimes) : 0;

  return (
    <aside className="w-[280px] bg-zinc-950 border-r border-zinc-800 p-4 flex flex-col gap-4 overflow-y-auto shrink-0 select-none z-20">
      {/* Segmented Workspace Toggle: Queue vs Batch */}
      <div className="p-1 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center gap-1">
        <button
          onClick={() => onWorkspaceModeChange("QUEUE")}
          className={`flex-1 h-11 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 ${
            workspaceMode === "QUEUE"
              ? "bg-amber-500 text-amber-950 font-black shadow-[0_0_16px_rgba(245,158,11,0.25)]"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
          }`}
        >
          <Kanban className="h-4 w-4" />
          <span>Queue Board</span>
        </button>

        <button
          onClick={() => onWorkspaceModeChange("BATCH")}
          className={`flex-1 h-11 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 ${
            workspaceMode === "BATCH"
              ? "bg-amber-500 text-amber-950 font-black shadow-[0_0_16px_rgba(245,158,11,0.25)]"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Batch Prep</span>
        </button>
      </div>

      {/* Kitchen Health Metrics */}
      <KitchenHealth
        activeCount={activeCount}
        cookingCount={cookingCount}
        readyCount={readyCount}
        avgPrepMin={avgPrepMin}
        longestWaitMin={longestWaitMin}
      />

      {/* Category Station Filters */}
      <KitchenFilters
        selectedFilter={selectedFilter}
        onSelectFilter={onSelectFilter}
        categoryCounts={categoryCounts}
      />

      {/* Actionable Kitchen Alerts */}
      <div className="mt-auto pt-2 border-t border-zinc-800/60">
        <KitchenAlerts cards={cards} onInspectCard={onInspectCard} />
      </div>
    </aside>
  );
}
