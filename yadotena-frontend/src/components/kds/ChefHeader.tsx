"use client";

import { useState } from "react";
import {
  ChefHat,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  RotateCw,
  User,
  Wifi,
} from "lucide-react";

interface ChefHeaderProps {
  pendingCount: number;
  preparingCount: number;
  readyCount: number;
  avgWaitMin: number;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onRefresh: () => void;
  chefName: string;
  isConnected: boolean;
}

export function ChefHeader({
  pendingCount,
  preparingCount,
  readyCount,
  avgWaitMin,
  soundEnabled,
  onToggleSound,
  onRefresh,
  chefName,
  isConnected,
}: ChefHeaderProps) {
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

  return (
    <header className="h-16 bg-zinc-950 border-b border-zinc-800 px-4 sm:px-6 flex items-center justify-between shrink-0 select-none z-30">
      {/* LEFT: Station Brand & Connection */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
          <ChefHat className="h-5 w-5 text-amber-500" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold text-zinc-50 tracking-tight leading-none uppercase">
              Yadotena KDS
            </h1>
            <span
              className={`h-2 w-2 rounded-full ${
                isConnected ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" : "bg-amber-500 animate-pulse"
              }`}
              title={isConnected ? "Realtime WebSocket Connected" : "Polling Active"}
            />
          </div>
          <p className="text-[11px] font-medium text-zinc-400 mt-0.5">
            {chefName}
          </p>
        </div>
      </div>

      {/* CENTER: High-Impact KPI Numbers (28px) */}
      <div className="flex items-center gap-6 sm:gap-10">
        {/* NEW */}
        <div className="flex items-center gap-2.5">
          <span className="text-2xl sm:text-[28px] font-extrabold text-amber-500 leading-none tracking-tight">
            {pendingCount}
          </span>
          <div className="hidden sm:flex flex-col justify-center">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider leading-none">
              New
            </span>
            <span className="text-[9px] text-zinc-500 font-semibold mt-0.5">
              Unstarted
            </span>
          </div>
        </div>

        <div className="h-8 w-px bg-zinc-800/80" />

        {/* PREPARING */}
        <div className="flex items-center gap-2.5">
          <span className="text-2xl sm:text-[28px] font-extrabold text-zinc-100 leading-none tracking-tight">
            {preparingCount}
          </span>
          <div className="hidden sm:flex flex-col justify-center">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider leading-none">
              Preparing
            </span>
            <span className="text-[9px] text-zinc-500 font-semibold mt-0.5">
              Cooking
            </span>
          </div>
        </div>

        <div className="h-8 w-px bg-zinc-800/80" />

        {/* READY */}
        <div className="flex items-center gap-2.5">
          <span className="text-2xl sm:text-[28px] font-extrabold text-emerald-400 leading-none tracking-tight">
            {readyCount}
          </span>
          <div className="hidden sm:flex flex-col justify-center">
            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider leading-none">
              Ready
            </span>
            <span className="text-[9px] text-zinc-500 font-semibold mt-0.5">
              Pickup
            </span>
          </div>
        </div>

        <div className="h-8 w-px bg-zinc-800/80" />

        {/* AVG WAIT */}
        <div className="flex items-center gap-2.5">
          <span className="text-2xl sm:text-[28px] font-extrabold text-orange-400 leading-none tracking-tight">
            {avgWaitMin}m
          </span>
          <div className="hidden sm:flex flex-col justify-center">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider leading-none">
              Avg Wait
            </span>
            <span className="text-[9px] text-zinc-500 font-semibold mt-0.5">
              Target &lt;15m
            </span>
          </div>
        </div>
      </div>

      {/* RIGHT: Compact Icon Actions (No text labels) */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        <button
          onClick={onToggleSound}
          title={soundEnabled ? "Mute KDS Audio" : "Enable KDS Audio"}
          className={`h-11 w-11 rounded-xl flex items-center justify-center border transition-all active:scale-95 cursor-pointer ${
            soundEnabled
              ? "bg-zinc-900 border-zinc-800 text-amber-400 hover:bg-zinc-800"
              : "bg-zinc-900/50 border-zinc-800 text-zinc-600 hover:text-zinc-400"
          }`}
          aria-label="Toggle Sound"
        >
          {soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
        </button>

        <button
          onClick={onRefresh}
          title="Refresh Order Stream"
          className="h-11 w-11 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 flex items-center justify-center transition-all active:scale-95 cursor-pointer"
          aria-label="Refresh Stream"
        >
          <RotateCw className="h-5 w-5" />
        </button>

        <button
          onClick={toggleFullscreen}
          title="Toggle Fullscreen KDS"
          className="h-11 w-11 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 flex items-center justify-center transition-all active:scale-95 cursor-pointer"
          aria-label="Toggle Fullscreen"
        >
          {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
        </button>

        <div
          title={chefName}
          className="h-11 w-11 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs shrink-0"
        >
          <User className="h-5 w-5" />
        </div>
      </div>
    </header>
  );
}
