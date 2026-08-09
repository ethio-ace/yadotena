import type { CreateOrderInput, OrderType } from "@/types";

export type CheckoutStep = 1 | 2 | 3 | 4;

export const CHECKOUT_STEP_LABELS = [
  "Cart & type",
  "Contact",
  "Payment",
  "Review",
] as const;

export type GuestPaymentChoice = "cash" | string; // "cash" or digital method id

export function buildGuestPlacePayload(input: {
  orderType: OrderType;
  tableId?: string | null;
  customerName: string;
  customerPhone: string;
  deliveryAddress?: string;
  items: CreateOrderInput["items"];
  total: number;
  paymentChoice: GuestPaymentChoice;
  transactionReference: string;
}): CreateOrderInput {
  const { orderType, paymentChoice, transactionReference } = input;
  const isDineIn = orderType === "DINE_IN";
  const isCash = paymentChoice === "cash" || isDineIn;

  if (!isCash && !transactionReference.trim()) {
    throw new Error("Transaction reference is required for digital payment");
  }

  return {
    type: orderType,
    status: "PENDING",
    // Never mark guest cash as PAID — staff confirms pickup/delivery cash;
    // dine-in stays unpaid until settled after the meal.
    paymentStatus: "PENDING",
    paymentMethod: isCash ? "cash" : "digital",
    digitalMethod: isCash ? undefined : paymentChoice,
    reference: isCash ? undefined : transactionReference.trim(),
    items: input.items,
    total: input.total,
    tableId: orderType === "DINE_IN" ? input.tableId || undefined : undefined,
    customerName: input.customerName.trim() || "Guest",
    customerPhone: input.customerPhone.trim() || "0000000000",
    deliveryAddress:
      orderType === "DELIVERY" || orderType === "SHOP_DELIVERY"
        ? input.deliveryAddress?.trim()
        : undefined,
  };
}

export function parseDigitalMethods(
  settings?: Record<string, unknown> | null,
): string[] {
  const enabled = settings?.digital_enabled !== false;
  if (!enabled) return [];
  const raw = settings?.digital_methods;
  if (Array.isArray(raw)) {
    return raw.filter((m): m is string => typeof m === "string" && m.trim() !== "");
  }
  return ["Telebirr", "CBE Birr"];
}

export function cashEnabled(settings?: Record<string, unknown> | null): boolean {
  return settings?.cash_enabled !== false;
}

export function placeOrderCtaLabel(orderType: OrderType, isCash: boolean): string {
  if (orderType === "DINE_IN") return "Place dine-in order";
  if (isCash) return "Place order — pay at counter";
  return "Submit payment & place order";
}
