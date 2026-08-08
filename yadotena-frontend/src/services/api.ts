import { MenuItem, Order, Table, User } from "../types";
import { mockMenu, mockOrders, mockTables, mockUsers } from "../mocks";

// Helper to simulate network delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// In-memory data stores for active prototype simulation
let menuList: MenuItem[] = [...mockMenu];
let tablesList: Table[] = [...mockTables];
let ordersList: Order[] = [...mockOrders];

export const api = {
  menu: {
    getAll: async (): Promise<MenuItem[]> => {
      await delay(300);
      return [...menuList];
    },
    getById: async (id: string): Promise<MenuItem | undefined> => {
      await delay(200);
      return menuList.find((m) => m.id === id);
    },
  },
  tables: {
    getAll: async (): Promise<Table[]> => {
      await delay(300);
      return [...tablesList];
    },
    getById: async (id: string): Promise<Table | undefined> => {
      await delay(200);
      return tablesList.find((t) => t.id === id);
    },
    updateStatus: async (id: string, status: Table["status"]): Promise<Table> => {
      await delay(300);
      const tableIndex = tablesList.findIndex((t) => t.id === id);
      if (tableIndex === -1) throw new Error("Table not found");
      tablesList[tableIndex] = { ...tablesList[tableIndex], status };
      return tablesList[tableIndex];
    },
  },
  orders: {
    getAll: async (): Promise<Order[]> => {
      await delay(300);
      return [...ordersList];
    },
    getById: async (id: string): Promise<Order | undefined> => {
      await delay(200);
      return ordersList.find((o) => o.id === id);
    },
    create: async (order: Omit<Order, "id" | "createdAt" | "updatedAt">): Promise<Order> => {
      await delay(500);
      const newOrder: Order = {
        ...order,
        id: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      // Store in in-memory state
      ordersList = [newOrder, ...ordersList];

      // If dine-in, update table status to OCCUPIED
      if (order.tableId) {
        const tIndex = tablesList.findIndex(t => t.id === order.tableId);
        if (tIndex !== -1) {
          tablesList[tIndex] = { ...tablesList[tIndex], status: "PREPARING" };
        }
      }

      return newOrder;
    },
    updateStatus: async (id: string, status: Order["status"]): Promise<Order> => {
      await delay(300);
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
  users: {
    getAll: async (): Promise<User[]> => {
      await delay(300);
      return [...mockUsers];
    },
  },
};
