import type { Table } from "@/types";

/** Prefer knownName / table.name from API; never mangle UUID ids. */
export function tableLabel(
  tableId: string | undefined | null,
  tables?: Table[],
  knownName?: string | null,
): string {
  if (knownName?.trim()) return knownName.trim();
  if (!tableId) return "—";
  const match = tables?.find((t) => t.id === tableId);
  if (match?.name) return match.name;
  return "Table";
}
