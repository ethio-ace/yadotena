import { getSession } from "next-auth/react";
import { apiFetch, apiFetchServer } from "@/lib/http";
import type {
  CreateOrderInput,
  Expense,
  MenuCategory,
  MenuItem,
  Order,
  OrderStatus,
  PaymentStatus,
  Review,
  ServiceRequest,
  Table,
  User,
} from "@/types";

const CATEGORY_ICONS: Record<string, string> = {
  "Fresh Dairy & Milk": "🥛",
  "Main Course": "🍔",
  Pizza: "🍕",
  Appetizers: "🍟",
  Beverages: "☕",
  Desserts: "🍰",
  Traditional: "🍲",
};

type ApiCategory = {
  id: string;
  name: string;
  sort_order?: number;
  is_active?: boolean;
};

type PublicMenu = {
  categories: ApiCategory[];
  items: MenuItem[];
};

type AnalyticsResponse = {
  revenue_etb?: number;
  paid_order_count?: number;
  daily?: Array<{
    date: string;
    revenue: number;
    dineIn?: number;
    takeaway?: number;
    delivery?: number;
  }>;
  top_items?: Array<{ name: string; qty: number; revenue_etb: number }>;
  byOrderType?: Record<string, number>;
  by_order_type?: Record<string, number>;
  from?: string;
  to?: string;
  payment_mix?: Record<string, number>;
};

export type CustomerRow = {
  id: string;
  name: string;
  phone: string;
  totalOrders: number;
  totalSpent: number;
  lastOrder: string;
  type: "VIP" | "REGULAR" | "OCCASIONAL";
};

export type ExpenseRow = Expense & {
  paymentMethod?: string;
  recordedByName?: string;
};

function mapCategory(c: ApiCategory): MenuCategory {
  return {
    id: c.id,
    name: c.name,
    icon: CATEGORY_ICONS[c.name] || "🍽️",
    sortOrder: c.sort_order,
  };
}

async function loadPublicMenu(): Promise<PublicMenu> {
  return apiFetch<PublicMenu>("/public/menu", { auth: false });
}

async function resolveCategoryId(categoryName: string): Promise<string> {
  const { categories } = await loadPublicMenu();
  const found = categories.find((c) => c.name === categoryName);
  if (!found) throw new Error(`Unknown category: ${categoryName}`);
  return found.id;
}

function buildPlaceBody(order: CreateOrderInput) {
  const method = order.paymentMethod || "cash";
  const markPaid = order.paymentStatus === "PAID" && method === "cash";
  return {
    type: order.type,
    customer_name: order.customerName || "Guest",
    customer_phone: order.customerPhone || "0000000000",
    customerName: order.customerName || "Guest",
    customerPhone: order.customerPhone || "0000000000",
    table_id: order.tableId || undefined,
    tableId: order.tableId || undefined,
    delivery_address: order.deliveryAddress || undefined,
    deliveryAddress: order.deliveryAddress || undefined,
    payment_method: method,
    paymentMethod: method,
    digital_method: order.digitalMethod || undefined,
    digitalMethod: order.digitalMethod || undefined,
    reference: order.reference || undefined,
    mark_cash_paid: markPaid,
    markCashPaid: markPaid,
    items: order.items.map((i) => ({
      menuItemId: i.menuItemId,
      quantity: i.quantity,
      specialInstructions: i.specialInstructions || "",
    })),
  };
}

function analyticsRangeQuery(from?: string, to?: string): string {
  const end = to || new Date().toISOString().slice(0, 10);
  const start =
    from ||
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return `?from=${encodeURIComponent(start)}&to=${encodeURIComponent(end)}`;
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
    async getAll(): Promise<MenuCategory[]> {
      const session = typeof window !== "undefined" ? await getSession() : null;
      const token = (session as { accessToken?: string } | null)?.accessToken;
      if (token) {
        try {
          const cats = await apiFetch<ApiCategory[]>("/staff/categories");
          return (cats || []).map(mapCategory);
        } catch {
          /* fall through to public */
        }
      }
      const data = await loadPublicMenu();
      return (data.categories || []).map(mapCategory);
    },

    async create(category: Omit<MenuCategory, "id">): Promise<MenuCategory> {
      const res = await apiFetch<{ id: string }>("/staff/categories", {
        body: { name: category.name, sort_order: category.sortOrder ?? 0 },
      });
      return {
        id: res.id,
        name: category.name,
        icon: category.icon || CATEGORY_ICONS[category.name] || "🍽️",
        description: category.description,
        sortOrder: category.sortOrder,
      };
    },

    async update(id: string, updates: Partial<MenuCategory>): Promise<MenuCategory> {
      await apiFetch(`/staff/categories/${id}`, {
        method: "PATCH",
        body: { name: updates.name, sort_order: updates.sortOrder },
      });
      return {
        id,
        name: updates.name || "",
        icon: updates.icon || "🍽️",
        description: updates.description,
        sortOrder: updates.sortOrder,
      };
    },

    async delete(id: string): Promise<void> {
      await apiFetch(`/staff/categories/${id}`, {
        method: "PATCH",
        body: { is_active: false },
      });
    },
  },

  menu: {
    async getAll(): Promise<MenuItem[]> {
      const session = typeof window !== "undefined" ? await getSession() : null;
      const token = (session as { accessToken?: string } | null)?.accessToken;
      if (token) {
        try {
          return await apiFetch<MenuItem[]>("/staff/items");
        } catch {
          /* fall through to public */
        }
      }
      const data = await loadPublicMenu();
      return data.items || [];
    },

    async getById(id: string): Promise<MenuItem | undefined> {
      const items = await this.getAll();
      return items.find((m) => m.id === id);
    },

    async create(item: Omit<MenuItem, "id">): Promise<MenuItem> {
      const categoryId = await resolveCategoryId(item.category);
      const res = await apiFetch<{ id: string }>("/staff/items", {
        body: {
          categoryId,
          name: item.name,
          description: item.description,
          price: item.price,
          image: item.image,
          available: item.available,
          preparationTime: item.preparationTime,
        },
      });
      return { ...item, id: res.id };
    },

    async update(id: string, updates: Partial<MenuItem>): Promise<MenuItem> {
      const body: Record<string, unknown> = {
        name: updates.name,
        description: updates.description,
        price: updates.price,
        image: updates.image,
        available: updates.available,
        preparationTime: updates.preparationTime,
      };
      if (updates.category) {
        body.categoryId = await resolveCategoryId(updates.category);
      }
      await apiFetch(`/staff/items/${id}`, { method: "PATCH", body });
      const current = await this.getById(id);
      return { ...(current as MenuItem), ...updates, id };
    },

    async toggleAvailability(id: string): Promise<MenuItem> {
      const current = await this.getById(id);
      if (!current) throw new Error("Menu item not found");
      return this.update(id, { available: !current.available });
    },

    async delete(id: string): Promise<void> {
      await apiFetch(`/staff/items/${id}`, {
        method: "PATCH",
        body: { available: false },
      });
    },
  },

  tables: {
    async getAll(): Promise<Table[]> {
      const session = typeof window !== "undefined" ? await getSession() : null;
      const token = (session as { accessToken?: string } | null)?.accessToken;
      if (token) {
        try {
          return await apiFetch<Table[]>("/staff/tables");
        } catch {
          /* fall through to public */
        }
      }
      return apiFetch<Table[]>("/public/tables", { auth: false });
    },

    async getById(id: string): Promise<Table | undefined> {
      const tables = await this.getAll();
      return tables.find((t) => t.id === id);
    },

    async create(tableData: {
      name: string;
      capacity: number;
      id?: string;
      status?: Table["status"];
    }): Promise<Table> {
      const res = await apiFetch<{ id: string }>("/staff/tables", {
        body: {
          name: tableData.name,
          label: tableData.name,
          capacity: tableData.capacity,
          seats: tableData.capacity,
        },
      });
      return {
        id: res.id,
        name: tableData.name,
        capacity: tableData.capacity,
        status: "AVAILABLE",
      };
    },

    async update(id: string, updates: Partial<Table>): Promise<Table> {
      await apiFetch(`/staff/tables/${id}`, {
        method: "PATCH",
        body: {
          name: updates.name,
          label: updates.name,
          capacity: updates.capacity,
          seats: updates.capacity,
        },
      });
      const current = await this.getById(id);
      return { ...(current as Table), ...updates, id };
    },

    async updateStatus(id: string, _status: Table["status"]): Promise<Table> {
      // Status is derived from open orders on the backend.
      const table = await this.getById(id);
      if (!table) throw new Error("Table not found");
      return table;
    },

    async delete(id: string): Promise<void> {
      await apiFetch(`/staff/tables/${id}`, {
        method: "PATCH",
        body: { is_active: false },
      });
    },
  },

  orders: {
    async getAll(): Promise<Order[]> {
      return apiFetch<Order[]>("/staff/orders");
    },

    async getById(id: string): Promise<Order | undefined> {
      try {
        return await apiFetch<Order>(`/staff/orders/${id}`);
      } catch {
        try {
          return await apiFetch<Order>(`/public/orders/track?id=${encodeURIComponent(id)}`, {
            auth: false,
          });
        } catch {
          return undefined;
        }
      }
    },

    async create(order: CreateOrderInput): Promise<Order> {
      const body = buildPlaceBody(order);
      if (typeof window !== "undefined") {
        const session = await getSession();
        if ((session as { accessToken?: string } | null)?.accessToken) {
          return apiFetch<Order>("/staff/orders", { body });
        }
      }
      return apiFetch<Order>("/public/orders", { auth: false, body });
    },

    async updateStatus(id: string, status: OrderStatus): Promise<Order> {
      return apiFetch<Order>(`/staff/orders/${id}/status`, {
        method: "PATCH",
        body: { status },
      });
    },

    async updatePayment(
      id: string,
      paymentStatus: PaymentStatus,
      opts?: { method?: "cash" | "digital"; digitalMethod?: string; reference?: string },
    ): Promise<Order> {
      if (paymentStatus === "PAID") {
        return apiFetch<Order>(`/staff/orders/${id}/payment`, {
          method: "POST",
          body: {
            method: opts?.method || "cash",
            markCashPaid: (opts?.method || "cash") === "cash",
            digitalMethod: opts?.digitalMethod,
            reference: opts?.reference,
          },
        });
      }
      return apiFetch<Order>(`/staff/orders/${id}`);
    },

    async verifyPayment(id: string): Promise<Order> {
      return apiFetch<Order>(`/staff/orders/${id}/payment/verify`, {
        method: "POST",
        body: {},
      });
    },

    async rejectPayment(id: string): Promise<Order> {
      return apiFetch<Order>(`/staff/orders/${id}/payment/reject`, {
        method: "POST",
        body: {},
      });
    },
  },

  serviceRequests: {
    async getAll(): Promise<ServiceRequest[]> {
      return apiFetch<ServiceRequest[]>("/staff/service-requests");
    },

    async getPending(): Promise<ServiceRequest[]> {
      return apiFetch<ServiceRequest[]>("/staff/service-requests?status=PENDING");
    },

    async create(req: {
      tableId: string;
      type: "WAITER" | "BILL" | "ASSISTANCE";
      notes?: string;
    }): Promise<ServiceRequest> {
      return apiFetch<ServiceRequest>("/public/service-requests", {
        auth: false,
        body: req,
      });
    },

    async resolve(id: string): Promise<ServiceRequest> {
      return apiFetch<ServiceRequest>(`/staff/service-requests/${id}/resolve`, {
        method: "PATCH",
        body: {},
      });
    },
  },

  expenses: {
    async getAll(): Promise<ExpenseRow[]> {
      return apiFetch<ExpenseRow[]>("/staff/expenses");
    },
    async create(data: {
      category: string;
      description: string;
      amount: number;
      paymentMethod: string;
      date?: string;
    }): Promise<ExpenseRow> {
      return apiFetch<ExpenseRow>("/staff/expenses", {
        body: {
          category: data.category,
          description: data.description,
          amount: data.amount,
          paymentMethod: data.paymentMethod,
          date: data.date || new Date().toISOString().slice(0, 10),
        },
      });
    },
  },

  customers: {
    async getAll(): Promise<CustomerRow[]> {
      return apiFetch<CustomerRow[]>("/staff/customers");
    },
  },

  reviews: {
    async getAll(): Promise<Review[]> {
      return apiFetch<Review[]>("/staff/reviews");
    },
    async create(data: {
      orderId?: string;
      rating: number;
      comment?: string;
      customerName?: string;
    }): Promise<Review> {
      return apiFetch<Review>("/public/reviews", { auth: false, body: data });
    },
  },

  users: {
    async getAll(): Promise<User[]> {
      return apiFetch<User[]>("/staff/staff");
    },

    async create(data: {
      name: string;
      phone?: string;
      email?: string;
      pin?: string;
      password?: string;
      role: User["role"];
      status?: User["status"];
    }): Promise<User> {
      const pin = data.pin || data.password || "1234";
      const phone = (data.phone || "").replace(/\s+/g, "") || `09${Date.now().toString().slice(-8)}`;
      const res = await apiFetch<{ id: string }>("/staff/staff", {
        body: {
          name: data.name,
          phone,
          pin,
          email: data.email,
          role: data.role,
        },
      });
      if (data.status === "INACTIVE") {
        await apiFetch(`/staff/staff/${res.id}`, {
          method: "PATCH",
          body: { status: "INACTIVE" },
        });
      }
      return {
        id: res.id,
        name: data.name,
        email: data.email || "",
        phone,
        role: data.role,
        status: data.status || "ACTIVE",
      };
    },

    async update(
      id: string,
      data: Partial<Pick<User, "name" | "email" | "phone" | "role" | "status">> & {
        pin?: string;
        password?: string;
      },
    ): Promise<User> {
      await apiFetch(`/staff/staff/${id}`, {
        method: "PATCH",
        body: {
          name: data.name,
          email: data.email,
          phone: data.phone,
          role: data.role,
          status: data.status,
          pin: data.pin || data.password,
        },
      });
      const all = await this.getAll();
      const found = all.find((u) => u.id === id);
      if (!found) throw new Error("User not found");
      return found;
    },

    async toggleStatus(id: string): Promise<User> {
      const all = await this.getAll();
      const current = all.find((u) => u.id === id);
      if (!current) throw new Error("User not found");
      const next = current.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
      return this.update(id, { status: next });
    },

    async delete(id: string): Promise<void> {
      await this.update(id, { status: "INACTIVE" });
    },
  },

  analytics: {
    async getSummary(from?: string, to?: string): Promise<AnalyticsResponse> {
      const f = typeof from === "string" ? from : undefined;
      const t = typeof to === "string" ? to : undefined;
      return apiFetch<AnalyticsResponse>(`/staff/analytics${analyticsRangeQuery(f, t)}`);
    },
  },

  settings: {
    async get(): Promise<Record<string, unknown>> {
      try {
        return await apiFetch("/staff/settings");
      } catch {
        return apiFetch("/public/settings", { auth: false });
      }
    },
    async update(data: Record<string, unknown>): Promise<Record<string, unknown>> {
      return apiFetch("/staff/settings", { method: "PATCH", body: data });
    },
  },
};
