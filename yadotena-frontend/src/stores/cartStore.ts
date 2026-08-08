import { create } from "zustand";
import { OrderItem, OrderType } from "../types";

interface CartState {
  items: OrderItem[];
  tableId: string | null;
  orderType: OrderType | null;
  activeOrderId: string | null;
  addItem: (item: Omit<OrderItem, "id">) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  getTotal: () => number;
  setTableId: (id: string | null) => void;
  setOrderType: (type: OrderType | null) => void;
  setActiveOrderId: (id: string | null) => void;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  tableId: null,
  orderType: null,
  activeOrderId: null,
  setTableId: (id) => set({ tableId: id }),
  setOrderType: (type) => set({ orderType: type }),
  setActiveOrderId: (id) => set({ activeOrderId: id }),
  addItem: (item) =>
    set((state) => {
      // Check if item with same menuItemId and specialInstructions already exists
      const existingItem = state.items.find(
        (i) => i.menuItemId === item.menuItemId && i.specialInstructions === item.specialInstructions
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
  getTotal: () => {
    return get().items.reduce((total, item) => total + item.price * item.quantity, 0);
  },
}));
