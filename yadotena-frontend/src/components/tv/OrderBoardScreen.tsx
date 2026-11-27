"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { OrderBoardEntry, RestaurantSettings, MenuItem } from "@/types";
import { cn, getImageUrl } from "@/lib/utils";
import { ChefHat, CheckCircle2, Clock3, Wifi, QrCode, Flame, Maximize } from "lucide-react";

/**
 * Café TV order board. Guests in the room see where their order is:
 * Received → Preparing → Ready. Shows only the 6-char code from their receipt /
 * tracking page, the table and the dishes — never names, phones or money.
 *
 * Data: public GET /orders/board, polled; the ["orders", …] key also gets
 * invalidated by AblySyncProvider on order events, so it updates instantly
 * when realtime is configured.
 */

const POLL_MS = 8_000;
const FRESH_READY_MS = 90_000; // newly ready tickets glow for 1½ minutes
const ROTATE_MS = 12_000;
const CAP = { received: 7, preparing: 7, ready: 9 } as const;

type Stage = OrderBoardEntry["stage"];

const STAGES: { key: Stage; title: string; hint: string; icon: React.ElementType; tone: string; head: string }[] = [
  { key: "received", title: "Received", hint: "In the queue", icon: Clock3, tone: "border-amber-500/40", head: "text-amber-400" },
  { key: "preparing", title: "Preparing", hint: "Being made now", icon: ChefHat, tone: "border-blue-400/40", head: "text-blue-300" },
  { key: "ready", title: "Ready", hint: "Dine-in: on its way · Takeaway: collect at the counter", icon: CheckCircle2, tone: "border-emerald-500/60", head: "text-emerald-400" },
];

function useNow(intervalMs: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

/** Keep the TV from dimming while the board is open (where supported). */
function useWakeLock() {
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
    const acquire = () => {
      if (document.visibilityState === "visible" && nav.wakeLock) {
        nav.wakeLock.request("screen").then((l) => { lock = l; }).catch(() => {});
      }
    };
    acquire();
    document.addEventListener("visibilitychange", acquire);
    return () => {
      document.removeEventListener("visibilitychange", acquire);
      lock?.release().catch(() => {});
    };
  }, []);
}

function minutesSince(iso: string, now: number) {
  return Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));
}

function where(o: OrderBoardEntry) {
  if (o.type === "TAKEAWAY") return "Takeaway";
  return o.tableName || "Dine-in";
}

function TicketCard({ o, now }: { o: OrderBoardEntry; now: number }) {
  const shown = o.items.slice(0, 3);
  const more = o.items.slice(3).reduce((s, i) => s + i.quantity, 0);
  const fresh = o.stage === "ready" && now - new Date(o.since).getTime() < FRESH_READY_MS;
  const mins = minutesSince(o.since, now);
  return (
    <div
      className={cn(
        "rounded-2xl border-2 px-[1.1vw] py-[0.9vw] bg-white/[0.04] transition-colors",
        o.stage === "ready" ? "border-emerald-500/70 bg-emerald-500/10" : "border-white/10",
        fresh && "tv-fresh"
      )}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className={cn("font-mono font-black tracking-wider leading-none", o.stage === "ready" ? "text-[2.4vw] text-emerald-300" : "text-[1.9vw]")}>
          {o.code}
        </span>
        <span className="text-[1.05vw] font-bold text-white/70 truncate">{where(o)}</span>
      </div>
      <p className="mt-[0.5vw] text-[0.95vw] text-white/60 leading-snug line-clamp-2">
        {shown.map((i) => `${i.quantity}× ${i.name}`).join(" · ")}
        {more > 0 && ` · +${more} more`}
      </p>
      {o.stage === "preparing" && (
        <p className="mt-[0.35vw] text-[0.85vw] font-bold text-blue-300/80">{mins < 1 ? "Just started" : `Cooking ${mins} min`}</p>
      )}
      {o.stage === "ready" && fresh && (
        <p className="mt-[0.35vw] text-[0.85vw] font-black uppercase tracking-wider text-emerald-300">Just ready</p>
      )}
    </div>
  );
}

function InfoRail({ settings, popular }: { settings?: RestaurantSettings; popular: MenuItem[] }) {
  // Client-only (empty during SSR) without a setState-in-effect round trip.
  const origin = useSyncExternalStore(() => () => {}, () => window.location.origin, () => "");
  const panels = useMemo(() => {
    const list: ("wifi" | "order" | "popular")[] = ["order"];
    if (settings?.guestWifiSsid) list.push("wifi");
    if (popular.length) list.push("popular");
    return list;
  }, [settings?.guestWifiSsid, popular.length]);
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => i + 1), ROTATE_MS);
    return () => clearInterval(t);
  }, []);
  const panel = panels[idx % panels.length];
  const menuUrl = origin ? `${origin}/menu` : "";
  // Same QR service the table cards use; this link carries no table key.
  const qr = menuUrl ? `https://api.qrserver.com/v1/create-qr-code/?size=360x360&margin=8&data=${encodeURIComponent(menuUrl)}` : "";

  return (
    <aside className="rounded-3xl border-2 border-white/10 bg-white/[0.03] p-[1.4vw] flex flex-col min-h-0 overflow-hidden">
      <div key={panel} className="flex-1 min-h-0 flex flex-col animate-in fade-in duration-700">
        {panel === "order" && (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-[1vw]">
            <QrCode className="h-[2.2vw] w-[2.2vw] text-amber-400" />
            <p className="text-[1.6vw] font-black leading-tight">Scan to see the menu</p>
            {qr && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qr} alt="QR code for the menu" className="w-[11vw] h-[11vw] rounded-xl bg-white p-[0.4vw]" />
            )}
            <p className="text-[0.95vw] text-white/60 leading-snug">
              Scan the code on your table to order — your waiter confirms it. Track it with the code on your phone.
            </p>
          </div>
        )}
        {panel === "wifi" && settings && (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-[1vw]">
            <Wifi className="h-[2.6vw] w-[2.6vw] text-blue-300" />
            <p className="text-[1.6vw] font-black">Free Wi-Fi</p>
            <div className="w-full rounded-2xl bg-white/[0.06] p-[1vw] space-y-[0.6vw]">
              <p className="text-[0.85vw] uppercase tracking-widest text-white/50 font-bold">Network</p>
              <p className="text-[1.5vw] font-black break-all">{settings.guestWifiSsid}</p>
              {settings.guestWifiPassword && (
                <>
                  <p className="text-[0.85vw] uppercase tracking-widest text-white/50 font-bold pt-[0.4vw]">Password</p>
                  <p className="text-[1.5vw] font-mono font-black break-all">{settings.guestWifiPassword}</p>
                </>
              )}
            </div>
          </div>
        )}
        {panel === "popular" && (
          <div className="flex-1 min-h-0 flex flex-col gap-[0.8vw]">
            <p className="text-[1.4vw] font-black flex items-center gap-2">
              <Flame className="h-[1.4vw] w-[1.4vw] text-amber-400" /> Popular here
            </p>
            <ul className="flex-1 min-h-0 flex flex-col gap-[0.7vw] overflow-hidden">
              {popular.slice(0, 5).map((m) => {
                const src = m.imageUrl || m.image;
                return (
                  <li key={m.id} className="flex items-center gap-[0.8vw] rounded-xl bg-white/[0.05] p-[0.5vw]">
                    <div className="relative h-[3.6vw] w-[3.6vw] shrink-0 rounded-lg bg-white/10 overflow-hidden flex items-center justify-center text-[1.4vw] font-black text-white/40">
                      {m.name.charAt(0)}
                      {src && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={getImageUrl(src)} alt="" className="absolute inset-0 h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[1.05vw] font-bold truncate">{m.name}</p>
                      <p className="text-[0.9vw] text-white/55 tabular-nums">{Number(m.price).toLocaleString()} ETB</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
      <div className="flex justify-center gap-1.5 pt-[0.8vw]">
        {panels.map((p) => (
          <span key={p} className={cn("h-1.5 rounded-full transition-all", p === panel ? "w-6 bg-white/70" : "w-1.5 bg-white/25")} />
        ))}
      </div>
    </aside>
  );
}

export function OrderBoardScreen() {
  useWakeLock();
  const now = useNow(15_000);
  const clockNow = useNow(1_000);

  const board = useQuery({
    queryKey: ["orders", "board"],
    queryFn: api.orders.board,
    refetchInterval: POLL_MS,
    refetchIntervalInBackground: true,
    retry: true,
  });
  const { data: settings } = useQuery<RestaurantSettings>({ queryKey: ["settings"], queryFn: api.settings.get, staleTime: 10 * 60_000, refetchInterval: 10 * 60_000 });
  const { data: popular = [] } = useQuery({ queryKey: ["menu", "popular", 6], queryFn: () => api.menu.getPopular(6), staleTime: 30 * 60_000, refetchInterval: 30 * 60_000 });

  const byStage = useMemo(() => {
    const groups: Record<Stage, OrderBoardEntry[]> = { received: [], preparing: [], ready: [] };
    for (const o of board.data?.orders || []) groups[o.stage]?.push(o);
    // Newest-ready first so a guest's code appears at the top the moment it's done.
    groups.ready.sort((a, b) => new Date(b.since).getTime() - new Date(a.since).getTime());
    return groups;
  }, [board.data]);

  // Hide the cursor once nobody is touching the TV.
  const [idle, setIdle] = useState(false);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const wake = () => {
      setIdle(false);
      if (idleTimer.current) clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(() => setIdle(true), 4000);
    };
    wake();
    window.addEventListener("mousemove", wake);
    window.addEventListener("pointerdown", wake);
    return () => {
      window.removeEventListener("mousemove", wake);
      window.removeEventListener("pointerdown", wake);
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, []);

  const offline = board.isError && !board.isFetching;
  const clock = new Date(clockNow);
  const name = settings?.restaurantName || "Hilif";

  return (
    <div className={cn("dark fixed inset-0 bg-background text-white flex flex-col select-none overflow-hidden", idle && "cursor-none")}>
      <style>{`
        @keyframes tv-glow { 0%,100% { box-shadow: 0 0 0 0 rgb(16 185 129 / 0); } 50% { box-shadow: 0 0 0 0.35vw rgb(16 185 129 / 0.35); } }
        .tv-fresh { animation: tv-glow 2.2s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .tv-fresh { animation: none; } }
      `}</style>

      {/* Header */}
      <header className="h-[10vh] px-[2.5vw] flex items-center gap-[1.2vw] shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon.svg" alt="" className="h-[4.5vh] w-[4.5vh] rounded-xl" />
        <div className="min-w-0">
          <p className="text-[1.7vw] font-black tracking-tight leading-none truncate">{name}</p>
          <p className="text-[0.9vw] text-white/50 font-bold uppercase tracking-[0.2em] mt-[0.3vw]">Order status</p>
        </div>
        <div className="flex-1" />
        {offline && (
          <span className="text-[0.9vw] font-bold text-amber-400 flex items-center gap-2 mr-[1.5vw]">
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" /> Reconnecting…
          </span>
        )}
        {!idle && (
          <button
            onClick={() => document.documentElement.requestFullscreen?.().catch(() => {})}
            className="mr-[1.5vw] h-10 px-3 rounded-lg border border-white/20 text-white/70 text-sm font-bold flex items-center gap-2 hover:bg-white/10"
          >
            <Maximize className="h-4 w-4" /> Full screen
          </button>
        )}
        <div className="text-right">
          <p className="text-[2.4vw] font-black tabular-nums leading-none">
            {clock.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
          <p className="text-[0.9vw] text-white/50 font-bold mt-[0.3vw]">
            {clock.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
      </header>
      <div className="tibeb shrink-0" />

      {/* Board */}
      <main className="flex-1 min-h-0 grid grid-cols-[1fr_1fr_1.25fr_0.85fr] gap-[1.2vw] p-[1.6vw]">
        {STAGES.map((s) => {
          const list = byStage[s.key];
          const cap = CAP[s.key];
          const extra = list.length - cap;
          return (
            <section key={s.key} className={cn("rounded-3xl border-2 bg-white/[0.02] flex flex-col min-h-0 overflow-hidden", s.tone)}>
              <div className="px-[1.2vw] pt-[1.1vw] pb-[0.8vw] flex items-center gap-[0.7vw]">
                <s.icon className={cn("h-[1.8vw] w-[1.8vw]", s.head)} />
                <h2 className={cn("text-[1.7vw] font-black", s.head)}>{s.title}</h2>
                <span className="ml-auto text-[1.4vw] font-black tabular-nums text-white/70">{list.length}</span>
              </div>
              <p className="px-[1.2vw] -mt-[0.4vw] pb-[0.8vw] text-[0.85vw] text-white/45 font-medium">{s.hint}</p>
              <div className="flex-1 min-h-0 px-[1vw] pb-[1vw] flex flex-col gap-[0.7vw] overflow-hidden">
                {list.slice(0, cap).map((o) => <TicketCard key={o.code + o.createdAt} o={o} now={now} />)}
                {extra > 0 && (
                  <p className="text-center text-[1vw] font-bold text-white/50 pt-[0.3vw]">+{extra} more</p>
                )}
                {list.length === 0 && (
                  <p className="m-auto text-[1vw] text-white/30 font-bold">
                    {s.key === "ready" ? "Nothing waiting" : s.key === "preparing" ? "Kitchen is free" : "No new orders"}
                  </p>
                )}
              </div>
            </section>
          );
        })}
        <InfoRail settings={settings} popular={popular} />
      </main>

      {/* Footer */}
      <footer className="h-[6vh] px-[2.5vw] flex items-center justify-center gap-[2vw] shrink-0 border-t border-white/10 text-[1vw] text-white/55 font-medium">
        <span>Your order code is on your receipt and your phone</span>
        <span className="text-white/25">•</span>
        <span>Need anything? Tap “Call waiter” on your order page</span>
      </footer>
    </div>
  );
}
