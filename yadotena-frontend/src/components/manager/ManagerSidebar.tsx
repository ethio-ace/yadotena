"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { managerNavGroups as navGroups } from "@/lib/nav";

interface ManagerSidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  /** Live floor state shown in the footer so the manager never loses the pulse. */
  floor?: {
    activeTables: number;
    totalTables: number;
    attentionCount: number;
  };
}

export function ManagerSidebar({
  isCollapsed = false,
  onToggleCollapse,
  isOpenMobile = false,
  onCloseMobile,
  floor,
}: ManagerSidebarProps) {
  const pathname = usePathname();
  const expanded = !isCollapsed || isOpenMobile;
  const activeTables = floor?.activeTables ?? 0;
  const totalTables = floor?.totalTables ?? 0;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Drawer */}
      <aside
        className={cn(
          "bg-card border-r flex flex-col transition-[width,transform] duration-300 z-40",
          "fixed md:static inset-y-0 left-0 h-full overscroll-contain",
          isOpenMobile ? "translate-x-0 w-64 shadow-2xl" : "-translate-x-full md:translate-x-0",
          isCollapsed ? "md:w-20" : "md:w-64"
        )}
      >
        {/* Header Branding */}
        <div className="h-16 border-b px-4 flex items-center justify-between shrink-0">
          <Link
            href="/dashboard/manager"
            className={cn("flex items-center gap-3 transition-opacity", expanded && "flex-1")}
          >
            <img
              src="/icon.svg"
              alt="Yadotena logo"
              width="64"
              height="64"
              className="h-9 w-9 rounded-xl shrink-0 shadow-md"
            />
            {expanded && (
              <span className="flex flex-col leading-none">
                <span className="font-black text-base tracking-tight text-foreground">
                  YADOTENA
                </span>
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground mt-1">
                  Operations
                </span>
              </span>
            )}
          </Link>

          {/* Desktop Collapse Toggle */}
          <button
            onClick={onToggleCollapse}
            className="hidden md:flex p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            aria-label={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-3 space-y-5 overflow-y-auto scrollbar-none">
          {navGroups.map((group) => (
            <div key={group.group} className="space-y-1">
              {expanded && (
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
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition group relative",
                      isActive
                        ? "bg-primary/10 text-primary font-black"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      isCollapsed && !isOpenMobile && "justify-center px-0"
                    )}
                    title={isCollapsed ? item.name : undefined}
                  >
                    {/* Active indicator bar */}
                    {isActive && (
                      <span
                        className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-full bg-primary"
                        aria-hidden="true"
                      />
                    )}

                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0 transition",
                        isActive
                          ? "text-primary"
                          : "text-muted-foreground group-hover:text-foreground"
                      )}
                    />

                    {expanded && <span>{item.name}</span>}

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

        {/* Footer — live floor pulse */}
        <div className="p-3 border-t bg-muted/20 shrink-0">
          {expanded ? (
            <div className="p-3 rounded-xl border bg-card shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                  Floor status
                </span>
                <span className="flex items-center gap-1.5 text-[10px] font-black text-emerald-600 dark:text-emerald-400">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                  </span>
                  LIVE
                </span>
              </div>
              <p className="text-sm font-black text-foreground mt-1.5">
                {activeTables}
                <span className="text-muted-foreground font-bold"> / {totalTables} tables in use</span>
              </p>
              <p
                className={cn(
                  "text-[10px] font-bold mt-0.5",
                  (floor?.attentionCount ?? 0) > 0
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-muted-foreground"
                )}
              >
                {floor && floor.attentionCount > 0
                  ? `${floor.attentionCount} item${floor.attentionCount === 1 ? "" : "s"} need attention`
                  : "All clear — no action needed"}
              </p>
            </div>
          ) : (
            <div className="flex justify-center py-1">
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  (floor?.attentionCount ?? 0) > 0
                    ? "bg-amber-500"
                    : "bg-emerald-500"
                )}
                title={
                  floor && floor.attentionCount > 0
                    ? `${floor.attentionCount} items need attention`
                    : "All clear — nothing needs attention"
                }
                aria-label={
                  floor && floor.attentionCount > 0
                    ? `${floor.attentionCount} items need attention`
                    : "All clear — nothing needs attention"
                }
              />
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
