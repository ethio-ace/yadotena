import { MenuItem, Table, User, Order } from "../types";

export const mockUsers: User[] = [
  { id: "1", name: "Alice Owner", email: "owner@demo.com", role: "OWNER", status: "ACTIVE" },
  { id: "2", name: "Bob Manager", email: "manager@demo.com", role: "MANAGER", status: "ACTIVE" },
  { id: "3", name: "Charlie Waiter", email: "waiter@demo.com", role: "WAITER", status: "ACTIVE" },
  { id: "4", name: "Dave Chef", email: "kitchen@demo.com", role: "KITCHEN", status: "ACTIVE" },
];

export const mockMenu: MenuItem[] = [
  {
    id: "m1",
    name: "Classic Chicken Burger",
    description: "Grilled chicken, lettuce, tomato and special sauce.",
    price: 9.5,
    category: "Burgers",
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80",
    available: true,
    preparationTime: 10,
  },
  {
    id: "m2",
    name: "Beef Steak",
    description: "Premium cut beef steak with herb butter.",
    price: 24.0,
    category: "Main Dishes",
    image: "https://images.unsplash.com/photo-1600891964092-4316c288032e?auto=format&fit=crop&w=800&q=80",
    available: true,
    preparationTime: 20,
  },
  {
    id: "m3",
    name: "Margherita Pizza",
    description: "Classic Italian pizza with fresh tomatoes and mozzarella.",
    price: 14.5,
    category: "Pizza",
    image: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=800&q=80",
    available: true,
    preparationTime: 15,
  },
  {
    id: "m4",
    name: "French Fries",
    description: "Crispy golden french fries with salt.",
    price: 5.0,
    category: "Sides",
    image: "https://images.unsplash.com/photo-1576107232684-1279f390859f?auto=format&fit=crop&w=800&q=80",
    available: true,
    preparationTime: 5,
  },
  {
    id: "m5",
    name: "Iced Latte",
    description: "Refreshing iced espresso with milk.",
    price: 4.5,
    category: "Drinks",
    image: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=800&q=80",
    available: true,
    preparationTime: 3,
  },
];

export const mockTables: Table[] = [
  { id: "t1", name: "Table 01", capacity: 2, status: "OCCUPIED" },
  { id: "t2", name: "Table 02", capacity: 4, status: "AVAILABLE" },
  { id: "t3", name: "Table 03", capacity: 4, status: "WAITING_FOR_SERVICE" },
  { id: "t4", name: "Table 04", capacity: 6, status: "AVAILABLE" },
  { id: "t5", name: "Table 05", capacity: 2, status: "AVAILABLE" },
  { id: "t6", name: "Table 06", capacity: 8, status: "PREPARING" },
  { id: "t7", name: "Table 07", capacity: 4, status: "CLEANING" },
  { id: "t8", name: "Table 08", capacity: 2, status: "AVAILABLE" },
];

export const mockOrders: Order[] = [
  {
    id: "ORD-1042",
    type: "DINE_IN",
    status: "PREPARING",
    paymentStatus: "PENDING",
    tableId: "t6",
    items: [
      { id: "oi1", menuItemId: "m1", name: "Classic Chicken Burger", price: 9.5, quantity: 2 },
      { id: "oi2", menuItemId: "m4", name: "French Fries", price: 5.0, quantity: 1, specialInstructions: "Extra crispy" },
    ],
    total: 24.0,
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
  },
  {
    id: "ORD-1043",
    type: "TAKEAWAY",
    status: "PENDING",
    paymentStatus: "PAID",
    customerName: "John Doe",
    customerPhone: "555-0192",
    items: [
      { id: "oi3", menuItemId: "m3", name: "Margherita Pizza", price: 14.5, quantity: 1 },
    ],
    total: 14.5,
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  },
  {
    id: "ORD-1044",
    type: "DINE_IN",
    status: "READY",
    paymentStatus: "PENDING",
    tableId: "t3",
    items: [
      { id: "oi4", menuItemId: "m5", name: "Iced Latte", price: 4.5, quantity: 2 },
    ],
    total: 9.0,
    createdAt: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
  },
];

export const mockExpenses = [
  { id: "e1", category: "Ingredients", description: "Weekly meat supply", amount: 450.00, date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), paymentMethod: "Bank Transfer", recordedBy: "Bob Manager" },
  { id: "e2", category: "Utilities", description: "Electricity bill", amount: 120.50, date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(), paymentMethod: "Credit Card", recordedBy: "Alice Owner" },
  { id: "e3", category: "Equipment", description: "Coffee machine maintenance", amount: 85.00, date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString(), paymentMethod: "Cash", recordedBy: "Bob Manager" },
];

export const mockEmployees = [
  { id: "emp1", name: "Alice Owner", email: "owner@demo.com", role: "OWNER", phone: "+251 91 111 1111", joinedDate: "2023-01-01", status: "ACTIVE" },
  { id: "emp2", name: "Bob Manager", email: "manager@demo.com", role: "MANAGER", phone: "+251 91 234 5678", joinedDate: "2023-05-12", status: "ACTIVE" },
  { id: "emp3", name: "Charlie Waiter", email: "waiter@demo.com", role: "WAITER", phone: "+251 92 345 6789", joinedDate: "2023-08-01", status: "ACTIVE" },
  { id: "emp4", name: "Dave Chef", email: "kitchen@demo.com", role: "KITCHEN", phone: "+251 93 456 7890", joinedDate: "2023-06-15", status: "ACTIVE" },
  { id: "emp5", name: "Eve Server", email: "eve@demo.com", role: "WAITER", phone: "+251 94 567 8901", joinedDate: "2023-11-20", status: "INACTIVE" },
];

export const mockCustomers = [
  { id: "c1", name: "John Doe", phone: "555-0192", totalOrders: 12, totalSpent: 345.50, lastOrder: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), type: "REGULAR" },
  { id: "c2", name: "Sarah Smith", phone: "555-0345", totalOrders: 4, totalSpent: 85.00, lastOrder: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(), type: "OCCASIONAL" },
  { id: "c3", name: "Michael Johnson", phone: "555-0876", totalOrders: 28, totalSpent: 890.20, lastOrder: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString(), type: "VIP" },
];

export const mockReviews = [
  { id: "r1", customerName: "Sarah M.", rating: 5, comment: "The food was excellent and the ordering system was very easy.", date: new Date(Date.now() - 1000 * 60 * 120).toISOString() },
  { id: "r2", customerName: "John D.", rating: 4, comment: "Great burger, but the fries were a bit cold.", date: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() },
  { id: "r3", customerName: "Anonymous", rating: 5, comment: "Best pizza in town!", date: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString() },
  { id: "r4", customerName: "Mike T.", rating: 2, comment: "Waiting time was too long.", date: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString() },
];
