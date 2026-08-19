"use client";

import { useEffect, useState, memo } from "react";
import { formatElapsed } from "@/lib/kitchen";

interface KDSTimerProps {
  startedAt: string;
  isReady?: boolean;
}

export const KDSTimer = memo(function KDSTimer({ startedAt, isReady }: KDSTimerProps) {
  const [seconds, setSeconds] = useState<number>(() => {
    return Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
  });

  useEffect(() => {
    if (isReady) return;
    const interval = setInterval(() => {
      setSeconds(Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)));
    }, 1000);
    return () => clearInterval(interval);
  }, [startedAt, isReady]);

  const mins = Math.floor(seconds / 60);
  const isOverdue = mins >= 15;
  const isAttention = mins >= 8 && !isOverdue;

  let colorClass = "text-zinc-400 font-medium";
  if (isOverdue) {
    colorClass = "text-red-400 font-bold";
  } else if (isAttention) {
    colorClass = "text-amber-400 font-semibold";
  }

  return (
    <div className="flex items-center gap-1.5 font-mono text-xs select-none shrink-0">
      <span className={colorClass}>{formatElapsed(seconds)}</span>
      {isOverdue && (
        <span className="text-[10px] font-black tracking-wider uppercase text-red-400 bg-red-950/60 border border-red-500/40 px-1 py-0.2 rounded">
          LATE
        </span>
      )}
    </div>
  );
});
