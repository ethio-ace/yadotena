import type { OrderType } from "@/types";

/** Offline fallbacks while public settings load — prefer API values. */
export const FALLBACK_TAX_PERCENT = 15;
export const FALLBACK_DELIVERY_FEE_ETB = 100;
export const DEFAULT_SERVICE_CHARGE_PERCENT = 0;

/** @deprecated use parseTaxPercent / computeOrderTotals taxPercent */
export const TAX_RATE = FALLBACK_TAX_PERCENT / 100;
/** @deprecated use parseDeliveryFeeEtb */
export const DELIVERY_FEE_ETB = FALLBACK_DELIVERY_FEE_ETB;

function numSetting(
  settings: Record<string, unknown> | null | undefined,
  key: string,
  fallback: number,
): number {
  const raw = settings?.[key];
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return n;
}

export function parseServiceChargePercent(
  settings?: Record<string, unknown> | null,
): number {
  return numSetting(settings, "service_charge_percent", DEFAULT_SERVICE_CHARGE_PERCENT);
}

export function parseTaxPercent(
  settings?: Record<string, unknown> | null,
): number {
  return numSetting(settings, "tax_percent", FALLBACK_TAX_PERCENT);
}

export function parseDeliveryFeeEtb(
  settings?: Record<string, unknown> | null,
): number {
  return numSetting(settings, "delivery_fee_etb", FALLBACK_DELIVERY_FEE_ETB);
}

export function computeOrderTotals(input: {
  subtotal: number;
  orderType: OrderType;
  serviceChargePercent: number;
  taxPercent?: number;
  deliveryFeeEtb?: number;
}) {
  const subtotal = Math.max(0, input.subtotal);
  const taxPercent = input.taxPercent ?? FALLBACK_TAX_PERCENT;
  const deliveryFeeEtb = input.deliveryFeeEtb ?? FALLBACK_DELIVERY_FEE_ETB;
  const tax = subtotal * (taxPercent / 100);
  const serviceCharge =
    input.orderType === "DINE_IN" && input.serviceChargePercent > 0
      ? subtotal * (input.serviceChargePercent / 100)
      : 0;
  const deliveryFee =
    input.orderType === "DELIVERY" || input.orderType === "SHOP_DELIVERY"
      ? deliveryFeeEtb
      : 0;
  const total = subtotal + tax + serviceCharge + deliveryFee;
  return { subtotal, tax, serviceCharge, deliveryFee, total, taxPercent };
}
