import { MenuItem, Order, PaymentRecord } from "@/types";
import { isRetailProduct } from "./orderUtils";

/**
 * Owner business metrics, computed from one shared view of server state.
 * Every number has a real source — nothing is invented or padded:
 *
 * Every figure is derived from the range-filtered order list using the exact
 * `createdAt` instants bucketed in local (café) time. This is deliberate:
 * the backend's `/staff/analytics` aggregation date-casts in the database's
 * UTC session timezone, which would misclassify early-morning Addis orders
 * into the wrong day. Local-instant bucketing keeps the whole snapshot
 * internally consistent against any backend. (The aggregation endpoint stays
 * for Phase 2's heavier Sales surfaces.)
 *
 * - Revenue / paid orders / avg ticket: sum of PAID order totals in range.
 * - Daily trend: PAID totals grouped by local day, zero-filled over the range.
 * - Top products: item quantities & snapshot prices aggregated over PAID
 *   orders. No profitability claim — no cost data exists (spec §39).
 * - Payment mix: method of each PAID payment record, as a share of paid
 *   orders with a recorded settlement.
 * - Expenses are filtered by their recorded `date` within the same range.
 * - Attention items (unpaid orders, out-of-stock products, pending
 *   verification) come from real order / menu / payment records.
 */

export type OwnerRange = "today" | "yesterday" | "week" | "month" | "quarter" | "year";

export interface DateRange {
  /** YYYY-MM-DD, inclusive lower bound (server date range). */
  from: string;
  /** YYYY-MM-DD, inclusive upper bound. */
  to: string;
  /** ISO instant cutoff for client-side order filtering (local midnight). */
  fromInstant: string;
  /** Human label, e.g. "This Month". */
  label: string;
  /** e.g. "August 1 – August 16, 2026" for display. */
  display: string;
}

function fmtDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function localMidnightISO(date: Date): string {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString();
}

function displayRange(from: string, to: string): string {
  const opts: Intl.DateTimeFormatOptions = { month: "long", day: "numeric", year: "numeric" };
  const fromDate = new Date(`${from}T00:00:00`);
  const toDate = new Date(`${to}T00:00:00`);
  if (from === to) return fromDate.toLocaleDateString("en-US", opts);
  return `${fromDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${toDate.toLocaleDateString("en-US", opts)}`;
}

export function getDateRange(range: OwnerRange, now: Date = new Date()): DateRange {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (range) {
    case "today":
      return {
        from: fmtDate(today),
        to: fmtDate(today),
        fromInstant: localMidnightISO(today),
        label: "Today",
        display: displayRange(fmtDate(today), fmtDate(today)),
      };
    case "yesterday": {
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      return {
        from: fmtDate(yesterday),
        to: fmtDate(yesterday),
        fromInstant: localMidnightISO(yesterday),
        label: "Yesterday",
        display: displayRange(fmtDate(yesterday), fmtDate(yesterday)),
      };
    }
    case "week": {
      // Monday of the current week.
      const monday = new Date(today);
      monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
      return {
        from: fmtDate(monday),
        to: fmtDate(today),
        fromInstant: localMidnightISO(monday),
        label: "This Week",
        display: displayRange(fmtDate(monday), fmtDate(today)),
      };
    }
    case "month": {
      const first = new Date(today.getFullYear(), today.getMonth(), 1);
      return {
        from: fmtDate(first),
        to: fmtDate(today),
        fromInstant: localMidnightISO(first),
        label: "This Month",
        display: displayRange(fmtDate(first), fmtDate(today)),
      };
    }
    case "quarter": {
      // Rolling 3 calendar months: first day of the month two months back.
      const first = new Date(today.getFullYear(), today.getMonth() - 2, 1);
      return {
        from: fmtDate(first),
        to: fmtDate(today),
        fromInstant: localMidnightISO(first),
        label: "3 Months",
        display: displayRange(fmtDate(first), fmtDate(today)),
      };
    }
    case "year": {
      const first = new Date(today.getFullYear(), 0, 1);
      return {
        from: fmtDate(first),
        to: fmtDate(today),
        fromInstant: localMidnightISO(first),
        label: "This Year",
        display: displayRange(fmtDate(first), fmtDate(today)),
      };
    }
  }
}

/** Shape returned by `GET /staff/analytics?from&to` (server aggregation). */
export interface OwnerAnalytics {
  from: string;
  to: string;
  paid_order_count: number;
  revenue_etb: number;
  by_order_type?: Record<string, number>;
  byOrderType?: Record<string, number>;
  top_items: { name: string; qty: number; revenue_etb: number }[];
  payment_mix: Record<string, number>;
  daily: { date: string; dineIn: number; takeaway: number; delivery: number; revenue: number }[];
}

export interface PaymentMixEntry {
  /** Raw method string as recorded by the backend. */
  method: string;
  /** Human label for known aliases (Cbe_birr → CBE Birr), raw otherwise. */
  label: string;
  /** Count of PAID orders paid via this method. */
  count: number;
  /** Share of paid orders (0–100). */
  percent: number;
}

/** Normalize common payment-method aliases for display; unknown → title case. */
export function formatPaymentMethod(method: string): string {
  const key = method.trim().toLowerCase().replace(/[\s_-]+/g, " ");
  const known: Record<string, string> = {
    cash: "Cash",
    cbe: "CBE Birr",
    "cbe birr": "CBE Birr",
    cbebirr: "CBE Birr",
    telebirr: "Telebirr",
    boa: "Bank of Abyssinia",
    "bank of abyssinia": "Bank of Abyssinia",
    ebirr: "eBirr",
    "e birr": "eBirr",
    "bank transfer": "Bank Transfer",
  };
  if (known[key]) return known[key];
  return key
    .split(" ")
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");
}

export interface OwnerMetrics {
  range: DateRange;
  /** Revenue from PAID orders in the range (server-computed). */
  revenue: number;
  /** Number of PAID orders in the range (server-computed). */
  paidOrders: number;
  /** Revenue / paid orders; 0 when there are no paid orders. */
  averageTicket: number;
  /** Recorded expenses whose `date` falls in the range. */
  expenses: number;
  /**
   * Revenue minus recorded expenses. Deliberately NOT called profit —
   * the system does not track cost of goods, so this is not a real profit
   * figure (spec §39).
   */
  revenueMinusExpenses: number;
  /** Orders in the range that are still unpaid (not PAID, not CANCELLED). */
  unpaidOrders: number;
  /** Menu items currently marked unavailable. */
  outOfStock: number;
  /** Digital payments awaiting manager verification. */
  pendingVerification: number;
  /** Anything the owner should look at right now. */
  attentionCount: number;
  /** Top sellers by units (server-computed, range-scoped). */
  topProducts: { name: string; qty: number; revenue: number }[];
  /** Payment method distribution over PAID orders in the range. */
  paymentMix: PaymentMixEntry[];
  /** Zero-filled daily revenue series (server-computed). */
  daily: { date: string; revenue: number }[];
}

export function computeOwnerMetrics(opts: {
  range: DateRange;
  expenses: { date: string; amount: number }[];
  orders: Order[];
  menuItems: MenuItem[];
  payments: PaymentRecord[];
}): OwnerMetrics {
  const { range, expenses, orders, menuItems, payments } = opts;

  const rangeOrders = orders.filter(
    (o) => o.createdAt && new Date(o.createdAt) >= new Date(range.fromInstant)
  );

  // Revenue / paid orders: PAID order totals within the range. (The backend
  // `since` filter trims payloads once deployed; older backends ignore it, so
  // the client instant filter below is the source of truth.)
  const paidRangeOrders = rangeOrders.filter((o) => o.paymentStatus === "PAID");
  const revenue = paidRangeOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const paidOrders = paidRangeOrders.length;
  const averageTicket = paidOrders > 0 ? revenue / paidOrders : 0;

  const expensesInRange = expenses
    .filter((e) => e.date >= range.from && e.date <= range.to)
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  const unpaidOrders = rangeOrders.filter(
    (o) => o.paymentStatus !== "PAID" && o.status !== "CANCELLED"
  ).length;

  const outOfStock = menuItems.filter((i) => i.available === false).length;
  const pendingVerification = payments.filter((p) => p.status === "PENDING_VERIFICATION").length;

  // Top products: aggregate item snapshots across PAID orders in range.
  const productMap = new Map<string, { qty: number; revenue: number }>();
  for (const o of paidRangeOrders) {
    for (const item of o.items ?? []) {
      const cur = productMap.get(item.name) ?? { qty: 0, revenue: 0 };
      cur.qty += item.quantity || 0;
      cur.revenue += (item.price || 0) * (item.quantity || 0);
      productMap.set(item.name, cur);
    }
  }
  const topProducts = [...productMap.entries()]
    .map(([name, v]) => ({ name, qty: v.qty, revenue: v.revenue }))
    .sort((a, b) => b.qty - a.qty || b.revenue - a.revenue);

  // Payment mix: the method of each PAID payment record on PAID orders. Only
  // orders with a recorded settlement count — nothing is assumed. Raw method
  // strings vary per record ("cbe_birr", "cbe", "CBE Birr"), so entries are
  // merged by their normalized display label first — one chip per method.
  const mixMap = new Map<string, number>();
  for (const o of paidRangeOrders) {
    const paidPayment = (o.payments ?? []).find((p) => p.status === "PAID");
    if (!paidPayment?.method) continue;
    const label = formatPaymentMethod(paidPayment.method);
    mixMap.set(label, (mixMap.get(label) ?? 0) + 1);
  }
  const mixTotal = [...mixMap.values()].reduce((a, b) => a + b, 0);
  const paymentMix: PaymentMixEntry[] = [...mixMap.entries()]
    .map(([label, count]) => ({
      method: label,
      label,
      count,
      percent: mixTotal > 0 ? Math.round((count / mixTotal) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // Daily trend: PAID totals bucketed by local day, zero-filled over the
  // range so quiet days still render honest bars.
  const dailyByDay = new Map<string, number>();
  for (const o of paidRangeOrders) {
    const key = fmtDate(new Date(o.createdAt));
    dailyByDay.set(key, (dailyByDay.get(key) ?? 0) + (o.total || 0));
  }
  const daily: { date: string; revenue: number }[] = [];
  const cursor = new Date(`${range.from}T00:00:00`);
  const end = new Date(`${range.to}T00:00:00`);
  // Cap the zero-filled series — multi-year spans are bucketed on demand by
  // the drill-down trend instead of materializing thousands of day entries.
  let guard = 0;
  while (cursor <= end && guard < 400) {
    const key = fmtDate(cursor);
    daily.push({ date: key, revenue: dailyByDay.get(key) ?? 0 });
    cursor.setDate(cursor.getDate() + 1);
    guard++;
  }

  return {
    range,
    revenue,
    paidOrders,
    averageTicket,
    expenses: expensesInRange,
    revenueMinusExpenses: revenue - expensesInRange,
    unpaidOrders,
    outOfStock,
    pendingVerification,
    attentionCount: unpaidOrders + outOfStock + pendingVerification,
    topProducts,
    paymentMix,
    daily,
  };
}

export interface ProductPerformanceRow {
  /** Menu item id (for stable identity), or the snapshot name when unmatched. */
  menuItemId: string;
  name: string;
  category: string;
  /** True for over-the-counter packaged goods (menu vs retail split). */
  isRetail: boolean;
  units: number;
  revenue: number;
  /** Number of PAID orders that contained this product. */
  orderCount: number;
}

export interface CategoryPerformance {
  category: string;
  units: number;
  revenue: number;
}

export interface SalesBreakdown {
  /** Revenue split between kitchen-prepared menu items and packaged retail. */
  menuVsRetail: { menu: number; retail: number };
  /** Product-level performance, ranked by units sold. */
  products: ProductPerformanceRow[];
  /** Category-level performance, ranked by revenue. */
  categories: CategoryPerformance[];
  /** Paid order counts by order type (DINE_IN / TAKEAWAY / DELIVERY). */
  orderTypeMix: { type: string; count: number; revenue: number }[];
}

/**
 * Sales drill-down for the Owner Sales page — all derived from the same
 * range-filtered PAID orders used by the overview snapshot, joined against the
 * live menu to recover category and retail channel. Nothing is invented:
 * units/revenue come from order item snapshots; categories come from the
 * current menu (items no longer on the menu fall into "Other").
 */
export function computeSalesBreakdown(opts: {
  range: DateRange;
  orders: Order[];
  menuItems: MenuItem[];
}): SalesBreakdown {
  const { range, orders, menuItems } = opts;
  const byId = new Map(menuItems.map((m) => [m.id, m]));

  const rangeOrders = orders.filter(
    (o) => o.createdAt && new Date(o.createdAt) >= new Date(range.fromInstant)
  );
  const paidRangeOrders = rangeOrders.filter((o) => o.paymentStatus === "PAID");

  const productMap = new Map<
    string,
    { menuItemId: string; name: string; category: string; isRetail: boolean; units: number; revenue: number; orders: Set<string> }
  >();

  for (const o of paidRangeOrders) {
    for (const item of o.items ?? []) {
      const menuItem = item.menuItemId ? byId.get(item.menuItemId) : undefined;
      const key = menuItem?.id || item.name;
      // When the item no longer exists on the menu, infer the retail channel
      // from the snapshot's id/name (the shop heuristic only needs those).
      const retailHeuristic = { id: item.menuItemId || "", category: item.name } as MenuItem;
      const cur =
        productMap.get(key) ?? {
          menuItemId: menuItem?.id ?? item.menuItemId ?? item.name,
          name: item.name,
          category: menuItem?.category || "Other",
          isRetail: menuItem ? isRetailProduct(menuItem) : isRetailProduct(retailHeuristic),
          units: 0,
          revenue: 0,
          orders: new Set<string>(),
        };
      cur.units += item.quantity || 0;
      cur.revenue += (item.price || 0) * (item.quantity || 0);
      cur.orders.add(o.id);
      productMap.set(key, cur);
    }
  }

  const products: ProductPerformanceRow[] = [...productMap.values()]
    .map((p) => ({ menuItemId: p.menuItemId, name: p.name, category: p.category, isRetail: p.isRetail, units: p.units, revenue: p.revenue, orderCount: p.orders.size }))
    .sort((a, b) => b.units - a.units || b.revenue - a.revenue);

  const catMap = new Map<string, { units: number; revenue: number }>();
  for (const p of products) {
    const cur = catMap.get(p.category) ?? { units: 0, revenue: 0 };
    cur.units += p.units;
    cur.revenue += p.revenue;
    catMap.set(p.category, cur);
  }
  const categories: CategoryPerformance[] = [...catMap.entries()]
    .map(([category, v]) => ({ category, units: v.units, revenue: v.revenue }))
    .sort((a, b) => b.revenue - a.revenue);

  const menuVsRetail = products.reduce(
    (acc, p) => {
      if (p.isRetail) acc.retail += p.revenue;
      else acc.menu += p.revenue;
      return acc;
    },
    { menu: 0, retail: 0 }
  );

  const typeMap = new Map<string, { count: number; revenue: number }>();
  for (const o of paidRangeOrders) {
    const key = o.type || "OTHER";
    const cur = typeMap.get(key) ?? { count: 0, revenue: 0 };
    cur.count += 1;
    cur.revenue += o.total || 0;
    typeMap.set(key, cur);
  }
  const orderTypeMix = [...typeMap.entries()]
    .map(([type, v]) => ({ type, count: v.count, revenue: v.revenue }))
    .sort((a, b) => b.revenue - a.revenue);

  return { menuVsRetail, products, categories, orderTypeMix };
}
