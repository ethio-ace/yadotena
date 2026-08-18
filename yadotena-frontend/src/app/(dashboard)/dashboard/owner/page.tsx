"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { useSidebarCollapse } from "@/hooks/useSidebarCollapse";
import { OwnerSidebar } from "@/components/owner/OwnerSidebar";
import { OwnerHeader } from "@/components/owner/OwnerHeader";
import { DateRangeSelector } from "@/components/owner/DateRangeSelector";
import { ComparisonBar } from "@/components/owner/PeriodCompare";
import { BusinessSnapshot } from "@/components/owner/BusinessSnapshot";
import { AttentionCenter } from "@/components/owner/AttentionCenter";
import { RevenueExpenseChart } from "@/components/owner/RevenueExpenseChart";
import { HourlyProfile } from "@/components/owner/HourlyProfile";
import { Scale, Clock } from "lucide-react";
import { TopProducts } from "@/components/owner/TopProducts";
import { PaymentMix } from "@/components/owner/PaymentMix";
import { ExpensesCard } from "@/components/owner/ExpensesCard";
import { TodayActivity } from "@/components/owner/TodayActivity";
import { useOwnerOps } from "@/hooks/useOwnerOps";
import { CustomRange } from "@/lib/owner";
import { formatETB } from "@/lib/currency";
import { greetingForHour } from "@/lib/manager";

const DrilldownTrend = dynamic(
  () => import("@/components/owner/DrilldownTrend").then((mod) => mod.DrilldownTrend),
  {
    loading: () => <div className="h-64 bg-muted/30 border rounded-2xl animate-pulse" />,
    ssr: false,
  }
);

export default function OwnerDashboardPage() {
  const { data: session } = useSession();
  const { isCollapsed: isSidebarCollapsed, toggle: toggleSidebarCollapse } = useSidebarCollapse();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [customRange, setCustomRange] = useState<CustomRange | undefined>();

  const {
    rangeKey,
    setRangeKey,
    metrics,
    comparison,
    orders,
    expenses,
    recentActivity,
    isLoading,
  } = useOwnerOps(undefined, customRange);

  const handleRangeChange = (r: Parameters<typeof setRangeKey>[0], custom?: CustomRange) => {
    setRangeKey(r);
    if (r === "custom" && custom) setCustomRange(custom);
  };

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
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* OWNER SIDEBAR */}
      <OwnerSidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapse}
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
              <DateRangeSelector value={rangeKey} onChange={handleRangeChange} custom={customRange} />
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
                <ComparisonBar comparison={comparison} />
                <BusinessSnapshot metrics={metrics} comparison={comparison} />

                <div className="grid gap-4 lg:grid-cols-3">
                  <div className="lg:col-span-2">
                    <DrilldownTrend
                      key={`${metrics.range.from}-${metrics.range.to}`}
                      orders={orders}
                      expenses={expenses}
                      range={metrics.range}
                    />
                  </div>
                  <PaymentMix metrics={metrics} />
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                  <div className="lg:col-span-2 bg-card border rounded-2xl p-5 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="font-black text-sm text-foreground flex items-center gap-1.5">
                          <Scale className="h-4 w-4 text-emerald-500" /> Revenue vs Recorded Expenses
                        </h3>
                        <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
                          Daily bars · net in green · long periods auto-bucket to weeks
                        </p>
                      </div>
                      <span className="text-[11px] font-black text-muted-foreground">
                        Net {formatETB(metrics.revenueMinusExpenses)}
                      </span>
                    </div>
                    <div className="mt-3">
                      <RevenueExpenseChart metrics={metrics} />
                    </div>
                  </div>

                  <div className="bg-card border rounded-2xl p-5 shadow-sm">
                    <h3 className="font-black text-sm text-foreground flex items-center gap-1.5">
                      <Clock className="h-4 w-4 text-amber-500" /> Hourly Sales Profile
                    </h3>
                    <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
                      Revenue by hour — spot rush windows
                    </p>
                    <div className="mt-3">
                      <HourlyProfile metrics={metrics} />
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                  <TopProducts metrics={metrics} />
                  <ExpensesCard range={metrics.range} expenses={expenses} />
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
