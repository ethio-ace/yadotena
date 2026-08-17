"use client";

import { useState, useEffect } from "react";
import { UtensilsCrossed, Volume2, VolumeX, ListFilter, Layers, History, LogOut, Clock } from "lucide-react";
import { signOut } from "next-auth/react";

interface ChefHeaderProps {
  pendingCount: number;
  preparingCount: number;
  readyCount: number;
  overdueCount: number;
  viewMode: "QUEUE" | "BATCH" | "HISTORY";
  onViewModeChange: (mode: "QUEUE" | "BATCH" | "HISTORY") => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  chefName?: string;
}

export function ChefHeader({
  pendingCount,
  preparingCount,
  readyCount,
  overdueCount,
  viewMode,
  onViewModeChange,
  soundEnabled,
  onToggleSound,
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

  // Kitchen state at a glance. Color is reserved for meaning: NEW = needs a
  // chef's attention, READY = needs a waiter, OVERDUE = needs intervention.
  const counts = [
    { label: "NEW", value: pendingCount, dot: "bg-amber-500", alert: false },
    { label: "PREP", value: preparingCount, dot: "bg-zinc-500", alert: false },
    { label: "READY", value: readyCount, dot: "bg-emerald-500", alert: false },
    { label: "OVERDUE", value: overdueCount, dot: "bg-red-500", alert: overdueCount > 0 },
  ];

  const viewBtn = (mode: "QUEUE" | "BATCH" | "HISTORY", active: boolean) =>
    `px-2.5 py-1.5 rounded-md text-[11px] font-bold flex items-center gap-1.5 transition-colors ${
      active ? "bg-zinc-100 text-zinc-900" : "text-zinc-500 hover:text-white"
    }`;

  return (
    <header className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur border-b border-zinc-800">
      <div className="max-w-[1800px] mx-auto px-4 py-2.5 flex flex-wrap items-center gap-x-6 gap-y-2">
        {/* Brand + chef identity */}
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center">
            <UtensilsCrossed className="h-4 w-4 text-zinc-400" />
          </div>
          <div>
            <div className="text-sm font-extrabold tracking-tight text-white leading-none">
              Yadotena <span className="text-zinc-600">·</span> Kitchen
            </div>
            <div className="text-[10px] font-medium text-zinc-500 mt-1">{chefName}</div>
          </div>
        </div>

        {/* Live clock + kitchen counts */}
        <div className="flex items-center gap-5">
          <div className="hidden md:flex items-center gap-1.5 font-mono text-sm font-bold text-zinc-300 tabular-nums">
            <Clock className="h-3.5 w-3.5 text-zinc-500" />
            {timeStr || "—"}
          </div>

          <div className="flex items-center gap-4">
            {counts.map((c) => (
              <span
                key={c.label}
                className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                  c.alert ? "text-red-400" : "text-zinc-500"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
                <span className="text-sm font-extrabold text-zinc-200 tabular-nums leading-none">{c.value}</span>
                {c.label}
              </span>
            ))}
          </div>
        </div>

        {/* View modes, sound, profile */}
        <div className="flex items-center gap-1.5 ml-auto">
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
            <button onClick={() => onViewModeChange("QUEUE")} className={viewBtn("QUEUE", viewMode === "QUEUE")}>
              <ListFilter className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">QUEUE</span>
            </button>
            <button onClick={() => onViewModeChange("BATCH")} className={viewBtn("BATCH", viewMode === "BATCH")}>
              <Layers className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">BATCH</span>
            </button>
          </div>

          <button
            onClick={() => onViewModeChange(viewMode === "HISTORY" ? "QUEUE" : "HISTORY")}
            title="Today's Production History"
            className={`p-2 rounded-lg transition-colors ${
              viewMode === "HISTORY" ? "bg-zinc-100 text-zinc-900" : "text-zinc-500 hover:text-white hover:bg-zinc-800"
            }`}
          >
            <History className="h-4 w-4" />
          </button>

          <button
            onClick={onToggleSound}
            title={soundEnabled ? "Sound alert on" : "Sound alert off"}
            className="p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>

          <div className="hidden sm:flex items-center gap-1 pl-1.5 border-l border-zinc-800">
            <div className="h-7 w-7 rounded-lg bg-zinc-800 text-zinc-300 font-bold text-[11px] flex items-center justify-center uppercase">
              {chefName.charAt(0)}
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              title="Sign out"
              className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-zinc-800/60 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
