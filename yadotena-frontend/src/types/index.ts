export type Role = "WAITER" | "KITCHEN" | "MANAGER" | "OWNER";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone?: string;
  image?: string;
  avatar_url?: string;
  status: "ACTIVE" | "INACTIVE";
  joinedDate?: string;
  is_active?: boolean;
}

export type OrderStatus =
  | "DRAFT"
  | "PENDING"
  | "PREPARING"
  | "READY"
  | "SERVED"
  | "COMPLETED"
  | "CANCELLED";

export type OrderType = "DINE_IN" | "TAKEAWAY" | "DELIVERY";
export type PaymentStatus = "PENDING" | "PAID" | "REFUNDED";

export type AddonScope = "GLOBAL" | "CATEGORY" | "ITEM";

export interface MenuItemAddon {
  id: string;
  name: string;
  price: number; // in ETB
  description?: string;
  imageUrl?: string;
  image?: string;
  scope?: AddonScope;
  categoryId?: string;
  categoryName?: string;
  menuItemId?: string;
  menuItemName?: string;
  isGlobal?: boolean;
  isActive?: boolean;
}

export interface AddonItem {
  id: string;
  name: string;
  price: number;
  description?: string;
  imageUrl?: string;
  image?: string;
  scope: AddonScope;
  categoryId?: string;
  categoryName?: string;
  menuItemId?: string;
  menuItemName?: string;
  isGlobal: boolean;
  isActive: boolean;
  sortOrder?: number;
  createdAt?: string;
}

export interface MenuCategory {
  id: string;
  name: string;
  icon: string;
  description?: string;
  sortOrder?: number;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  categoryId?: string;
  image?: string;
  imageUrl?: string;
  available: boolean;
  preparationTime: number; // in minutes
  dietaryTags?: string[]; // e.g. "Spicy", "Vegetarian", "Halal", "Chef's Special"
  customAddons?: MenuItemAddon[];
  calories?: number;
}

export interface PaymentRecord {
  id: string;
  orderId: string;
  method: string;
  amount: number;
  status: string;
  transactionRef?: string;
  receiptUrl?: string;
  /** Refund reason / staff note (staff-only). */
  notes?: string;
  createdAt: string;
  recordedById?: string | null;
  recordedByName?: string | null;
}

/**
 * Kitchen lifecycle of a single line item. Rounds are the kitchen unit of
 * work: every item carries its own state so round 1 can be PREPARING while
 * round 2 (appended later) is still PENDING — the whole order never re-opens.
 */
/** DRAFT = placed by a guest from the public menu, waiting for a waiter to approve. */
export type ItemKitchenStatus = "DRAFT" | "PENDING" | "PREPARING" | "READY" | "SERVED" | "CANCELLED";

export interface OrderItem {
  id: string;
  menuItemId: string;
  name: string; // snapshot of name
  price: number; // snapshot of price
  quantity: number;
  specialInstructions?: string;
  selectedAddons?: { id: string; name: string; price: number }[];
  addons?: Array<{ id: string; name: string; price: number }> | string[];
  roundNumber?: number;
  status?: ItemKitchenStatus;
  startedAt?: string;
  completedAt?: string;
  /** Why the line was cancelled/voided (staff-only). */
  cancelReason?: string;
  cancelledAt?: string | null;
}

export interface Order {
  id: string;
  type: OrderType;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  items: OrderItem[];
  payments?: PaymentRecord[];
  subtotal?: number;
  tax?: number;
  serviceCharge?: number;
  deliveryFee?: number;
  total: number;
  /** Sum of PAID payment records (server-computed). */
  amountPaid?: number;
  /** What is still owed — only the new rounds on a ticket paid earlier. */
  balanceDue?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  
  // Specific to Dine-in
  tableId?: string;
  tableName?: string;
  
  // Specific to Takeaway/Delivery
  customerName?: string;
  customerPhone?: string;
  
  // Specific to Delivery
  deliveryAddress?: string;
  /** How a delivery customer said they'll pay (a hint for staff, not money). */
  paymentPreference?: PaymentPreference | "";

  /** Short daily ticket number ("#27"), restarts every cafe day. */
  dailyNumber?: number | null;
  businessDate?: string | null;
  /** Staff who took the order (guest orders: the approving waiter). Staff-only. */
  createdById?: string | null;
  createdByName?: string | null;
  cancelReason?: string;
  cancelledByName?: string | null;
  cancelledAt?: string | null;
  /** Set when this ticket was merged into another table's ticket. */
  mergedInto?: string | null;
}

export type PaymentPreference = "ON_DELIVERY" | "TRANSFER";

export interface RestaurantSettings {
  restaurantName: string;
  phone: string;
  address: string;
  serviceChargePercent: number;
  /** 0 = not VAT-registered: no VAT line anywhere. */
  vatPercent: number;
  deliveryFee: number;
  /** Website delivery switched on by the owner. */
  deliveryEnabled?: boolean;
  /** Cafe-local "HH:MM"; null = no limit. A window may cross midnight. */
  deliveryStartTime?: string | null;
  deliveryEndTime?: string | null;
  /** Server-computed: enabled and inside the hours right now. */
  deliveryOpenNow?: boolean;
  requireTableQrKey: boolean;
  guestWifiSsid: string;
  guestWifiPassword: string;
  updatedAt?: string;
}

export interface MenuIngredient {
  id: number;
  menuItemId: string;
  productId: string;
  productName: string;
  unit: string;
  quantity: number;
}

export interface DayCloseReport {
  date: string;
  totals: { collected: number; refunded: number; net: number; tickets: number; sales: number; voidValue: number };
  cash: { in: number; refunds: number; expenses: number; expected: number };
  byMethod: { method: string; collected: number; refunded: number; net: number; count: number; isCash: boolean }[];
  byStaff: { userId: string | null; name: string; collected: number; refunded: number; net: number; cash: number; count: number }[];
  byWaiter: { userId: string | null; name: string; orders: number; sales: number }[];
  refunds: { orderId: string; ticket: string; amount: number; method: string; reason: string; by: string; at: string }[];
  voids: { orderId: string; ticket: string; name: string; quantity: number; value: number; reason: string; by: string; wasCooked: boolean; at: string }[];
  cancelledTickets: { orderId: string; ticket: string; reason: string; by: string; at: string }[];
  openTickets: { orderId: string; ticket: string; table: string; status: string; total: number; balanceDue: number; createdAt: string }[];
  outOfStock: { id: string; name: string; stock: number; unit: string }[];
  closed: null | { countedCash: number; expectedCash: number; difference: number; notes: string; closedBy: string; closedAt: string };
}

export interface DiningSession {
  id: string;
  tableId: string;
  tableName?: string;
  sessionCode: string;
  status: "ACTIVE" | "BILLED" | "CLOSED";
  openOrderId?: string | null;
  startedAt?: string;
  closedAt?: string | null;
  active?: boolean;
}

export type TableStatus =
  | "AVAILABLE"
  | "OCCUPIED"
  | "ORDERING"
  | "PREPARING"
  | "WAITING_FOR_SERVICE"
  | "WAITING_FOR_PAYMENT"
  | "CLEANING";

export interface Table {
  id: string;
  name: string;
  capacity: number;
  status: TableStatus;
  currentOrderId?: string;
  /** Secret key printed in the table QR (staff-only). */
  qrToken?: string;
}

export interface Expense {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  recordedBy?: string; // User ID
  paymentMethod?: string;
  payment_method?: string;
  reference?: string;
}

export interface ServiceRequest {
  id: string;
  tableId: string;
  tableName?: string;
  type: "WAITER" | "BILL" | "ASSISTANCE";
  status: "PENDING" | "RESOLVED";
  createdAt: string;
  resolvedAt?: string;
  notes?: string;
}

// --- Inventory (retail products) ---
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  unit: string;
  stock_quantity: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductSale {
  id: string;
  product: string; // Product ID
  product_name?: string;
  quantity: number;
  total_price: number;
  sold_by?: string; // User ID
  sold_by_name?: string;
  sale_date: string;
}

export interface ProductPurchase {
  id: string;
  product: string; // Product ID
  product_name?: string;
  quantity: number;
  total_cost: number;
  purchased_by?: string; // User ID
  purchased_by_name?: string;
  purchase_date: string;
}

export interface ProductAnalyticsPeriod {
  quantity: number;
  total: number;
}

export interface ProductAnalytics {
  sales: {
    today: ProductAnalyticsPeriod;
    week: ProductAnalyticsPeriod;
    month: ProductAnalyticsPeriod;
    year: ProductAnalyticsPeriod;
  };
  purchases: {
    today: ProductAnalyticsPeriod;
    week: ProductAnalyticsPeriod;
    month: ProductAnalyticsPeriod;
    year: ProductAnalyticsPeriod;
  };
}
