import { Table, Order } from "@/types";

/**
 * Checks if an order is active (not completed, not cancelled, and not paid).
 */
export function isOrderActive(order?: Order | null): boolean {
  if (!order) return false;
  if (order.status === "COMPLETED" || order.status === "CANCELLED") return false;
  if (order.paymentStatus === "PAID") return false;
  return true;
}

/**
 * Robustly matches an active order for a given table across table.currentOrderId,
 * strict tableId, tableName, and normalized format aliases (tbl-01, t1, Table 1, 1).
 */
export function findActiveOrderForTable(table?: Table | null, orders?: Order[] | null): Order | undefined {
  if (!table || !orders || orders.length === 0) return undefined;

  const activeOrders = orders.filter(isOrderActive);
  if (activeOrders.length === 0) return undefined;

  // 1. Direct match by table's currentOrderId (primary key guarantee)
  if (table.currentOrderId) {
    const byCurrentId = activeOrders.find((o) => o.id === table.currentOrderId);
    if (byCurrentId) return byCurrentId;
  }

  // Normalize helper: strip 'table', 'tbl-', 't', whitespace, and leading zeroes
  const normalize = (s?: string) => {
    if (!s) return "";
    return s
      .toLowerCase()
      .trim()
      .replace(/^(table\s*|tbl-?|t)/i, "")
      .trim()
      .replace(/^0+/, "");
  };

  const tableIdNorm = normalize(table.id);
  const tableNameNorm = normalize(table.name);

  // 2. Strict match by table.id or table.name
  const exactMatch = activeOrders.find(
    (o) => o.tableId === table.id || (table.name && o.tableId === table.name)
  );
  if (exactMatch) return exactMatch;

  // 3. Normalized alias match
  const aliasMatch = activeOrders.find((o) => {
    if (!o.tableId) return false;
    const oNorm = normalize(o.tableId);
    if (!oNorm) return false;
    return oNorm === tableIdNorm || oNorm === tableNameNorm || o.tableId === tableIdNorm || o.tableId === tableNameNorm;
  });

  return aliasMatch;
}

