import { MenuItem, Order, Table, User, ServiceRequest, Expense, MenuCategory } from "../types";
import { mockMenu, mockOrders, mockTables, mockUsers, mockExpenses, mockCustomers, mockReviews, mockCategories } from "../mocks";

// Helper to simulate network delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// In-memory data stores for active prototype simulation
let categoriesList: MenuCategory[] = [...mockCategories];
let menuList: MenuItem[] = [...mockMenu];
let tablesList: Table[] = [...mockTables];
let ordersList: Order[] = [...mockOrders];
let expensesList: any[] = [...mockExpenses];
let customersList: any[] = [...mockCustomers];
let serviceRequestsList: ServiceRequest[] = [
  {
    id: "req-1",
    tableId: "t3",
    tableName: "Table 03",
    type: "WAITER",
    status: "PENDING",
    createdAt: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
    notes: "Guest requested extra napkins and water refill",
  },
];

export const api = {
  categories: {
    getAll: async (): Promise<MenuCategory[]> => {
      await delay(150);
      return [...categoriesList];
    },
    create: async (category: Omit<MenuCategory, "id">): Promise<MenuCategory> => {
      await delay(200);
      const newCategory: MenuCategory = {
        ...category,
        id: `cat-${Date.now()}`,
        sortOrder: categoriesList.length + 1,
      };
      categoriesList = [...categoriesList, newCategory];
      return newCategory;
    },
    update: async (id: string, updates: Partial<MenuCategory>): Promise<MenuCategory> => {
      await delay(200);
      const index = categoriesList.findIndex(c => c.id === id);
      if (index === -1) throw new Error("Category not found");
      categoriesList[index] = { ...categoriesList[index], ...updates };
      return categoriesList[index];
    },
    delete: async (id: string): Promise<void> => {
      await delay(200);
      categoriesList = categoriesList.filter(c => c.id !== id);
    },
  },
  menu: {
    getAll: async (): Promise<MenuItem[]> => {
      await delay(200);
      return [...menuList];
    },
    getById: async (id: string): Promise<MenuItem | undefined> => {
      await delay(150);
      return menuList.find((m) => m.id === id);
    },
    create: async (item: Omit<MenuItem, "id">): Promise<MenuItem> => {
      await delay(250);
      const newItem: MenuItem = {
        ...item,
        id: `m-${Date.now()}`,
      };
      menuList = [newItem, ...menuList];
      return newItem;
    },
    update: async (id: string, updates: Partial<MenuItem>): Promise<MenuItem> => {
      await delay(200);
      const index = menuList.findIndex(m => m.id === id);
      if (index === -1) throw new Error("Menu item not found");
      menuList[index] = { ...menuList[index], ...updates };
      return menuList[index];
    },
    toggleAvailability: async (id: string): Promise<MenuItem> => {
      await delay(150);
      const index = menuList.findIndex(m => m.id === id);
      if (index === -1) throw new Error("Menu item not found");
      menuList[index] = { ...menuList[index], available: !menuList[index].available };
      return menuList[index];
    },
    delete: async (id: string): Promise<void> => {
      await delay(200);
      menuList = menuList.filter(m => m.id !== id);
    },
  },
  tables: {
    getAll: async (): Promise<Table[]> => {
      await delay(200);
      return [...tablesList];
    },
    getById: async (id: string): Promise<Table | undefined> => {
      await delay(150);
      return tablesList.find((t) => t.id === id);
    },
    updateStatus: async (id: string, status: Table["status"]): Promise<Table> => {
      await delay(200);
      const tableIndex = tablesList.findIndex((t) => t.id === id);
      if (tableIndex === -1) throw new Error("Table not found");
      tablesList[tableIndex] = { ...tablesList[tableIndex], status };
      return tablesList[tableIndex];
    },
  },
  orders: {
    getAll: async (): Promise<Order[]> => {
      await delay(200);
      return [...ordersList];
    },
    getById: async (id: string): Promise<Order | undefined> => {
      await delay(150);
      return ordersList.find((o) => o.id === id);
    },
    create: async (order: Omit<Order, "id" | "createdAt" | "updatedAt">): Promise<Order> => {
      await delay(300);
      const newOrder: Order = {
        ...order,
        id: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      ordersList = [newOrder, ...ordersList];

      if (order.tableId) {
        const tIndex = tablesList.findIndex(t => t.id === order.tableId);
        if (tIndex !== -1) {
          tablesList[tIndex] = { ...tablesList[tIndex], status: "PREPARING" };
        }
      }

      return newOrder;
    },
    updateStatus: async (id: string, status: Order["status"]): Promise<Order> => {
      await delay(200);
      const orderIndex = ordersList.findIndex((o) => o.id === id);
      if (orderIndex === -1) throw new Error("Order not found");
      ordersList[orderIndex] = { 
        ...ordersList[orderIndex], 
        status, 
        updatedAt: new Date().toISOString() 
      };
      return ordersList[orderIndex];
    },
  },
  serviceRequests: {
    getAll: async (): Promise<ServiceRequest[]> => {
      await delay(150);
      return [...serviceRequestsList];
    },
    create: async (req: { tableId: string; type: "WAITER" | "BILL" | "ASSISTANCE"; notes?: string }): Promise<ServiceRequest> => {
      await delay(200);
      const table = tablesList.find(t => t.id === req.tableId);
      const newReq: ServiceRequest = {
        id: `req-${Date.now()}`,
        tableId: req.tableId,
        tableName: table ? table.name : `Table ${req.tableId.replace("t", "")}`,
        type: req.type,
        status: "PENDING",
        createdAt: new Date().toISOString(),
        notes: req.notes || (req.type === "BILL" ? "Requested table check / bill" : "Called for table waiter"),
      };

      // Set table status to waiting for service if not already
      const tIndex = tablesList.findIndex(t => t.id === req.tableId);
      if (tIndex !== -1) {
        tablesList[tIndex] = { 
          ...tablesList[tIndex], 
          status: req.type === "BILL" ? "WAITING_FOR_PAYMENT" : "WAITING_FOR_SERVICE" 
        };
      }

      serviceRequestsList = [newReq, ...serviceRequestsList];
      return newReq;
    },
    resolve: async (id: string): Promise<void> => {
      await delay(150);
      const req = serviceRequestsList.find(r => r.id === id);
      if (req) {
        req.status = "RESOLVED";
        // Also update table status back to OCCUPIED if needed
        const tIndex = tablesList.findIndex(t => t.id === req.tableId);
        if (tIndex !== -1 && (tablesList[tIndex].status === "WAITING_FOR_SERVICE" || tablesList[tIndex].status === "WAITING_FOR_PAYMENT")) {
          tablesList[tIndex] = { ...tablesList[tIndex], status: "OCCUPIED" };
        }
      }
    },
  },
  expenses: {
    getAll: async () => {
      await delay(200);
      return [...expensesList];
    },
  },
  customers: {
    getAll: async () => {
      await delay(200);
      return [...customersList];
    },
  },
  reviews: {
    getAll: async () => {
      await delay(200);
      return [...mockReviews];
    },
  },
  users: {
    getAll: async (): Promise<User[]> => {
      await delay(200);
      return [...mockUsers];
    },
  },
};
