"use client";

import { Activity, Clock, AlertTriangle } from "lucide-react";

interface KitchenHealthProps {
  activeCount: number;
  cookingCount: number;
  readyCount: number;
  avgPrepMin: number;
  longestWaitMin: number;
}

export function KitchenHealth({
  activeCount,
  cookingCount,
  readyCount,
  avgPrepMin,
  longestWaitMin,
}: KitchenHealthProps) {
  return (
    <div className="bg-zinc-900 border border-zinc-800/80 rounded-2xl p-3.5 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
          <Activity className="h-3.5 w-3.5 text-amber-500" />
          Kitchen Health
        </span>
        <span className="text-[10px] font-semibold text-zinc-500">Live</span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="p-2 rounded-xl bg-zinc-950/60 border border-zinc-800/50">
          <div className="text-base font-black text-zinc-50">{activeCount}</div>
          <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-tight">
            Active
          </div>
        </div>

        <div className="p-2 rounded-xl bg-zinc-950/60 border border-zinc-800/50">
          <div className="text-base font-black text-amber-500">{cookingCount}</div>
          <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-tight">
            Cooking
          </div>
        </div>

        <div className="p-2 rounded-xl bg-zinc-950/60 border border-zinc-800/50">
          <div className="text-base font-black text-emerald-400">{readyCount}</div>
          <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-tight">
            Ready
          </div>
        </div>
      </div>

      <div className="pt-1 border-t border-zinc-800/50 flex items-center justify-between text-xs font-semibold">
        <div className="flex items-center gap-1.5 text-zinc-400 text-[11px]">
          <Clock className="h-3.5 w-3.5 text-zinc-400" />
          <span>Avg Prep</span>
        </div>
        <span className="font-bold text-zinc-200 text-[12px]">{avgPrepMin} min</span>
      </div>

      <div className="flex items-center justify-between text-xs font-semibold">
        <div className="flex items-center gap-1.5 text-zinc-400 text-[11px]">
          <AlertTriangle className={`h-3.5 w-3.5 ${longestWaitMin >= 15 ? "text-red-500" : "text-amber-500"}`} />
          <span>Longest Wait</span>
        </div>
        <span className={`font-bold text-[12px] ${longestWaitMin >= 15 ? "text-red-400 font-extrabold" : "text-zinc-200"}`}>
          {longestWaitMin} min
        </span>
      </div>
    </div>
  );
}
