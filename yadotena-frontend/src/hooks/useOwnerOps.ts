"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { Expense, MenuItem, Order, PaymentRecord } from "@/types";
import {
  comparePeriods,
  computeOwnerMetrics,
  CustomRange,
  getDateRange,
  getPreviousDateRange,
  OwnerMetrics,
  OwnerRange,
  PeriodComparison,
} from "@/lib/owner";

/**
 * Single source of truth for the owner's business snapshot.
 *
 * Every metric is derived from the range-filtered order list bucketed in
 * local (café) time — see `lib/owner.ts` for why local-instant bucketing is
 * used instead of the backend's UTC date cast. Expenses are filtered by
 * their recorded `date` inside the same range. Attention items (unpaid
 * orders, out-of-stock products, pending verification) are derived from the
 * same queries the rest of the app uses.
 *
 * Query keys keep their plain prefixes (["orders"], ["menu"], ["payments"],
 * ["expenses"]) so existing mutations and realtime events invalidate them;
 * the intervals are only a low-intensity safety net for the owner.
 */
export function useOwnerOps(rangeOverride?: OwnerRange, customRange?: CustomRange) {
  // Controlled mode: when the caller owns the range (e.g. the Analytics Hub
  // keeps it in the URL), the override is authoritative and must stay in sync
  // on every render. Otherwise fall back to internal state (owner overview).
  const isControlled = rangeOverride !== undefined;
  const [internalRangeKey, setInternalRangeKey] = useState<OwnerRange>(
    rangeOverride ?? "today"
  );
  const rangeKey = isControlled ? rangeOverride : internalRangeKey;
  const setRangeKey = (r: OwnerRange) => setInternalRangeKey(r);
  const range = getDateRange(rangeKey, new Date(), customRange);
  // The equivalent earlier window for "vs last period" deltas.
  const previousRange = getPreviousDateRange(range, rangeKey);

  const orders = useQuery({
    // The cutoff is part of the key so switching ranges actually refetches
    // instead of serving the previously-fetched window.
    queryKey: ["orders", "owner", range.fromInstant],
    queryFn: () => api.orders.getAllSince(range.fromInstant),
    refetchInterval: 60_000,
  });

  const previousOrders = useQuery({
    queryKey: ["orders", "owner", "prev", previousRange.fromInstant],
    queryFn: () => api.orders.getAllSince(previousRange.fromInstant),
    // Only needed for the comparison; refresh on the same slow cadence.
    refetchInterval: 60_000,
  });

  const expenses = useQuery({
    queryKey: ["expenses"],
    queryFn: api.expenses.getAll,
    refetchInterval: 60_000,
  });

  const menu = useQuery({
    queryKey: ["menu"],
    queryFn: api.menu.getAll,
    refetchInterval: 60_000,
  });

  const payments = useQuery({
    queryKey: ["payments"],
    queryFn: api.payments.getAll,
    refetchInterval: 60_000,
  });

  const activity = useQuery({
    queryKey: ["activityLogs", { limit: 6 }],
    queryFn: () => api.activityLogs.getAll({ limit: 6 }),
    refetchInterval: 60_000,
  });

  const metrics: OwnerMetrics = useMemo(
    () =>
      computeOwnerMetrics({
        range,
        expenses: (expenses.data ?? []) as Expense[],
        orders: orders.data ?? [],
        menuItems: menu.data ?? [],
        payments: (payments.data ?? []) as PaymentRecord[],
      }),
    [range, expenses.data, orders.data, menu.data, payments.data]
  );

  // Previous-period metrics + deltas, derived from the same computation so
  // the comparison is always apples-to-apples.
  const previousMetrics: OwnerMetrics = useMemo(
    () =>
      computeOwnerMetrics({
        range: previousRange,
        expenses: (expenses.data ?? []) as Expense[],
        orders: previousOrders.data ?? [],
        menuItems: menu.data ?? [],
        payments: (payments.data ?? []) as PaymentRecord[],
      }),
    [previousRange, expenses.data, previousOrders.data, menu.data, payments.data]
  );

  const comparison: PeriodComparison = useMemo(
    () => comparePeriods(metrics, previousMetrics),
    [metrics, previousMetrics]
  );

  return {
    rangeKey,
    setRangeKey,
    range,
    metrics,
    /** Metrics for the equivalent earlier period (e.g. yesterday / last week). */
    previousMetrics,
    /** Deltas comparing `metrics` to the previous period. */
    comparison,
    /** Raw range-filtered orders (shared query — same cache the overview uses). */
    orders: (orders.data ?? []) as Order[],
    /** Live menu (used to join order items back to category / retail channel). */
    menuItems: (menu.data ?? []) as MenuItem[],
    /** Recorded expenses (date + amount) — drawn as the second analytics series. */
    expenses: (expenses.data ?? []) as Expense[],
    recentActivity: activity.data ?? [],
    isLoading: orders.isLoading || previousOrders.isLoading || expenses.isLoading || menu.isLoading,
    isError:
      orders.isError ||
      previousOrders.isError ||
      expenses.isError ||
      menu.isError ||
      payments.isError ||
      activity.isError,
    refetchAll: () => {
      orders.refetch();
      previousOrders.refetch();
      expenses.refetch();
      menu.refetch();
      payments.refetch();
      activity.refetch();
    },
  };
}
