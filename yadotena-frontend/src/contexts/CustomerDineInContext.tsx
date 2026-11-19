"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import { MenuItem, Table, Order } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";

export interface SelectedAddon {
  id: string;
  name: string;
  price: number;
}

export interface CustomerCartItem {
  id: string; // unique cart line id
  menuItem: MenuItem;
  quantity: number;
  selectedAddons: SelectedAddon[];
  specialInstructions: string;
  unitPrice: number;
  itemTotal: number;
}

interface CustomerDineInContextType {
  tableId: string | null;
  tableName: string;
  activeTable: Table | null;
  /** The open order this device placed for its table (tracked by id — guests can't list orders). */
  activeTableOrder: Order | null;
  rememberOrder: (orderId: string) => void;
  cart: CustomerCartItem[];
  setTableId: (id: string | null) => void;
  clearTable: () => void;
  addToCart: (menuItem: MenuItem, quantity: number, selectedAddons: SelectedAddon[], specialInstructions: string) => void;
  updateCartItemQty: (cartItemId: string, newQty: number) => void;
  removeFromCart: (cartItemId: string) => void;
  clearCart: () => void;
  /** Quantity of a dish across all cart lines (for steppers on the menu). */
  qtyInCart: (menuItemId: string) => number;
  /** Remove one of a dish (from its newest line). */
  decrementItem: (menuItemId: string) => void;
  itemCount: number;
  /** Items only — VAT and service charge are added by the restaurant on the bill. */
  subtotal: number;
  total: number;
  /** Bumped on every add so the cart bar can pulse. */
  lastAddedAt: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  isTablePickerOpen: boolean;
  setIsTablePickerOpen: (open: boolean) => void;
  isQRScannerOpen: boolean;
  setIsQRScannerOpen: (open: boolean) => void;
}

const STORAGE_TABLE_KEY = "yadotena_customer_table_id";
const STORAGE_CART_KEY = "yadotena_customer_cart";
const orderKey = (tableId: string) => `yadotena_customer_order_${tableId}`;

const readStorage = (key: string): string | null => {
  try { return localStorage.getItem(key); } catch { return null; }
};
const writeStorage = (key: string, value: string | null) => {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Private mode / blocked storage — the cart simply won't survive a reload.
  }
};

const CustomerDineInContext = createContext<CustomerDineInContextType | undefined>(undefined);

export function CustomerDineInProvider({ children }: { children: React.ReactNode }) {
  const [tableId, setTableIdState] = useState<string | null>(null);
  const [cart, setCart] = useState<CustomerCartItem[]>([]);
  const [myOrderId, setMyOrderId] = useState<string | null>(null);
  const [lastAddedAt, setLastAddedAt] = useState(0);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isTablePickerOpen, setIsTablePickerOpen] = useState(false);
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const { data: tables = [] } = useQuery({ queryKey: ["tables"], queryFn: api.tables.getAll });

  // Restore table, cart and this device's last order from storage.
  useEffect(() => {
    const savedTable = readStorage(STORAGE_TABLE_KEY);
    if (savedTable) {
      setTableIdState(savedTable);
      setMyOrderId(readStorage(orderKey(savedTable)));
    }
    try {
      const savedCart = readStorage(STORAGE_CART_KEY);
      if (savedCart) setCart(JSON.parse(savedCart));
    } catch {
      // Corrupt cart — start empty.
    }
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (isInitialized) writeStorage(STORAGE_CART_KEY, JSON.stringify(cart));
  }, [cart, isInitialized]);

  const setTableId = useCallback((id: string | null) => {
    setTableIdState(id);
    writeStorage(STORAGE_TABLE_KEY, id);
    setMyOrderId(id ? readStorage(orderKey(id)) : null);
  }, []);
  const clearTable = () => setTableId(null);

  const rememberOrder = useCallback((orderId: string) => {
    setMyOrderId(orderId);
    if (tableId) writeStorage(orderKey(tableId), orderId);
  }, [tableId]);

  // Public endpoint: an order can be read by its (unguessable) id.
  const { data: myOrder } = useQuery({
    queryKey: ["orders", "mine", myOrderId],
    queryFn: () => api.orders.getById(myOrderId!),
    enabled: !!myOrderId,
    refetchInterval: 10_000,
  });
  const activeTableOrder =
    myOrder && myOrder.status !== "COMPLETED" && myOrder.status !== "CANCELLED" ? myOrder : null;

  const activeTable = useMemo(
    () => (tableId ? tables.find((t) => t.id === tableId || t.name === tableId) || null : null),
    [tableId, tables]
  );
  const tableName = useMemo(() => {
    if (!tableId) return "";
    return activeTable?.name || `Table ${tableId.replace(/^(tbl-|t)/i, "")}`;
  }, [tableId, activeTable]);

  const addToCart = (menuItem: MenuItem, quantity: number, selectedAddons: SelectedAddon[], specialInstructions: string) => {
    const unitPrice = menuItem.price + selectedAddons.reduce((sum, a) => sum + (a.price || 0), 0);
    setLastAddedAt(Date.now());
    setCart((prev) => {
      // Tapping "+" on the same plain dish again just bumps its quantity.
      const plain = selectedAddons.length === 0 && !specialInstructions;
      const same = plain && prev.find((c) => c.menuItem.id === menuItem.id && c.selectedAddons.length === 0 && !c.specialInstructions);
      if (same) {
        return prev.map((c) =>
          c.id === same.id ? { ...c, quantity: c.quantity + quantity, itemTotal: c.unitPrice * (c.quantity + quantity) } : c
        );
      }
      return [
        ...prev,
        {
          id: `cart-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          menuItem, quantity, selectedAddons, specialInstructions, unitPrice,
          itemTotal: unitPrice * quantity,
        },
      ];
    });
  };

  const removeFromCart = (cartItemId: string) => setCart((prev) => prev.filter((i) => i.id !== cartItemId));
  const updateCartItemQty = (cartItemId: string, newQty: number) => {
    if (newQty <= 0) return removeFromCart(cartItemId);
    setCart((prev) => prev.map((i) => (i.id === cartItemId ? { ...i, quantity: newQty, itemTotal: i.unitPrice * newQty } : i)));
  };
  const clearCart = () => setCart([]);

  const qtyInCart = (menuItemId: string) =>
    cart.reduce((n, c) => (c.menuItem.id === menuItemId ? n + c.quantity : n), 0);
  const decrementItem = (menuItemId: string) => {
    const line = [...cart].reverse().find((c) => c.menuItem.id === menuItemId);
    if (line) updateCartItemQty(line.id, line.quantity - 1);
  };

  const itemCount = useMemo(() => cart.reduce((sum, i) => sum + i.quantity, 0), [cart]);
  const subtotal = useMemo(() => Math.round(cart.reduce((sum, i) => sum + i.itemTotal, 0) * 100) / 100, [cart]);

  return (
    <CustomerDineInContext.Provider
      value={{
        tableId, tableName, activeTable, activeTableOrder, rememberOrder,
        cart, setTableId, clearTable, addToCart, updateCartItemQty, removeFromCart, clearCart,
        qtyInCart, decrementItem, itemCount, subtotal, total: subtotal, lastAddedAt,
        isCartOpen, setIsCartOpen, isTablePickerOpen, setIsTablePickerOpen, isQRScannerOpen, setIsQRScannerOpen,
      }}
    >
      {children}
    </CustomerDineInContext.Provider>
  );
}

export function useCustomerDineIn() {
  const context = useContext(CustomerDineInContext);
  if (!context) throw new Error("useCustomerDineIn must be used within a CustomerDineInProvider");
  return context;
}
