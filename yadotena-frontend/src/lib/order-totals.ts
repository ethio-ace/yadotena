import type { OrderType } from "@/types";

/** Matches backend createOrder tax rate. */
export const TAX_RATE = 0.15;

/** Matches backend createOrder delivery fee (ETB). */
export const DELIVERY_FEE_ETB = 100;

/** Fallback only while public settings load; prefer API service_charge_percent. */
export const DEFAULT_SERVICE_CHARGE_PERCENT = 0;

export function parseServiceChargePercent(
  settings?: Record<string, unknown> | null,
): number {
  const raw = settings?.service_charge_percent;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n) || n < 0) return DEFAULT_SERVICE_CHARGE_PERCENT;
  return n;
}

export function computeOrderTotals(input: {
  subtotal: number;
  orderType: OrderType;
  serviceChargePercent: number;
}) {
  const subtotal = Math.max(0, input.subtotal);
  const tax = subtotal * TAX_RATE;
  const serviceCharge =
    input.orderType === "DINE_IN" && input.serviceChargePercent > 0
      ? subtotal * (input.serviceChargePercent / 100)
      : 0;
  const deliveryFee =
    input.orderType === "DELIVERY" || input.orderType === "SHOP_DELIVERY"
      ? DELIVERY_FEE_ETB
      : 0;
  const total = subtotal + tax + serviceCharge + deliveryFee;
  return { subtotal, tax, serviceCharge, deliveryFee, total };
}
