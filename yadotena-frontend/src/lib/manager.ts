import { MenuItem, Order, PaymentRecord, ServiceRequest, Table } from "@/types";

/**
 * Manager operational metrics, computed from one shared view of server state.
 * The header badge and the overview both consume `useManagerOps()`, so the
 * attention count can never drift between them.
 */
export interface ManagerMetrics {
  /** Today's non-terminal orders (active tickets on the floor/line). */
  todayOrders: Order[];
  /** Money taken today: PAID minus REFUNDED payment records since local midnight (matches Day Close). */
  todayRevenue: number;
  /** Total orders created today. */
  totalOrdersToday: number;
  /** Average value of today's settled orders. */
  avgOrderValue: number;
  /** Today's open orders still awaiting settlement. */
  unpaidOrders: Order[];
  /** Digital payments waiting for manager verification. */
  pendingVerification: number;
  /** Menu items marked unavailable. */
  outOfStockCount: number;
  /** The unavailable menu items themselves (for the stock watch). */
  unavailableItems: MenuItem[];
  /** Tables in any in-use state (not just OCCUPIED). */
  activeTables: number;
  totalTables: number;
  /** Open table assistance calls. */
  pendingServiceCalls: number;
  /** Everything that needs the manager's attention today. */
  attentionCount: number;
}

/** Local midnight as an ISO timestamp — the cutoff for "today's" orders. */
export function startOfTodayISO(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
}

export function greetingForHour(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function computeManagerMetrics(opts: {
  orders: Order[];
  menuItems: MenuItem[];
  tables: Table[];
  serviceRequests: ServiceRequest[];
  payments: PaymentRecord[];
}): ManagerMetrics {
  const { orders, menuItems, tables, serviceRequests, payments } = opts;

  const activeOrders = orders.filter((o) => !["COMPLETED", "CANCELLED"].includes(o.status));
  const unpaidOrders = orders.filter(
    (o) => o.paymentStatus === "PENDING" && o.status !== "CANCELLED"
  );
  const pendingVerification = payments.filter(
    (p) => p.status === "PENDING_VERIFICATION"
  ).length;
  // The backend derives several in-use states (ORDERING, PREPARING,
  // WAITING_FOR_SERVICE, WAITING_FOR_PAYMENT, OCCUPIED) — anything not
  // AVAILABLE is an occupied table.
  const activeTables = tables.filter((t) => t.status !== "AVAILABLE").length;
  const pendingServiceCalls = serviceRequests.filter((r) => r.status === "PENDING").length;
  const midnight = new Date(startOfTodayISO()).getTime();
  const todayPayments = payments.filter(
    (p) => (p.status === "PAID" || p.status === "REFUNDED") && new Date(p.createdAt).getTime() >= midnight
  );
  const todayRevenue = todayPayments.reduce(
    (sum, p) => sum + (p.status === "REFUNDED" ? -1 : 1) * (Number(p.amount) || 0), 0
  );
  const paidTicketCount = new Set(todayPayments.filter((p) => p.status === "PAID").map((p) => p.orderId)).size;
  const unavailableItems = menuItems.filter((i) => i.available === false);
  const outOfStockCount = unavailableItems.length;

  const attentionCount =
    pendingVerification + outOfStockCount + unpaidOrders.length + pendingServiceCalls;

  return {
    todayOrders: activeOrders,
    todayRevenue,
    totalOrdersToday: orders.length,
    avgOrderValue: paidTicketCount > 0 ? todayRevenue / paidTicketCount : 0,
    unpaidOrders,
    pendingVerification,
    outOfStockCount,
    unavailableItems,
    activeTables,
    totalTables: tables.length,
    pendingServiceCalls,
    attentionCount,
  };
}
