"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ErrorState } from "@/components/ui/empty-state";
import { formatETB } from "@/lib/currency";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { Download, Printer, Receipt, ShoppingBag, Utensils } from "lucide-react";

export default function ReportsPage() {
  const {
    data: analytics,
    isLoading,
    isError: analyticsError,
    refetch: refetchAnalytics,
  } = useQuery({
    queryKey: ["analytics"],
    queryFn: () => api.analytics.getSummary(),
  });

  const {
    data: expenses = [],
    isError: expensesError,
    refetch: refetchExpenses,
  } = useQuery({
    queryKey: ["expenses"],
    queryFn: api.expenses.getAll,
  });

  const chartData = useMemo(
    () =>
      (analytics?.daily || []).map((d) => ({
        name: d.date.slice(5),
        dineIn: d.dineIn || 0,
        takeaway: d.takeaway || 0,
        delivery: d.delivery || 0,
        shop: d.shop || 0,
        total: d.revenue,
      })),
    [analytics?.daily],
  );

  const gross = analytics?.revenue_etb || 0;
  const periodFrom = analytics?.from;
  const periodTo = analytics?.to;
  const expenseTotal = useMemo(() => {
    return expenses
      .filter((e) => {
        if (!periodFrom || !periodTo) return false;
        return e.date >= periodFrom && e.date <= periodTo;
      })
      .reduce((sum, e) => sum + e.amount, 0);
  }, [expenses, periodFrom, periodTo]);
  const ordersCount = analytics?.paid_order_count || 0;
  const netProfit = gross - expenseTotal;
  const profitMargin = gross > 0 ? ((netProfit / gross) * 100).toFixed(1) : "0.0";
  const avgTicket = ordersCount > 0 ? gross / ordersCount : 0;
  const topItems = analytics?.top_items || [];
  const periodLabel =
    periodFrom && periodTo ? `${periodFrom} → ${periodTo}` : "Current period";

  const handleExportCSV = () => {
    const headers = "Date,DineIn_ETB,Takeaway_ETB,Delivery_ETB,Shop_ETB,Total_ETB\n";
    const rows = chartData
      .map((d) => `${d.name},${d.dineIn},${d.takeaway},${d.delivery},${d.shop},${d.total}`)
      .join("\n");
    const summary = `\n\nSummary (${periodLabel})\nGross Revenue,${gross}\nExpenses (same period),${expenseTotal}\nNet,${netProfit}\nPaid Orders,${ordersCount}`;
    const blob = new Blob([headers + rows + summary], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `Yadotena_Report_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return <div className="p-8 text-muted-foreground">Loading analytics…</div>;
  }

  if (analyticsError) {
    return (
      <div className="p-8 max-w-lg mx-auto">
        <ErrorState
          title="Could not load analytics"
          description="Check your connection and try again."
          onRetry={() => {
            refetchAnalytics();
            refetchExpenses();
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-16">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-3xl font-extrabold tracking-tight">Financial & Sales Analytics</h2>
            <Badge variant="outline" className="font-bold text-xs bg-primary/10 text-primary border-primary/20">
              Live API
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">{periodLabel}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button variant="outline" size="sm" className="rounded-xl font-bold text-xs gap-1.5 h-9" onClick={handleExportCSV}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button size="sm" className="rounded-xl font-bold text-xs gap-1.5 h-9" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            Print
          </Button>
        </div>
      </div>

      {expensesError ? (
        <ErrorState
          title="Could not load expenses for this period"
          description="Net profit is hidden until expenses load — revenue below is still accurate."
          onRetry={() => refetchExpenses()}
        />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Gross Revenue" value={formatETB(gross)} hint="Paid orders in period (Addis Ababa days)" />
        <MetricCard
          title="Operating Expenses"
          value={expensesError ? "—" : formatETB(expenseTotal)}
          hint={expensesError ? "Unavailable" : "Expenses dated in the same period"}
          icon={<Receipt className="h-4 w-4" />}
        />
        <MetricCard
          title="Net Operating Profit"
          value={expensesError ? "—" : formatETB(netProfit)}
          hint={
            expensesError
              ? "Waiting on expenses"
              : `${profitMargin}% margin (period revenue − period expenses)`
          }
          highlight
        />
        <MetricCard
          title="Orders & Avg Ticket"
          value={`${ordersCount} orders`}
          hint={`Avg ${formatETB(avgTicket)}`}
          icon={<ShoppingBag className="h-4 w-4" />}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="rounded-3xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-black">Revenue by Channel</CardTitle>
            <CardDescription className="text-xs">Dine-in · takeaway · delivery · shop</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full pt-4">
              {chartData.length === 0 ? (
                <EmptyChart />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                    <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `${val / 1000}k`} />
                    <Tooltip
                      formatter={(value, name) => [
                        formatETB(Number(value ?? 0)),
                        name === "dineIn"
                          ? "Dine-in"
                          : name === "takeaway"
                            ? "Takeaway"
                            : name === "delivery"
                              ? "Delivery"
                              : name === "shop"
                                ? "Shop"
                                : String(name),
                      ]}
                    />
                    <Bar dataKey="dineIn" stackId="a" fill="var(--primary)" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="takeaway" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="delivery" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="shop" stackId="a" fill="#6366f1" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-black">Gross Sales Trend</CardTitle>
            <CardDescription className="text-xs">Daily revenue</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full pt-4">
              {chartData.length === 0 ? (
                <EmptyChart />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorTotalETB" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                    <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `${val / 1000}k`} />
                    <Tooltip formatter={(value) => [formatETB(Number(value ?? 0)), "Gross Sales"]} />
                    <Area
                      type="monotone"
                      dataKey="total"
                      stroke="var(--primary)"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorTotalETB)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-3xl shadow-sm">
        <CardHeader className="border-b pb-4">
          <CardTitle className="text-lg font-black flex items-center gap-2">
            <Utensils className="h-4 w-4 text-primary" />
            Top-Selling Dishes
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {topItems.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">No top items yet.</div>
          ) : (
            <div className="divide-y">
              {topItems.map((dish, idx) => (
                <div key={dish.name} className="p-4 md:px-6 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <div className="h-8 w-8 rounded-xl bg-muted flex items-center justify-center font-black text-xs text-muted-foreground">
                      #{idx + 1}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm">{dish.name}</h4>
                      <p className="text-xs text-muted-foreground">{dish.qty} sold</p>
                    </div>
                  </div>
                  <span className="font-black text-sm text-primary">{formatETB(dish.revenue_etb)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({
  title,
  value,
  hint,
  icon,
  highlight,
}: {
  title: string;
  value: string;
  hint: string;
  icon?: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <Card
      className={`rounded-3xl shadow-sm ${
        highlight ? "border-primary/20 bg-gradient-to-br from-card to-primary/5" : ""
      }`}
    >
      <CardContent className="p-5 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{title}</span>
          {icon}
        </div>
        <h3 className={`text-2xl font-black ${highlight ? "text-primary" : ""}`}>{value}</h3>
        <p className="text-xs text-muted-foreground font-medium">{hint}</p>
      </CardContent>
    </Card>
  );
}

function EmptyChart() {
  return (
    <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
      No chart data for this period.
    </div>
  );
}
