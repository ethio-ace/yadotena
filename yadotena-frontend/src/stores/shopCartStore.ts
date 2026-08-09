import { create } from "zustand";
import type { OrderItem, Product } from "@/types";

interface ShopCartState {
  items: OrderItem[];
  addProduct: (product: Product, quantity?: number) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  getTotal: () => number;
}

export const useShopCartStore = create<ShopCartState>((set, get) => ({
  items: [],
  addProduct: (product, quantity = 1) =>
    set((state) => {
      const existing = state.items.find((i) => i.productId === product.id);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.id === existing.id
              ? { ...i, quantity: i.quantity + quantity }
              : i,
          ),
        };
      }
      return {
        items: [
          ...state.items,
          {
            id: Math.random().toString(36).slice(2),
            productId: product.id,
            name: product.name,
            price: product.price,
            quantity,
          },
        ],
      };
    }),
  removeItem: (id) =>
    set((state) => ({ items: state.items.filter((i) => i.id !== id) })),
  updateQuantity: (id, quantity) =>
    set((state) => ({
      items: state.items.map((i) => (i.id === id ? { ...i, quantity } : i)),
    })),
  clearCart: () => set({ items: [] }),
  getTotal: () =>
    get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
}));
