import type { Order } from "@/types";

/** Mirrors backend orders.KitchenVisible — shop never; pickup/delivery only when PAID. */
export function isKitchenVisible(order: Order): boolean {
  if (typeof order.kitchenVisible === "boolean") {
    return order.kitchenVisible;
  }
  if (order.status === "CANCELLED" || order.status === "COMPLETED") {
    return false;
  }
  if (order.type === "SHOP_PICKUP" || order.type === "SHOP_DELIVERY") {
    return false;
  }
  if (order.type === "TAKEAWAY" || order.type === "DELIVERY") {
    return order.paymentStatus === "PAID";
  }
  return true;
}
