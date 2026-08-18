"use client";

import { useState, useEffect } from "react";
import { Clock, Bell, LogOut, Menu } from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

interface ManagerHeaderProps {
  user?: { name: string; email?: string; role: string };
  attentionCount: number;
  onOpenAttention?: () => void;
  onToggleSidebar?: () => void;
}

export function ManagerHeader({
  user = { name: "Store Manager", role: "MANAGER" },
  attentionCount = 0,
  onOpenAttention,
  onToggleSidebar,
}: ManagerHeaderProps) {
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

  const hasAttention = attentionCount > 0;

  return (
    <header className="h-16 bg-card border-b px-4 md:px-6 flex items-center justify-between shadow-sm sticky top-0 z-30">
      {/* Left — mobile menu + workspace title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted md:hidden transition-colors"
          title="Toggle Navigation"
          aria-label="Toggle Navigation"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="min-w-0">
          <p className="font-black text-base tracking-tight text-foreground truncate leading-none">
            Operations
            <span className="text-primary"> Console</span>
          </p>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground mt-1.5">
            Manager workspace
          </p>
        </div>
      </div>

      {/* Right — live clock, attention, user */}
      <div className="flex items-center gap-2.5 md:gap-3">
        {/* Live Shift Clock */}
        <div
          className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-muted/40 border rounded-xl"
          aria-label={`Current time ${timeStr || "unavailable"}`}
        >
          <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
          </span>
          <Clock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
          <span className="font-mono text-xs font-bold text-foreground">{timeStr || "—"}</span>
        </div>

        {/* Attention Badge Trigger */}
        <button
          onClick={onOpenAttention}
          className={cn(
            "relative p-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition",
            hasAttention
              ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 shadow-sm"
              : "bg-muted/30 border-transparent text-muted-foreground hover:bg-muted"
          )}
          title="Items requiring manager attention"
          aria-label={
            hasAttention
              ? `${attentionCount} items require attention`
              : "No items require attention"
          }
        >
          <Bell className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">ATTENTION</span>
          {hasAttention && (
            <span className="h-5 min-w-5 px-1.5 rounded-full bg-amber-500 text-zinc-950 font-black text-[10px] flex items-center justify-center">
              {attentionCount}
            </span>
          )}
        </button>

        <div className="h-6 w-px bg-border hidden sm:block" aria-hidden="true" />

        {/* User Info & Logout */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:block text-right">
            <p className="text-xs font-bold leading-none text-foreground">{user.name}</p>
            <p className="text-[10px] text-muted-foreground capitalize mt-1">
              {user.role.toLowerCase()}
            </p>
          </div>
          <div className="h-9 w-9 rounded-xl bg-primary/15 text-primary font-bold flex items-center justify-center text-sm border border-primary/20">
            {user.name.charAt(0)}
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="p-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            title="Sign Out"
            aria-label="Sign Out"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
}
