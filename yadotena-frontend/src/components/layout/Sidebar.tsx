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
  Settings,
  ShieldCheck,
  Briefcase,
  Wallet,
  Utensils
} from "lucide-react";

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  roles: Role[];
}

export const navItems: NavItem[] = [
  { name: "Overview Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["OWNER", "MANAGER"] },
  { name: "Owner Console", href: "/dashboard/owner", icon: ShieldCheck, roles: ["OWNER"] },
  { name: "Manager Operations", href: "/dashboard/manager", icon: Briefcase, roles: ["OWNER", "MANAGER"] },
  { name: "Waiter Floor POS", href: "/dashboard/waiter", icon: Utensils, roles: ["OWNER", "MANAGER"] },
  { name: "Kitchen Display (KDS)", href: "/dashboard/kitchen", icon: ChefHat, roles: ["OWNER", "MANAGER"] },
  { name: "Cashier POS", href: "/dashboard/cashier", icon: Wallet, roles: ["OWNER", "MANAGER"] },
  { name: "Orders Ledger", href: "/dashboard/orders", icon: ShoppingCart, roles: ["OWNER", "MANAGER"] },
  { name: "Floor Tables", href: "/dashboard/tables", icon: Grid, roles: ["OWNER", "MANAGER"] },
  { name: "Menu Catalog", href: "/dashboard/menu", icon: MenuSquare, roles: ["OWNER", "MANAGER"] },
  { name: "Customers CRM", href: "/dashboard/customers", icon: Users, roles: ["OWNER", "MANAGER"] },
  { name: "Payments Ledger", href: "/dashboard/payments", icon: CreditCard, roles: ["OWNER", "MANAGER"] },
  { name: "Payment Methods", href: "/dashboard/payment-methods", icon: Wallet, roles: ["OWNER", "MANAGER"] },
  { name: "Expenses Ledger", href: "/dashboard/expenses", icon: Receipt, roles: ["OWNER", "MANAGER"] },
  { name: "Employees", href: "/dashboard/employees", icon: UserSquare2, roles: ["OWNER", "MANAGER"] },
  { name: "Analytics & Reports", href: "/dashboard/reports", icon: BarChart3, roles: ["OWNER", "MANAGER"] },
  { name: "System Settings", href: "/dashboard/settings", icon: Settings, roles: ["OWNER"] },
];

export default function Sidebar({ role }: Readonly<{ role: Role }>) {
  const pathname = usePathname();
  const allowedItems = navItems.filter((item) => item.roles.includes(role));

  if (allowedItems.length === 0) return null;

  return (
    <aside className="w-64 bg-card border-r flex-shrink-0 hidden md:flex flex-col">
      <div className="h-16 flex items-center px-6 border-b gap-3">
        <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-black text-base shadow-sm">
          🥛
        </div>
        <div>
          <h1 className="text-lg font-black text-primary tracking-tight leading-none">Yadotena</h1>
          <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">Milk & Foods</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto py-3">
        <nav className="space-y-1 px-3">
          {allowedItems.map((item) => {
            const isActive = 
              item.href === "/dashboard" 
                ? pathname === "/dashboard" 
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center px-3 py-2 rounded-xl text-xs font-bold transition-all",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon
                  className={cn(
                    "mr-2.5 h-4 w-4 flex-shrink-0 transition-colors",
                    isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
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
