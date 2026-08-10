import type { OrderType } from "@/types";

const LABELS: Record<OrderType, string> = {
  DINE_IN: "Dine-in",
  TAKEAWAY: "Takeaway",
  DELIVERY: "Delivery",
  SHOP_PICKUP: "Shop pickup",
  SHOP_DELIVERY: "Shop delivery",
};

/** Friendly label for any order type (incl. TAKEAWAY ↔ pickup alias). */
export function orderTypeLabel(type: string | undefined | null): string {
  if (!type) return "Order";
  if (type in LABELS) return LABELS[type as OrderType];
  if (type === "PICKUP") return LABELS.TAKEAWAY;
  return type.replaceAll("_", " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

export function isDeliveryType(type: string | undefined | null): boolean {
  return type === "DELIVERY" || type === "SHOP_DELIVERY";
}
