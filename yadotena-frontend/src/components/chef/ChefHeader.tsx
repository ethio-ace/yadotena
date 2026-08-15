"use client";

import { useState, useEffect } from "react";
import { UtensilsCrossed, Volume2, VolumeX, Layers, ListFilter, History, Wifi, WifiOff, Clock, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

interface ChefHeaderProps {
  activeCount: number;
  readyCount: number;
  viewMode: "QUEUE" | "BATCH" | "HISTORY";
  onViewModeChange: (mode: "QUEUE" | "BATCH" | "HISTORY") => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  isConnected?: boolean;
  chefName?: string;
}

export function ChefHeader({
  activeCount,
  readyCount,
  viewMode,
  onViewModeChange,
  soundEnabled,
  onToggleSound,
  isConnected = true,
  chefName = "Kitchen Station",
}: ChefHeaderProps) {
  const [timeStr, setTimeStr] = useState<string>("");

  useEffect(() => {
    const update = () => {
      setTimeStr(
        new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
      );
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-zinc-950 text-zinc-100 border-b border-zinc-800 shadow-xl px-4 py-3">
      <div className="max-w-[1800px] mx-auto flex flex-col lg:flex-row items-center justify-between gap-3">
        {/* Left: Branding, Chef Identity & Connection */}
        <div className="flex items-center gap-4 w-full lg:w-auto justify-between lg:justify-start">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20 text-zinc-950 shrink-0">
              <UtensilsCrossed className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-black text-lg tracking-tight text-white uppercase leading-none">
                  Yadotena <span className="text-amber-500">Kitchen</span>
                </h1>
              </div>
              <p className="text-[11px] font-medium text-zinc-400 mt-0.5">
                Production Station • <span className="text-zinc-200">{chefName}</span>
              </p>
            </div>
          </div>

          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors ${
              isConnected
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                : "bg-red-500/10 text-red-400 border-red-500/30 animate-pulse"
            }`}
          >
            {isConnected ? (
              <>
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                <Wifi className="h-3 w-3" /> CONNECTED
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3" /> RECONNECTING
              </>
            )}
          </span>
        </div>

        {/* Center: Live Clock + Operational Counters */}
        <div className="flex items-center gap-3 text-xs font-bold">
          <div className="flex items-center gap-2 bg-zinc-900/90 border border-zinc-800 rounded-xl px-3 py-1.5 shadow-inner">
            <Clock className="h-3.5 w-3.5 text-zinc-400" />
            <span className="font-mono text-zinc-200 text-sm">{timeStr || "10:42 AM"}</span>
          </div>

          <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl px-3 py-1.5">
            <span className="font-black text-sm">{activeCount}</span>
            <span className="text-[10px] uppercase tracking-wider text-amber-300/80">Active</span>
          </div>

          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl px-3 py-1.5">
            <span className="font-black text-sm">{readyCount}</span>
            <span className="text-[10px] uppercase tracking-wider text-emerald-300/80">Ready</span>
          </div>
        </div>

        {/* Right: View Modes, Sound & Profile */}
        <div className="flex items-center gap-2 w-full lg:w-auto justify-between lg:justify-end">
          {/* Primary view modes */}
          <div className="bg-zinc-900 border border-zinc-800 p-1 rounded-xl flex items-center gap-1">
            <button
              onClick={() => onViewModeChange("QUEUE")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                viewMode === "QUEUE"
                  ? "bg-amber-500 text-zinc-950 shadow-md font-black"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
              }`}
            >
              <ListFilter className="h-3.5 w-3.5" /> QUEUE
            </button>

            <button
              onClick={() => onViewModeChange("BATCH")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                viewMode === "BATCH"
                  ? "bg-amber-500 text-zinc-950 shadow-md font-black"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
              }`}
            >
              <Layers className="h-3.5 w-3.5" /> BATCH
            </button>
          </div>

          {/* Secondary: production history */}
          <button
            onClick={() => onViewModeChange(viewMode === "HISTORY" ? "QUEUE" : "HISTORY")}
            title="Today's Production History"
            className={`h-9 w-9 rounded-xl border flex items-center justify-center transition-colors ${
              viewMode === "HISTORY"
                ? "bg-amber-500/15 border-amber-500/40 text-amber-400"
                : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800"
            }`}
          >
            <History className="h-4 w-4" />
          </button>

          {/* Mute/Unmute Audio Alert Toggle */}
          <button
            onClick={onToggleSound}
            title={soundEnabled ? "Sound Alert ON" : "Sound Alert Silent"}
            className={`h-9 px-3 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors ${
              soundEnabled
                ? "bg-zinc-900 border-zinc-700 text-zinc-200 hover:bg-zinc-800"
                : "bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20"
            }`}
          >
            {soundEnabled ? (
              <>
                <Volume2 className="h-4 w-4 text-emerald-400" />
                <span className="hidden sm:inline">SOUND</span>
              </>
            ) : (
              <>
                <VolumeX className="h-4 w-4 text-red-400" />
                <span className="hidden sm:inline">SILENT</span>
              </>
            )}
          </button>

          {/* Chef profile chip + sign out */}
          <div className="hidden sm:flex items-center gap-1.5 pl-1.5 border-l border-zinc-800">
            <div className="h-8 w-8 rounded-lg bg-amber-500/20 text-amber-400 font-black text-xs flex items-center justify-center border border-amber-500/30 uppercase">
              {chefName.charAt(0)}
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              title="Sign out"
              className="h-8 px-2 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
