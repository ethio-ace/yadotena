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
  Receipt, 
  UserSquare2, 
  BarChart3, 
  Settings,
  ShieldCheck,
  Briefcase,
  Wallet,
  Utensils,
  CreditCard,
  Activity,
  Sparkles
} from "lucide-react";

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  roles: Role[];
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export const navSections: NavSection[] = [
  {
    title: "OPERATIONS & TERMINALS",
    items: [
      { name: "Shift Operations", href: "/dashboard/manager", icon: Briefcase, roles: ["OWNER", "MANAGER"] },
      { name: "Waiter Floor POS", href: "/dashboard/waiter", icon: Utensils, roles: ["OWNER", "MANAGER", "WAITER"] },
      { name: "Kitchen Display (KDS)", href: "/dashboard/kitchen", icon: ChefHat, roles: ["OWNER", "MANAGER", "KITCHEN"] },
    ]
  },
  {
    title: "RESTAURANT MANAGEMENT",
    items: [
      { name: "Overview Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["OWNER", "MANAGER"] },
      { name: "Live Orders & Tickets", href: "/dashboard/orders", icon: ShoppingCart, roles: ["OWNER", "MANAGER", "WAITER", "KITCHEN"] },
      { name: "Floor Tables", href: "/dashboard/tables", icon: Grid, roles: ["OWNER", "MANAGER", "WAITER"] },
      { name: "Menu & Catalog", href: "/dashboard/menu", icon: MenuSquare, roles: ["OWNER", "MANAGER", "KITCHEN"] },
      { name: "Add-ons & Modifiers", href: "/dashboard/addons", icon: Sparkles, roles: ["OWNER", "MANAGER", "KITCHEN"] },
      { name: "Activity Logs", href: "/dashboard/logs", icon: Activity, roles: ["OWNER", "MANAGER"] },
    ]
  },
  {
    title: "FINANCE & STAFF",
    items: [
      { name: "Payments & Gateways", href: "/dashboard/payments", icon: CreditCard, roles: ["OWNER", "MANAGER"] },
      { name: "Expenses Ledger", href: "/dashboard/expenses", icon: Receipt, roles: ["OWNER", "MANAGER"] },
      { name: "Staff & Roster", href: "/dashboard/employees", icon: UserSquare2, roles: ["OWNER", "MANAGER"] },
      { name: "Analytics & Reports", href: "/dashboard/reports", icon: BarChart3, roles: ["OWNER", "MANAGER"] },
    ]
  },
  {
    title: "ADMINISTRATION",
    items: [
      { name: "Owner Console", href: "/dashboard/owner", icon: ShieldCheck, roles: ["OWNER"] },
      { name: "System Settings", href: "/dashboard/settings", icon: Settings, roles: ["OWNER"] },
    ]
  }
];

// Flat export of all nav items for role checking in Header or Layout
export const navItems = navSections.flatMap(s => s.items);

export default function Sidebar({ role }: Readonly<{ role: Role }>) {
  const pathname = usePathname();

  // Filter sections and items based on role
  const filteredSections = navSections
    .map(section => ({
      ...section,
      items: section.items.filter(item => item.roles.includes(role))
    }))
    .filter(section => section.items.length > 0);

  if (filteredSections.length === 0) return null;

  return (
    <aside className="w-64 bg-card border-r flex-shrink-0 hidden md:flex flex-col">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b gap-3">
        <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-black text-lg tracking-tighter shadow-sm">
          Y
        </div>
        <div>
          <h1 className="text-lg font-black text-primary tracking-tight leading-none">Yadotena</h1>
          <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">Milk & Foods</span>
        </div>
      </div>

      {/* Nav Sections Feed */}
      <div className="flex-1 overflow-y-auto py-3 space-y-4">
        {filteredSections.map((section) => (
          <div key={section.title} className="px-3 space-y-1">
            <span className="px-3 text-[10px] font-black text-muted-foreground/70 uppercase tracking-widest block">
              {section.title}
            </span>
            <nav className="space-y-0.5">
              {section.items.map((item) => {
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
        ))}
      </div>
    </aside>
  );
}
