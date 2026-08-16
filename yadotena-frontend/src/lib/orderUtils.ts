import { OrderItem, MenuItem, AddonItem, MenuItemAddon } from "@/types";

/**
 * Is this menu item an over-the-counter packaged retail product (beans, powder,
 * butter jars, honey, spices) rather than a kitchen-prepared dish?
 *
 * Same heuristic the customer shop storefront uses — the backend has no
 * dedicated "retail" flag on items, so channel identity is inferred from the
 * item/category naming scheme.
 */
export function isRetailProduct(item: MenuItem | null | undefined): boolean {
  if (!item) return false;
  const cat = (item.category || "").toLowerCase();
  const catId = item.categoryId || "";
  return (
    item.id.startsWith("shop-") ||
    catId.startsWith("cat-shop") ||
    cat.includes("shop") ||
    cat.includes("tomoca") ||
    cat.includes("pack") ||
    cat.includes("butter") ||
    cat.includes("honey") ||
    cat.includes("spice") ||
    cat.includes("powder") ||
    cat.includes("retail")
  );
}

export function isShopProductItem(item: MenuItem | null | undefined): boolean {
  if (!item) return false;
  const cat = (item.category || "").toLowerCase();
  const catId = item.categoryId || "";
  return (
    item.id.startsWith("shop-") ||
    catId.startsWith("cat-shop") ||
    cat.includes("shop") ||
    cat.includes("tomoca") ||
    cat.includes("retail")
  );
}

export function getApplicableAddonsForItem(
  item: MenuItem | null | undefined,
  allAddons: AddonItem[] = []
): MenuItemAddon[] {
  if (!item) return [];

  // Retail shop items (packaged products) NEVER have add-ons!
  if (isShopProductItem(item)) {
    return [];
  }

  const result: MenuItemAddon[] = [];
  const seenIds = new Set<string>();

  // 1. Custom inline addons on the MenuItem itself
  if (item.customAddons && Array.isArray(item.customAddons)) {
    for (const ca of item.customAddons) {
      if (ca.id && !seenIds.has(ca.id)) {
        seenIds.add(ca.id);
        result.push({
          id: ca.id,
          name: ca.name,
          price: ca.price || 0,
          description: ca.description,
          imageUrl: ca.imageUrl || ca.image,
          scope: ca.scope || "ITEM",
          categoryId: ca.categoryId,
          categoryName: ca.categoryName,
          menuItemId: ca.menuItemId || item.id,
          menuItemName: ca.menuItemName || item.name,
          isGlobal: ca.isGlobal || false,
          isActive: ca.isActive !== false,
        });
      }
    }
  }

  // 2. System-wide addons (GLOBAL, CATEGORY, ITEM)
  if (Array.isArray(allAddons)) {
    for (const a of allAddons) {
      if (a.isActive === false) continue;

      const isGlobal = a.isGlobal || a.scope === "GLOBAL";
      const isCategory =
        a.scope === "CATEGORY" ||
        Boolean(a.categoryId && a.categoryId !== "") ||
        Boolean(a.categoryName && a.categoryName !== "");
      const isItem =
        a.scope === "ITEM" ||
        Boolean(a.menuItemId && a.menuItemId !== "") ||
        Boolean(a.menuItemName && a.menuItemName !== "");

      let matches = false;
      if (isGlobal) {
        matches = true;
      } else if (
        isItem &&
        (a.menuItemId === item.id ||
          (a.menuItemName && item.name && a.menuItemName.toLowerCase() === item.name.toLowerCase()))
      ) {
        matches = true;
      } else if (
        isCategory &&
        ((item.categoryId && a.categoryId === item.categoryId) ||
          (a.categoryName && item.category && a.categoryName.toLowerCase() === item.category.toLowerCase()))
      ) {
        matches = true;
      }

      if (matches && a.id && !seenIds.has(a.id)) {
        seenIds.add(a.id);
        result.push({
          id: a.id,
          name: a.name,
          price: a.price || 0,
          description: a.description,
          imageUrl: a.imageUrl || a.image,
          scope: isGlobal ? "GLOBAL" : isCategory ? "CATEGORY" : "ITEM",
          categoryId: a.categoryId,
          categoryName: a.categoryName,
          menuItemId: a.menuItemId,
          menuItemName: a.menuItemName,
          isGlobal: isGlobal,
          isActive: a.isActive,
        });
      }
    }
  }

  return result;
}

export function toOrderItemPayload(items: OrderItem[]) {
  return items.map((item) => ({
    menuItemId: item.menuItemId,
    name: item.name,
    price: item.price,
    quantity: item.quantity,
    qty: item.quantity,
    specialInstructions: item.specialInstructions,
    notes: item.specialInstructions,
    selectedAddons: item.selectedAddons?.map((addon) => addon.id || addon.name) || [],
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
