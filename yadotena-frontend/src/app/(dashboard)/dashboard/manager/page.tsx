"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { ManagerHeader } from "@/components/manager/ManagerHeader";
import { ManagerSidebar } from "@/components/manager/ManagerSidebar";
import { ManagerOverview } from "@/components/manager/ManagerOverview";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";

export default function ManagerDashboardPage() {
  const { data: session } = useSession();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const { data: payments = [] } = useQuery({
    queryKey: ["payments"],
    queryFn: api.payments.getAll,
  });

  const { data: menuItems = [] } = useQuery({
    queryKey: ["menu"],
    queryFn: api.menu.getAll,
  });

  const { data: serviceRequests = [] } = useQuery({
    queryKey: ["serviceRequests"],
    queryFn: api.serviceRequests.getAll,
  });

  const pendingPayments = payments.filter((p: any) => p.status === "PENDING_VERIFICATION" || p.status === "PENDING");
  const outOfStockItems = menuItems.filter((i) => i.available === false || (i as any).isAvailable === false);
  const pendingServiceCalls = serviceRequests.filter((r) => r.status === "PENDING");

  const totalAttentionCount = pendingPayments.length + outOfStockItems.length + pendingServiceCalls.length;

  const userObj = session?.user
    ? {
        name: session.user.name || "Store Manager",
        role: (session.user as any).role || "MANAGER",
        email: session.user.email || undefined,
      }
    : { name: "Store Manager", role: "MANAGER" };

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden -m-3 sm:-m-4 md:-m-6">
      {/* MANAGER SIDEBAR */}
      <ManagerSidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* MAIN CONTENT WORKSPACE AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <ManagerHeader
          user={userObj}
          attentionCount={totalAttentionCount}
          onToggleSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <ManagerOverview />
        </main>
      </div>
    </div>
  );
}
