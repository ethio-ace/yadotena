import { Table, Order } from "@/types";

/**
 * Is this ticket still open on its table? Mirrors the backend's
 * OPEN_ORDER_STATUSES: only COMPLETED/CANCELLED are closed. A ticket paid
 * early is still open while its food cooks (the server auto-completes it
 * once everything is served) — treating PAID as closed made the table look
 * free while new orders silently merged into the paid ticket.
 */
export function isOrderActive(order?: Order | null): boolean {
  if (!order) return false;
  return order.status !== "COMPLETED" && order.status !== "CANCELLED";
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


/**
 * Resolve whatever a guest gave us — a QR `?table=` code, a typed number
 * ("4", "Table 04", "tbl-04"), or a code remembered from an older build — to a
 * real table on the roster. Returns undefined when nothing matches, so callers
 * never send the API a table id that does not exist.
 */
export function resolveTable(code?: string | null, tables?: Table[] | null): Table | undefined {
  if (!code || !tables || tables.length === 0) return undefined;
  const raw = code.trim();
  const exact = tables.find((t) => t.id === raw) || tables.find((t) => t.name?.toLowerCase() === raw.toLowerCase());
  if (exact) return exact;
  const norm = (s?: string) =>
    (s || "").toLowerCase().trim().replace(/^(table\s*|tbl-?|t)/i, "").trim().replace(/^0+(?=\d)/, "");
  const target = norm(raw);
  if (!target) return undefined;
  const matches = tables.filter((t) => norm(t.id) === target || norm(t.name) === target);
  // Only accept an unambiguous alias match.
  return matches.length === 1 ? matches[0] : undefined;
}

/**
 * Every open ticket on a table, newest first. Staff can open several tickets
 * on one table (a new party, a separate bill), so the floor and the table
 * screen must not assume there is only one.
 */
export function findActiveOrdersForTable(table?: Table | null, orders?: Order[] | null): Order[] {
  if (!table || !orders || orders.length === 0) return [];
  const normalize = (s?: string) =>
    (s || "").toLowerCase().trim().replace(/^(table\s*|tbl-?|t)/i, "").trim().replace(/^0+/, "");
  const idNorm = normalize(table.id);
  const nameNorm = normalize(table.name);
  const exact = orders.filter(
    (o) => isOrderActive(o) && (o.id === table.currentOrderId || o.tableId === table.id || (!!table.name && o.tableId === table.name))
  );
  // Only fall back to alias matching (legacy `t1` codes) when nothing matched exactly.
  const matched = exact.length
    ? exact
    : orders.filter((o) => {
        if (!isOrderActive(o) || !o.tableId) return false;
        const n = normalize(o.tableId);
        return !!n && (n === idNorm || n === nameNorm);
      });
  return [...matched].sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
}
