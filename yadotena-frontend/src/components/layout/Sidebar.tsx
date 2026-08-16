"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Role } from "@/types";
import { navGroupsForRole } from "@/lib/nav";
import { useSidebarCollapse } from "@/hooks/useSidebarCollapse";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Shared sidebar for pages rendered in the common chrome. It renders the same
 * role-based navigation (lib/nav) and the same visual language as the role
 * shells, so a manager or owner sees one consistent sidebar everywhere.
 */
export default function Sidebar({ role }: Readonly<{ role: Role }>) {
  const pathname = usePathname();
  const { isCollapsed, toggle } = useSidebarCollapse();

  const navGroups = navGroupsForRole(role);

  if (navGroups.length === 0) return null;

  return (
    <aside
      className={cn(
        "bg-card border-r flex-col justify-between transition-all duration-300",
        "hidden md:flex h-full shrink-0",
        isCollapsed ? "w-20" : "w-64"
      )}
    >
      <div>
        {/* Brand Header */}
        <div className="h-16 border-b px-4 flex items-center justify-between">
          <Link
            href={role === "OWNER" ? "/dashboard/owner" : "/dashboard/manager"}
            className={cn("flex items-center gap-3", isCollapsed && "md:justify-center w-full")}
          >
            <img
              src="/icon.svg"
              alt="Yadotena logo"
              className="h-9 w-9 rounded-xl shrink-0 shadow-md"
            />
            {!isCollapsed && (
              <span className="font-black text-lg tracking-tight text-foreground">YADOTENA</span>
            )}
          </Link>

          {/* Collapse Toggle */}
          <button
            onClick={toggle}
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-4 overflow-y-auto max-h-[calc(100vh-8rem)] scrollbar-none">
          {navGroups.map((group) => (
            <div key={group.group} className="space-y-1">
              {!isCollapsed && (
                <p className="px-3 text-[10px] font-black uppercase tracking-wider text-muted-foreground/70 mb-1">
                  {group.group}
                </p>
              )}

              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

                return (
                  <Link
                    key={item.name}
                    href={item.href}
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
                        isActive
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-muted-foreground group-hover:text-foreground"
                      )}
                    />

                    {!isCollapsed && <span>{item.name}</span>}

                    {isCollapsed && (
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
      </div>
    </aside>
  );
}
