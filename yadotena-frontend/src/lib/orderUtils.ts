import { OrderItem } from "@/types";

export function toOrderItemPayload(items: OrderItem[]) {
  return items.map((item) => ({
    menuItemId: item.menuItemId,
    quantity: item.quantity,
    specialInstructions: item.specialInstructions,
    selectedAddons: item.selectedAddons?.map((addon) => addon.id) || [],
  }));
}

/** Estimate totals for display — server recalculates authoritative amounts at submit time. */
export function estimateOrderTotals(
  items: Array<{ price: number; quantity: number }>,
  orderType: "DINE_IN" | "TAKEAWAY" | "DELIVERY",
  options?: { vatPercent?: number; serviceChargePercent?: number; includeDeliveryFee?: boolean }
) {
  const vatPercent = options?.vatPercent ?? 15;
  const serviceChargePercent = options?.serviceChargePercent ?? 10;
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * (vatPercent / 100);
  const serviceCharge = orderType === "DINE_IN" ? subtotal * (serviceChargePercent / 100) : 0;
  const deliveryFee = orderType === "DELIVERY" && options?.includeDeliveryFee !== false ? 100 : 0;
  const total = subtotal + tax + serviceCharge + deliveryFee;

  return { subtotal, tax, serviceCharge, deliveryFee, total };
}
