"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Coffee,
  Layers,
  Grid3X3,
  ClipboardList,
  CreditCard,
  Receipt,
  Settings,
  ChevronLeft,
  ChevronRight,
  UtensilsCrossed,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ManagerSidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export function ManagerSidebar({
  isCollapsed = false,
  onToggleCollapse,
  isOpenMobile = false,
  onCloseMobile,
}: ManagerSidebarProps) {
  const pathname = usePathname();

  // Every item points at a real surface — no duplicate destinations.
  // Retail goods and availability live inside the Café Menu page, so they are
  // not given separate (misleading) navigation entries.
  const navGroups = [
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

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Drawer */}
      <aside
        className={cn(
          "bg-card border-r flex flex-col transition-all duration-300 z-40",
          "fixed md:static inset-y-0 left-0 h-full",
          isOpenMobile ? "translate-x-0 w-64 shadow-2xl" : "-translate-x-full md:translate-x-0",
          isCollapsed ? "md:w-20" : "md:w-64"
        )}
      >
        {/* Header Branding */}
        <div className="h-16 border-b px-4 flex items-center justify-between shrink-0">
          <Link
            href="/dashboard/manager"
            className={cn("flex items-center gap-3 transition-opacity", isCollapsed && "md:justify-center w-full")}
          >
            <div className="h-9 w-9 rounded-xl bg-amber-500 text-zinc-950 flex items-center justify-center font-black shadow-md shrink-0">
              <UtensilsCrossed className="h-5 w-5" />
            </div>
            {(!isCollapsed || isOpenMobile) && (
              <span className="font-black text-lg tracking-tight text-foreground">
                YADOTENA
              </span>
            )}
          </Link>

          {/* Desktop Collapse Toggle */}
          <button
            onClick={onToggleCollapse}
            className="hidden md:flex p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-3 space-y-4 overflow-y-auto scrollbar-none">
          {navGroups.map((group) => (
            <div key={group.group} className="space-y-1">
              {(!isCollapsed || isOpenMobile) && (
                <p className="px-3 text-[10px] font-black uppercase tracking-wider text-muted-foreground/70 mb-1">
                  {group.group}
                </p>
              )}

              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.href === "/dashboard/manager"
                    ? pathname === "/dashboard/manager"
                    : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={onCloseMobile}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all group relative",
                      isActive
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 font-black border border-amber-500/20 shadow-sm"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                    title={isCollapsed ? item.name : undefined}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0 transition-colors",
                        isActive ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground group-hover:text-foreground"
                      )}
                    />

                    {(!isCollapsed || isOpenMobile) && (
                      <span>{item.name}</span>
                    )}

                    {isCollapsed && !isOpenMobile && (
                      <div className="absolute left-full ml-2 px-2.5 py-1 bg-zinc-900 text-white rounded-lg text-xs font-bold opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap shadow-xl z-50">
                        {item.name}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
