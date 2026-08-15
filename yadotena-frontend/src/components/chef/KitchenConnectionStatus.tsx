"use client";

import { useState, useEffect } from "react";
import { WifiOff, RefreshCw, CheckCircle2 } from "lucide-react";

interface KitchenConnectionStatusProps {
  isConnected: boolean;
  onRefresh: () => void;
}

export function KitchenConnectionStatus({
  isConnected,
  onRefresh,
}: KitchenConnectionStatusProps) {
  const [showReconnected, setShowReconnected] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>("");

  useEffect(() => {
    if (isConnected) {
      setLastSyncTime(new Date().toLocaleTimeString());
      setShowReconnected(true);
      const timer = setTimeout(() => setShowReconnected(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [isConnected]);

  if (!isConnected) {
    return (
      <div className="bg-red-950/90 border-b border-red-800 text-red-200 px-4 py-2.5 flex items-center justify-between text-xs font-bold animate-pulse shadow-md">
        <div className="flex items-center gap-2">
          <WifiOff className="h-4 w-4 text-red-400 shrink-0" />
          <span>⚠ CONNECTION LOST — Waiting for connection... Last updated {lastSyncTime}</span>
        </div>
        <button
          onClick={onRefresh}
          className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white rounded-lg font-black flex items-center gap-1.5 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" /> RESYNC
        </button>
      </div>
    );
  }

  if (showReconnected) {
    return (
      <div className="bg-emerald-950/90 border-b border-emerald-800 text-emerald-200 px-4 py-2 flex items-center justify-between text-xs font-bold transition-all">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>✓ RECONNECTED — Kitchen queue synchronized at {lastSyncTime}</span>
        </div>
      </div>
    );
  }

  return null;
}
