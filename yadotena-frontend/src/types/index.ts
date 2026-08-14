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
  image: string;
  available: boolean;
  preparationTime: number; // in minutes
  dietaryTags?: string[]; // e.g. "Spicy", "Vegetarian", "Halal", "Chef's Special"
  customAddons?: MenuItemAddon[];
  calories?: number;
}

export interface OrderItem {
  id: string;
  menuItemId: string;
  name: string; // snapshot of name
  price: number; // snapshot of price
  quantity: number;
  specialInstructions?: string;
  selectedAddons?: { id: string; name: string; price: number }[];
  roundNumber?: number;
}

export interface Order {
  id: string;
  type: OrderType;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  items: OrderItem[];
  subtotal?: number;
  tax?: number;
  serviceCharge?: number;
  deliveryFee?: number;
  total: number;
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
  tableName: string;
  type: "WAITER" | "BILL" | "ASSISTANCE";
  status: "PENDING" | "RESOLVED";
  createdAt: string;
  notes?: string;
}
