import { create } from "zustand";
import { persist } from "zustand/middleware";
import { OrderItem, OrderType } from "../types";

const SESSION_STORAGE_KEY = "yadotena_session";

interface CartState {
  items: OrderItem[];
  tableId: string | null;
  sessionId: string | null;
  sessionCode: string | null;
  orderType: OrderType | null;
  activeOrderId: string | null;
  idempotencyKey: string | null;
  addItem: (item: Omit<OrderItem, "id">) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  getTotal: () => number;
  setTableId: (id: string | null) => void;
  setSession: (session: { sessionId: string; sessionCode: string; tableId: string; openOrderId?: string | null }) => void;
  setOrderType: (type: OrderType | null) => void;
  setActiveOrderId: (id: string | null) => void;
  getOrCreateIdempotencyKey: () => string;
  clearIdempotencyKey: () => void;
  resetSession: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      tableId: null,
      sessionId: null,
      sessionCode: null,
      orderType: null,
      activeOrderId: null,
      idempotencyKey: null,

      setTableId: (id) => set({ tableId: id }),

      setSession: ({ sessionId, sessionCode, tableId, openOrderId }) =>
        set({
          sessionId,
          sessionCode,
          tableId,
          orderType: "DINE_IN",
          activeOrderId: openOrderId || null,
        }),

      setOrderType: (type) => set({ orderType: type }),

      setActiveOrderId: (id) => set({ activeOrderId: id }),

      getOrCreateIdempotencyKey: () => {
        const existing = get().idempotencyKey;
        if (existing) return existing;
        const key = crypto.randomUUID();
        set({ idempotencyKey: key });
        return key;
      },

      clearIdempotencyKey: () => set({ idempotencyKey: null }),

      resetSession: () =>
        set({
          tableId: null,
          sessionId: null,
          sessionCode: null,
          orderType: null,
          activeOrderId: null,
          idempotencyKey: null,
          items: [],
        }),

      addItem: (item) =>
        set((state) => {
          const existingItem = state.items.find(
            (i) =>
              i.menuItemId === item.menuItemId &&
              i.specialInstructions === item.specialInstructions
          );

          if (existingItem) {
            return {
              items: state.items.map((i) =>
                i.id === existingItem.id ? { ...i, quantity: i.quantity + item.quantity } : i
              ),
            };
          }

          return {
            items: [...state.items, { ...item, id: Math.random().toString(36).substring(7) }],
          };
        }),

      removeItem: (id) =>
        set((state) => ({
          items: state.items.filter((i) => i.id !== id),
        })),

      updateQuantity: (id, quantity) =>
        set((state) => ({
          items: state.items.map((i) => (i.id === id ? { ...i, quantity } : i)),
        })),

      clearCart: () => set({ items: [] }),

      getTotal: () => get().items.reduce((total, item) => total + item.price * item.quantity, 0),
    }),
    {
      name: SESSION_STORAGE_KEY,
      partialize: (state) => ({
        tableId: state.tableId,
        sessionId: state.sessionId,
        sessionCode: state.sessionCode,
        orderType: state.orderType,
        activeOrderId: state.activeOrderId,
      }),
    }
  )
);
