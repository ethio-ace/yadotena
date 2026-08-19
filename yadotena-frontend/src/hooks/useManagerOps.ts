"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { computeManagerMetrics, startOfTodayISO, ManagerMetrics } from "@/lib/manager";

// Stable within a day; only changes at local midnight, which refetches today's data.
const TODAY = startOfTodayISO();

/**
 * Single source of truth for the manager's operational state.
 *
 * Orders are fetched for today only (backend `since` filter) so revenue and
 * order counts are honest. Query keys keep the Ably prefix (`["orders"]`,
 * `["tables"]`, `["serviceRequests"]`), so realtime events invalidate these
 * queries automatically; the poll interval is only a safety net.
 */
export function useManagerOps() {
  const orders = useQuery({
    queryKey: ["orders", "today"],
    queryFn: () => api.orders.getAllSince(TODAY),
    refetchInterval: 15000,
  });

  // Belt and suspenders: the backend `since` filter trims the payload once
  // deployed, but older backends ignore it and would return the all-time list.
  // Filtering client-side by createdAt keeps "today" metrics honest against
  // any backend — never padded with yesterday's or last week's tickets.
  const todayOrders = (orders.data ?? []).filter(
    (o) => o.createdAt && new Date(o.createdAt) >= new Date(TODAY)
  );

  const menu = useQuery({
    queryKey: ["menu"],
    queryFn: api.menu.getAll,
    refetchInterval: 15000,
  });

  const tables = useQuery({
    queryKey: ["tables"],
    queryFn: api.tables.getAll,
    refetchInterval: 15000,
  });

  const serviceRequests = useQuery({
    queryKey: ["serviceRequests"],
    queryFn: api.serviceRequests.getAll,
    staleTime: 5000,
  });

  const payments = useQuery({
    queryKey: ["payments"],
    queryFn: api.payments.getAll,
    refetchInterval: 15000,
  });

  const metrics: ManagerMetrics = computeManagerMetrics({
    orders: todayOrders,
    menuItems: menu.data ?? [],
    tables: tables.data ?? [],
    serviceRequests: serviceRequests.data ?? [],
    payments: payments.data ?? [],
  });

  // Map raw table ids ("bl-04") to human table names for display.
  const tableNameById: Record<string, string> = Object.fromEntries(
    (tables.data ?? []).map((t) => [t.id, t.name])
  );

  return {
    metrics,
    tableNameById,
    isLoading:
      orders.isLoading ||
      menu.isLoading ||
      tables.isLoading ||
      serviceRequests.isLoading ||
      payments.isLoading,
    isError:
      orders.isError ||
      menu.isError ||
      tables.isError ||
      serviceRequests.isError ||
      payments.isError,
    refetchAll: () => {
      orders.refetch();
      menu.refetch();
      tables.refetch();
      serviceRequests.refetch();
      payments.refetch();
    },
  };
}
