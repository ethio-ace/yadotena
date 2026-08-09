"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Role } from "@/types";
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
  Bell,
  Package,
  Store,
} from "lucide-react";

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  roles: Role[];
}

const navItems: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["OWNER", "MANAGER", "WAITER"] },
  { name: "Orders", href: "/dashboard/orders", icon: ShoppingCart, roles: ["OWNER", "MANAGER", "WAITER", "KITCHEN"] },
  { name: "Shop", href: "/dashboard/shop", icon: Store, roles: ["OWNER", "MANAGER", "WAITER"] },
  { name: "Tables", href: "/dashboard/tables", icon: Grid, roles: ["OWNER", "MANAGER", "WAITER"] },
  { name: "Kitchen", href: "/dashboard/kitchen", icon: ChefHat, roles: ["OWNER", "MANAGER", "KITCHEN"] },
  { name: "Menu", href: "/dashboard/menu", icon: MenuSquare, roles: ["OWNER", "MANAGER"] },
  { name: "Products", href: "/dashboard/products", icon: Package, roles: ["OWNER", "MANAGER"] },
  { name: "Customers", href: "/dashboard/customers", icon: Users, roles: ["OWNER", "MANAGER", "WAITER"] },
  { name: "Payments", href: "/dashboard/payments", icon: CreditCard, roles: ["OWNER", "MANAGER"] },
  { name: "Expenses", href: "/dashboard/expenses", icon: Receipt, roles: ["OWNER", "MANAGER"] },
  { name: "Employees", href: "/dashboard/employees", icon: UserSquare2, roles: ["OWNER", "MANAGER"] },
  { name: "Reports", href: "/dashboard/reports", icon: BarChart3, roles: ["OWNER", "MANAGER"] },
  { name: "Reviews", href: "/dashboard/reviews", icon: MessageSquare, roles: ["OWNER", "MANAGER"] },
  { name: "Settings", href: "/dashboard/settings", icon: Settings, roles: ["OWNER"] },
];

export default function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  const allowedItems = navItems.filter((item) => item.roles.includes(role));

  return (
    <aside className="w-64 bg-card border-r flex-shrink-0 hidden md:flex flex-col">
      <div className="h-20 flex items-center px-6 border-b gap-3">
        <div className="h-10 w-10 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground font-black text-lg shadow-md shadow-primary/25">
          🥛
        </div>
        <div>
          <h1 className="text-xl font-black text-primary tracking-tight leading-none">Yadotena</h1>
          <span className="text-[11px] font-bold text-muted-foreground tracking-wider uppercase">Milk & Foods</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-1 px-3">
          {allowedItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon
                  className={cn(
                    "mr-3 h-5 w-5 flex-shrink-0 transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                  )}
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
