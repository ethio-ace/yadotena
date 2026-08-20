export interface User {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  role: UserRole;
  branchId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type UserRole = 'OWNER' | 'MANAGER' | 'WAITER' | 'CHEF';

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  category?: string;
  isAvailable: boolean;
  branchId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MenuCategory {
  id: string;
  name: string;
  description?: string;
  displayOrder: number;
  branchId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  categoryId: string;
  isAvailable: boolean;
  branchId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  id: string;
  tableNumber?: string;
  customerName?: string;
  totalAmount: number;
  status: OrderStatus;
  orderType: OrderType;
  branchId?: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  orderItems: OrderItem[];
  payments: Payment[];
  createdByUser?: User;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId?: string;
  menuItemId?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
  createdAt: string;
  product?: Product;
  menuItem?: MenuItem;
}

export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';
export type OrderType = 'MENU' | 'RETAIL';

export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  transactionReference?: string;
  receiptImageUrl?: string;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
  order?: Order;
}

export type PaymentMethod = 'CASH' | 'DIGITAL_BANK' | 'WALLET';
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
}

export interface ApiResponse<T> {
  data: T;
}

export interface ApiErrorResponse {
  error: string;
}

export interface CreateOrderItemReq {
  productId?: string;
  menuItemId?: string;
  quantity: number;
  unitPrice: number;
  notes?: string;
}

export interface CreateOrderReq {
  tableNumber?: string;
  customerName?: string;
  orderType: OrderType;
  orderItems: CreateOrderItemReq[];
}

export interface CreatePaymentReq {
  orderId: string;
  amount: number;
  method: PaymentMethod;
  transactionReference?: string;
  receiptImageUrl?: string;
}
