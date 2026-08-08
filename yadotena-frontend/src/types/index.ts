export type Role = "CUSTOMER" | "WAITER" | "KITCHEN" | "MANAGER" | "OWNER";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  image?: string;
  status: "ACTIVE" | "INACTIVE";
}

export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PREPARING"
  | "READY"
  | "SERVED"
  | "COMPLETED"
  | "CANCELLED";

export type OrderType = "DINE_IN" | "TAKEAWAY" | "DELIVERY";
export type PaymentStatus = "PENDING" | "PAID" | "REFUNDED";

export interface MenuItemAddon {
  id: string;
  name: string;
  price: number; // in ETB
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
}

export interface Order {
  id: string;
  type: OrderType;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  items: OrderItem[];
  total: number;
  createdAt: string;
  updatedAt: string;
  
  // Specific to Dine-in
  tableId?: string;
  
  // Specific to Takeaway/Delivery
  customerName?: string;
  customerPhone?: string;
  
  // Specific to Delivery
  deliveryAddress?: string;
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
  recordedBy: string; // User ID
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
