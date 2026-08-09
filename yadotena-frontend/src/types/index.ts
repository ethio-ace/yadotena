export type Role = "CUSTOMER" | "WAITER" | "KITCHEN" | "MANAGER" | "OWNER";

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: Role;
  image?: string;
  avatar_url?: string;
  status: "ACTIVE" | "INACTIVE";
  joinedDate?: string;
  is_active?: boolean;
}

export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PREPARING"
  | "READY"
  | "SERVED"
  | "COMPLETED"
  | "CANCELLED";

export type OrderType =
  | "DINE_IN"
  | "TAKEAWAY"
  | "DELIVERY"
  | "SHOP_PICKUP"
  | "SHOP_DELIVERY";
export type PaymentStatus =
  | "PENDING"
  | "PENDING_VERIFICATION"
  | "PAID"
  | "REJECTED"
  | "REFUNDED";

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

export interface ProductCategory {
  id: string;
  name: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface Product {
  id: string;
  categoryId: string;
  category: string;
  name: string;
  description: string;
  price: number;
  image: string;
  available: boolean;
  sortOrder?: number;
}

export interface OrderItem {
  id: string;
  menuItemId?: string;
  productId?: string;
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

/** Extra fields accepted by api.orders.create (not always on Order responses). */
export type CreateOrderInput = Omit<Order, "id" | "createdAt" | "updatedAt"> & {
  paymentMethod?: "cash" | "digital";
  digitalMethod?: string;
  reference?: string;
};

export interface Review {
  id: string;
  customerName: string;
  rating: number;
  comment: string;
  date: string;
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
