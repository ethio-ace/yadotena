"use client";

import { useState } from "react";
import { Volume2, VolumeX, Maximize2, Minimize2, RotateCw } from "lucide-react";
import { KitchenCategoryFilter } from "./KitchenFilters";

interface KDSHeaderProps {
  pendingCount: number;
  preparingCount: number;
  readyCount: number;
  selectedFilter: KitchenCategoryFilter;
  onSelectFilter: (filter: KitchenCategoryFilter) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onRefresh: () => void;
  isConnected: boolean;
  categoryCounts?: Record<KitchenCategoryFilter, number>;
}

export function KDSHeader({
  pendingCount,
  preparingCount,
  readyCount,
  selectedFilter,
  onSelectFilter,
  soundEnabled,
  onToggleSound,
  onRefresh,
  isConnected,
  categoryCounts,
}: KDSHeaderProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  const filters: Array<{ id: KitchenCategoryFilter; label: string }> = [
    { id: "ALL", label: "ALL" },
    { id: "FOOD", label: "FOOD" },
    { id: "DRINKS", label: "DRINKS" },
    { id: "COFFEE", label: "COFFEE" },
    { id: "BAKERY", label: "BAKERY" },
    { id: "DESSERT", label: "DESSERT" },
  ];

  return (
    <header className="h-14 bg-zinc-950 border-b border-zinc-800 px-4 flex items-center justify-between shrink-0 select-none z-30">
      {/* BRAND & REALTIME INDICATOR */}
      <div className="flex items-center gap-3">
        <h1 className="text-sm font-black tracking-wider text-zinc-100 uppercase">
          YADOTENA KITCHEN
        </h1>

        <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-zinc-400">
          <span
            className={`h-2 w-2 rounded-full ${
              isConnected ? "bg-emerald-500" : "bg-amber-500 animate-pulse"
            }`}
          />
          <span className="uppercase text-[10px] text-zinc-400">
            {isConnected ? "LIVE" : "POLLING"}
          </span>
        </div>
      </div>

      {/* COMPACT CATEGORY FILTER PILLS */}
      <div className="hidden md:flex items-center gap-1">
        {filters.map((f) => {
          const isActive = selectedFilter === f.id;
          const count = categoryCounts?.[f.id];
          return (
            <button
              key={f.id}
              onClick={() => onSelectFilter(f.id)}
              className={`px-3 py-1 rounded-md text-xs font-mono font-bold transition-all cursor-pointer ${
                isActive
                  ? "bg-amber-500 text-amber-950 font-extrabold"
                  : "bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
              }`}
            >
              {f.label}
              {typeof count === "number" && (
                <span className={`ml-1 text-[10px] ${isActive ? "text-amber-950 opacity-80" : "text-zinc-500"}`}>
                  ({count})
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* RIGHT: INLINE COUNTERS & COMPACT ACTIONS */}
      <div className="flex items-center gap-4">
        {/* INLINE PRODUCTION COUNTERS */}
        <div className="flex items-center gap-3 font-mono text-xs font-bold">
          <span className="text-amber-400">{pendingCount} NEW</span>
          <span className="text-zinc-400">•</span>
          <span className="text-zinc-200">{preparingCount} PREPARING</span>
          <span className="text-zinc-400">•</span>
          <span className="text-emerald-400">{readyCount} READY</span>
        </div>

        <div className="h-4 w-px bg-zinc-800 hidden sm:block" />

        {/* ACTION BUTTONS */}
        <div className="flex items-center gap-1">
          <button
            onClick={onToggleSound}
            title={soundEnabled ? "Mute Sound" : "Enable Sound"}
            className={`h-9 w-9 rounded-md flex items-center justify-center border transition-all cursor-pointer ${
              soundEnabled
                ? "bg-zinc-900 border-zinc-800 text-amber-400 hover:bg-zinc-800"
                : "bg-zinc-900 border-zinc-800 text-zinc-600 hover:text-zinc-400"
            }`}
            aria-label="Toggle Sound"
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>

          <button
            onClick={onRefresh}
            title="Refresh Stream"
            className="h-9 w-9 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 flex items-center justify-center transition-all cursor-pointer"
            aria-label="Refresh Stream"
          >
            <RotateCw className="h-4 w-4" />
          </button>

          <button
            onClick={toggleFullscreen}
            title="Toggle Fullscreen"
            className="h-9 w-9 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 flex items-center justify-center transition-all cursor-pointer"
            aria-label="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </header>
  );
}
