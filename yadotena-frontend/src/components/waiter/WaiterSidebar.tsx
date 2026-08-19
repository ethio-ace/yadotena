"use client";

import { Home, Table2, ClipboardList, Bell, Coffee, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";

export type WaiterView = "home" | "tables" | "cafe-order" | "shop-sale" | "orders" | "alerts";

interface WaiterSidebarProps {
  view: WaiterView;
  pendingAlerts: number;
  onNavigate: (view: WaiterView) => void;
}

const NAV: { key: WaiterView; label: string; icon: React.ElementType }[] = [
  { key: "tables", label: "Tables", icon: Table2 },
  { key: "orders", label: "Orders", icon: ClipboardList },
  { key: "alerts", label: "Alerts", icon: Bell },
];

export function WaiterSidebar({ view, pendingAlerts, onNavigate }: WaiterSidebarProps) {
  const isActive = (key: WaiterView) =>
    view === key || (view === "cafe-order" && key === "tables") || (view === "shop-sale" && key === "tables");

  return (
    <>
      {/* Desktop vertical rail */}
      <aside className="hidden md:flex flex-col bg-card border-r w-[220px] shrink-0 select-none">
        {/* Brand */}
        <div className="h-14 border-b px-4 flex items-center gap-2.5 shrink-0">
          <img src="/icon.svg" alt="Yadotena" className="h-7 w-7 rounded-lg shrink-0" />
          <div className="min-w-0">
            <p className="font-black text-[13px] tracking-tight leading-none truncate">YADOTENA</p>
            <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mt-0.5">
              Waiter
            </p>
          </div>
        </div>

        {/* Primary actions — visually dominant */}
        <div className="p-3 space-y-2 border-b">
          <button
            onClick={() => onNavigate("cafe-order")}
            className={cn(
              "w-full h-12 rounded-xl font-black text-sm flex items-center gap-3 px-4 transition-all active:scale-[0.97]",
              view === "cafe-order"
                ? "bg-amber-500 text-amber-950 shadow-md shadow-amber-500/20"
                : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20"
            )}
          >
            <Coffee className="h-5 w-5" />
            <span>+ Café Order</span>
          </button>
          <button
            onClick={() => onNavigate("shop-sale")}
            className={cn(
              "w-full h-12 rounded-xl font-black text-sm flex items-center gap-3 px-4 transition-all active:scale-[0.97]",
              view === "shop-sale"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
            )}
          >
            <ShoppingBag className="h-5 w-5" />
            <span>+ Shop Sale</span>
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-1 flex-1">
          {NAV.map((item) => {
            const active = isActive(item.key);
            return (
              <button
                key={item.key}
                onClick={() => onNavigate(item.key)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all relative",
                  active
                    ? "bg-foreground/5 text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="flex-1 text-left">{item.label}</span>
                {item.key === "alerts" && pendingAlerts > 0 && (
                  <span className="h-5 min-w-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center">
                    {pendingAlerts}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Mobile bottom navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="flex items-stretch">
          {/* Quick action: Café Order */}
          <button
            onClick={() => onNavigate("cafe-order")}
            className="flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 text-amber-600 dark:text-amber-400 active:bg-amber-500/10 transition-colors"
          >
            <Coffee className="h-5 w-5" />
            <span className="text-[10px] font-black">Café</span>
          </button>

          {/* Quick action: Shop Sale */}
          <button
            onClick={() => onNavigate("shop-sale")}
            className="flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 text-emerald-600 dark:text-emerald-400 active:bg-emerald-500/10 transition-colors"
          >
            <ShoppingBag className="h-5 w-5" />
            <span className="text-[10px] font-black">Shop</span>
          </button>

          <div className="w-px bg-border" />

          {NAV.map((item) => {
            const active = isActive(item.key);
            return (
              <button
                key={item.key}
                onClick={() => onNavigate(item.key)}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 transition-colors relative",
                  active ? "text-foreground" : "text-muted-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-[10px] font-bold">{item.label}</span>
                {item.key === "alerts" && pendingAlerts > 0 && (
                  <span className="absolute top-1.5 right-[calc(50%-18px)] h-3.5 min-w-3.5 px-0.5 rounded-full bg-red-500 text-white text-[8px] font-black flex items-center justify-center">
                    {pendingAlerts}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
