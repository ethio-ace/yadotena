import {
  LayoutDashboard,
  Coffee,
  Layers,
  Grid3X3,
  ClipboardList,
  CreditCard,
  Receipt,
  Settings,
  BarChart3,
  Users,
  ScrollText,
} from "lucide-react";
import { Role } from "@/types";

export interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
}

export interface NavGroup {
  group: string;
  items: NavItem[];
}

/**
 * Single source of truth for role-based navigation.
 *
 * The role shells (ManagerSidebar, OwnerSidebar) and the shared sidebar all
 * render from these arrays, so a manager or owner sees the same navigation —
 * same items, same order — on every page, whether it is a full-screen shell
 * route or a page rendered inside the shared chrome.
 */

export const managerNavGroups: NavGroup[] = [
  {
    group: "OVERVIEW",
    items: [{ name: "Overview", href: "/dashboard/manager", icon: LayoutDashboard }],
  },
  {
    group: "CATALOG",
    items: [
      { name: "Café Menu", href: "/dashboard/menu", icon: Coffee },
      { name: "Add-ons", href: "/dashboard/addons", icon: Layers },
    ],
  },
  {
    group: "OPERATIONS",
    items: [
      { name: "Floor Tables", href: "/dashboard/tables", icon: Grid3X3 },
      { name: "Order Supervision", href: "/dashboard/orders", icon: ClipboardList },
    ],
  },
  {
    group: "PAYMENTS",
    items: [{ name: "Payment Verification", href: "/dashboard/payments", icon: CreditCard }],
  },
  {
    group: "EXPENSES",
    items: [{ name: "Expense Ledger", href: "/dashboard/expenses", icon: Receipt }],
  },
  {
    group: "SETTINGS",
    items: [{ name: "Store Settings", href: "/dashboard/settings", icon: Settings }],
  },
];

export const ownerNavGroups: NavGroup[] = [
  {
    group: "OVERVIEW",
    items: [{ name: "Business Overview", href: "/dashboard/owner", icon: LayoutDashboard }],
  },
  {
    group: "SALES",
    items: [
      { name: "Sales & Products", href: "/dashboard/reports", icon: BarChart3 },
      { name: "Orders", href: "/dashboard/orders", icon: ClipboardList },
    ],
  },
  {
    group: "FINANCE",
    items: [
      { name: "Payments", href: "/dashboard/payments", icon: CreditCard },
      { name: "Expenses", href: "/dashboard/expenses", icon: Receipt },
    ],
  },
  {
    group: "PEOPLE",
    items: [{ name: "Staff & Access", href: "/dashboard/employees", icon: Users }],
  },
  {
    group: "AUDIT",
    items: [{ name: "Audit Log", href: "/dashboard/logs", icon: ScrollText }],
  },
  {
    group: "SETTINGS",
    items: [{ name: "Business Settings", href: "/dashboard/settings", icon: Settings }],
  },
];

export const waiterNavGroups: NavGroup[] = [
  {
    group: "OPERATIONS",
    items: [
      { name: "Floor Tables", href: "/dashboard/tables", icon: Grid3X3 },
      { name: "Order Supervision", href: "/dashboard/orders", icon: ClipboardList },
    ],
  },
];

export function navGroupsForRole(role: Role | string): NavGroup[] {
  if (role === "OWNER") return ownerNavGroups;
  if (role === "MANAGER") return managerNavGroups;
  if (role === "WAITER") return waiterNavGroups;
  // The shared chrome is only rendered for OWNER/MANAGER today; fall back to
  // the manager set rather than rendering nothing.
  return managerNavGroups;
}

/** Flat list of the role's nav items (used by the shared header's mobile menu). */
export function navItemsForRole(role: Role | string): NavItem[] {
  return navGroupsForRole(role).flatMap((g) => g.items);
}
