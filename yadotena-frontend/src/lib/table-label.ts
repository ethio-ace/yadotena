import type { Table } from "@/types";

/** Prefer table.name from API; fall back to a short id snippet. */
export function tableLabel(tableId: string | undefined, tables?: Table[]): string {
  if (!tableId) return "—";
  const match = tables?.find((t) => t.id === tableId);
  if (match?.name) return match.name;
  if (tableId.startsWith("t") && tableId.length < 8) {
    return `Table ${tableId.replace(/^t/, "").padStart(2, "0")}`;
  }
  return `Table ${tableId.slice(0, 8)}`;
}
