import { MenuItem, Table, User, Order, MenuCategory } from "../types";

export const mockUsers: User[] = [
  { id: "1", name: "Alice Owner", email: "owner@demo.com", role: "OWNER", status: "ACTIVE" },
  { id: "2", name: "Bob Manager", email: "manager@demo.com", role: "MANAGER", status: "ACTIVE" },
  { id: "3", name: "Charlie Waiter", email: "waiter@demo.com", role: "WAITER", status: "ACTIVE" },
  { id: "4", name: "Dave Chef", email: "kitchen@demo.com", role: "KITCHEN", status: "ACTIVE" },
];

export const mockCategories: MenuCategory[] = [
  { id: "cat-0", name: "Fresh Dairy & Milk", icon: "🥛", description: "Pure farm-fresh milk, organic yogurt, milkshakes & cheeses", sortOrder: 1 },
  { id: "cat-1", name: "Main Course", icon: "🍔", description: "Hearty chef special main dishes and steaks", sortOrder: 2 },
  { id: "cat-2", name: "Pizza", icon: "🍕", description: "Artisanal stone-baked crust pizzas", sortOrder: 3 },
  { id: "cat-3", name: "Appetizers", icon: "🍟", description: "Tasty snacks, dips, and finger foods", sortOrder: 4 },
  { id: "cat-4", name: "Beverages", icon: "☕", description: "Specialty Ethiopian coffee, tea, and drinks", sortOrder: 5 },
  { id: "cat-5", name: "Desserts", icon: "🍰", description: "Freshly baked sweets and chocolate treats", sortOrder: 6 },
  { id: "cat-6", name: "Traditional", icon: "🍲", description: "Authentic gourmet Ethiopian cuisine & platters", sortOrder: 7 },
];

export const mockMenu: MenuItem[] = [
  {
    id: "m0-1",
    name: "Pure Farm-Fresh Cow Milk (Warm / Chilled)",
    description: "100% organic, pasteurized rich whole milk served fresh from local dairy farms.",
    price: 120,
    category: "Fresh Dairy & Milk",
    image: "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=800&q=80",
    available: true,
    preparationTime: 5,
    dietaryTags: ["Organic", "Popular", "Gluten-Free"],
    customAddons: [
      { id: "add-d1", name: "Pure Honey Drizzle", price: 30 },
      { id: "add-d2", name: "Cinnamon & Cardamom Spice", price: 20 },
    ],
  },
  {
    id: "m0-2",
    name: "Artisanal Spiced Ergo (Organic Yogurt)",
    description: "Traditional fermented creamy yogurt topped with mild organic spices and freshly churned butter.",
    price: 180,
    category: "Fresh Dairy & Milk",
    image: "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=800&q=80",
    available: true,
    preparationTime: 5,
    dietaryTags: ["Chef's Special", "Vegetarian", "Popular"],
    customAddons: [
      { id: "add-d3", name: "Extra Pure Niter Kibbeh (Spiced Butter)", price: 50 },
      { id: "add-d4", name: "Roasted Barley / Kolo Garnish", price: 40 },
    ],
  },
  {
    id: "m0-3",
    name: "Signature Yadotena Cream Milkshake",
    description: "Ultra-thick, rich milkshake prepared with fresh dairy cream, Madagascar vanilla, and strawberry coulis.",
    price: 260,
    category: "Fresh Dairy & Milk",
    image: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=800&q=80",
    available: true,
    preparationTime: 8,
    dietaryTags: ["Sweet", "Popular"],
    customAddons: [
      { id: "add-d5", name: "Whipped Dairy Cream & Cherry", price: 40 },
      { id: "add-d6", name: "Belgian Chocolate Drizzle", price: 50 },
    ],
  },
  {
    id: "m1",
    name: "Classic Chicken Burger",
    description: "Grilled marinated chicken breast, organic lettuce, ripe tomato and secret house sauce.",
    price: 380,
    category: "Main Course",
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80",
    available: true,
    preparationTime: 15,
    dietaryTags: ["Halal", "Popular"],
    customAddons: [
      { id: "add-1", name: "Extra Melted Cheese", price: 60 },
      { id: "add-2", name: "Crispy Beef Bacon", price: 90 },
      { id: "add-3", name: "Truffle Aioli Dip", price: 80 },
    ],
  },
  {
    id: "m2",
    name: "Prime Beef Ribeye Steak",
    description: "Premium cut tender beef steak with rosemary herb butter and roasted garlic mash.",
    price: 850,
    category: "Main Course",
    image: "https://images.unsplash.com/photo-1600891964092-4316c288032e?auto=format&fit=crop&w=800&q=80",
    available: true,
    preparationTime: 25,
    dietaryTags: ["Chef's Special", "Gluten-Free", "Halal"],
    customAddons: [
      { id: "add-4", name: "Mushroom Peppercorn Sauce", price: 80 },
      { id: "add-5", name: "Extra Garlic Mash", price: 70 },
    ],
  },
  {
    id: "m3",
    name: "Artisanal Margherita Pizza",
    description: "Stone-baked Italian crust with San Marzano tomatoes, fresh buffalo mozzarella, and basil.",
    price: 550,
    category: "Pizza",
    image: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=800&q=80",
    available: true,
    preparationTime: 18,
    dietaryTags: ["Vegetarian", "Popular"],
    customAddons: [
      { id: "add-6", name: "Extra Buffalo Mozzarella", price: 90 },
      { id: "add-7", name: "Fresh Basil & Olive Oil Drizzle", price: 40 },
    ],
  },
  {
    id: "m4",
    name: "Truffle Parmesan Fries",
    description: "Crispy hand-cut golden fries tossed with white truffle oil, rosemary, and aged parmesan.",
    price: 220,
    category: "Appetizers",
    image: "https://images.unsplash.com/photo-1576107232684-1279f390859f?auto=format&fit=crop&w=800&q=80",
    available: true,
    preparationTime: 8,
    dietaryTags: ["Vegetarian"],
    customAddons: [
      { id: "add-8", name: "Truffle Aioli Dip", price: 80 },
      { id: "add-9", name: "Spicy Awaze Mayo", price: 50 },
    ],
  },
  {
    id: "m5",
    name: "Signature Iced Caramel Latte",
    description: "Double shot of single-origin Ethiopian Yirgacheffe espresso with silky cold milk and caramel.",
    price: 160,
    category: "Beverages",
    image: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=800&q=80",
    available: true,
    preparationTime: 5,
    dietaryTags: ["Vegetarian", "Popular"],
    customAddons: [
      { id: "add-10", name: "Extra Espresso Shot", price: 40 },
      { id: "add-11", name: "Oat Milk Substitute", price: 50 },
    ],
  },
  {
    id: "m6",
    name: "Molten Chocolate Lava Cake",
    description: "Warm Belgian dark chocolate cake with a molten center, served with vanilla bean gelato.",
    price: 280,
    category: "Desserts",
    image: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=800&q=80",
    available: true,
    preparationTime: 12,
    dietaryTags: ["Vegetarian", "Chef's Special"],
    customAddons: [
      { id: "add-12", name: "Extra Scoop Vanilla Gelato", price: 60 },
      { id: "add-13", name: "Fresh Strawberry Coulis", price: 40 },
    ],
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
      { id: "oi1", menuItemId: "m1", name: "Classic Chicken Burger", price: 380, quantity: 2 },
      { id: "oi2", menuItemId: "m4", name: "Truffle Parmesan Fries", price: 220, quantity: 1, specialInstructions: "Extra crispy" },
    ],
    total: 980.0,
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
  },
  {
    id: "ORD-1043",
    type: "TAKEAWAY",
    status: "PENDING",
    paymentStatus: "PAID",
    customerName: "Abebe Kebede",
    customerPhone: "+251 91 123 4567",
    items: [
      { id: "oi3", menuItemId: "m3", name: "Artisanal Margherita Pizza", price: 550, quantity: 1 },
    ],
    total: 550.0,
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
      { id: "oi4", menuItemId: "m5", name: "Signature Iced Caramel Latte", price: 160, quantity: 2 },
    ],
    total: 320.0,
    createdAt: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
  },
];

export const mockExpenses = [
  { id: "e1", category: "Ingredients", description: "Weekly fresh beef & chicken supply", amount: 16500.00, date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), paymentMethod: "Bank Transfer", recordedBy: "Bob Manager" },
  { id: "e2", category: "Utilities", description: "Monthly commercial electricity bill", amount: 4800.50, date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(), paymentMethod: "Telebirr", recordedBy: "Alice Owner" },
  { id: "e3", category: "Equipment", description: "La Marzocco espresso maintenance", amount: 3500.00, date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString(), paymentMethod: "Cash", recordedBy: "Bob Manager" },
];

export const mockEmployees = [
  { id: "emp1", name: "Alice Owner", email: "owner@demo.com", role: "OWNER", phone: "+251 91 111 1111", joinedDate: "2023-01-01", status: "ACTIVE" },
  { id: "emp2", name: "Bob Manager", email: "manager@demo.com", role: "MANAGER", phone: "+251 91 234 5678", joinedDate: "2023-05-12", status: "ACTIVE" },
  { id: "emp3", name: "Charlie Waiter", email: "waiter@demo.com", role: "WAITER", phone: "+251 92 345 6789", joinedDate: "2023-08-01", status: "ACTIVE" },
  { id: "emp4", name: "Dave Chef", email: "kitchen@demo.com", role: "KITCHEN", phone: "+251 93 456 7890", joinedDate: "2023-06-15", status: "ACTIVE" },
  { id: "emp5", name: "Eve Server", email: "eve@demo.com", role: "WAITER", phone: "+251 94 567 8901", joinedDate: "2023-11-20", status: "INACTIVE" },
];

export const mockCustomers = [
  { id: "c1", name: "Abebe Kebede", phone: "+251 91 123 4567", totalOrders: 14, totalSpent: 12450.00, lastOrder: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), type: "REGULAR" },
  { id: "c2", name: "Sara Tefera", phone: "+251 91 234 5678", totalOrders: 6, totalSpent: 4850.00, lastOrder: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(), type: "OCCASIONAL" },
  { id: "c3", name: "Dawit Haile", phone: "+251 91 345 6789", totalOrders: 32, totalSpent: 34900.00, lastOrder: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString(), type: "VIP" },
];

export const mockReviews = [
  { id: "r1", customerName: "Sara T.", rating: 5, comment: "The ribeye steak was cooked to perfection and ordering from the QR table was effortless!", date: new Date(Date.now() - 1000 * 60 * 120).toISOString() },
  { id: "r2", customerName: "Abebe K.", rating: 5, comment: "Best Yirgacheffe iced latte in town. Fast service.", date: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() },
  { id: "r3", customerName: "Helen G.", rating: 5, comment: "Lovely ambiance and delicious stone-baked Margherita.", date: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString() },
  { id: "r4", customerName: "Yonas B.", rating: 4, comment: "Great burger, but took 5 mins more during peak lunch.", date: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString() },
];
