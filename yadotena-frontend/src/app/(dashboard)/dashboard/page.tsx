"use client";

import { useMemo } from "react";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight, ShoppingBag, Users, Utensils } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatETB } from "@/lib/currency";
import WaiterDashboard from "@/components/dashboard/WaiterDashboard";
import { api } from "@/services/api";

export default function DashboardPage() {
  const { data: session } = useSession();

  const { data: analytics } = useQuery({
    queryKey: ["analytics"],
    queryFn: () => api.analytics.getSummary(),
    enabled: session?.user?.role !== "WAITER" && session?.user?.role !== "KITCHEN",
  });

  const { data: tables = [] } = useQuery({
    queryKey: ["tables"],
    queryFn: api.tables.getAll,
    enabled: session?.user?.role !== "WAITER",
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: api.customers.getAll,
    enabled: session?.user?.role !== "WAITER" && session?.user?.role !== "KITCHEN",
  });

  const revenueData = useMemo(
    () =>
      (analytics?.daily || []).map((d) => ({
        name: d.date.slice(5),
        total: d.revenue,
      })),
    [analytics?.daily],
  );

  const activeTables = tables.filter((t) => t.status !== "AVAILABLE").length;
  const topItems = analytics?.top_items || [];

  if (session?.user?.role === "WAITER") {
    return <WaiterDashboard />;
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">
          Good day, {session?.user?.name?.split(" ")[0] || "Manager"}
        </h2>
        <p className="text-muted-foreground mt-1">
          Live metrics from the Yadotena API.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Period Revenue"
          value={formatETB(analytics?.revenue_etb || 0)}
          trend={analytics?.from && analytics?.to ? `${analytics.from} → ${analytics.to}` : "—"}
          trendLabel="selected period"
          icon={<div className="font-bold text-xs text-muted-foreground">ETB</div>}
        />
        <KpiCard
          title="Paid Orders"
          value={String(analytics?.paid_order_count ?? 0)}
          trend="live"
          trendLabel="from analytics"
          icon={<ShoppingBag className="h-4 w-4 text-muted-foreground" />}
        />
        <KpiCard
          title="Active Tables"
          value={`${activeTables} / ${tables.length || 0}`}
          trend={tables.length ? `${Math.round((activeTables / tables.length) * 100)}%` : "0%"}
          trendLabel="occupancy"
          icon={<Utensils className="h-4 w-4 text-muted-foreground" />}
        />
        <KpiCard
          title="Customers"
          value={String(customers.length)}
          trend="from orders"
          trendLabel="unique phones"
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 rounded-3xl shadow-sm">
          <CardHeader>
            <CardTitle>Revenue Overview (ETB)</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[350px] w-full">
              {revenueData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  No revenue data for this period yet.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis
                      stroke="#888888"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `${value / 1000}k`}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "12px",
                        border: "1px solid hsl(var(--border))",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      }}
                      formatter={(value) => [`${formatETB(Number(value ?? 0))}`, "Revenue"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="total"
                      stroke="var(--primary)"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorTotal)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3 rounded-3xl shadow-sm">
          <CardHeader>
            <CardTitle>Top Selling Dishes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {topItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">No paid item sales in this period.</p>
              ) : (
                topItems.map((product, i) => (
                  <div key={product.name} className="flex items-center">
                    <div className="h-9 w-9 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-xs mr-4">
                      {i + 1}
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-bold leading-none">{product.name}</p>
                      <p className="text-xs text-muted-foreground">{product.qty} sold</p>
                    </div>
                    <div className="font-extrabold text-sm text-primary">
                      {formatETB(product.revenue_etb)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({
  title,
  value,
  trend,
  trendLabel,
  icon,
}: {
  title: string;
  value: string;
  trend: string;
  trendLabel: string;
  icon: React.ReactNode;
}) {
  return (
    <Card className="rounded-3xl shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          {title}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-black">{value}</div>
        <p className="text-xs text-muted-foreground mt-1 flex items-center">
          <span className="text-emerald-500 font-bold flex items-center mr-1">
            <ArrowUpRight className="h-3.5 w-3.5 mr-0.5" />
            {trend}
          </span>
          {trendLabel}
        </p>
      </CardContent>
    </Card>
  );
}
