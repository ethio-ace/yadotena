"use client";

import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { MenuItem, Table, Order } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { isShopProductItem } from "@/lib/orderUtils";
import { findActiveOrderForTable } from "@/lib/tableUtils";

export interface SelectedAddon {
  id: string;
  name: string;
  price: number;
}

export interface CustomerCartItem {
  id: string; // unique cart item id
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
  activeTableOrder: Order | null;
  cart: CustomerCartItem[];
  setTableId: (id: string | null) => void;
  clearTable: () => void;
  addToCart: (
    menuItem: MenuItem,
    quantity: number,
    selectedAddons: SelectedAddon[],
    specialInstructions: string
  ) => void;
  updateCartItemQty: (cartItemId: string, newQty: number) => void;
  removeFromCart: (cartItemId: string) => void;
  clearCart: () => void;
  itemCount: number;
  subtotal: number;
  serviceCharge: number;
  tax: number;
  total: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  isTablePickerOpen: boolean;
  setIsTablePickerOpen: (open: boolean) => void;
  isQRScannerOpen: boolean;
  setIsQRScannerOpen: (open: boolean) => void;
}

const STORAGE_TABLE_KEY = "yadotena_customer_table_id";
const STORAGE_CART_KEY = "yadotena_customer_cart";

const CustomerDineInContext = createContext<CustomerDineInContextType | undefined>(undefined);

export function CustomerDineInProvider({ children }: { children: React.ReactNode }) {
  const [tableId, setTableIdState] = useState<string | null>(null);
  const [cart, setCart] = useState<CustomerCartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isTablePickerOpen, setIsTablePickerOpen] = useState(false);
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Fetch table roster to resolve human table names
  const { data: tables = [] } = useQuery({
    queryKey: ["tables"],
    queryFn: api.tables.getAll,
  });

  // Fetch active orders to detect if table already has an active order running
  const { data: allOrders = [] } = useQuery({
    queryKey: ["orders", "active-dinein-check"],
    queryFn: async () => {
      try {
        return await api.orders.getAll();
      } catch {
        return [];
      }
    },
    refetchInterval: 8000,
  });

  // Restore tableId & cart from localStorage on client load
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedTable = localStorage.getItem(STORAGE_TABLE_KEY);
      if (savedTable) {
        setTableIdState(savedTable);
      }
      try {
        const savedCart = localStorage.getItem(STORAGE_CART_KEY);
        if (savedCart) {
          setCart(JSON.parse(savedCart));
        }
      } catch (e) {
        console.error("Failed to parse customer cart", e);
      }
      setIsInitialized(true);
    }
  }, []);

  // Persist tableId changes
  const setTableId = (id: string | null) => {
    setTableIdState(id);
    if (typeof window !== "undefined") {
      if (id) {
        localStorage.setItem(STORAGE_TABLE_KEY, id);
      } else {
        localStorage.removeItem(STORAGE_TABLE_KEY);
      }
    }
  };

  const clearTable = () => {
    setTableId(null);
  };

  // Persist cart changes
  useEffect(() => {
    if (isInitialized && typeof window !== "undefined") {
      localStorage.setItem(STORAGE_CART_KEY, JSON.stringify(cart));
    }
  }, [cart, isInitialized]);

  const activeTable = useMemo(() => {
    if (!tableId) return null;
    return tables.find((t) => t.id === tableId || t.name === tableId) || null;
  }, [tableId, tables]);

  const tableName = useMemo(() => {
    if (!tableId) return "";
    if (activeTable?.name) return activeTable.name;
    const cleanId = tableId.replace(/^(tbl-|t)/i, "");
    return `Table ${cleanId}`;
  }, [tableId, activeTable]);

  // Check if table currently has an active running order in progress
  const activeTableOrder = useMemo(() => {
    if (!tableId) return null;
    const target = activeTable || ({ id: tableId, name: tableName } as Table);
    return findActiveOrderForTable(target, allOrders) || null;
  }, [tableId, activeTable, tableName, allOrders]);

  const addToCart = (
    menuItem: MenuItem,
    quantity: number,
    selectedAddons: SelectedAddon[],
    specialInstructions: string
  ) => {
    const addonsPrice = selectedAddons.reduce((sum, a) => sum + (a.price || 0), 0);
    const unitPrice = menuItem.price + addonsPrice;
    const itemTotal = unitPrice * quantity;

    const newItem: CustomerCartItem = {
      id: `cart-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      menuItem,
      quantity,
      selectedAddons,
      specialInstructions,
      unitPrice,
      itemTotal,
    };

    setCart((prev) => [...prev, newItem]);
  };

  const updateCartItemQty = (cartItemId: string, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(cartItemId);
      return;
    }
    setCart((prev) =>
      prev.map((item) => {
        if (item.id === cartItemId) {
          const itemTotal = item.unitPrice * newQty;
          return { ...item, quantity: newQty, itemTotal };
        }
        return item;
      })
    );
  };

  const removeFromCart = (cartItemId: string) => {
    setCart((prev) => prev.filter((item) => item.id !== cartItemId));
  };

  const clearCart = () => {
    setCart([]);
  };

  // Derived financial calculations
  const itemCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

  const subtotal = useMemo(
    () => Math.round(cart.reduce((sum, item) => sum + item.itemTotal, 0) * 100) / 100,
    [cart]
  );

  const serviceCharge = useMemo(
    () => Math.round(subtotal * 0.10 * 100) / 100,
    [subtotal]
  );

  const tax = useMemo(
    () => Math.round(subtotal * 0.15 * 100) / 100,
    [subtotal]
  );

  const total = useMemo(
    () => Math.round((subtotal + serviceCharge + tax) * 100) / 100,
    [subtotal, serviceCharge, tax]
  );

  return (
    <CustomerDineInContext.Provider
      value={{
        tableId,
        tableName,
        activeTable,
        activeTableOrder,
        cart,
        setTableId,
        clearTable,
        addToCart,
        updateCartItemQty,
        removeFromCart,
        clearCart,
        itemCount,
        subtotal,
        serviceCharge,
        tax,
        total,
        isCartOpen,
        setIsCartOpen,
        isTablePickerOpen,
        setIsTablePickerOpen,
        isQRScannerOpen,
        setIsQRScannerOpen,
      }}
    >
      {children}
    </CustomerDineInContext.Provider>
  );
}

export function useCustomerDineIn() {
  const context = useContext(CustomerDineInContext);
  if (!context) {
    throw new Error("useCustomerDineIn must be used within a CustomerDineInProvider");
  }
  return context;
}
