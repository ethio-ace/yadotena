"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Role } from "@/types";
import { DASHBOARD_NAV } from "@/lib/nav-access";
import {
  LayoutDashboard,
  ShoppingCart,
  Grid,
  MenuSquare,
  ChefHat,
  Users,
  CreditCard,
  Receipt,
  UserSquare2,
  BarChart3,
  MessageSquare,
  Settings,
  Package,
  Store,
  ScrollText,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  "/dashboard": LayoutDashboard,
  "/dashboard/orders": ShoppingCart,
  "/dashboard/shop": Store,
  "/dashboard/tables": Grid,
  "/dashboard/kitchen": ChefHat,
  "/dashboard/menu": MenuSquare,
  "/dashboard/products": Package,
  "/dashboard/customers": Users,
  "/dashboard/payments": CreditCard,
  "/dashboard/expenses": Receipt,
  "/dashboard/employees": UserSquare2,
  "/dashboard/reports": BarChart3,
  "/dashboard/activity": ScrollText,
  "/dashboard/reviews": MessageSquare,
  "/dashboard/settings": Settings,
};

const LABELS: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/orders": "Orders",
  "/dashboard/shop": "Shop",
  "/dashboard/tables": "Tables",
  "/dashboard/kitchen": "Kitchen",
  "/dashboard/menu": "Menu",
  "/dashboard/products": "Products",
  "/dashboard/customers": "Customers",
  "/dashboard/payments": "Payments",
  "/dashboard/expenses": "Expenses",
  "/dashboard/employees": "Employees",
  "/dashboard/reports": "Reports",
  "/dashboard/activity": "Activity",
  "/dashboard/reviews": "Reviews",
  "/dashboard/settings": "Settings",
};

export default function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  const allowedItems = DASHBOARD_NAV.filter((item) => item.roles.includes(role)).map(
    (item) => ({
      ...item,
      name: LABELS[item.href] || item.href,
      icon: ICONS[item.href] || LayoutDashboard,
    }),
  );

  return (
    <aside className="w-64 bg-card border-r flex-shrink-0 hidden md:flex flex-col">
      <div className="h-20 flex items-center px-6 border-b gap-3">
        <div className="h-10 w-10 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground font-black text-lg shadow-md shadow-primary/25">
          Y
        </div>
        <div>
          <h1 className="text-xl font-black text-primary tracking-tight leading-none">Yadotena</h1>
          <span className="text-[11px] font-bold text-muted-foreground tracking-wider uppercase">
            Milk & Foods
          </span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-1 px-3">
          {allowedItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <item.icon
                  className={cn("mr-3 h-4 w-4", isActive ? "text-primary" : "text-muted-foreground")}
                />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
