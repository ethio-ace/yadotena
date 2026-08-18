/**
 * High-level, human-readable summaries of activity-log state changes.
 *
 * The raw snapshots stored by the activity logger are full entity objects,
 * which are noisy to read field-by-field (unchanged ids, idempotency keys,
 * JSON blobs). These helpers turn a before/after pair into a short list of
 * what actually mattered — "Added 1× Macchiato", "Order status: PENDING →
 * COMPLETED" — and the viewer only ever shows *changed* fields.
 */

import { formatETB } from "@/lib/currency";

export type ChangeKind = "added" | "removed" | "status" | "changed";

export interface ChangeSummary {
  kind: ChangeKind;
  /** Short human sentence, e.g. `Added 1× Artisanal Spiced Ergo`. */
  text: string;
  /** Optional secondary line (small print, e.g. the price delta). */
  detail?: string;
}

/* ── Small helpers ──────────────────────────────────────────────────── */

function parseState(value: unknown): Record<string, unknown> {
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function valuesEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function toArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
}

/** Pretty human label for status-like tokens (PENDING → Pending, DINE_IN → Dine-in). */
function prettyToken(value: unknown): string {
  if (value === undefined || value === null) return "—";
  const raw = String(value);
  const overrides: Record<string, string> = {
    PENDING: "Pending",
    CONFIRMED: "Confirmed",
    PREPARING: "Preparing",
    READY: "Ready",
    SERVED: "Served",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
    PAID: "Paid",
    UNPAID: "Unpaid",
    PARTIAL: "Partially paid",
    REFUNDED: "Refunded",
    DINE_IN: "Dine-in",
    TAKEOUT: "Takeout",
    DELIVERY: "Delivery",
    ACTIVE: "Active",
    INACTIVE: "Inactive",
  };
  if (overrides[raw]) return overrides[raw];
  return raw
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function displayValue(value: unknown): string {
  if (value === undefined || value === null) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function addonNames(value: unknown): string {
  return toArray(value)
    .map((a) => {
      const name = (a as { name?: unknown }).name ?? a;
      return String(name ?? "").trim();
    })
    .filter(Boolean)
    .join(", ");
}

function itemQty(item: Record<string, unknown>): number {
  const q = Number(item.quantity);
  return Number.isFinite(q) && q > 0 ? q : 1;
}

const ORDER_FIELDS: { key: string; label: string; money?: boolean; token?: boolean }[] = [
  { key: "status", label: "Order status", token: true },
  { key: "paymentStatus", label: "Payment status", token: true },
  { key: "type", label: "Order type", token: true },
  { key: "total", label: "Total", money: true },
  { key: "subtotal", label: "Subtotal", money: true },
  { key: "tax", label: "Tax", money: true },
  { key: "serviceCharge", label: "Service charge", money: true },
  { key: "deliveryFee", label: "Delivery fee", money: true },
  { key: "discount", label: "Discount", money: true },
  { key: "tableId", label: "Table" },
  { key: "customerName", label: "Customer" },
];

function fmtValue(value: unknown, opts: { money?: boolean; token?: boolean }): string {
  if (opts.money) return formatETB(Number(value ?? 0));
  if (opts.token) return prettyToken(value);
  return displayValue(value);
}

/** Item-level diff: added/removed dishes, quantity, per-item status, add-ons, notes. */
function diffOrderItems(prevItems: Record<string, unknown>[], nextItems: Record<string, unknown>[]): ChangeSummary[] {
  const out: ChangeSummary[] = [];
  const prevById = new Map(prevItems.map((i) => [String(i.id), i]));
  const nextById = new Map(nextItems.map((i) => [String(i.id), i]));

  for (const item of nextItems) {
    const id = String(item.id);
    const prevItem = prevById.get(id);
    const name = String(item.name ?? "item");

    if (!prevItem) {
      out.push({ kind: "added", text: `Added ${itemQty(item)}× ${name}` });
      continue;
    }

    const changes: string[] = [];
    if (item.quantity !== prevItem.quantity) {
      changes.push(`quantity ${itemQty(prevItem)} → ${itemQty(item)}`);
    }
    if (item.status && prevItem.status && item.status !== prevItem.status) {
      changes.push(`status ${prettyToken(prevItem.status)} → ${prettyToken(item.status)}`);
    }
    const prevAddons = addonNames(prevItem.selectedAddons);
    const nextAddons = addonNames(item.selectedAddons);
    if (prevAddons !== nextAddons) {
      changes.push(`add-ons ${prevAddons || "none"} → ${nextAddons || "none"}`);
    }
    if (item.specialInstructions !== prevItem.specialInstructions) {
      changes.push(
        `note ${displayValue(prevItem.specialInstructions || "—")} → ${displayValue(item.specialInstructions || "—")}`
      );
    }
    if (changes.length) {
      out.push({ kind: "changed", text: `${name}: ${changes.join(" · ")}` });
    }
  }

  for (const item of prevItems) {
    if (!nextById.has(String(item.id))) {
      out.push({ kind: "removed", text: `Removed ${itemQty(item)}× ${String(item.name ?? "item")}` });
    }
  }

  return out;
}

function orderSummary(prev: Record<string, unknown>, next: Record<string, unknown>): ChangeSummary[] {
  const out: ChangeSummary[] = [];

  const prevItems = toArray(prev.items);
  const nextItems = toArray(next.items);
  if (prevItems.length || nextItems.length) {
    out.push(...diffOrderItems(prevItems, nextItems));
  }

  // New payment records added to the order.
  const prevPayments = toArray(prev.payments);
  const nextPayments = toArray(next.payments);
  if (nextPayments.length > prevPayments.length) {
    const added = nextPayments.slice(prevPayments.length);
    for (const p of added) {
      const amount = formatETB(Number(p.amount ?? 0));
      const method = p.method ? ` via ${prettyToken(p.method)}` : "";
      out.push({ kind: "added", text: `Payment of ${amount} recorded${method}` });
    }
  }

  for (const { key, label, money, token } of ORDER_FIELDS) {
    if (valuesEqual(prev[key], next[key])) continue; // only changed fields
    out.push({
      kind: "changed",
      text: `${label}: ${fmtValue(prev[key], { money, token })} → ${fmtValue(next[key], { money, token })}`,
    });
  }

  return out;
}

const PRODUCT_FIELDS: { key: string; label: string; money?: boolean; token?: boolean; summarize?: boolean }[] = [
  { key: "name", label: "Name" },
  { key: "price", label: "Price", money: true },
  { key: "category", label: "Category" },
  { key: "categoryId", label: "Category" },
  { key: "available", label: "Availability", token: true },
  { key: "stock", label: "Stock" },
  { key: "isActive", label: "Status", token: true },
  { key: "preparationTime", label: "Prep time" },
  { key: "dietaryTags", label: "Dietary tags" },
  { key: "description", label: "Description", summarize: true },
  { key: "image", label: "Photo", summarize: true },
];

function productSummary(prev: Record<string, unknown>, next: Record<string, unknown>): ChangeSummary[] {
  const out: ChangeSummary[] = [];
  for (const { key, label, money, token, summarize } of PRODUCT_FIELDS) {
    if (valuesEqual(prev[key], next[key])) continue;
    if (summarize) {
      out.push({ kind: "changed", text: `${label} updated` });
    } else {
      out.push({
        kind: "changed",
        text: `${label}: ${fmtValue(prev[key], { money, token })} → ${fmtValue(next[key], { money, token })}`,
      });
    }
  }
  return out;
}

const TABLE_FIELDS: { key: string; label: string; token?: boolean }[] = [
  { key: "name", label: "Name" },
  { key: "capacity", label: "Capacity" },
  { key: "status", label: "Status", token: true },
  { key: "location", label: "Location" },
];

function tableSummary(prev: Record<string, unknown>, next: Record<string, unknown>): ChangeSummary[] {
  const out: ChangeSummary[] = [];
  for (const { key, label, token } of TABLE_FIELDS) {
    if (valuesEqual(prev[key], next[key])) continue;
    out.push({
      kind: "changed",
      text: `${label}: ${fmtValue(prev[key], { token })} → ${fmtValue(next[key], { token })}`,
    });
  }
  return out;
}

const PAYMENT_FIELDS: { key: string; label: string; money?: boolean; token?: boolean }[] = [
  { key: "amount", label: "Amount", money: true },
  { key: "status", label: "Status", token: true },
  { key: "method", label: "Method", token: true },
  { key: "reference", label: "Reference" },
];

function paymentSummary(prev: Record<string, unknown>, next: Record<string, unknown>): ChangeSummary[] {
  const out: ChangeSummary[] = [];
  for (const { key, label, money, token } of PAYMENT_FIELDS) {
    if (valuesEqual(prev[key], next[key])) continue;
    out.push({
      kind: "changed",
      text: `${label}: ${fmtValue(prev[key], { money, token })} → ${fmtValue(next[key], { money, token })}`,
    });
  }
  return out;
}

/** Fields that are internal bookkeeping and never worth showing. */
const IGNORED_KEYS = new Set([
  "updatedAt",
  "createdAt",
  "idempotencyKey",
  "__v",
  "version",
  "orderNumber",
  "customerId",
]);

const GENERIC_LABELS: Record<string, string> = {
  total: "Total",
  price: "Price",
  status: "Status",
  name: "Name",
  role: "Role",
  capacity: "Capacity",
  amount: "Amount",
  quantity: "Quantity",
};

function genericSummary(prev: Record<string, unknown>, next: Record<string, unknown>): ChangeSummary[] {
  const out: ChangeSummary[] = [];
  const keys = Array.from(new Set([...Object.keys(prev), ...Object.keys(next)]));
  for (const key of keys) {
    if (IGNORED_KEYS.has(key)) continue;
    if (valuesEqual(prev[key], next[key])) continue;
    const label = GENERIC_LABELS[key] ?? key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/_/g, " ");
    const labelCased = label.charAt(0).toUpperCase() + label.slice(1);
    const prevV = prev[key];
    const nextV = next[key];
    if (typeof prevV === "object" || typeof nextV === "object") {
      out.push({ kind: "changed", text: `${labelCased} updated`, detail: "See technical diff for details" });
    } else {
      out.push({ kind: "changed", text: `${labelCased}: ${displayValue(prevV)} → ${displayValue(nextV)}` });
    }
  }
  return out;
}

/**
 * Turn a before/after snapshot pair into a short, human-readable list of
 * changes. Only fields that actually changed are reported — unchanged ids,
 * timestamps, and bookkeeping keys are never shown.
 */
export function summarizeChanges(
  entityType: string,
  prevState: unknown,
  nextState: unknown
): ChangeSummary[] {
  const prev = parseState(prevState);
  const next = parseState(nextState);

  switch (String(entityType || "").toUpperCase()) {
    case "ORDER":
      return orderSummary(prev, next);
    case "MENU_ITEM":
    case "ADDON":
      return productSummary(prev, next);
    case "TABLE":
      return tableSummary(prev, next);
    case "PAYMENT":
      return paymentSummary(prev, next);
    default:
      return genericSummary(prev, next);
  }
}

/**
 * Raw count of snapshot attributes that differ between before/after. Used by
 * the "changes only" filter and row badges — it counts actual field diffs,
 * not the (possibly longer) item-level summary list.
 */
export function countChangedFields(prevState: unknown, nextState: unknown): number {
  const prev = parseState(prevState);
  const next = parseState(nextState);
  const keys = Array.from(new Set([...Object.keys(prev), ...Object.keys(next)])).filter(
    (k) => k !== "updatedAt" && k !== "createdAt"
  );
  return keys.filter((k) => !valuesEqual(prev[k], next[k])).length;
}
