"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { Expense, PaymentRecord } from "@/types";
import {
  computeOwnerMetrics,
  getDateRange,
  OwnerAnalytics,
  OwnerMetrics,
  OwnerRange,
} from "@/lib/owner";

/**
 * Single source of truth for the owner's business snapshot.
 *
 * The core numbers (revenue, paid orders, top products, payment mix, daily
 * trend) come from the backend's date-ranged `/staff/analytics` aggregation,
 * so the frontend never sums order lists itself for revenue. Expenses are
 * filtered by their recorded `date` inside the same range. Attention items
 * (unpaid orders, out-of-stock products, pending verification) are derived
 * from the same queries the rest of the app uses.
 *
 * Query keys keep their plain prefixes (["orders"], ["menu"], ["payments"],
 * ["expenses"]) so existing mutations and realtime events invalidate them;
 * the intervals are only a low-intensity safety net for the owner.
 */
export function useOwnerOps() {
  const [rangeKey, setRangeKey] = useState<OwnerRange>("today");
  const range = getDateRange(rangeKey);

  const analytics = useQuery({
    queryKey: ["owner", "analytics", range.from, range.to],
    queryFn: () =>
      api.analytics.getSummary({ range: rangeKey, from: range.from, to: range.to }) as Promise<OwnerAnalytics>,
    refetchInterval: 60_000,
  });

  const orders = useQuery({
    queryKey: ["orders", "owner"],
    queryFn: () => api.orders.getAllSince(range.fromInstant),
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

  const metrics: OwnerMetrics = computeOwnerMetrics({
    range,
    analytics: analytics.data,
    expenses: (expenses.data ?? []) as Expense[],
    orders: orders.data ?? [],
    menuItems: menu.data ?? [],
    payments: (payments.data ?? []) as PaymentRecord[],
  });

  return {
    rangeKey,
    setRangeKey,
    metrics,
    recentActivity: activity.data ?? [],
    isLoading:
      analytics.isLoading || orders.isLoading || expenses.isLoading || menu.isLoading,
    isError:
      analytics.isError ||
      orders.isError ||
      expenses.isError ||
      menu.isError ||
      payments.isError ||
      activity.isError,
    refetchAll: () => {
      analytics.refetch();
      orders.refetch();
      expenses.refetch();
      menu.refetch();
      payments.refetch();
      activity.refetch();
    },
  };
}
