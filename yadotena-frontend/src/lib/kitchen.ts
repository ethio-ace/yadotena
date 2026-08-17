import { Order, OrderItem } from "@/types";

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

/**
 * Kitchen production thresholds (minutes since order creation).
 * Centralized so urgency logic, stats, and cards never drift apart.
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

export function isOrderOverdue(order: Order, now: number = Date.now()): boolean {
  if (order.status !== "PENDING" && order.status !== "PREPARING") return false;
  return (now - new Date(order.createdAt).getTime()) / 60000 >= KITCHEN_URGENT_MIN;
}

/** Formats elapsed seconds as MM:SS (e.g. 02:14, 07:32, 12:48). */
export function formatElapsed(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
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

export function orderTicketNumber(order: { id: string }): string {
  return order.id.slice(-6).toUpperCase();
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
