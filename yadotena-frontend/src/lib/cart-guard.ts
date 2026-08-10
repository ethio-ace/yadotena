"use client";

import { create } from "zustand";
import { useCartStore } from "@/stores/cartStore";
import { useShopCartStore } from "@/stores/shopCartStore";

type CartTarget = "menu" | "shop";

type CartConflictState = {
  open: boolean;
  target: CartTarget | null;
  message: string;
  proceed: (() => void) | null;
  request: (target: CartTarget, proceed: () => void) => void;
  confirm: () => void;
  cancel: () => void;
};

const MESSAGES: Record<CartTarget, string> = {
  menu: "Your retail shop cart will be cleared so kitchen and shop items stay separate. Continue?",
  shop: "Your kitchen menu cart will be cleared so shop and menu items stay separate. Continue?",
};

export const useCartConflictStore = create<CartConflictState>((set, get) => ({
  open: false,
  target: null,
  message: "",
  proceed: null,
  request: (target, proceed) => {
    const menuCount = useCartStore.getState().items.length;
    const shopCount = useShopCartStore.getState().items.length;
    const needsClear =
      (target === "menu" && shopCount > 0) || (target === "shop" && menuCount > 0);
    if (!needsClear) {
      proceed();
      return;
    }
    set({
      open: true,
      target,
      message: MESSAGES[target],
      proceed,
    });
  },
  confirm: () => {
    const { target, proceed } = get();
    if (target === "menu") useShopCartStore.getState().clearCart();
    if (target === "shop") useCartStore.getState().clearCart();
    set({ open: false, target: null, message: "", proceed: null });
    proceed?.();
  },
  cancel: () => set({ open: false, target: null, message: "", proceed: null }),
}));

/** Run `proceed` after clearing the other cart if needed (in-app confirm). */
export function withExclusiveCart(target: CartTarget, proceed: () => void) {
  useCartConflictStore.getState().request(target, proceed);
}
