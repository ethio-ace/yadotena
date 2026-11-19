"use client";

import { useSession, signOut } from "next-auth/react";
import { LayoutGrid, ClipboardList, BellRing, Plus, ShoppingBag, LogOut, Volume2, VolumeX } from "lucide-react";
import { useSoundNotifications } from "@/contexts/SoundNotificationContext";
import { cn } from "@/lib/utils";

/**
 * Waiter views. The three tabs (tables / orders / calls) are the only places a
 * waiter navigates to; "cafe-order" and "shop-sale" are focused order-entry
 * screens reached from the New Order buttons or by tapping a free table.
 */
export type WaiterView = "tables" | "cafe-order" | "shop-sale" | "orders" | "calls";

interface WaiterSidebarProps {
  view: WaiterView;
  readyCount: number;
  /** Guest orders waiting for approval — outranks "ready" on the Orders badge. */
  approvalCount: number;
  pendingCalls: number;
  /** Order entry & table detail are focus screens — hide the mobile tab bar. */
  focusMode: boolean;
  onNavigate: (view: WaiterView) => void;
}

const TABS: { key: WaiterView; label: string; icon: React.ElementType }[] = [
  { key: "tables", label: "Tables", icon: LayoutGrid },
  { key: "orders", label: "Orders", icon: ClipboardList },
  { key: "calls", label: "Calls", icon: BellRing },
];

function Badge({ count, tone }: { count: number; tone: "ready" | "call" | "approve" }) {
  if (count <= 0) return null;
  return (
    <span
      className={cn(
        "h-5 min-w-5 px-1.5 rounded-full text-[11px] font-black flex items-center justify-center tabular-nums",
        tone === "call" ? "bg-red-500 text-white" : tone === "approve" ? "bg-orange-500 text-white" : "bg-emerald-600 text-white"
      )}
    >
      {count}
    </span>
  );
}

export function WaiterSidebar({ view, readyCount, approvalCount, pendingCalls, focusMode, onNavigate }: WaiterSidebarProps) {
  const { data: session } = useSession();
  const { isMuted, toggleMute, unlockAudio } = useSoundNotifications();
  const isActive = (key: WaiterView) => view === key || (key === "tables" && (view === "cafe-order" || view === "shop-sale"));
  const badgeFor = (key: WaiterView) =>
    key === "orders" ? (approvalCount > 0 ? <Badge count={approvalCount} tone="approve" /> : <Badge count={readyCount} tone="ready" />) : key === "calls" ? <Badge count={pendingCalls} tone="call" /> : null;

  // Any tap on the chrome unlocks Web Audio (mobile Safari blocks it until a gesture).
  const go = (v: WaiterView) => { unlockAudio(); onNavigate(v); };

  return (
    <>
      {/* Desktop rail */}
      <aside className="hidden md:flex flex-col bg-card border-r w-[208px] shrink-0 select-none">
        <div className="h-14 border-b px-4 flex items-center gap-2.5 shrink-0">
          <img src="/icon.svg" alt="" className="h-7 w-7 rounded-lg shrink-0" />
          <div className="min-w-0">
            <p className="font-black text-[13px] tracking-tight leading-none truncate">YADOTENA</p>
            <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mt-0.5">Waiter</p>
          </div>
        </div>

        <div className="p-3 space-y-2">
          <button
            onClick={() => go("cafe-order")}
            className={cn(
              "w-full h-12 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.97]",
              view === "cafe-order"
                ? "bg-amber-600 text-white"
                : "bg-amber-500 text-amber-950 hover:bg-amber-400 shadow-sm shadow-amber-500/20"
            )}
          >
            <Plus className="h-5 w-5" strokeWidth={3} />
            New Order
          </button>
          <button
            onClick={() => go("shop-sale")}
            className={cn(
              "w-full h-10 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-colors",
              view === "shop-sale" ? "bg-foreground text-background border-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <ShoppingBag className="h-4 w-4" />
            Shop Sale
          </button>
        </div>

        <nav className="px-3 space-y-1 flex-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => go(t.key)}
              className={cn(
                "w-full h-11 flex items-center gap-3 px-3 rounded-xl text-sm font-bold transition-colors",
                isActive(t.key) ? "bg-foreground/[0.07] text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <t.icon className="h-[18px] w-[18px] shrink-0" />
              <span className="flex-1 text-left">{t.label}</span>
              {badgeFor(t.key)}
            </button>
          ))}
        </nav>

        <div className="border-t p-3 space-y-1">
          <p className="px-2 pb-1 text-xs font-bold truncate">{session?.user?.name || "Waiter"}</p>
          <div className="flex gap-1">
            <button
              onClick={() => { unlockAudio(); toggleMute(); }}
              title={isMuted ? "Turn sound on" : "Mute sound"}
              className="flex-1 h-9 rounded-lg text-xs font-bold text-muted-foreground hover:bg-muted hover:text-foreground flex items-center justify-center gap-1.5"
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              {isMuted ? "Muted" : "Sound"}
            </button>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              title="Sign out"
              className="flex-1 h-9 rounded-lg text-xs font-bold text-muted-foreground hover:bg-red-500/10 hover:text-red-600 flex items-center justify-center gap-1.5"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile top bar — sound + sign out (the tab bar lives at the bottom) */}
      {!focusMode && (
        <div className="md:hidden h-12 px-4 border-b bg-card flex items-center gap-2 shrink-0">
          <img src="/icon.svg" alt="" className="h-6 w-6 rounded-md" />
          <p className="font-black text-sm flex-1 truncate">{session?.user?.name || "Waiter"}</p>
          <button onClick={() => { unlockAudio(); toggleMute(); }} aria-label={isMuted ? "Turn sound on" : "Mute sound"} className="h-9 w-9 rounded-lg flex items-center justify-center text-muted-foreground">
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
          <button onClick={() => signOut({ callbackUrl: "/login" })} aria-label="Sign out" className="h-9 w-9 rounded-lg flex items-center justify-center text-muted-foreground">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Mobile bottom tab bar */}
      {!focusMode && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t pb-[env(safe-area-inset-bottom)]">
          <div className="flex items-stretch h-16">
            {TABS.slice(0, 1).map((t) => (
              <MobileTab key={t.key} label={t.label} icon={t.icon} active={isActive(t.key)} onClick={() => go(t.key)} />
            ))}
            <button
              onClick={() => go("cafe-order")}
              className="flex-1 flex flex-col items-center justify-center"
              aria-label="New order"
            >
              <span className="h-11 w-11 rounded-2xl bg-amber-500 text-amber-950 flex items-center justify-center shadow-md shadow-amber-500/30">
                <Plus className="h-6 w-6" strokeWidth={3} />
              </span>
            </button>
            {TABS.slice(1).map((t) => (
              <MobileTab
                key={t.key}
                label={t.label}
                icon={t.icon}
                active={isActive(t.key)}
                onClick={() => go(t.key)}
                badge={t.key === "orders" ? approvalCount || readyCount : pendingCalls}
                badgeTone={t.key === "orders" ? (approvalCount > 0 ? "approve" : "ready") : "call"}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function MobileTab({
  label, icon: Icon, active, onClick, badge = 0, badgeTone = "call",
}: { label: string; icon: React.ElementType; active: boolean; onClick: () => void; badge?: number; badgeTone?: "ready" | "call" | "approve" }) {
  return (
    <button
      onClick={onClick}
      className={cn("flex-1 flex flex-col items-center justify-center gap-0.5 relative", active ? "text-foreground" : "text-muted-foreground")}
    >
      <Icon className="h-5 w-5" />
      <span className="text-[11px] font-bold">{label}</span>
      {badge > 0 && (
        <span
          className={cn(
            "absolute top-1.5 left-1/2 ml-1.5 h-4 min-w-4 px-1 rounded-full text-[9px] font-black flex items-center justify-center text-white",
            badgeTone === "ready" ? "bg-emerald-600" : badgeTone === "approve" ? "bg-orange-500" : "bg-red-500"
          )}
        >
          {badge}
        </span>
      )}
    </button>
  );
}
