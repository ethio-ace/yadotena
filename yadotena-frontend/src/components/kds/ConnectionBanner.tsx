"use client";

import { Wifi, WifiOff, RotateCw } from "lucide-react";

interface ConnectionBannerProps {
  isConnected: boolean;
  onRefresh: () => void;
}

export function ConnectionBanner({ isConnected, onRefresh }: ConnectionBannerProps) {
  if (isConnected) return null;

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 flex items-center justify-between text-xs font-semibold text-amber-300 animate-in fade-in duration-200 shrink-0">
      <div className="flex items-center gap-2">
        <WifiOff className="h-4 w-4 text-amber-400 animate-pulse shrink-0" />
        <span>
          Real-time sync interrupted. Using 3s polling backup. System will auto-reconnect.
        </span>
      </div>

      <button
        onClick={onRefresh}
        className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30 transition-colors text-[11px] font-bold active:scale-95 cursor-pointer"
      >
        <RotateCw className="h-3.5 w-3.5" />
        <span>Resync Stream</span>
      </button>
    </div>
  );
}
