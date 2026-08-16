"use client";

import { useState, useEffect } from "react";
import { Building2, Clock, Bell, LogOut, Menu } from "lucide-react";
import { signOut } from "next-auth/react";
import { Badge } from "@/components/ui/badge";

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

  return (
    <header className="h-16 bg-card border-b px-4 md:px-6 flex items-center justify-between shadow-sm sticky top-0 z-30">
      
      {/* Left Title & Mobile Menu Toggle */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted md:hidden transition-colors"
          title="Toggle Navigation"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center font-black shrink-0">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-black text-base tracking-tight text-foreground">
                YADOTENA <span className="text-amber-600 dark:text-amber-400 font-extrabold">OPERATIONS</span>
              </h1>
              <Badge variant="outline" className="text-[10px] font-bold px-2 py-0 hidden sm:inline-flex">
                Manager Control Center
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Right Clock, Attention Button & User Profile */}
      <div className="flex items-center gap-3">
        
        {/* Live Shift Clock */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-muted/40 border rounded-xl text-xs font-bold text-muted-foreground">
          <Clock className="h-3.5 w-3.5 text-amber-500" />
          <span className="font-mono text-foreground">{timeStr || "—"}</span>
        </div>

        {/* Attention Badge Trigger */}
        <button
          onClick={onOpenAttention}
          className={`relative p-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
            attentionCount > 0
              ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 animate-pulse shadow-sm"
              : "bg-muted/30 border-transparent text-muted-foreground hover:bg-muted"
          }`}
          title="Items requiring manager attention"
          aria-label={
            attentionCount > 0
              ? `${attentionCount} items require attention`
              : "No items require attention"
          }
        >
          <Bell className="h-4 w-4" />
          <span className="hidden sm:inline">ATTENTION</span>
          {attentionCount > 0 && (
            <span className="h-5 min-w-5 px-1.5 rounded-full bg-amber-500 text-zinc-950 font-black text-[10px] flex items-center justify-center">
              {attentionCount}
            </span>
          )}
        </button>

        <div className="h-6 w-px bg-border hidden sm:block" />

        {/* User Info & Logout */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:block text-right">
            <p className="text-xs font-bold leading-none text-foreground">{user.name}</p>
            <p className="text-[10px] text-muted-foreground capitalize mt-0.5">{user.role.toLowerCase()}</p>
          </div>
          <div className="h-9 w-9 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold flex items-center justify-center text-sm border border-amber-500/30">
            {user.name.charAt(0)}
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="p-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            title="Sign Out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>

      </div>
    </header>
  );
}
