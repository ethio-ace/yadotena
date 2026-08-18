"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { ManagerHeader } from "@/components/manager/ManagerHeader";
import { ManagerSidebar } from "@/components/manager/ManagerSidebar";
import { ManagerOverview } from "@/components/manager/ManagerOverview";
import { useManagerOps } from "@/hooks/useManagerOps";
import { useSidebarCollapse } from "@/hooks/useSidebarCollapse";

export default function ManagerDashboardPage() {
  const { data: session } = useSession();
  const { isCollapsed: isSidebarCollapsed, toggle: toggleSidebarCollapse } = useSidebarCollapse();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const { metrics } = useManagerOps();

  const userObj = session?.user
    ? {
        name: session.user.name || "Store Manager",
        role: session.user.role || "MANAGER",
        email: session.user.email || undefined,
      }
    : { name: "Store Manager", role: "MANAGER" };

  // The header bell jumps to the attention section on the overview.
  const handleOpenAttention = () => {
    document
      .getElementById("attention-center")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* SKIP LINK — keyboard users bypass the chrome straight to content */}
      <a
        href="#manager-main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[70] focus:px-4 focus:py-2 focus:rounded-xl focus:bg-primary focus:text-primary-foreground focus:text-xs focus:font-black focus:shadow-xl"
      >
        Skip to main content
      </a>

      {/* MANAGER SIDEBAR */}
      <ManagerSidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapse}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        floor={{
          activeTables: metrics.activeTables,
          totalTables: metrics.totalTables,
          attentionCount: metrics.attentionCount,
        }}
      />

      {/* MAIN CONTENT WORKSPACE AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <ManagerHeader
          user={userObj}
          attentionCount={metrics.attentionCount}
          onOpenAttention={handleOpenAttention}
          onToggleSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        />

        <main id="manager-main" className="flex-1 overflow-y-auto bg-muted/30 p-4 sm:p-6 lg:p-8">
          <ManagerOverview />
        </main>
      </div>
    </div>
  );
}
