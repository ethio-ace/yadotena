"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";

/**
 * Shared table-id → human-label map (e.g. "bl-04" → "Table 04 (VIP Lounge)").
 * One fetch, cached under ["tables"], reused by every shared-chrome surface so
 * staff never see raw database ids.
 */
export function useTableLabels(): Record<string, string> {
  const { data: tables = [] } = useQuery({
    queryKey: ["tables"],
    queryFn: api.tables.getAll,
    staleTime: 5 * 60 * 1000,
  });
  return Object.fromEntries(tables.map((t) => [t.id, t.name]));
}

/** Format a raw table id for display, preferring the real table name. */
export function formatTableRef(
  tableId: string | undefined,
  labels: Record<string, string>
): string {
  if (!tableId) return "";
  return labels[tableId] || `Table ${tableId.replace(/^t/i, "")}`;
}
