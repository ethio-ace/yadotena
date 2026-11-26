"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import { MenuItem, Table, Order } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { resolveTable } from "@/lib/tableUtils";

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

export type CustomerOrderMode = "DINE_IN" | "DELIVERY";

export interface DeliveryDetails {
  name: string;
  phone: string;
  address: string;
}

interface CustomerDineInContextType {
  /** Eating here (table) or delivery. Delivery only when the owner has it on. */
  orderMode: CustomerOrderMode;
  setOrderMode: (mode: CustomerOrderMode) => void;
  /** Owner switched website delivery on (it may still be outside hours). */
  deliveryAvailable: boolean;
  /** Inside delivery hours right now (server-computed). */
  deliveryOpenNow: boolean;
  /** "09:00–21:00", or "" when there are no hours set. */
  deliveryHours: string;
  deliveryFee: number;
  /** Last details used on this device, so repeat customers don't retype. */
  deliveryDetails: DeliveryDetails;
  setDeliveryDetails: (d: DeliveryDetails) => void;
  /** A real table id from the roster — never a raw QR/typed code. */
  tableId: string | null;
  /** A code we were given (QR, typed, remembered) that matches no table. */
  unmatchedTableCode: string | null;
  tableName: string;
  activeTable: Table | null;
  /** State of the public table roster — "empty" means no tables exist on the server. */
  tablesStatus: "loading" | "error" | "empty" | "ready";
  retryTables: () => void;
  /** The open order this device placed for its table — or its delivery, in delivery mode
   *  (tracked by id — guests can't list orders). */
  activeTableOrder: Order | null;
  rememberOrder: (orderId: string) => void;
  cart: CustomerCartItem[];
  /** Connect a table. `key` is the secret from the table's QR (`?k=`), kept per table. */
  setTableId: (id: string | null, key?: string | null) => void;
  /** This table's QR key if this device scanned it (sent with guest orders). */
  tableKey: string | null;
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
  /** Items only — the service charge is added by the restaurant on the bill. */
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
const qrKeyKey = (tableId: string) => `yadotena_customer_table_key_${tableId}`;
const STORAGE_MODE_KEY = "yadotena_customer_order_mode";
const STORAGE_DELIVERY_KEY = "yadotena_customer_delivery_details";
const DELIVERY_ORDER_SLOT = "delivery";
const EMPTY_DELIVERY: DeliveryDetails = { name: "", phone: "", address: "" };

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
  // Whatever code we were handed; resolved against the roster below.
  const [tableCode, setTableCode] = useState<string | null>(null);
  const [cart, setCart] = useState<CustomerCartItem[]>([]);
  // Bumped when this device places an order, to re-read the remembered id.
  const [orderVersion, setOrderVersion] = useState(0);
  const [lastAddedAt, setLastAddedAt] = useState(0);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isTablePickerOpen, setIsTablePickerOpen] = useState(false);
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [modeChoice, setModeChoice] = useState<CustomerOrderMode>("DINE_IN");
  const [deliveryDetails, setDeliveryDetailsState] = useState<DeliveryDetails>(EMPTY_DELIVERY);

  // Public settings: is delivery on, its hours and fee. Re-checked so the
  // menu notices when the delivery window opens or closes.
  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: api.settings.get,
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  });
  const deliveryAvailable = !!settings?.deliveryEnabled;
  const deliveryOpenNow = deliveryAvailable && settings?.deliveryOpenNow !== false;
  const deliveryHours =
    settings?.deliveryStartTime && settings?.deliveryEndTime && settings.deliveryStartTime !== settings.deliveryEndTime
      ? `${settings.deliveryStartTime}–${settings.deliveryEndTime}`
      : "";
  const deliveryFee = Number(settings?.deliveryFee || 0);
  // Delivery switched off by the owner → everyone is a dine-in guest again.
  const orderMode: CustomerOrderMode = modeChoice === "DELIVERY" && deliveryAvailable ? "DELIVERY" : "DINE_IN";
  const setOrderMode = useCallback((mode: CustomerOrderMode) => {
    setModeChoice(mode);
    writeStorage(STORAGE_MODE_KEY, mode);
  }, []);
  const setDeliveryDetails = useCallback((d: DeliveryDetails) => {
    setDeliveryDetailsState(d);
    writeStorage(STORAGE_DELIVERY_KEY, JSON.stringify(d));
  }, []);

  const {
    data: tables = [],
    isSuccess: tablesLoaded,
    isError: tablesFailed,
    refetch: refetchTables,
  } = useQuery({ queryKey: ["tables"], queryFn: api.tables.getAll, retry: 3 });
  // Without a roster no code can resolve, so the menu must say why instead of looping on "choose your table".
  const tablesStatus: CustomerDineInContextType["tablesStatus"] = tablesLoaded
    ? tables.length === 0 ? "empty" : "ready"
    : tablesFailed ? "error" : "loading";
  const retryTables = useCallback(() => { refetchTables(); }, [refetchTables]);

  // Restore table, cart and this device's last order from storage.
  useEffect(() => {
    const savedTable = readStorage(STORAGE_TABLE_KEY);
    if (savedTable) setTableCode(savedTable);
    if (readStorage(STORAGE_MODE_KEY) === "DELIVERY") setModeChoice("DELIVERY");
    try {
      const savedDelivery = readStorage(STORAGE_DELIVERY_KEY);
      if (savedDelivery) setDeliveryDetailsState({ ...EMPTY_DELIVERY, ...JSON.parse(savedDelivery) });
    } catch {
      // Corrupt details — the form starts empty.
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

  const activeTable = useMemo(() => resolveTable(tableCode, tables) || null, [tableCode, tables]);
  const tableId = activeTable?.id ?? null;
  const unmatchedTableCode = tableCode && tablesLoaded && !activeTable ? tableCode : null;

  const [keyVersion, setKeyVersion] = useState(0);
  const setTableId = useCallback((code: string | null, key?: string | null) => {
    // Store the canonical id when we can already resolve it.
    const canonical = code ? resolveTable(code, tables)?.id || code : null;
    setTableCode(canonical);
    writeStorage(STORAGE_TABLE_KEY, canonical);
    if (canonical && key) {
      writeStorage(qrKeyKey(canonical), key);
      setKeyVersion((v) => v + 1);
    }
  }, [tables]);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- keyVersion re-reads storage after a scan
  const tableKey = useMemo(() => (tableId ? readStorage(qrKeyKey(tableId)) : null), [tableId, keyVersion]);
  const clearTable = () => setTableId(null);

  // Where this device remembers its last order: per table, or one delivery slot.
  const orderSlot = orderMode === "DELIVERY" ? DELIVERY_ORDER_SLOT : tableId;
  const rememberOrder = useCallback((orderId: string) => {
    if (orderSlot) writeStorage(orderKey(orderSlot), orderId);
    setOrderVersion((v) => v + 1);
  }, [orderSlot]);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- orderVersion re-reads storage after rememberOrder
  const myOrderId = useMemo(() => (orderSlot ? readStorage(orderKey(orderSlot)) : null), [orderSlot, orderVersion]);

  // Public endpoint: an order can be read by its (unguessable) id.
  const { data: myOrder } = useQuery({
    queryKey: ["orders", "mine", myOrderId],
    queryFn: () => api.orders.getById(myOrderId!),
    enabled: !!myOrderId,
    refetchInterval: 10_000,
  });
  const activeTableOrder =
    myOrder && myOrder.status !== "COMPLETED" && myOrder.status !== "CANCELLED" ? myOrder : null;

  // Only ever a real table's name — no invented "Table 4" for unknown codes.
  const tableName = activeTable?.name || "";

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
        orderMode, setOrderMode, deliveryAvailable, deliveryOpenNow, deliveryHours, deliveryFee,
        deliveryDetails, setDeliveryDetails,
        tableId, tableKey, unmatchedTableCode, tableName, activeTable, tablesStatus, retryTables, activeTableOrder, rememberOrder,
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
