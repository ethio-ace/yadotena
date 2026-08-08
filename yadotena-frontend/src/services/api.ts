import { MenuItem, Order, Table, User, ServiceRequest, Expense, MenuCategory } from "../types";
import { mockMenu, mockOrders, mockTables, mockUsers, mockExpenses, mockCustomers, mockReviews, mockCategories } from "../mocks";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://semu.ethioace.com/api/v1";

// In-memory fallback stores for offline/dev resilience
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

// Helper to make backend requests with automatic fallback
async function requestApi<T>(
  endpoint: string,
  options: RequestInit = {},
  fallbackFn: () => Promise<T> | T
): Promise<T> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(options.headers || {}),
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      // If server returned 404 or 500, check if we should fallback
      if (res.status === 404 && endpoint.includes('/orders/')) {
        return await fallbackFn();
      }
      throw new Error(`API HTTP Error: ${res.status} ${res.statusText}`);
    }

    if (res.status === 204) {
      return {} as T;
    }

    const data = await res.json();
    return data as T;
  } catch (err) {
    // Graceful fallback to in-memory state
    return await fallbackFn();
  }
}

export const api = {
  auth: {
    login(phone: string, pin: string) {
      return apiFetchServer<{ token: string; user: User }>("/staff/auth/login", {
        method: "POST",
        body: { phone, pin },
      });
    },
  },

  categories: {
    getAll: async (): Promise<MenuCategory[]> => {
      return requestApi<MenuCategory[]>("/categories/", { method: "GET" }, () => {
        return [...categoriesList];
      });
    },
    create: async (category: Omit<MenuCategory, "id">): Promise<MenuCategory> => {
      return requestApi<MenuCategory>(
        "/categories/",
        {
          method: "POST",
          body: JSON.stringify(category),
        },
        () => {
          const newCategory: MenuCategory = {
            ...category,
            id: `cat-${Date.now()}`,
            sortOrder: categoriesList.length + 1,
          };
          categoriesList = [...categoriesList, newCategory];
          return newCategory;
        }
      );
    },
    update: async (id: string, updates: Partial<MenuCategory>): Promise<MenuCategory> => {
      return requestApi<MenuCategory>(
        `/categories/${id}/`,
        {
          method: "PATCH",
          body: JSON.stringify(updates),
        },
        () => {
          const index = categoriesList.findIndex((c) => c.id === id);
          if (index === -1) throw new Error("Category not found");
          categoriesList[index] = { ...categoriesList[index], ...updates };
          return categoriesList[index];
        }
      );
    },
    delete: async (id: string): Promise<void> => {
      return requestApi<void>(
        `/categories/${id}/`,
        { method: "DELETE" },
        () => {
          categoriesList = categoriesList.filter((c) => c.id !== id);
        }
      );
    },
  },

  menu: {
    getAll: async (): Promise<MenuItem[]> => {
      return requestApi<MenuItem[]>("/menu/", { method: "GET" }, () => {
        return [...menuList];
      });
    },
    getById: async (id: string): Promise<MenuItem | undefined> => {
      return requestApi<MenuItem | undefined>(
        `/menu/${id}/`,
        { method: "GET" },
        () => menuList.find((m) => m.id === id)
      );
    },
    create: async (item: Omit<MenuItem, "id">): Promise<MenuItem> => {
      return requestApi<MenuItem>(
        "/menu/",
        {
          method: "POST",
          body: JSON.stringify({
            ...item,
            category: item.category,
            preparation_time: item.preparationTime,
            dietary_tags: item.dietaryTags,
          }),
        },
        () => {
          const newItem: MenuItem = {
            ...item,
            id: `m-${Date.now()}`,
          };
          menuList = [newItem, ...menuList];
          return newItem;
        }
      );
    },
    update: async (id: string, updates: Partial<MenuItem>): Promise<MenuItem> => {
      return requestApi<MenuItem>(
        `/menu/${id}/`,
        {
          method: "PATCH",
          body: JSON.stringify({
            ...updates,
            category: updates.category,
            preparation_time: updates.preparationTime,
            dietary_tags: updates.dietaryTags,
          }),
        },
        () => {
          const index = menuList.findIndex((m) => m.id === id);
          if (index === -1) throw new Error("Menu item not found");
          menuList[index] = { ...menuList[index], ...updates };
          return menuList[index];
        }
      );
    },
    toggleAvailability: async (id: string): Promise<MenuItem> => {
      return requestApi<MenuItem>(
        `/menu/${id}/toggle-availability/`,
        { method: "POST" },
        () => {
          const index = menuList.findIndex((m) => m.id === id);
          if (index === -1) throw new Error("Menu item not found");
          menuList[index] = { ...menuList[index], available: !menuList[index].available };
          return menuList[index];
        }
      );
    },
    delete: async (id: string): Promise<void> => {
      return requestApi<void>(
        `/menu/${id}/`,
        { method: "DELETE" },
        () => {
          menuList = menuList.filter((m) => m.id !== id);
        }
      );
    },
  },

  tables: {
    getAll: async (): Promise<Table[]> => {
      return requestApi<Table[]>("/tables/", { method: "GET" }, () => {
        return [...tablesList];
      });
    },
    getById: async (id: string): Promise<Table | undefined> => {
      return requestApi<Table | undefined>(
        `/tables/${id}/`,
        { method: "GET" },
        () => tablesList.find((t) => t.id === id)
      );
    },
    create: async (tableData: { name: string; capacity: number; id?: string; status?: Table["status"] }): Promise<Table> => {
      return requestApi<Table>(
        "/tables/",
        {
          method: "POST",
          body: JSON.stringify(tableData),
        },
        () => {
          const nextId = tableData.id || `t${tablesList.length + 1}`;
          const newTable: Table = {
            id: nextId,
            name: tableData.name || `Table ${tablesList.length + 1}`,
            capacity: tableData.capacity || 4,
            status: tableData.status || "AVAILABLE",
          };
          tablesList = [...tablesList, newTable];
          return newTable;
        }
      );
    },
    update: async (id: string, updates: Partial<Table>): Promise<Table> => {
      return requestApi<Table>(
        `/tables/${id}/`,
        {
          method: "PATCH",
          body: JSON.stringify(updates),
        },
        () => {
          const idx = tablesList.findIndex((t) => t.id === id);
          if (idx === -1) throw new Error("Table not found");
          tablesList[idx] = { ...tablesList[idx], ...updates };
          return tablesList[idx];
        }
      );
    },
    updateStatus: async (id: string, status: Table["status"]): Promise<Table> => {
      return requestApi<Table>(
        `/tables/${id}/status/`,
        {
          method: "POST",
          body: JSON.stringify({ status }),
        },
        () => {
          const tableIndex = tablesList.findIndex((t) => t.id === id);
          if (tableIndex === -1) throw new Error("Table not found");
          tablesList[tableIndex] = { ...tablesList[tableIndex], status };
          return tablesList[tableIndex];
        }
      );
    },
    delete: async (id: string): Promise<void> => {
      return requestApi<void>(
        `/tables/${id}/`,
        { method: "DELETE" },
        () => {
          tablesList = tablesList.filter((t) => t.id !== id);
        }
      );
    },
  },

  orders: {
    getAll: async (): Promise<Order[]> => {
      return requestApi<Order[]>("/orders/", { method: "GET" }, () => {
        return [...ordersList];
      });
    },
    getById: async (id: string): Promise<Order | undefined> => {
      return requestApi<Order | undefined>(
        `/orders/${id}/`,
        { method: "GET" },
        () => ordersList.find((o) => o.id === id)
      );
    },
    create: async (order: Omit<Order, "id" | "createdAt" | "updatedAt">): Promise<Order> => {
      return requestApi<Order>(
        "/orders/",
        {
          method: "POST",
          body: JSON.stringify({
            type: order.type,
            status: order.status || "PENDING",
            payment_status: order.paymentStatus || "PENDING",
            table_id: order.tableId,
            customer_name: order.customerName,
            customer_phone: order.customerPhone,
            delivery_address: order.deliveryAddress,
            total: order.total,
            items: order.items?.map((it) => ({
              menuItemId: it.menuItemId,
              name: it.name,
              price: it.price,
              quantity: it.quantity,
              specialInstructions: it.specialInstructions,
            })) || [],
          }),
        },
        () => {
          const newOrder: Order = {
            ...order,
            id: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          ordersList = [newOrder, ...ordersList];

          if (order.tableId) {
            const tIndex = tablesList.findIndex((t) => t.id === order.tableId);
            if (tIndex !== -1) {
              tablesList[tIndex] = { ...tablesList[tIndex], status: "PREPARING" };
            }
          }

          return newOrder;
        }
      );
    },
    updateStatus: async (id: string, status: Order["status"]): Promise<Order> => {
      return requestApi<Order>(
        `/orders/${id}/status/`,
        {
          method: "POST",
          body: JSON.stringify({ status }),
        },
        () => {
          const orderIndex = ordersList.findIndex((o) => o.id === id);
          if (orderIndex === -1) throw new Error("Order not found");
          ordersList[orderIndex] = {
            ...ordersList[orderIndex],
            status,
            updatedAt: new Date().toISOString(),
          };
          return ordersList[orderIndex];
        }
      );
    },
  },

  serviceRequests: {
    getAll: async (): Promise<ServiceRequest[]> => {
      return requestApi<ServiceRequest[]>("/service-requests/", { method: "GET" }, () => {
        return [...serviceRequestsList];
      });
    },
    create: async (req: {
      tableId: string;
      type: "WAITER" | "BILL" | "ASSISTANCE";
      notes?: string;
    }): Promise<ServiceRequest> => {
      return requestApi<ServiceRequest>(
        "/service-requests/",
        {
          method: "POST",
          body: JSON.stringify({
            tableId: req.tableId,
            type: req.type,
            notes: req.notes,
          }),
        },
        () => {
          const table = tablesList.find((t) => t.id === req.tableId);
          const newReq: ServiceRequest = {
            id: `req-${Date.now()}`,
            tableId: req.tableId,
            tableName: table ? table.name : `Table ${req.tableId.replace("t", "")}`,
            type: req.type,
            status: "PENDING",
            createdAt: new Date().toISOString(),
            notes:
              req.notes ||
              (req.type === "BILL"
                ? "Requested table check / bill"
                : "Called for table waiter"),
          };

          const tIndex = tablesList.findIndex((t) => t.id === req.tableId);
          if (tIndex !== -1) {
            tablesList[tIndex] = {
              ...tablesList[tIndex],
              status:
                req.type === "BILL" ? "WAITING_FOR_PAYMENT" : "WAITING_FOR_SERVICE",
            };
          }

          serviceRequestsList = [newReq, ...serviceRequestsList];
          return newReq;
        }
      );
    },
    resolve: async (id: string): Promise<void> => {
      return requestApi<void>(
        `/service-requests/${id}/resolve/`,
        { method: "POST" },
        () => {
          const req = serviceRequestsList.find((r) => r.id === id);
          if (req) {
            req.status = "RESOLVED";
            const tIndex = tablesList.findIndex((t) => t.id === req.tableId);
            if (
              tIndex !== -1 &&
              (tablesList[tIndex].status === "WAITING_FOR_SERVICE" ||
                tablesList[tIndex].status === "WAITING_FOR_PAYMENT")
            ) {
              tablesList[tIndex] = { ...tablesList[tIndex], status: "OCCUPIED" };
            }
          }
        }
      );
    },
  },

  expenses: {
    getAll: async () => {
      return requestApi<Expense[]>("/expenses/", { method: "GET" }, () => {
        return [...expensesList];
      });
    },
  },

  customers: {
    getAll: async () => {
      return requestApi<any[]>("/customers/", { method: "GET" }, () => {
        return [...customersList];
      });
    },
  },

  reviews: {
    getAll: async () => {
      return requestApi<any[]>("/reviews/", { method: "GET" }, () => {
        return [...mockReviews];
      });
    },
  },

  users: {
    getAll: async (): Promise<User[]> => {
      return requestApi<User[]>("/users/", { method: "GET" }, () => {
        return [...mockUsers];
      });
    },
    create: async (userData: Partial<User> & { password?: string }): Promise<User> => {
      return requestApi<User>(
        "/users/",
        {
          method: "POST",
          body: JSON.stringify(userData),
        },
        () => {
          const newUser: User = {
            id: `usr-${Date.now()}`,
            name: userData.name || "Staff Member",
            email: userData.email || "staff@yadotena.com",
            role: userData.role || "WAITER",
            phone: userData.phone || "+251 900 000 000",
            status: userData.status || "ACTIVE",
            joinedDate: new Date().toISOString().split("T")[0],
          };
          mockUsers.push(newUser as any);
          return newUser;
        }
      );
    },
    update: async (id: string, updates: Partial<User> & { password?: string }): Promise<User> => {
      return requestApi<User>(
        `/users/${id}/`,
        {
          method: "PATCH",
          body: JSON.stringify(updates),
        },
        () => {
          const idx = mockUsers.findIndex((u) => u.id === id);
          if (idx === -1) throw new Error("User not found");
          mockUsers[idx] = { ...mockUsers[idx], ...updates } as any;
          return mockUsers[idx] as any;
        }
      );
    },
    toggleStatus: async (id: string): Promise<User> => {
      return requestApi<User>(
        `/users/${id}/toggle-status/`,
        { method: "POST" },
        () => {
          const idx = mockUsers.findIndex((u) => u.id === id);
          if (idx === -1) throw new Error("User not found");
          const nextStatus = mockUsers[idx].status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
          mockUsers[idx] = { ...mockUsers[idx], status: nextStatus } as any;
          return mockUsers[idx] as any;
        }
      );
    },
    delete: async (id: string): Promise<void> => {
      return requestApi<void>(
        `/users/${id}/`,
        { method: "DELETE" },
        () => {
          const idx = mockUsers.findIndex((u) => u.id === id);
          if (idx !== -1) mockUsers.splice(idx, 1);
        }
      );
    },
  },
};
