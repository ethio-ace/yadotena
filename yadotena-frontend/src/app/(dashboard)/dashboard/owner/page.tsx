"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { OwnerSidebar } from "@/components/owner/OwnerSidebar";
import { OwnerHeader } from "@/components/owner/OwnerHeader";
import { DateRangeSelector } from "@/components/owner/DateRangeSelector";
import { BusinessSnapshot } from "@/components/owner/BusinessSnapshot";
import { AttentionCenter } from "@/components/owner/AttentionCenter";
import { RevenueTrend } from "@/components/owner/RevenueTrend";
import { TopProducts } from "@/components/owner/TopProducts";
import { PaymentMix } from "@/components/owner/PaymentMix";
import { TodayActivity } from "@/components/owner/TodayActivity";
import { useOwnerOps } from "@/hooks/useOwnerOps";
import { greetingForHour } from "@/lib/manager";

export default function OwnerDashboardPage() {
  const { data: session } = useSession();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const {
    rangeKey,
    setRangeKey,
    metrics,
    recentActivity,
    isLoading,
  } = useOwnerOps();

  const userObj = session?.user
    ? {
        name: session.user.name || "Business Owner",
        role: session.user.role || "OWNER",
        email: session.user.email || undefined,
      }
    : { name: "Business Owner", role: "OWNER" };

  // The header bell jumps to the attention section on the overview.
  const handleOpenAttention = () => {
    document
      .getElementById("attention-center")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden -m-3 sm:-m-4 md:-m-6">
      {/* OWNER SIDEBAR */}
      <OwnerSidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* MAIN CONTENT WORKSPACE AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <OwnerHeader
          user={userObj}
          attentionCount={metrics.attentionCount}
          rangeDisplay={metrics.range.display}
          onOpenAttention={handleOpenAttention}
          onToggleSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-6xl mx-auto space-y-5">
            {/* Page heading: greeting, period, range switch */}
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black tracking-tight text-foreground">
                  {greetingForHour(new Date().getHours())}
                </h1>
                <p className="text-xs text-muted-foreground font-medium mt-1">
                  {metrics.range.label} · {metrics.range.display}
                </p>
              </div>
              <DateRangeSelector value={rangeKey} onChange={setRangeKey} />
            </div>

            {isLoading && metrics.paidOrders === 0 && metrics.revenue === 0 ? (
              <div className="space-y-4">
                <div className="h-24 bg-muted/40 border rounded-2xl animate-pulse" />
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                  <div className="h-32 bg-muted/40 border rounded-2xl animate-pulse" />
                  <div className="h-32 bg-muted/40 border rounded-2xl animate-pulse" />
                  <div className="h-32 bg-muted/40 border rounded-2xl animate-pulse" />
                  <div className="h-32 bg-muted/40 border rounded-2xl animate-pulse" />
                </div>
              </div>
            ) : (
              <>
                <AttentionCenter metrics={metrics} />
                <BusinessSnapshot metrics={metrics} />

                <div className="grid gap-4 lg:grid-cols-3">
                  <div className="lg:col-span-2">
                    <RevenueTrend metrics={metrics} />
                  </div>
                  <PaymentMix metrics={metrics} />
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <TopProducts metrics={metrics} />
                  <TodayActivity logs={recentActivity} />
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
