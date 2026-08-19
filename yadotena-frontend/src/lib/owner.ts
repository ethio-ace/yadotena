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

export type OwnerRange = "today" | "yesterday" | "week" | "month" | "quarter" | "year" | "custom";

export interface DateRange {
  /** YYYY-MM-DD, inclusive lower bound (server date range). */
  from: string;
  /** YYYY-MM-DD, inclusive upper bound. */
  to: string;
  /** ISO instant cutoff for client-side order filtering (local midnight). */
  fromInstant: string;
  /** ISO instant upper bound for client-side order filtering (local end of day). */
  toInstant: string;
  /** Human label, e.g. "This Month". */
  label: string;
  /** e.g. "August 1 – August 16, 2026" for display. */
  display: string;
}

export function parseDate(val?: string | Date | number): Date {
  if (!val) return new Date(0);
  if (val instanceof Date) return val;
  if (typeof val === "number") return new Date(val);
  const normalized = String(val).trim().replace(" ", "T");
  const d = new Date(normalized);
  return isNaN(d.getTime()) ? new Date(0) : d;
}

function fmtDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function localMidnightISO(date: Date): string {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString();
}

function localEndOfDayISO(date: Date): string {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999).toISOString();
}

function displayRange(from: string, to: string): string {
  const opts: Intl.DateTimeFormatOptions = { month: "long", day: "numeric", year: "numeric" };
  const fromDate = new Date(`${from}T00:00:00`);
  const toDate = new Date(`${to}T00:00:00`);
  if (from === to) return fromDate.toLocaleDateString("en-US", opts);
  return `${fromDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${toDate.toLocaleDateString("en-US", opts)}`;
}

export interface CustomRange {
  /** YYYY-MM-DD inclusive lower bound. */
  from: string;
  /** YYYY-MM-DD inclusive upper bound. */
  to: string;
}

export function getDateRange(
  range: OwnerRange,
  now: Date = new Date(),
  custom?: CustomRange
): DateRange {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (range === "custom") {
    const from = custom?.from ?? fmtDate(today);
    const to = custom?.to && custom.to >= from ? custom.to : from;
    return {
      from,
      to,
      fromInstant: localMidnightISO(new Date(`${from}T00:00:00`)),
      toInstant: localEndOfDayISO(new Date(`${to}T00:00:00`)),
      label: "Custom Range",
      display: displayRange(from, to),
    };
  }

  switch (range) {
    case "today":
      return {
        from: fmtDate(today),
        to: fmtDate(today),
        fromInstant: localMidnightISO(today),
        toInstant: localEndOfDayISO(today),
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
        toInstant: localEndOfDayISO(yesterday),
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
        toInstant: localEndOfDayISO(today),
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
        toInstant: localEndOfDayISO(today),
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
        toInstant: localEndOfDayISO(today),
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
        toInstant: localEndOfDayISO(today),
        label: "This Year",
        display: displayRange(fmtDate(first), fmtDate(today)),
      };
    }
  }
}

/**
 * The equivalent period right before `range`, used for "vs last period"
 * comparisons. Mirrors each range key's natural predecessor:
 * today → yesterday, this week → previous week, this month → last month,
 * 3 months → previous 3 months, year → last year. Custom ranges shift back
 * by exactly their own length so the comparison is apples-to-apples.
 */
export function getPreviousDateRange(range: DateRange, rangeKey: OwnerRange): DateRange {
  switch (rangeKey) {
    case "yesterday": {
      const d = new Date(`${range.from}T00:00:00`);
      d.setDate(d.getDate() - 1);
      return {
        from: fmtDate(d),
        to: fmtDate(d),
        fromInstant: localMidnightISO(d),
        toInstant: localEndOfDayISO(d),
        label: "Day Before",
        display: displayRange(fmtDate(d), fmtDate(d)),
      };
    }
    case "week": {
      const monday = new Date(`${range.from}T00:00:00`);
      monday.setDate(monday.getDate() - 7);
      const sunday = new Date(`${range.to}T00:00:00`);
      sunday.setDate(sunday.getDate() - 7);
      return {
        from: fmtDate(monday),
        to: fmtDate(sunday),
        fromInstant: localMidnightISO(monday),
        toInstant: localEndOfDayISO(sunday),
        label: "Last Week",
        display: displayRange(fmtDate(monday), fmtDate(sunday)),
      };
    }
    case "month": {
      const fromDate = new Date(`${range.from}T00:00:00`);
      const prev = new Date(fromDate.getFullYear(), fromDate.getMonth() - 1, 1);
      const prevEnd = new Date(prev.getFullYear(), prev.getMonth() + 1, 0);
      return {
        from: fmtDate(prev),
        to: fmtDate(prevEnd),
        fromInstant: localMidnightISO(prev),
        toInstant: localEndOfDayISO(prevEnd),
        label: "Last Month",
        display: displayRange(fmtDate(prev), fmtDate(prevEnd)),
      };
    }
    case "quarter": {
      const fromDate = new Date(`${range.from}T00:00:00`);
      const prevStart = new Date(fromDate.getFullYear(), fromDate.getMonth() - 3, 1);
      const prevEnd = new Date(fromDate.getFullYear(), fromDate.getMonth() - 1, 0);
      return {
        from: fmtDate(prevStart),
        to: fmtDate(prevEnd),
        fromInstant: localMidnightISO(prevStart),
        toInstant: localEndOfDayISO(prevEnd),
        label: "Previous 3 Months",
        display: displayRange(fmtDate(prevStart), fmtDate(prevEnd)),
      };
    }
    case "year": {
      const fromDate = new Date(`${range.from}T00:00:00`);
      return {
        from: fmtDate(new Date(fromDate.getFullYear() - 1, 0, 1)),
        to: fmtDate(new Date(fromDate.getFullYear() - 1, 11, 31)),
        fromInstant: localMidnightISO(new Date(fromDate.getFullYear() - 1, 0, 1)),
        toInstant: localEndOfDayISO(new Date(fromDate.getFullYear() - 1, 11, 31)),
        label: "Last Year",
        display: displayRange(
          fmtDate(new Date(fromDate.getFullYear() - 1, 0, 1)),
          fmtDate(new Date(fromDate.getFullYear() - 1, 11, 31))
        ),
      };
    }
    case "custom": {
      const fromDate = new Date(`${range.from}T00:00:00`);
      const toDate = new Date(`${range.to}T00:00:00`);
      const days = Math.round((toDate.getTime() - fromDate.getTime()) / 86_400_000) + 1;
      const prevTo = new Date(fromDate);
      prevTo.setDate(prevTo.getDate() - 1);
      const prevFrom = new Date(prevTo);
      prevFrom.setDate(prevFrom.getDate() - (days - 1));
      return {
        from: fmtDate(prevFrom),
        to: fmtDate(prevTo),
        fromInstant: localMidnightISO(prevFrom),
        toInstant: localEndOfDayISO(prevTo),
        label: "Previous Period",
        display: displayRange(fmtDate(prevFrom), fmtDate(prevTo)),
      };
    }
    case "today":
    default: {
      const yesterday = new Date(`${range.from}T00:00:00`);
      yesterday.setDate(yesterday.getDate() - 1);
      return {
        from: fmtDate(yesterday),
        to: fmtDate(yesterday),
        fromInstant: localMidnightISO(yesterday),
        toInstant: localEndOfDayISO(yesterday),
        label: "Yesterday",
        display: displayRange(fmtDate(yesterday), fmtDate(yesterday)),
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
  /** Zero-filled daily expense series (same day grid as `daily`). */
  dailyExpenses: { date: string; amount: number }[];
  /** Revenue and order count bucketed by local hour of day (0–23). */
  hourly: { hour: string; revenue: number; orders: number }[];
}

/**
 * Current-vs-previous-period comparison. Percentages are rounded to one
 * decimal; `null` means the previous period had a zero baseline (so a
 * percentage would be meaningless/infinite).
 */
export interface PeriodComparison {
  /** Human label of the previous period, e.g. "Yesterday". */
  previousLabel: string;
  previousRevenue: number;
  previousPaidOrders: number;
  previousAverageTicket: number;
  previousExpenses: number;
  currentNet: number;
  previousNet: number;
  revenuePct: number | null;
  paidOrdersPct: number | null;
  averageTicketPct: number | null;
  expensesPct: number | null;
  netPct: number | null;
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export function comparePeriods(current: OwnerMetrics, previous: OwnerMetrics): PeriodComparison {
  return {
    previousLabel: previous.range.label,
    previousRevenue: previous.revenue,
    previousPaidOrders: previous.paidOrders,
    previousAverageTicket: previous.averageTicket,
    previousExpenses: previous.expenses,
    currentNet: current.revenueMinusExpenses,
    previousNet: previous.revenueMinusExpenses,
    revenuePct: pctChange(current.revenue, previous.revenue),
    paidOrdersPct: pctChange(current.paidOrders, previous.paidOrders),
    averageTicketPct: pctChange(current.averageTicket, previous.averageTicket),
    expensesPct: pctChange(current.expenses, previous.expenses),
    netPct: pctChange(current.revenueMinusExpenses, previous.revenueMinusExpenses),
  };
}

export function computeOwnerMetrics(opts: {
  range: DateRange;
  expenses: { date: string; amount: number }[];
  orders: Order[];
  menuItems: MenuItem[];
  payments: PaymentRecord[];
}): OwnerMetrics {
  const { range, expenses, orders, menuItems, payments } = opts;

  const fromTime = parseDate(range.fromInstant).getTime();
  const toTime = parseDate(range.toInstant).getTime();

  const rangeOrders = orders.filter((o) => {
    const t = parseDate(o.createdAt).getTime();
    return t > 0 && t >= fromTime && t <= toTime;
  });

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
  // Daily expenses on the same day grid (for revenue-vs-expense charts).
  const expensesByDay = new Map<string, number>();
  for (const e of expenses) {
    if (e.date >= range.from && e.date <= range.to) {
      expensesByDay.set(e.date, (expensesByDay.get(e.date) ?? 0) + (e.amount || 0));
    }
  }

  const daily: { date: string; revenue: number }[] = [];
  const dailyExpenses: { date: string; amount: number }[] = [];
  const cursor = new Date(`${range.from}T00:00:00`);
  const end = new Date(`${range.to}T00:00:00`);
  // Cap the zero-filled series — multi-year spans are bucketed on demand by
  // the drill-down trend instead of materializing thousands of day entries.
  let guard = 0;
  while (cursor <= end && guard < 400) {
    const key = fmtDate(cursor);
    daily.push({ date: key, revenue: dailyByDay.get(key) ?? 0 });
    dailyExpenses.push({ date: key, amount: expensesByDay.get(key) ?? 0 });
    cursor.setDate(cursor.getDate() + 1);
    guard++;
  }

  // Hour-of-day revenue profile — zero-filled 24 slots so quiet hours show
  // honest empty bars instead of disappearing.
  const hourlyByHour = new Map<number, { revenue: number; orders: number }>();
  for (const o of paidRangeOrders) {
    const h = new Date(o.createdAt).getHours();
    const cur = hourlyByHour.get(h) ?? { revenue: 0, orders: 0 };
    cur.revenue += o.total || 0;
    cur.orders += 1;
    hourlyByHour.set(h, cur);
  }
  const hourLabels = [
    "12a", "1a", "2a", "3a", "4a", "5a", "6a", "7a", "8a", "9a", "10a", "11a",
    "12p", "1p", "2p", "3p", "4p", "5p", "6p", "7p", "8p", "9p", "10p", "11p",
  ];
  const hourly: { hour: string; revenue: number; orders: number }[] = hourLabels.map((label, h) => {
    const cur = hourlyByHour.get(h) ?? { revenue: 0, orders: 0 };
    return { hour: label, revenue: cur.revenue, orders: cur.orders };
  });

  return {
    range,
    revenue,
    paidOrders,
    averageTicket,
    expenses: expensesInRange,
    revenueMinusExpenses: revenue - expensesInRange,
    dailyExpenses,
    hourly,
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
    (o) =>
      o.createdAt &&
      new Date(o.createdAt) >= new Date(range.fromInstant) &&
      new Date(o.createdAt) <= new Date(range.toInstant)
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

/* ------------------------------------------------------------------ */
/* Analytics Hub report helpers                                        */
/* ------------------------------------------------------------------ */

/** How often each add-on was sold (units + add-on revenue) in the range. */
export interface AddonPopularityRow {
  id: string;
  name: string;
  units: number;
  revenue: number;
  orderCount: number;
}

export function computeAddonPopularity(opts: {
  range: DateRange;
  orders: Order[];
}): AddonPopularityRow[] {
  const { range, orders } = opts;
  const paidRangeOrders = orders.filter(
    (o) =>
      o.paymentStatus === "PAID" &&
      o.createdAt &&
      new Date(o.createdAt) >= new Date(range.fromInstant) &&
      new Date(o.createdAt) <= new Date(range.toInstant)
  );
  const map = new Map<string, AddonPopularityRow>();
  for (const o of paidRangeOrders) {
    for (const item of o.items ?? []) {
      for (const a of item.selectedAddons ?? []) {
        const cur =
          map.get(a.id || a.name) ?? {
            id: a.id || a.name,
            name: a.name,
            units: 0,
            revenue: 0,
            orderCount: 0,
          };
        cur.units += item.quantity || 1;
        cur.revenue += (a.price || 0) * (item.quantity || 1);
        cur.orderCount += 1;
        map.set(a.id || a.name, cur);
      }
    }
  }
  return [...map.values()].sort((a, b) => b.units - a.units || b.revenue - a.revenue);
}

/** One ranked customer row (grouped from PAID orders in the range). */
export interface CustomerReportRow {
  name: string;
  phone: string;
  orders: number;
  revenue: number;
}

export interface CategoryReportRow {
  category: string;
  quantity: number;
  revenue: number;
}

export function computeCategoryReport(opts: { range: DateRange; orders: Order[] }): CategoryReportRow[] {
  const { range, orders } = opts;
  const filtered = orders.filter(
    (o) =>
      (o.paymentStatus === "PAID" || o.status === "COMPLETED" || o.status === "SERVED") &&
      o.createdAt &&
      new Date(o.createdAt) >= new Date(range.fromInstant) &&
      new Date(o.createdAt) <= new Date(range.toInstant)
  );

  const map = new Map<string, CategoryReportRow>();
  for (const o of filtered) {
    for (const item of o.items ?? []) {
      const cat = (item as any).category || "General";
      const qty = item.quantity || 1;
      const rev = (item.price || 0) * qty;
      const cur = map.get(cat) ?? { category: cat, quantity: 0, revenue: 0 };
      cur.quantity += qty;
      cur.revenue += rev;
      map.set(cat, cur);
    }
  }
  return [...map.values()].sort((a, b) => b.revenue - a.revenue);
}

export function computeCustomers(opts: { range: DateRange; orders: Order[] }): CustomerReportRow[] {
  const { range, orders } = opts;
  const paidRangeOrders = orders.filter(
    (o) =>
      o.paymentStatus === "PAID" &&
      o.createdAt &&
      new Date(o.createdAt) >= new Date(range.fromInstant) &&
      new Date(o.createdAt) <= new Date(range.toInstant)
  );
  const map = new Map<string, CustomerReportRow>();
  for (const o of paidRangeOrders) {
    const name = o.customerName?.trim() || "Walk-in";
    const cur =
      map.get(name) ?? { name, phone: o.customerPhone || "", orders: 0, revenue: 0 };
    cur.orders += 1;
    cur.revenue += o.total || 0;
    if (o.customerPhone && !cur.phone) cur.phone = o.customerPhone;
    map.set(name, cur);
  }
  return [...map.values()].sort((a, b) => b.revenue - a.revenue || b.orders - a.orders);
}

/** Expense report: category rollups + the individual entries in the range. */
export interface ExpenseReportCategory {
  category: string;
  total: number;
  count: number;
}

export interface ExpenseReportEntry {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  paymentMethod: string;
  recordedByName: string;
}

export function computeExpenseReport(opts: {
  range: DateRange;
  expenses: { id: string; amount: number; category: string; description: string; date: string; paymentMethod?: string; recordedByName?: string }[];
}): { total: number; count: number; categories: ExpenseReportCategory[]; entries: ExpenseReportEntry[] } {
  const { range, expenses } = opts;
  const entries: ExpenseReportEntry[] = expenses
    .filter((e) => e.date >= range.from && e.date <= range.to)
    .map((e) => ({
      id: e.id,
      amount: e.amount || 0,
      category: e.category || "Other",
      description: e.description || "",
      date: e.date,
      paymentMethod: e.paymentMethod || "",
      recordedByName: e.recordedByName || "",
    }))
    .sort((a, b) => b.date.localeCompare(a.date) || b.amount - a.amount);

  const catMap = new Map<string, { total: number; count: number }>();
  for (const e of entries) {
    const cur = catMap.get(e.category) ?? { total: 0, count: 0 };
    cur.total += e.amount;
    cur.count += 1;
    catMap.set(e.category, cur);
  }
  const categories: ExpenseReportCategory[] = [...catMap.entries()]
    .map(([category, v]) => ({ category, total: v.total, count: v.count }))
    .sort((a, b) => b.total - a.total);

  return {
    total: entries.reduce((s, e) => s + e.amount, 0),
    count: entries.length,
    categories,
    entries,
  };
}

/** Staff activity categories used by the Staff & Roles report. */
export type StaffActivityCategory = "ORDERS" | "PAYMENTS" | "MENU" | "EXPENSES" | "STAFF" | "OTHER";

export const STAFF_ACTIVITY_CATEGORIES: StaffActivityCategory[] = [
  "ORDERS",
  "PAYMENTS",
  "MENU",
  "EXPENSES",
  "STAFF",
  "OTHER",
];

/** Map a backend activity record (UPPER_SNAKE action + entity type) to a bucket. */
export function staffActionCategory(action: string, entityType: string): StaffActivityCategory {
  const a = (action || "").toUpperCase();
  const e = (entityType || "").toUpperCase();
  if (a.includes("ORDER") || e === "ORDER") return "ORDERS";
  if (
    a.includes("PAYMENT") ||
    a.includes("SETTLE") ||
    a.includes("VERIF") ||
    a.includes("REFUND") ||
    e.includes("PAYMENT")
  )
    return "PAYMENTS";
  if (
    a.includes("MENU") ||
    a.includes("DISH") ||
    a.includes("PRICE") ||
    a.includes("CATEGOR") ||
    a.includes("ADDON") ||
    a.includes("AVAILAB") ||
    e.includes("MENU") ||
    e.includes("PRODUCT") ||
    e.includes("CATEGOR") ||
    e.includes("ADDON")
  )
    return "MENU";
  if (a.includes("EXPENSE") || e.includes("EXPENSE")) return "EXPENSES";
  if (
    a.includes("STAFF") ||
    a.includes("USER") ||
    a.includes("ROLE") ||
    a.includes("SUSPEND") ||
    a.includes("CREDENTIAL") ||
    e.includes("USER") ||
    e.includes("STAFF") ||
    e.includes("EMPLOYEE")
  )
    return "STAFF";
  return "OTHER";
}

/** One staff member's activity rollup for the period. */
export interface StaffMemberPerformance {
  userId: string;
  name: string;
  role: string;
  active: boolean;
  actions: number;
  byCategory: Record<StaffActivityCategory, number>;
  lastActiveAt?: string;
}

/**
 * Staff & Roles report: merges the staff roster (/users) with real activity
 * log records in the period. Nothing is invented — action counts are the
 * number of backend audit records attributed to that user.
 */
export function computeStaffReport(opts: {
  employees: { id: string; name?: string; role?: string; active?: boolean }[];
  logs: { userId?: string; userName?: string; userRole?: string; action?: string; entityType?: string; createdAt?: string }[];
}): { members: StaffMemberPerformance[]; roleRollup: { role: string; members: number; actions: number }[] } {
  const { employees, logs } = opts;
  const byUser = new Map<string, StaffMemberPerformance>();

  const ensure = (userId: string, name: string, role: string, active: boolean) => {
    const key = userId || name;
    let m = byUser.get(key);
    if (!m) {
      m = {
        userId: key,
        name: name || "Unknown",
        role: role || "STAFF",
        active,
        actions: 0,
        byCategory: { ORDERS: 0, PAYMENTS: 0, MENU: 0, EXPENSES: 0, STAFF: 0, OTHER: 0 },
      };
      byUser.set(key, m);
    }
    if (name && !m.name.includes(name)) m.name = name;
    if (role && m.role === "STAFF") m.role = role;
    return m;
  };

  for (const emp of employees ?? []) {
    ensure(emp.id, emp.name || "", emp.role || "STAFF", emp.active !== false);
  }

  for (const log of logs ?? []) {
    const m = ensure(log.userId || "", log.userName || "", log.userRole || "STAFF", true);
    m.actions += 1;
    const cat = staffActionCategory(log.action || "", log.entityType || "");
    m.byCategory[cat] += 1;
    if (log.createdAt && (!m.lastActiveAt || log.createdAt > m.lastActiveAt)) {
      m.lastActiveAt = log.createdAt;
    }
  }

  const members = [...byUser.values()].sort(
    (a, b) => b.actions - a.actions || a.name.localeCompare(b.name)
  );

  const roleMap = new Map<string, { members: number; actions: number }>();
  for (const m of members) {
    const cur = roleMap.get(m.role) ?? { members: 0, actions: 0 };
    cur.members += 1;
    cur.actions += m.actions;
    roleMap.set(m.role, cur);
  }
  const roleRollup = [...roleMap.entries()]
    .map(([role, v]) => ({ role, members: v.members, actions: v.actions }))
    .sort((a, b) => b.actions - a.actions);

  return { members, roleRollup };
}

/** One product's popularity series across the period. */
export interface PopularityTrendRow {
  menuItemId: string;
  name: string;
  category: string;
  isRetail: boolean;
  units: number;
  revenue: number;
  series: { label: string; units: number }[];
}

/**
 * Per-product units over time. Bucket width adapts to the range: daily for
 * short periods, weekly for months, monthly for long periods — so a year of
 * data still renders as a readable trend without a thousand points.
 */
export function computePopularityTrend(opts: {
  range: DateRange;
  orders: Order[];
  menuItems: MenuItem[];
}): { rows: PopularityTrendRow[]; bucketLabel: string } {
  const { range, orders, menuItems } = opts;
  const byId = new Map(menuItems.map((m) => [m.id, m]));

  const start = new Date(`${range.from}T00:00:00`);
  const end = new Date(`${range.to}T23:59:59`);
  const dayCount = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1);

  // Build bucket boundaries.
  const buckets: { start: Date; label: string }[] = [];
  const bucketOf = (d: Date): number => {
    if (dayCount <= 62) {
      const idx = Math.floor((d.getTime() - start.getTime()) / 86_400_000);
      return idx >= 0 && idx < buckets.length ? idx : -1;
    }
    if (dayCount <= 400) {
      const weekIdx = Math.floor((d.getTime() - start.getTime()) / (7 * 86_400_000));
      return weekIdx >= 0 && weekIdx < buckets.length ? weekIdx : -1;
    }
    const monthIdx = (d.getFullYear() - start.getFullYear()) * 12 + (d.getMonth() - start.getMonth());
    return monthIdx >= 0 && monthIdx < buckets.length ? monthIdx : -1;
  };

  const labelFmt: Intl.DateTimeFormatOptions =
    dayCount <= 62 ? { month: "short", day: "numeric" } : dayCount <= 400 ? { month: "short", day: "numeric" } : { month: "short" };

  const cursor = new Date(start);
  if (dayCount <= 62) {
    while (cursor <= end) {
      buckets.push({ start: new Date(cursor), label: cursor.toLocaleDateString("en-US", labelFmt) });
      cursor.setDate(cursor.getDate() + 1);
    }
  } else if (dayCount <= 400) {
    // Align to the range start, stepping by 7 days.
    while (cursor <= end) {
      const bStart = new Date(cursor);
      const bEnd = new Date(cursor);
      bEnd.setDate(bEnd.getDate() + 6);
      buckets.push({
        start: bStart,
        label: `${bStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
      });
      cursor.setDate(cursor.getDate() + 7);
    }
  } else {
    while (cursor <= end) {
      buckets.push({ start: new Date(cursor), label: cursor.toLocaleDateString("en-US", labelFmt) });
      cursor.setMonth(cursor.getMonth() + 1);
    }
  }

  const paidRangeOrders = orders.filter(
    (o) => o.paymentStatus === "PAID" && o.createdAt && new Date(o.createdAt) >= start && new Date(o.createdAt) <= end
  );

  const prodMap = new Map<string, { menuItemId: string; name: string; category: string; isRetail: boolean; units: number; revenue: number; series: number[] }>();
  for (const o of paidRangeOrders) {
    const bi = bucketOf(new Date(o.createdAt));
    if (bi < 0) continue;
    for (const item of o.items ?? []) {
      const mi = item.menuItemId ? byId.get(item.menuItemId) : undefined;
      const key = mi?.id || item.name;
      let p = prodMap.get(key);
      if (!p) {
        const retailHeuristic = { id: item.menuItemId || "", category: item.name } as MenuItem;
        p = {
          menuItemId: mi?.id ?? item.menuItemId ?? item.name,
          name: item.name,
          category: mi?.category || "Other",
          isRetail: mi ? isRetailProduct(mi) : isRetailProduct(retailHeuristic),
          units: 0,
          revenue: 0,
          series: new Array(buckets.length).fill(0),
        };
        prodMap.set(key, p);
      }
      const qty = item.quantity || 1;
      p.units += qty;
      p.revenue += (item.price || 0) * qty;
      p.series[bi] += qty;
    }
  }

  const rows: PopularityTrendRow[] = [...prodMap.values()]
    .map((p) => ({
      menuItemId: p.menuItemId,
      name: p.name,
      category: p.category,
      isRetail: p.isRetail,
      units: p.units,
      revenue: p.revenue,
      series: p.series.map((units, i) => ({ label: buckets[i].label, units })),
    }))
    .sort((a, b) => b.units - a.units || b.revenue - a.revenue);

  return {
    rows,
    bucketLabel: dayCount <= 62 ? "Daily" : dayCount <= 400 ? "Weekly" : "Monthly",
  };
}
