"use client";

import { useMemo, useState } from "react";
import { Order } from "@/types";
import { formatETB } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { DateRange } from "@/lib/owner";
import { formatTableRef, useTableLabels } from "@/hooks/useTableLabels";

/**
 * Drillable revenue analytics.
 *
 * Buckets PAID orders by exact local `createdAt` instants — no server math —
 * and lets the owner drill from the whole period down through
 * YEAR → MONTH → WEEK → DAY → HOUR → MINUTE by clicking a point, rendered as
 * a line graph. Expenses (recorded per day) are drawn as a second line at day
 * granularity and coarser. A "Customers" dimension ranks the same orders by
 * who placed them, and a customer selector scopes the whole chart to one
 * customer ("customer range"). Every figure is real; nothing is invented.
 */

type Granularity = "YEAR" | "MONTH" | "WEEK" | "DAY" | "HOUR" | "MINUTE";

const NEXT_LEVEL: Record<Granularity, Granularity | null> = {
  YEAR: "MONTH",
  MONTH: "WEEK",
  WEEK: "DAY",
  DAY: "HOUR",
  HOUR: "MINUTE",
  MINUTE: null,
};

const LEVEL_LABEL: Record<Granularity, string> = {
  YEAR: "Years",
  MONTH: "Months",
  WEEK: "Weeks",
  DAY: "Days",
  HOUR: "Hours",
  MINUTE: "Minutes",
};

interface BucketDef {
  key: string;
  label: string;
  start: Date;
  end: Date;
}

function startOfWeek(d: Date): Date {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  r.setDate(r.getDate() - ((r.getDay() + 6) % 7));
  return r;
}

function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function buildBuckets(start: Date, end: Date, g: Granularity): BucketDef[] {
  const buckets: BucketDef[] = [];
  const cursor = new Date(start);

  switch (g) {
    case "YEAR": {
      let y = cursor.getFullYear();
      while (y <= end.getFullYear()) {
        buckets.push({
          key: `y${y}`,
          label: String(y),
          start: new Date(y, 0, 1),
          // End of the last day (not midnight), so Dec 31 orders are included.
          end: new Date(y, 11, 31, 23, 59, 59),
        });
        y++;
      }
      break;
    }
    case "MONTH": {
      let c = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
      let guard = 0;
      while (c <= end && guard < 200) {
        const s = c;
        // End of the last day of the month (not midnight).
        const e = new Date(c.getFullYear(), c.getMonth() + 1, 0, 23, 59, 59);
        const showYear = c.getFullYear() !== end.getFullYear();
        buckets.push({
          key: `m${c.getFullYear()}-${c.getMonth()}`,
          label:
            c.toLocaleDateString("en-US", { month: "short" }) +
            (showYear ? ` '${String(c.getFullYear()).slice(2)}` : ""),
          start: s,
          end: e,
        });
        c = new Date(c.getFullYear(), c.getMonth() + 1, 1);
        guard++;
      }
      break;
    }
    case "WEEK": {
      let c = startOfWeek(cursor);
      let guard = 0;
      while (c <= end && guard < 60) {
        const s = c;
        // End of the last day of the week (not midnight), so Sunday orders count.
        const e = new Date(c.getFullYear(), c.getMonth(), c.getDate() + 6, 23, 59, 59);
        const fromLabel = s.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        const toLabel =
          e.getFullYear() !== s.getFullYear() || e.getMonth() !== s.getMonth()
            ? e.toLocaleDateString("en-US", { month: "short", day: "numeric" })
            : String(e.getDate());
        buckets.push({
          key: `w${s.getFullYear()}-${s.getMonth()}-${s.getDate()}`,
          label: `${fromLabel}–${toLabel}`,
          start: s,
          end: e,
        });
        c = new Date(c.getFullYear(), c.getMonth(), c.getDate() + 7);
        guard++;
      }
      break;
    }
    case "DAY": {
      let c = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate());
      let guard = 0;
      while (c <= end && guard < 370) {
        buckets.push({
          key: `d${c.getFullYear()}-${c.getMonth()}-${c.getDate()}`,
          label: c.toLocaleDateString("en-US", { weekday: "short", day: "numeric" }),
          start: new Date(c.getFullYear(), c.getMonth(), c.getDate()),
          end: new Date(c.getFullYear(), c.getMonth(), c.getDate(), 23, 59, 59),
        });
        c = new Date(c.getFullYear(), c.getMonth(), c.getDate() + 1);
        guard++;
      }
      break;
    }
    case "HOUR": {
      for (let h = 0; h < 24; h++) {
        const h12 = h % 12 === 0 ? 12 : h % 12;
        buckets.push({
          key: `h${h}`,
          label: `${h12}${h < 12 ? "a" : "p"}`,
          start: new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate(), h, 0),
          end: new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate(), h, 59, 59),
        });
      }
      break;
    }
    case "MINUTE": {
      for (let m = 0; m < 60; m++) {
        const s = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate(), cursor.getHours(), m, 0);
        buckets.push({
          key: `mi${m}`,
          label: `${String(cursor.getHours()).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
          start: s,
          end: new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate(), cursor.getHours(), m, 59),
        });
      }
      break;
    }
  }
  return buckets;
}

function defaultGranularity(start: Date, end: Date): Granularity {
  const spanDays = (end.getTime() - start.getTime()) / 86_400_000;
  if (spanDays <= 1.2) return "HOUR";
  if (spanDays <= 8) return "DAY";
  if (spanDays <= 60) return "WEEK";
  if (spanDays <= 400) return "MONTH";
  return "YEAR";
}

function fmtFocus(start: Date, end: Date): string {
  const s = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const e = end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return start.getTime() === end.getTime() ? e : `${s} – ${e}`;
}

/** Catmull-Rom → cubic Bézier smoothing so the line reads as a curve, not a zigzag. */
function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M${pts[0].x},${pts[0].y}`;
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`;
  }
  return d;
}

interface TrendPoint {
  key: string;
  label: string;
  revenue: number;
  expense: number;
  count: number;
  orders: Order[];
  start: Date;
  end: Date;
}

interface CustomerRow {
  key: string;
  name: string;
  revenue: number;
  count: number;
  orders: Order[];
}

interface DrilldownTrendProps {
  orders: Order[];
  /** Recorded expenses (date + amount) — drawn as a second series at day level and coarser. */
  expenses: { date: string; amount: number }[];
  range: DateRange;
}

/** Stable customer identity for an order (same rule the Customers dimension uses). */
function customerKeyOf(o: Order, labels: Record<string, string>): string {
  const isDineIn = o.type === "DINE_IN";
  return (
    o.customerName?.trim() ||
    (isDineIn ? (o.tableName || formatTableRef(o.tableId, labels) || "Dine-in") : "Walk-in")
  );
}

export function DrilldownTrend({ orders, expenses, range }: DrilldownTrendProps) {
  const tableLabels = useTableLabels();
  const [dimension, setDimension] = useState<"time" | "customers">("time");
  const [customerKey, setCustomerKey] = useState<string>("all");
  const [focus, setFocus] = useState<{ start: Date; end: Date } | null>(null);
  const [granularity, setGranularity] = useState<Granularity | null>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);

  // Paid orders inside the reporting period (same local-instant rule as the
  // rest of the owner snapshot — honest against any backend).
  const paidOrders = useMemo(
    () =>
      orders.filter(
        (o) =>
          o.paymentStatus === "PAID" &&
          o.createdAt &&
          new Date(o.createdAt) >= new Date(range.fromInstant)
      ),
    [orders, range.fromInstant]
  );

  const customers: CustomerRow[] = useMemo(() => {
    const map = new Map<string, CustomerRow>();
    for (const o of paidOrders) {
      const key = customerKeyOf(o, tableLabels);
      const cur = map.get(key) ?? { key, name: key, revenue: 0, count: 0, orders: [] as Order[] };
      cur.revenue += o.total || 0;
      cur.count += 1;
      cur.orders.push(o);
      map.set(key, cur);
    }
    return [...map.values()].sort((a, b) => b.revenue - a.revenue);
  }, [paidOrders]);

  // Customer range: when a specific customer is selected, scope every chart to
  // their orders only (still drillable through time).
  const scopedOrders = useMemo(
    () => (customerKey === "all" ? paidOrders : paidOrders.filter((o) => customerKeyOf(o, tableLabels) === customerKey)),
    [paidOrders, customerKey]
  );

  // Expenses are recorded per day, so they only resolve at DAY granularity and
  // coarser — at HOUR/MINUTE we drop the expense line rather than invent one.
  const expenseByDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of expenses) {
      if (!e.date) continue;
      map.set(e.date, (map.get(e.date) ?? 0) + (e.amount || 0));
    }
    return map;
  }, [expenses]);
  const rangeStart = useMemo(() => new Date(`${range.from}T00:00:00`), [range.from]);
  const rangeEnd = useMemo(() => new Date(`${range.to}T23:59:59`), [range.to]);

  // NOTE: the parent keys this component by the reporting period, so a range
  // change remounts it and all drill state resets naturally.

  const activeFocus = focus ?? { start: rangeStart, end: rangeEnd };
  const activeStart = activeFocus.start;
  const activeEnd = activeFocus.end;
  const activeGranularity = granularity ?? defaultGranularity(activeStart, activeEnd);

  // Expenses resolve at day granularity and coarser; at HOUR/MINUTE they have
  // no time precision, so the expense line is hidden rather than invented.
  // When scoped to a single customer, expenses are hidden too — recorded costs
  // are café-wide and cannot be attributed to one customer.
  const scopedToCustomer = customerKey !== "all";
  const showExpenses =
    !scopedToCustomer &&
    activeGranularity !== "HOUR" &&
    activeGranularity !== "MINUTE" &&
    expenseByDate.size > 0;

  const focusStart = activeStart.getTime();
  const focusEnd = activeEnd.getTime();

  const points: TrendPoint[] = useMemo(() => {
    const defs = buildBuckets(new Date(focusStart), new Date(focusEnd), activeGranularity);
    const filled = defs.map((b) => ({
      ...b,
      revenue: 0,
      expense: 0,
      count: 0,
      orders: [] as Order[],
    }));
    for (const o of scopedOrders) {
      const t = new Date(o.createdAt).getTime();
      for (const b of filled) {
        if (t >= b.start.getTime() && t <= b.end.getTime()) {
          b.revenue += o.total || 0;
          b.count += 1;
          b.orders.push(o);
          break;
        }
      }
    }
    // Expenses by recorded date (day level and coarser only). The first week
    // bucket can start before the selected period (start-of-week), so the
    // expense window is clamped to the focus range — no out-of-range costs.
    if (activeGranularity === "DAY" || activeGranularity === "WEEK" || activeGranularity === "MONTH" || activeGranularity === "YEAR") {
      const range0 = fmtDate(new Date(focusStart));
      const range1 = fmtDate(new Date(focusEnd));
      for (const b of filled) {
        const d0 = fmtDate(b.start) < range0 ? range0 : fmtDate(b.start);
        const d1 = fmtDate(b.end) > range1 ? range1 : fmtDate(b.end);
        for (const [date, amount] of expenseByDate) {
          if (date >= d0 && date <= d1) b.expense += amount;
        }
      }
    }
    return filled;
  }, [scopedOrders, focusStart, focusEnd, activeGranularity, expenseByDate]);

  const maxRevenue = Math.max(...points.map((p) => p.revenue), 0);
  const maxExpense = Math.max(...points.map((p) => p.expense), 0);
  const totalRevenue = points.reduce((s, p) => s + p.revenue, 0);
  const totalExpense = points.reduce((s, p) => s + p.expense, 0);
  const peak = points.reduce((best, p) => (p.revenue > best.revenue ? p : best), points[0] ?? { label: "—", revenue: 0 });
  const totalOrders = points.reduce((s, p) => s + p.count, 0);
  const avgBucket = points.length > 0 ? totalRevenue / points.length : 0;

  const drillable = NEXT_LEVEL[activeGranularity] !== null;
  const hasData = points.some((p) => p.revenue > 0);

  // Chart geometry — SVG y grows downward, so the same percentage value is
  // used for the polyline y AND the hit-dot `top` offset. They now line up.
  // Revenue and expenses scale independently (dual axis): the two series often
  // differ by orders of magnitude, and a shared axis would flatten one to a
  // straight line. Each scale's max is labeled in the legend so the reader
  // knows the axes differ.
  const TOP = 8;
  const BOTTOM = 86;
  const scale = (max: number) => (value: number) =>
    max > 0 ? BOTTOM - (value / max) * (BOTTOM - TOP) : BOTTOM;
  const yRev = scale(maxRevenue);
  const yExp = scale(maxExpense);

  const xFor = (i: number) => ((i + 0.5) / Math.max(points.length, 1)) * 100;

  const revLine = smoothPath(points.map((p, i) => ({ x: xFor(i), y: yRev(p.revenue) })));
  const expLine = showExpenses
    ? smoothPath(points.map((p, i) => ({ x: xFor(i), y: yExp(p.expense) })))
    : "";
  const revArea = revLine ? `${revLine} L100,${BOTTOM} L0,${BOTTOM} Z` : "";
  const expArea = expLine ? `${expLine} L100,${BOTTOM} L0,${BOTTOM} Z` : "";

  // X-axis tick labels: show up to 8, evenly spaced.
  const tickEvery = Math.max(1, Math.ceil(points.length / 8));
  const ticks = points
    .map((p, i) => ({ p, i }))
    .filter(({ i }) => i % tickEvery === 0 || i === points.length - 1);

  const hovered = hoverIdx !== null ? points[hoverIdx] : null;

  const resetDrill = () => {
    setFocus(null);
    setGranularity(null);
    setHoverIdx(null);
  };

  const selectedCustomerName =
    customerKey === "all" ? null : customers.find((c) => c.key === customerKey)?.name ?? customerKey;

  return (
    <div className="bg-card border rounded-2xl p-5 shadow-sm">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-black text-sm text-foreground">Revenue Analytics</h3>
          <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
            {selectedCustomerName ? `${selectedCustomerName} · ` : ""}
            {focus
              ? `${LEVEL_LABEL[activeGranularity]} · ${fmtFocus(activeStart, activeEnd)}`
              : `${LEVEL_LABEL[activeGranularity]} · ${range.display}`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Customer range */}
          <select
            value={customerKey}
            onChange={(e) => {
              setCustomerKey(e.target.value);
              setExpandedCustomer(e.target.value === "all" ? null : e.target.value);
            }}
            className="h-8 rounded-xl border bg-background px-2 text-[11px] font-bold outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 max-w-[150px]"
            aria-label="Customer range"
          >
            <option value="all">All customers</option>
            {customers.map((c) => (
              <option key={c.key} value={c.key}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Dimension toggle */}
          <div className="flex items-center gap-1 p-1 bg-muted/50 border rounded-xl">
            {(["time", "customers"] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDimension(d)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all",
                  dimension === d ? "bg-card text-foreground border shadow-sm" : "text-muted-foreground border border-transparent"
                )}
              >
                {d === "time" ? "Time" : "Customers"}
              </button>
            ))}
          </div>

          {/* Drill breadcrumb */}
          <button
            onClick={resetDrill}
            className={cn(
              "px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all",
              focus
                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20"
                : "text-muted-foreground border-transparent cursor-default"
            )}
          >
            {focus ? "← All" : "All"}
          </button>
        </div>
      </div>

      {dimension === "time" ? (
        <>
          {/* Summary strip */}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="rounded-xl border bg-muted/20 px-3 py-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase block">Revenue</span>
              <span className="text-sm font-black text-amber-600 dark:text-amber-400">{formatETB(totalRevenue)}</span>
            </div>
            {showExpenses ? (
              <div className="rounded-xl border bg-muted/20 px-3 py-2">
                <span className="text-[10px] font-bold text-muted-foreground uppercase block">Expenses</span>
                <span className="text-sm font-black text-rose-600 dark:text-rose-400">{formatETB(totalExpense)}</span>
              </div>
            ) : (
              <div className="rounded-xl border bg-muted/20 px-3 py-2">
                <span className="text-[10px] font-bold text-muted-foreground uppercase block">Avg / {LEVEL_LABEL[activeGranularity].toLowerCase().slice(0, -1)}</span>
                <span className="text-sm font-black text-foreground">{formatETB(avgBucket)}</span>
              </div>
            )}
            <div className="rounded-xl border bg-muted/20 px-3 py-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase block">Peak {peak.label}</span>
              <span className="text-sm font-black text-foreground">{formatETB(peak.revenue)}</span>
            </div>
            <div className="rounded-xl border bg-muted/20 px-3 py-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase block">Paid Orders</span>
              <span className="text-sm font-black text-foreground">{totalOrders}</span>
            </div>
          </div>

          {!hasData ? (
            <div className="py-14 text-center space-y-1.5">
              <p className="text-xs font-bold text-muted-foreground">No paid sales in this period.</p>
              <p className="text-[11px] text-muted-foreground/80">New paid orders will appear here.</p>
            </div>
          ) : (
            <div className="mt-4">
              {/* Legend — each series labels its own scale max (dual axis). */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-bold text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-500" /> Revenue
                  <span className="text-[9px] font-semibold opacity-70">max {formatETB(maxRevenue)}</span>
                </span>
                {showExpenses ? (
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-rose-500" /> Expenses
                    <span className="text-[9px] font-semibold opacity-70">max {formatETB(maxExpense)}</span>
                  </span>
                ) : (
                  <span className="text-[9px] font-semibold opacity-70">
                    Expenses are recorded per day
                  </span>
                )}
              </div>

              <div className="relative h-52 mt-2">
                {/* Grid lines */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="w-full border-t border-border/50" />
                  ))}
                </div>

                {/* Lines + areas */}
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <defs>
                    <linearGradient id="revArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.22} />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.01} />
                    </linearGradient>
                    <linearGradient id="expArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.16} />
                      <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  {expArea && <path d={expArea} fill="url(#expArea)" />}
                  {revArea && <path d={revArea} fill="url(#revArea)" />}
                  {expLine && (
                    <path d={expLine} fill="none" stroke="#f43f5e" strokeWidth="1.8" strokeDasharray="4 3" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
                  )}
                  {revLine && (
                    <path d={revLine} fill="none" stroke="#f59e0b" strokeWidth="2.4" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
                  )}
                </svg>

                {/* Hit targets + tooltip */}
                {points.map((p, i) => {
                  const left = xFor(i);
                  const top = yRev(p.revenue);
                  return (
                    <button
                      key={p.key}
                      onClick={() => {
                        if (!drillable) return;
                        setFocus({ start: p.start, end: p.end });
                        setGranularity(NEXT_LEVEL[activeGranularity]);
                        setHoverIdx(null);
                      }}
                      onMouseEnter={() => setHoverIdx(i)}
                      onMouseLeave={() => setHoverIdx(null)}
                      onFocus={() => setHoverIdx(i)}
                      onBlur={() => setHoverIdx(null)}
                      aria-label={`${p.label}: revenue ${formatETB(p.revenue)}, ${p.count} orders${drillable ? ", click to drill in" : ""}`}
                      className={cn(
                        // Invisible by default so the line stays clean; a small dot
                        // appears only on hover/focus to show the drill target.
                        "absolute -translate-x-1/2 -translate-y-1/2 h-4 w-4 rounded-full transition-all focus-visible:outline-2 focus-visible:outline-amber-500",
                        hoverIdx === i ? "bg-amber-500 border-2 border-background shadow-md scale-125" : "bg-transparent border-0"
                      )}
                      style={{ left: `${left}%`, top: `${top}%` }}
                    />
                  );
                })}

                {/* Tooltip */}
                {hovered && (
                  <div
                    className="absolute z-10 -translate-x-1/2 -translate-y-full bg-foreground text-background text-[11px] font-bold rounded-xl px-3 py-2 shadow-xl whitespace-nowrap pointer-events-none"
                    style={{ left: `${xFor(hoverIdx!)}%`, top: `${Math.max(yRev(hovered.revenue) - 6, 2)}%` }}
                  >
                    <span className="block">{hovered.label}</span>
                    <span className="block text-amber-500">{formatETB(hovered.revenue)}</span>
                    {showExpenses && hovered.expense > 0 && (
                      <span className="block text-rose-400">{formatETB(hovered.expense)} exp.</span>
                    )}
                    <span className="block text-[10px] opacity-70">
                      {hovered.count} order{hovered.count !== 1 ? "s" : ""}
                      {drillable ? " · click to drill" : ""}
                    </span>
                  </div>
                )}
              </div>

              {/* X axis labels */}
              <div className="mt-1 flex justify-between text-[9px] font-bold text-muted-foreground uppercase">
                {ticks.map(({ p, i }) => (
                  <span key={i}>{p.label}</span>
                ))}
              </div>
            </div>
          )}

          {/* Minute-level: the actual orders of the drilled hour */}
          {activeGranularity === "MINUTE" && hasData && (
            <div className="mt-4 pt-4 border-t space-y-2">
              <p className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                Orders in this hour · {fmtFocus(activeStart, activeEnd)}
              </p>
              {points
                .flatMap((p) => p.orders)
                .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                .map((o) => (
                  <div key={o.id} className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl border bg-background/50 text-xs">
                    <div className="min-w-0">
                      <p className="font-black text-foreground truncate">
                        {new Date(o.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        <span className="ml-2 font-mono text-[10px] text-muted-foreground">{o.id.slice(-6).toUpperCase()}</span>
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {o.items?.map((i) => `${i.quantity}× ${i.name}`).join(", ") || "No items"}
                      </p>
                    </div>
                    <span className="font-black text-foreground shrink-0">{formatETB(o.total || 0)}</span>
                  </div>
                ))}
            </div>
          )}

          {drillable && hasData && (
            <p className="mt-3 text-[10px] font-semibold text-muted-foreground/80">
              Click any point to drill into its {LEVEL_LABEL[NEXT_LEVEL[activeGranularity]!].toLowerCase()}.
            </p>
          )}
        </>
      ) : (
        /* CUSTOMERS DIMENSION */
        <div className="mt-4 space-y-2">
          {customers.length === 0 ? (
            <p className="py-12 text-center text-xs font-bold text-muted-foreground">
              No paid customers in this period.
            </p>
          ) : (
            customers
              .filter((c) => customerKey === "all" || c.key === customerKey)
              .map((c) => (
                <div key={c.key} className="rounded-xl border overflow-hidden">
                  <button
                    onClick={() => setExpandedCustomer(expandedCustomer === c.key ? null : c.key)}
                    className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 hover:bg-muted/40 transition-colors text-left"
                    aria-expanded={expandedCustomer === c.key}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-black text-foreground truncate">{c.name}</p>
                      <p className="text-[11px] text-muted-foreground font-semibold">
                        {c.count} order{c.count !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-black text-primary">{formatETB(c.revenue)}</span>
                      <span className={cn("text-muted-foreground transition-transform", expandedCustomer === c.key && "rotate-90")}>›</span>
                    </div>
                  </button>
                  {expandedCustomer === c.key && (
                    <div className="px-3.5 pb-3 space-y-1.5 border-t bg-muted/20">
                      {c.orders
                        .slice()
                        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                        .map((o) => (
                          <div key={o.id} className="flex items-center justify-between gap-3 py-1.5 text-xs">
                            <div className="min-w-0">
                              <p className="font-bold text-foreground truncate">
                                {new Date(o.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}{" "}
                                {new Date(o.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                <span className="ml-2 font-mono text-[10px] text-muted-foreground">{o.id.slice(-6).toUpperCase()}</span>
                              </p>
                              <p className="text-[11px] text-muted-foreground truncate">
                                {o.items?.map((i) => `${i.quantity}× ${i.name}`).join(", ") || "No items"}
                              </p>
                            </div>
                            <span className="font-black text-foreground shrink-0">{formatETB(o.total || 0)}</span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              ))
          )}
        </div>
      )}
    </div>
  );
}
