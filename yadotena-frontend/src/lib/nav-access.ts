import type { Role } from "@/types";

/** Shared role → path access (Sidebar + middleware). */
export const DASHBOARD_NAV: { href: string; roles: Role[] }[] = [
  { href: "/dashboard", roles: ["OWNER", "MANAGER", "WAITER"] },
  { href: "/dashboard/orders", roles: ["OWNER", "MANAGER", "WAITER", "KITCHEN"] },
  { href: "/dashboard/shop", roles: ["OWNER", "MANAGER", "WAITER"] },
  { href: "/dashboard/tables", roles: ["OWNER", "MANAGER", "WAITER"] },
  { href: "/dashboard/kitchen", roles: ["OWNER", "MANAGER", "KITCHEN"] },
  { href: "/dashboard/menu", roles: ["OWNER", "MANAGER"] },
  { href: "/dashboard/products", roles: ["OWNER", "MANAGER"] },
  { href: "/dashboard/customers", roles: ["OWNER", "MANAGER", "WAITER"] },
  { href: "/dashboard/payments", roles: ["OWNER", "MANAGER"] },
  { href: "/dashboard/expenses", roles: ["OWNER", "MANAGER"] },
  { href: "/dashboard/employees", roles: ["OWNER", "MANAGER"] },
  { href: "/dashboard/reports", roles: ["OWNER", "MANAGER"] },
  { href: "/dashboard/activity", roles: ["OWNER", "MANAGER"] },
  { href: "/dashboard/reviews", roles: ["OWNER", "MANAGER"] },
  { href: "/dashboard/settings", roles: ["OWNER"] },
];

export function roleHome(role: Role): string {
  if (role === "KITCHEN") return "/dashboard/kitchen";
  return "/dashboard";
}

export function canAccessPath(role: Role, pathname: string): boolean {
  const path = pathname.split("?")[0].replace(/\/$/, "") || "/";
  if (path === "/dashboard") {
    return DASHBOARD_NAV.some((n) => n.href === "/dashboard" && n.roles.includes(role));
  }
  // Longest prefix match among dashboard routes
  const matches = DASHBOARD_NAV.filter(
    (n) => n.href !== "/dashboard" && (path === n.href || path.startsWith(`${n.href}/`)),
  ).sort((a, b) => b.href.length - a.href.length);
  if (matches.length === 0) {
    // Unknown /dashboard/* — allow owner/manager only
    return role === "OWNER" || role === "MANAGER";
  }
  return matches[0].roles.includes(role);
}
