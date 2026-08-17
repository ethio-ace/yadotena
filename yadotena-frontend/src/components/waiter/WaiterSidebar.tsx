"use client";

import { Home, Grid3X3, ClipboardList, BellRing } from "lucide-react";
import { cn } from "@/lib/utils";

export type WaiterView = "home" | "tables" | "cafe-order" | "shop-sale" | "orders" | "alerts";

interface WaiterSidebarProps {
  view: WaiterView;
  pendingAlerts: number;
  onNavigate: (view: WaiterView) => void;
}

const NAV: { key: WaiterView; label: string; icon: React.ElementType; hint: string }[] = [
  { key: "home", label: "Sell", icon: Home, hint: "New orders & floor" },
  { key: "tables", label: "Tables", icon: Grid3X3, hint: "Floor & open orders" },
  { key: "orders", label: "Orders", icon: ClipboardList, hint: "Tickets & history" },
  { key: "alerts", label: "Notifications", icon: BellRing, hint: "Waiter & bill calls" },
];

/** In-app navigation rail for the waiter workspace (mirrors the manager/owner sidebar). */
export function WaiterSidebar({ view, pendingAlerts, onNavigate }: WaiterSidebarProps) {
  return (
    <>
      {/* Desktop rail */}
      <aside className="hidden md:flex flex-col bg-card border-r w-56 shrink-0">
        <div className="h-16 border-b px-4 flex items-center gap-2.5">
          <img src="/icon.svg" alt="Yadotena logo" className="h-8 w-8 rounded-xl shrink-0 shadow-md" />
          <div className="min-w-0">
            <p className="font-black text-sm tracking-tight leading-none">YADOTENA</p>
            <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mt-0.5">
              Waiter Station
            </p>
          </div>
        </div>

        <nav className="p-3 space-y-1 flex-1 overflow-y-auto scrollbar-none">
          {NAV.map((item) => {
            const active = view === item.key;
            return (
              <button
                key={item.key}
                onClick={() => onNavigate(item.key)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all group relative",
                  active
                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 font-black border border-amber-500/20 shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon
                  className={cn(
                    "h-4 w-4 shrink-0 transition-colors",
                    active ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground group-hover:text-foreground"
                  )}
                />
                <span className="flex-1 text-left">{item.label}</span>
                {item.key === "alerts" && pendingAlerts > 0 && (
                  <span className="h-5 min-w-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center animate-pulse">
                    {pendingAlerts}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Mobile horizontal nav */}
      <div className="md:hidden sticky top-0 z-30 bg-card/95 backdrop-blur-md border-b px-2 py-1.5 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
        {NAV.map((item) => {
          const active = view === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onNavigate(item.key)}
              className={cn(
                "relative flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors",
                active ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className="h-3.5 w-3.5" />
              {item.label}
              {item.key === "alerts" && pendingAlerts > 0 && (
                <span className="h-4 min-w-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center">
                  {pendingAlerts}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </>
  );
}
