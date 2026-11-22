import { Order, OrderItem, OrderStatus, ItemKitchenStatus } from "@/types";

/**
 * Groups a ticket's items by kitchen round. Round 1 is the original order;
 * rounds 2+ are items a waiter appended later via add-items / auto-merge
 * (the backend stamps `round_number` on every order item). The KDS uses this
 * so an extended ticket shows exactly what's new instead of a mixed blob.
 */
export interface RoundGroup {
  round: number;
  items: OrderItem[];
}

export function groupItemsByRound(items?: OrderItem[]): RoundGroup[] {
  const map = new Map<number, OrderItem[]>();
  (items || []).forEach((item) => {
    const r = item.roundNumber || 1;
    if (!map.has(r)) map.set(r, []);
    map.get(r)!.push(item);
  });
  return Array.from(map.entries())
    .map(([round, grouped]) => ({ round, items: grouped }))
    .sort((a, b) => a.round - b.round);
}

export function hasAddedRounds(order: { items?: OrderItem[] }): boolean {
  return (order.items || []).some((i) => (i.roundNumber || 1) > 1);
}

/** Number of kitchen rounds a ticket carries (1 = single-round order). */
export function roundCount(order: { items?: OrderItem[] }): number {
  return new Set((order.items || []).map((i) => i.roundNumber || 1)).size;
}

/** Line total of a round (sum of item price × quantity, no tax/service). */
export function roundTotal(items: OrderItem[]): number {
  return items.reduce((sum, i) => sum + (i.price || 0) * (i.quantity || 0), 0);
}

/**
 * Human label for a round: "Round 2 · Added later" for extensions, plain
 * "Round 1" for the original ticket — used by waiter/chef ticket surfaces.
 */
export function roundLabel(round: number): string {
  return round > 1 ? `Round ${round} · Added later` : `Round ${round}`;
}

/** Effective kitchen status of an item. */
export function itemStatus(item: OrderItem): ItemKitchenStatus {
  return item.status || "PENDING";
}

/** Tailwind chip classes for a kitchen status (waiter surfaces). Shemma & Tibeb roles:
 *  DRAFT gold (act: approve) · READY green (act: serve) · PREPARING ergo blue (informational) ·
 *  CANCELLED berbere · waiting/served neutral. */
export function statusChipClass(status: string): string {
  switch (status) {
    case "DRAFT": return "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300";
    case "READY": return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400";
    case "PREPARING": return "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300";
    case "SERVED": return "bg-muted text-muted-foreground";
    case "CANCELLED": return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400";
    default: return "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400";
  }
}

/** Tailwind dot color for a kitchen status (used in round summary chips). */
export function statusDotClass(status: string): string {
  switch (status) {
    case "DRAFT": return "bg-orange-500";
    case "READY": return "bg-emerald-500";
    case "PREPARING": return "bg-blue-500";
    case "SERVED": return "bg-muted-foreground/50";
    case "CANCELLED": return "bg-red-500";
    default: return "bg-zinc-400";
  }
}

/** Human label for a kitchen status ("Waiting" for PENDING). */
export function statusLabel(status: string): string {
  if (status === "DRAFT") return "Needs approval";
  if (status === "PENDING") return "Waiting";
  if (status === "PREPARING") return "In Preparation";
  return status.charAt(0) + status.slice(1).toLowerCase();
}

/**
 * True once any item on the order carries an explicit kitchen status. Until
 * the backend exposes per-item status (migration 000016), orders fall back to
 * the legacy whole-order status so the UI never shows a live ticket as NEW.
 */
export function hasItemStatuses(items?: OrderItem[]): boolean {
  return (items || []).some((i) => !!i.status);
}

/**
 * Status of a whole round, derived from its items. READY wins over PREPARING
 * which wins over PENDING; SERVED only when every item in the round is served.
 * `fallback` is used only when the order predates per-item status (itemStatus
 * alone would always say PENDING for those rows, so explicit status wins).
 */
export function roundStatus(items: OrderItem[], fallback?: string): ItemKitchenStatus {
  const st = new Set(
    items.map((i) => (i.status ? i.status : (fallback as ItemKitchenStatus) || "PENDING"))
  );
  if (st.has("READY")) return "READY";
  if (st.has("PREPARING")) return "PREPARING";
  if (st.has("PENDING")) return "PENDING";
  // A guest round awaiting the waiter — never shown on the kitchen boards.
  if (st.has("DRAFT")) return "DRAFT";
  if (st.has("SERVED")) return "SERVED";
  return "CANCELLED";
}

/**
 * Derived kitchen status of the whole order from its items — mirrors the
 * backend's recompute rule. READY when anything is ready, PREPARING while
 * anything cooks, PENDING only when nothing has started, SERVED when done.
 * Appending a new round therefore never regresses started work.
 */
export function deriveOrderStatus(items?: OrderItem[], fallback?: string): OrderStatus {
  const active = (items || []).filter((i) => itemStatus(i) !== "CANCELLED");
  if (active.length === 0) return (fallback as OrderStatus) || "PENDING";
  const st = new Set(
    active.map((i) => (i.status ? i.status : (fallback as ItemKitchenStatus) || "PENDING"))
  );
  if (st.has("READY")) return "READY";
  if (st.has("PREPARING")) return "PREPARING";
  if (st.has("PENDING")) return "PENDING";
  if (st.has("DRAFT")) return "DRAFT";
  return "SERVED";
}

/** A kitchen card = one order + one round, with that round's derived state. */
export interface RoundCard {
  key: string;
  order: Order;
  round: number;
  status: ItemKitchenStatus;
  items: OrderItem[];
  extended: boolean; // round > 1 → "added later"
  startedAt?: string; // when this round entered PREPARING
  createdAt: string; // order creation, baseline for waiting timers
}

export function buildRoundCards(orders: Order[]): RoundCard[] {
  const cards: RoundCard[] = [];
  orders.forEach((order) => {
    if (order.status === "DRAFT" || order.status === "CANCELLED") return;
    // Pre-deploy / legacy orders have no per-item status yet — inherit the
    // whole-order kitchen status so they keep their true column placement.
    const fallback = hasItemStatuses(order.items) ? undefined : order.status;
    groupItemsByRound(order.items).forEach(({ round, items }) => {
      cards.push({
        key: `${order.id}:${round}`,
        order,
        round,
        status: roundStatus(items, fallback),
        items,
        extended: round > 1,
        startedAt: items.map((i) => i.startedAt).find(Boolean),
        createdAt: order.createdAt,
      });
    });
  });
  return cards;
}

/** Rounds that still have kitchen work (the ones the KDS queue shows). */
export function activeRoundCards(cards: RoundCard[]): RoundCard[] {
  return cards.filter((c) => ["PENDING", "PREPARING", "READY"].includes(c.status));
}

/** Items on an order that are still PENDING or PREPARING (not yet served). */
export function unresolvedItems(order: Order): OrderItem[] {
  return (order.items || []).filter((i) => ["PENDING", "PREPARING"].includes(itemStatus(i)));
}

/** Items on an order that are READY and waiting for a waiter to pick up. */
export function readyItems(order: Order): OrderItem[] {
  return (order.items || []).filter((i) => itemStatus(i) === "READY");
}

/**
 * Kitchen production thresholds (minutes since a round entered its current
 * stage). Centralized so urgency logic, stats, and cards never drift apart.
 * Tune these to the café's actual preparation times.
 */
export const KITCHEN_ATTENTION_MIN = 5;
export const KITCHEN_URGENT_MIN = 10;

export type KitchenUrgency = "NORMAL" | "ATTENTION" | "URGENT";

export function getUrgency(elapsedMinutes: number): KitchenUrgency {
  if (elapsedMinutes >= KITCHEN_URGENT_MIN) return "URGENT";
  if (elapsedMinutes >= KITCHEN_ATTENTION_MIN) return "ATTENTION";
  return "NORMAL";
}

/** Whether a round card has been waiting (or cooking) past the urgent mark. */
export function isCardOverdue(card: RoundCard, now: number = Date.now()): boolean {
  if (card.status !== "PENDING" && card.status !== "PREPARING") return false;
  const baseline = card.status === "PREPARING" ? card.startedAt || card.createdAt : card.createdAt;
  return (now - new Date(baseline).getTime()) / 60000 >= KITCHEN_URGENT_MIN;
}

/** Back-compat: an order is overdue when any of its rounds is. */
export function isOrderOverdue(order: Order, now: number = Date.now()): boolean {
  return buildRoundCards([order]).some((c) => isCardOverdue(c, now));
}

/**
 * Formats elapsed seconds for kitchen timers. Sub-hour waits read as a stopwatch
 * (02:14, 07:32); beyond that the clock becomes meaningless at MM:SS scale, so
 * long waits switch to compact human units (1h 05m, 10d 13h) that stay legible
 * even when a ticket has been sitting for days.
 */
export function formatElapsed(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  if (mins < 60) return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ${String(mins % 60).padStart(2, "0")}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

/**
 * Human destination label for a kitchen ticket. Prefers the real table name
 * (e.g. "Table 04 (VIP Lounge)") via `tableLabels` when available, falling
 * back to a cleaned code so staff never see raw database ids.
 */
export function orderDestination(order: Order, tableLabels?: Record<string, string>): string {
  if (order.tableId) {
    const label = tableLabels?.[order.tableId];
    return label ? label.toUpperCase() : `TABLE ${order.tableId.replace(/^t/i, "")}`;
  }
  if (order.type === "DELIVERY") return "DELIVERY";
  return "TAKEAWAY";
}

/**
 * What staff call a ticket: today's short number ("27" → shown as "#27").
 * Older tickets without one fall back to the last 6 characters of the id.
 * Customer-facing screens keep the 6-char code — guests track orders by it.
 */
export function orderTicketNumber(order: { id: string; dailyNumber?: number | null }): string {
  return order.dailyNumber ? String(order.dailyNumber) : order.id.slice(-6).toUpperCase();
}

/**
 * Item addon names, tolerant of both string[] (ids) and object[] shapes.
 * String ids are resolved through `addonMap` (id → name) when available so
 * kitchen tickets never show raw database ids.
 */
export function addonNames(
  addons?: Array<{ id: string; name: string; price: number }> | string[],
  addonMap?: Record<string, string>
): string[] {
  if (!addons) return [];
  return addons.map((a) => (typeof a === "string" ? addonMap?.[a] || a : a.name));
}

/**
 * Per-status item quantities for one order — the waiter's at-a-glance
 * tracking line ("2 cooking · 1 ready"). Falls back to the whole-order status
 * for legacy orders without per-item status, same as `roundStatus`.
 */
export interface OrderProgress {
  /** Guest-placed items the waiter has not approved yet. */
  approval: number;
  waiting: number;
  cooking: number;
  ready: number;
  served: number;
}

export function orderProgress(order: Order): OrderProgress {
  const legacy = hasItemStatuses(order.items) ? undefined : order.status;
  const p: OrderProgress = { approval: 0, waiting: 0, cooking: 0, ready: 0, served: 0 };
  for (const i of order.items || []) {
    const s = i.status || (legacy as ItemKitchenStatus) || "PENDING";
    const q = i.quantity || 1;
    if (s === "DRAFT") p.approval += q;
    else if (s === "PENDING") p.waiting += q;
    else if (s === "PREPARING") p.cooking += q;
    else if (s === "READY") p.ready += q;
    else if (s === "SERVED" || s === ("COMPLETED" as string)) p.served += q;
  }
  return p;
}

/** Compact wait label for waiter surfaces: "just now", "12m", "1h 05m", "3d 4h". */
export function formatWait(sinceIso: string | undefined, now: number = Date.now()): string {
  if (!sinceIso) return "";
  const m = Math.max(0, Math.floor((now - new Date(sinceIso).getTime()) / 60000));
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${String(m % 60).padStart(2, "0")}m`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}

/** Rounds on an order that hold guest items waiting for a waiter's approval. */
export function draftRounds(order: Order): number[] {
  const rounds = new Set<number>();
  for (const i of order.items || []) if (i.status === "DRAFT") rounds.add(i.roundNumber || 1);
  return [...rounds].sort((a, b) => a - b);
}
