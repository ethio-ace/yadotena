import { MenuItem, Order, Table, User, ServiceRequest, Expense, MenuCategory, DiningSession } from "../types";

const rawBase = (process.env.NEXT_PUBLIC_API_URL || "https://yadotena.onrender.com").replace(/\/+$/, "");
export const API_BASE_URL = rawBase.endsWith("/api/v1") ? rawBase : `${rawBase}/api/v1`;
const API_BASE = API_BASE_URL;

// Strict requests for order-critical flows — never silently fall back to mocks
async function requestApiStrict<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  const headers = new Headers(options.headers || {});
  
  // If the body is FormData, do NOT set Content-Type to application/json
  // Let the browser automatically set the Content-Type with the correct boundary
  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  // Ensure endpoint starts with / and has NO trailing slash for clean REST requests
  let cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  if (cleanEndpoint.length > 1 && cleanEndpoint.endsWith("/")) {
    cleanEndpoint = cleanEndpoint.replace(/\/+$/, "");
  }

  const res = await fetch(`${API_BASE}${cleanEndpoint}`, {
    ...options,
    headers,
    signal: controller.signal,
  });
  clearTimeout(timeoutId);

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const errorBody = await res.json();
      if (errorBody.detail) message = errorBody.detail;
      else if (errorBody.error) {
        message = typeof errorBody.error === "string" ? errorBody.error : JSON.stringify(errorBody.error);
      }
      else if (errorBody.unavailable_items) {
        message = `Unavailable: ${errorBody.unavailable_items.join(", ")}`;
      }
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  }

  if (res.status === 204) {
    return {} as T;
  }

  return (await res.json()) as T;
}

function serializeOrderItems(items: Array<{
  menuItemId: string;
  quantity: number;
  specialInstructions?: string;
  selectedAddons?: string[];
}>) {
  return items.map((it) => ({
    menuItemId: it.menuItemId,
    quantity: it.quantity,
    specialInstructions: it.specialInstructions || "",
    selectedAddons: it.selectedAddons || [],
  }));
}

export const api = {
  categories: {
    getAll: async (): Promise<MenuCategory[]> => {
      return requestApiStrict<MenuCategory[]>("/categories", { method: "GET" });
    },
    create: async (category: Omit<MenuCategory, "id">): Promise<MenuCategory> => {
      return requestApiStrict<MenuCategory>("/categories", {
        method: "POST",
        body: JSON.stringify(category),
      });
    },
    update: async (id: string, updates: Partial<MenuCategory>): Promise<MenuCategory> => {
      return requestApiStrict<MenuCategory>(`/categories/${id}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      });
    },
    delete: async (id: string): Promise<void> => {
      return requestApiStrict<void>(`/categories/${id}`, { method: "DELETE" });
    },
  },

  menu: {
    getAll: async (): Promise<MenuItem[]> => {
      return requestApiStrict<MenuItem[]>("/menu", { method: "GET" });
    },
    getById: async (id: string): Promise<MenuItem | undefined> => {
      return requestApiStrict<MenuItem>(`/menu/${id}`, { method: "GET" });
    },
    create: async (item: FormData | any): Promise<MenuItem> => {
      // Allow passing FormData directly for file uploads
      if (item instanceof FormData) {
        return requestApiStrict<MenuItem>("/menu", {
          method: "POST",
          body: item,
        });
      }
      return requestApiStrict<MenuItem>("/menu", {
        method: "POST",
        body: JSON.stringify({
          ...item,
          category: item.category,
          preparation_time: item.preparationTime,
          dietary_tags: item.dietaryTags,
        }),
      });
    },
    update: async (id: string, updates: FormData | any): Promise<MenuItem> => {
      // Allow passing FormData directly for file uploads
      if (updates instanceof FormData) {
        return requestApiStrict<MenuItem>(`/menu/${id}`, {
          method: "PATCH",
          body: updates,
        });
      }
      return requestApiStrict<MenuItem>(`/menu/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          ...updates,
          category: updates.category,
          preparation_time: updates.preparationTime,
          dietary_tags: updates.dietaryTags,
        }),
      });
    },
    toggleAvailability: async (id: string): Promise<MenuItem> => {
      return requestApiStrict<MenuItem>(`/menu/${id}/toggle-availability`, { method: "POST" });
    },
    delete: async (id: string): Promise<void> => {
      return requestApiStrict<void>(`/menu/${id}`, { method: "DELETE" });
    },
  },

  tables: {
    getAll: async (): Promise<Table[]> => {
      return requestApiStrict<Table[]>("/tables", { method: "GET" });
    },
    getById: async (id: string): Promise<Table | undefined> => {
      return requestApiStrict<Table>(`/tables/${id}`, { method: "GET" });
    },
    create: async (tableData: { name: string; capacity: number; id?: string; status?: Table["status"] }): Promise<Table> => {
      return requestApiStrict<Table>("/tables", {
        method: "POST",
        body: JSON.stringify(tableData),
      });
    },
    update: async (id: string, updates: Partial<Table>): Promise<Table> => {
      return requestApiStrict<Table>(`/tables/${id}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      });
    },
    updateStatus: async (id: string, status: Table["status"]): Promise<Table> => {
      return requestApiStrict<Table>(`/tables/${id}/status`, {
        method: "POST",
        body: JSON.stringify({ status }),
      });
    },
    delete: async (id: string): Promise<void> => {
      await requestApiStrict<void>(`/tables/${id}`, { method: "DELETE" });
    },
    startSession: async (tableId: string): Promise<DiningSession> => {
      return requestApiStrict<DiningSession>(`/tables/${tableId}/start-session`, {
        method: "POST",
      });
    },
  },

  sessions: {
    getActiveForTable: async (tableId: string): Promise<DiningSession> => {
      return requestApiStrict<DiningSession>(`/sessions/active?table=${encodeURIComponent(tableId)}`, {
        method: "GET",
      });
    },
  },

  orders: {
    getAll: async (): Promise<Order[]> => {
      return requestApiStrict<Order[]>("/orders", { method: "GET" });
    },
    getById: async (id: string): Promise<Order | undefined> => {
      return requestApiStrict<Order>(`/orders/${id}`, { method: "GET" });
    },
    create: async (
      order: Omit<Order, "id" | "createdAt" | "updatedAt" | "total"> & {
        items: Array<{
          menuItemId: string;
          quantity: number;
          specialInstructions?: string;
          selectedAddons?: string[];
        }>;
        idempotencyKey?: string;
      }
    ): Promise<Order> => {
      return requestApiStrict<Order>("/orders", {
        method: "POST",
        body: JSON.stringify({
          type: order.type,
          paymentStatus: order.paymentStatus || "PENDING",
          tableId: order.tableId,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          deliveryAddress: order.deliveryAddress,
          idempotencyKey: order.idempotencyKey,
          items: serializeOrderItems(order.items),
        }),
      });
    },
    updateStatus: async (id: string, status: Order["status"]): Promise<Order> => {
      return requestApiStrict<Order>(`/orders/${id}/status`, {
        method: "POST",
        body: JSON.stringify({ status }),
      });
    },
    addItems: async (
      id: string,
      newItems: Array<{
        menuItemId: string;
        quantity: number;
        specialInstructions?: string;
        selectedAddons?: string[];
      }>
    ): Promise<Order> => {
      return requestApiStrict<Order>(`/orders/${id}/add-items`, {
        method: "POST",
        body: JSON.stringify({ items: serializeOrderItems(newItems) }),
      });
    },
  },

  serviceRequests: {
    getAll: async (): Promise<ServiceRequest[]> => {
      return requestApiStrict<ServiceRequest[]>("/service-requests", { method: "GET" });
    },
    create: async (req: {
      tableId: string;
      type: "WAITER" | "BILL" | "ASSISTANCE";
      notes?: string;
    }): Promise<ServiceRequest> => {
      return requestApiStrict<ServiceRequest>("/service-requests", {
        method: "POST",
        body: JSON.stringify({
          tableId: req.tableId,
          type: req.type,
          notes: req.notes,
        }),
      });
    },
    resolve: async (id: string): Promise<void> => {
      return requestApiStrict<void>(`/service-requests/${id}/resolve`, { method: "POST" });
    },
  },

  expenses: {
    getAll: async () => {
      return requestApiStrict<Expense[]>("/expenses", { method: "GET" });
    },
    create: async (data: any) => {
      return requestApiStrict<Expense>("/expenses", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
  },

  customers: {
    getAll: async () => {
      return requestApiStrict<any[]>("/customers", { method: "GET" });
    },
    create: async (data: any) => {
      return requestApiStrict<any>("/customers", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
  },

  payments: {
    getAll: async () => {
      return requestApiStrict<any[]>("/payments", { method: "GET" });
    },
    create: async (data: {
      orderId: string;
      amount: number;
      method: string;
      transactionRef?: string;
      receiptUrl?: string;
      reference?: string;
      notes?: string;
      status?: string;
    }) => {
      return requestApiStrict<any>("/payments", {
        method: "POST",
        body: JSON.stringify({
          orderId: data.orderId,
          amount: data.amount,
          method: data.method,
          transactionRef: data.transactionRef || data.reference,
          receiptUrl: data.receiptUrl,
          reference: data.reference || data.transactionRef,
          notes: data.notes,
          status: data.status || "PAID",
        }),
      });
    },
  },

  paymentMethods: {
    getAll: async (showAll?: boolean): Promise<any[]> => {
      const query = showAll ? "?all=true" : "";
      return requestApiStrict<any[]>(`/payment-methods${query}`, { method: "GET" });
    },
    getById: async (id: string): Promise<any> => {
      return requestApiStrict<any>(`/payment-methods/${id}`, { method: "GET" });
    },
    create: async (data: any): Promise<any> => {
      return requestApiStrict<any>("/payment-methods", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    update: async (id: string, updates: any): Promise<any> => {
      return requestApiStrict<any>(`/payment-methods/${id}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      });
    },
    delete: async (id: string): Promise<void> => {
      return requestApiStrict<void>(`/payment-methods/${id}`, { method: "DELETE" });
    },
  },

  activityLogs: {
    getAll: async (params?: { role?: string; entityType?: string; action?: string; search?: string; limit?: number }): Promise<any[]> => {
      const queryParts: string[] = [];
      if (params?.role) queryParts.push(`role=${encodeURIComponent(params.role)}`);
      if (params?.entityType) queryParts.push(`entityType=${encodeURIComponent(params.entityType)}`);
      if (params?.action) queryParts.push(`action=${encodeURIComponent(params.action)}`);
      if (params?.search) queryParts.push(`search=${encodeURIComponent(params.search)}`);
      if (params?.limit) queryParts.push(`limit=${params.limit}`);
      const queryString = queryParts.length > 0 ? `?${queryParts.join("&")}` : "";
      return requestApiStrict<any[]>(`/activity-logs${queryString}`, { method: "GET" });
    },
    getById: async (id: string): Promise<any> => {
      return requestApiStrict<any>(`/activity-logs/${id}`, { method: "GET" });
    },
  },

  settings: {
    get: async (): Promise<any> => {
      return requestApiStrict<any>("/settings", { method: "GET" });
    },
    update: async (data: any): Promise<any> => {
      return requestApiStrict<any>("/settings", {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
  },

  media: {
    upload: async (file: File): Promise<{ url: string; publicUrl: string }> => {
      try {
        // 1. Request presigned PUT URL from backend for direct S3 upload
        const presign = await requestApiStrict<{
          uploadUrl: string;
          key: string;
          publicUrl: string;
        }>("/media/presign", {
          method: "POST",
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type || "image/jpeg",
          }),
        });

        if (presign && presign.uploadUrl) {
          // Direct PUT to Tigris S3 (0 MB payload on application server)
          const s3Put = await fetch(presign.uploadUrl, {
            method: "PUT",
            headers: {
              "Content-Type": file.type || "image/jpeg",
            },
            body: file,
          });

          if (s3Put.ok) {
            // Confirm presigned upload & register hash metadata in DB
            const confirm = await requestApiStrict<{ url: string; publicUrl: string }>(
              "/media/confirm-presigned",
              {
                method: "POST",
                body: JSON.stringify({
                  key: presign.key,
                  filename: file.name,
                }),
              }
            );
            const finalURL = confirm.publicUrl || confirm.url || presign.publicUrl;
            return { url: finalURL, publicUrl: finalURL };
          }
        }
      } catch (err) {
        console.warn("Presigned upload attempt bypassed, falling back to direct server upload:", err);
      }

      // 2. Direct server upload fallback
      const formData = new FormData();
      formData.append("file", file);
      return requestApiStrict<{ url: string; publicUrl: string }>("/media/upload", {
        method: "POST",
        body: formData,
      });
    },
  },

  users: {
    getAll: async (): Promise<User[]> => {
      return requestApiStrict<User[]>("/users", { method: "GET" });
    },
    create: async (userData: Partial<User> & { password?: string }): Promise<User> => {
      return requestApiStrict<User>("/users", {
        method: "POST",
        body: JSON.stringify(userData),
      });
    },
    update: async (id: string, updates: Partial<User> & { password?: string }): Promise<User> => {
      return requestApiStrict<User>(`/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      });
    },
    toggleStatus: async (id: string): Promise<User> => {
      return requestApiStrict<User>(`/users/${id}/toggle-status`, { method: "POST" });
    },
    delete: async (id: string): Promise<void> => {
      return requestApiStrict<void>(`/users/${id}`, { method: "DELETE" });
    },
  },

  employees: {
    getAll: async () => {
      return requestApiStrict<any[]>("/users", { method: "GET" });
    },
  },

  reports: {
    getSummary: async () => {
      return requestApiStrict<any>("/reports/summary", { method: "GET" });
    },
  },

  analytics: {
    getSummary: async (params?: { range?: string; from?: string; to?: string }) => {
      const q = params?.range ? `?from=${params.from || ""}&to=${params.to || ""}` : "";
      return requestApiStrict<any>(`/staff/analytics${q}`, { method: "GET" });
    },
  },
};
