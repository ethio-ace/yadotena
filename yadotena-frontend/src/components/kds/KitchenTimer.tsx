"use client";

import { useEffect, useState } from "react";
import { formatElapsed } from "@/lib/kitchen";

interface KitchenTimerProps {
  startedAt: string;
  status: "PENDING" | "PREPARING" | "READY" | "SERVED" | "CANCELLED";
}

export function KitchenTimer({ startedAt, status }: KitchenTimerProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(() => {
    return Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
  });

  useEffect(() => {
    if (status === "READY" || status === "SERVED" || status === "CANCELLED") return;

    const interval = setInterval(() => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)));
    }, 1000);

    return () => clearInterval(interval);
  }, [startedAt, status]);

  const elapsedMinutes = Math.floor(elapsedSeconds / 60);

  // Timer color threshold rules: Green (<8m), Orange (8-15m), Red (>15m)
  let timerColor = "text-emerald-400 stroke-emerald-500 bg-emerald-500/10 border-emerald-500/30";
  let trackColor = "stroke-emerald-950";
  let isOverdue = false;

  if (elapsedMinutes >= 15) {
    timerColor = "text-red-400 stroke-red-500 bg-red-500/15 border-red-500/40 animate-pulse";
    trackColor = "stroke-red-950";
    isOverdue = true;
  } else if (elapsedMinutes >= 8) {
    timerColor = "text-orange-400 stroke-orange-500 bg-orange-500/15 border-orange-500/30";
    trackColor = "stroke-orange-950";
  }

  // Radial progress calculations (target 15 min max = 900 seconds)
  const maxSec = 900;
  const progressPercent = Math.min(1, elapsedSeconds / maxSec);
  const strokeDashoffset = 100 - progressPercent * 100;

  return (
    <div className={`flex items-center gap-2 px-2.5 py-1 rounded-xl border ${timerColor} font-mono font-bold text-xs shrink-0`}>
      {/* Mini SVG Radial Indicator */}
      <div className="relative h-5 w-5 flex items-center justify-center shrink-0">
        <svg className="h-5 w-5 -rotate-90 transform" viewBox="0 0 36 36">
          <path
            className={`${trackColor} stroke-[4]`}
            fill="none"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          />
          <path
            className="stroke-current stroke-[4] transition-all duration-500"
            strokeDasharray="100, 100"
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="none"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          />
        </svg>
      </div>

      <span className="tracking-tight">{formatElapsed(elapsedSeconds)}</span>
    </div>
  );
}
