"use client";

import { useMemo, useState } from "react";
import { Order } from "@/types";
import { formatETB } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { DateRange } from "@/lib/owner";

/**
 * Drillable revenue analytics.
 *
 * Buckets PAID orders by exact local `createdAt` instants — no server math —
 * and lets the owner drill from the whole period down through
 * YEAR → MONTH → WEEK → DAY → HOUR → MINUTE by clicking a point, rendered as
 * a line graph. A separate "Customers" dimension ranks the same orders by who
 * placed them. Every figure is real; nothing is invented.
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
          end: new Date(y, 11, 31),
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
        const e = new Date(c.getFullYear(), c.getMonth() + 1, 0);
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
        const e = new Date(c.getFullYear(), c.getMonth(), c.getDate() + 6);
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
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const s = start.toLocaleDateString("en-US", opts);
  const e = end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return start.getTime() === end.getTime() ? e : `${s} – ${e}`;
}

interface TrendPoint {
  key: string;
  label: string;
  revenue: number;
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
  range: DateRange;
}

export function DrilldownTrend({ orders, range }: DrilldownTrendProps) {
  const [dimension, setDimension] = useState<"time" | "customers">("time");
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

  const rangeStart = useMemo(() => {
    const d = new Date(`${range.from}T00:00:00`);
    // For "All Time" start from the earliest order, not the sentinel year.
    if (range.label === "All Time" && paidOrders.length > 0) {
      const earliest = new Date(Math.min(...paidOrders.map((o) => new Date(o.createdAt).getTime())));
      return new Date(earliest.getFullYear(), earliest.getMonth(), 1);
    }
    return d;
  }, [range.from, range.label, paidOrders]);

  const rangeEnd = useMemo(() => new Date(`${range.to}T23:59:59`), [range.to]);

  // NOTE: the parent keys this component by the reporting period, so a range
  // change remounts it and all drill state resets naturally.

  const activeFocus = focus ?? { start: rangeStart, end: rangeEnd };
  const activeStart = activeFocus.start;
  const activeEnd = activeFocus.end;
  const activeGranularity = granularity ?? defaultGranularity(activeStart, activeEnd);

  const focusStart = activeStart.getTime();
  const focusEnd = activeEnd.getTime();

  const points: TrendPoint[] = useMemo(() => {
    const defs = buildBuckets(new Date(focusStart), new Date(focusEnd), activeGranularity);
    const filled = defs.map((b) => ({
      ...b,
      revenue: 0,
      count: 0,
      orders: [] as Order[],
    }));
    for (const o of paidOrders) {
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
    return filled;
  }, [paidOrders, focusStart, focusEnd, activeGranularity]);

  const customers: CustomerRow[] = useMemo(() => {
    const map = new Map<string, CustomerRow>();
    for (const o of paidOrders) {
      const isDineIn = o.type === "DINE_IN";
      const key =
        o.customerName?.trim() ||
        (isDineIn ? (o.tableName || (o.tableId ? `Table ${o.tableId}` : "Dine-in")) : "Walk-in");
      const cur = map.get(key) ?? { key, name: key, revenue: 0, count: 0, orders: [] as Order[] };
      cur.revenue += o.total || 0;
      cur.count += 1;
      cur.orders.push(o);
      map.set(key, cur);
    }
    return [...map.values()].sort((a, b) => b.revenue - a.revenue);
  }, [paidOrders]);

  const maxRevenue = Math.max(...points.map((p) => p.revenue), 0);
  const totalRevenue = points.reduce((s, p) => s + p.revenue, 0);
  const peak = points.reduce((best, p) => (p.revenue > best.revenue ? p : best), points[0] ?? { label: "—", revenue: 0 });
  const totalOrders = points.reduce((s, p) => s + p.count, 0);
  const avgBucket = points.length > 0 ? totalRevenue / points.length : 0;

  const drillable = NEXT_LEVEL[activeGranularity] !== null;
  const hasData = points.some((p) => p.revenue > 0);

  // Chart geometry (% coordinates). Top is 100 - ... we position with `bottom`.
  const TOP = 8;
  const BOTTOM = 86;
  const yFor = (revenue: number) =>
    maxRevenue > 0 ? BOTTOM - (revenue / maxRevenue) * (BOTTOM - TOP) : BOTTOM;
  const linePoints = points
    .map((p, i) => `${((i + 0.5) / Math.max(points.length, 1)) * 100},${yFor(p.revenue)}`)
    .join(" ");
  const areaPath =
    points.length > 0
      ? `M0,${BOTTOM} L${points
          .map((p, i) => `${((i + 0.5) / points.length) * 100},${yFor(p.revenue)}`)
          .join(" L")} L100,${BOTTOM} Z`
      : "";

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

  return (
    <div className="bg-card border rounded-2xl p-5 shadow-sm">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-black text-sm text-foreground">Revenue Analytics</h3>
          <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
            {focus
              ? `${LEVEL_LABEL[activeGranularity]} · ${fmtFocus(activeStart, activeEnd)}`
              : `${LEVEL_LABEL[activeGranularity]} · ${range.display}`}
          </p>
        </div>

        <div className="flex items-center gap-2">
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
              <span className="text-[10px] font-bold text-muted-foreground uppercase block">Total</span>
              <span className="text-sm font-black text-foreground">{formatETB(totalRevenue)}</span>
            </div>
            <div className="rounded-xl border bg-muted/20 px-3 py-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase block">Peak {peak.label}</span>
              <span className="text-sm font-black text-foreground">{formatETB(peak.revenue)}</span>
            </div>
            <div className="rounded-xl border bg-muted/20 px-3 py-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase block">Avg / {LEVEL_LABEL[activeGranularity].toLowerCase().slice(0, -1)}</span>
              <span className="text-sm font-black text-foreground">{formatETB(avgBucket)}</span>
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
              <div className="relative h-52">
                {/* Grid lines */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="w-full border-t border-border/50" />
                  ))}
                </div>

                {/* Line + area */}
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <defs>
                    <linearGradient id="drillArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  {areaPath && <path d={areaPath} fill="url(#drillArea)" />}
                  {linePoints && (
                    <polyline
                      points={linePoints}
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="2.2"
                      vectorEffect="non-scaling-stroke"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                  )}
                </svg>

                {/* Hit targets + tooltip */}
                {points.map((p, i) => {
                  const left = ((i + 0.5) / points.length) * 100;
                  const bottom = yFor(p.revenue);
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
                      aria-label={`${p.label}: ${formatETB(p.revenue)}, ${p.count} orders${drillable ? ", click to drill in" : ""}`}
                      className={cn(
                        "absolute -translate-x-1/2 translate-y-1/2 h-3.5 w-3.5 rounded-full border-2 transition-all focus-visible:outline-2 focus-visible:outline-amber-500",
                        p.revenue > 0
                          ? "bg-amber-500 border-background shadow-md"
                          : "bg-muted border-border",
                        hoverIdx === i && "scale-150 bg-amber-600"
                      )}
                      style={{ left: `${left}%`, bottom: `${bottom}%` }}
                    />
                  );
                })}

                {/* Tooltip */}
                {hovered && (
                  <div
                    className="absolute z-10 -translate-x-1/2 -translate-y-full bg-foreground text-background text-[11px] font-bold rounded-xl px-3 py-2 shadow-xl whitespace-nowrap pointer-events-none"
                    style={{ left: `${((hoverIdx! + 0.5) / points.length) * 100}%`, bottom: `${yFor(hovered.revenue) + 8}%` }}
                  >
                    <span className="block">{hovered.label}</span>
                    <span className="block text-amber-500">{formatETB(hovered.revenue)}</span>
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
                        <span className="ml-2 font-mono text-[10px] text-muted-foreground">#{o.id.slice(-6).toUpperCase()}</span>
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
            customers.map((c) => (
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
                              <span className="ml-2 font-mono text-[10px] text-muted-foreground">#{o.id.slice(-6).toUpperCase()}</span>
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
