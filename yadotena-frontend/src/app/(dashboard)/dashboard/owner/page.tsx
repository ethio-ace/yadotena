"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatETB } from "@/lib/currency";
import { 
  TrendingUp, 
  DollarSign, 
  Receipt, 
  Users, 
  PieChart, 
  BarChart3, 
  ArrowUpRight, 
  ShieldCheck, 
  Download, 
  Building2,
  Calendar,
  Sparkles,
  FileSpreadsheet
} from "lucide-react";
import { useState } from "react";
import { ActivityLogsViewer } from "@/components/dashboard/ActivityLogsViewer";

export default function OwnerDashboardPage() {
  const [timeRange, setTimeRange] = useState<"today" | "week" | "month">("month");

  const { data: reports } = useQuery({
    queryKey: ["reportsSummary"],
    queryFn: api.reports.getSummary,
  });

  const { data: orders = [] } = useQuery({
    queryKey: ["orders"],
    queryFn: api.orders.getAll,
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses"],
    queryFn: api.expenses.getAll,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: api.employees.getAll,
  });

  // Calculate high-level executive numbers
  const totalGrossRevenue = orders.reduce((acc, o) => acc + (o.total || 0), 0);
  const totalExpenseSum = expenses.reduce((acc, e) => acc + (e.amount || 0), 0);
  const netProfit = totalGrossRevenue - totalExpenseSum;
  const netProfitMargin = totalGrossRevenue > 0 ? ((netProfit / totalGrossRevenue) * 100).toFixed(1) : "0.0";
  const activeStaffCount = employees.length;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-16">
      {/* Executive Header Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-slate-50 p-6 md:p-8 rounded-3xl border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 font-black text-[10px] uppercase tracking-wider px-3 py-1">
              Executive Owner Suite
            </Badge>
            <span className="text-xs text-slate-400 font-medium">Yadotena Enterprise</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight">
            Financial & Strategic Command
          </h1>
          <p className="text-sm text-slate-300 max-w-xl">
            Executive overview of revenue performance, net operating profit, margin efficiency, and multi-department expense controls.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700/60 flex items-center gap-1 text-xs">
            <button
              onClick={() => setTimeRange("today")}
              className={`px-3 py-1.5 rounded-xl font-extrabold transition-colors ${timeRange === "today" ? "bg-primary text-primary-foreground" : "text-slate-400 hover:text-white"}`}
            >
              Today
            </button>
            <button
              onClick={() => setTimeRange("week")}
              className={`px-3 py-1.5 rounded-xl font-extrabold transition-colors ${timeRange === "week" ? "bg-primary text-primary-foreground" : "text-slate-400 hover:text-white"}`}
            >
              This Week
            </button>
            <button
              onClick={() => setTimeRange("month")}
              className={`px-3 py-1.5 rounded-xl font-extrabold transition-colors ${timeRange === "month" ? "bg-primary text-primary-foreground" : "text-slate-400 hover:text-white"}`}
            >
              This Month
            </button>
          </div>

          <Button 
            onClick={() => alert("Downloading official financial P&L report (PDF/CSV)...")} 
            className="rounded-2xl font-black text-xs h-11 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 gap-2 shadow-lg shadow-amber-500/20"
          >
            <Download className="h-4 w-4" /> Export Financial Report
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-3xl border shadow-sm p-6 bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Gross Sales Revenue</span>
            <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <h2 className="text-3xl font-black text-foreground">{formatETB(totalGrossRevenue)}</h2>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 mt-1">
              <TrendingUp className="h-3.5 w-3.5" /> +18.4% vs last period
            </p>
          </div>
        </Card>

        <Card className="rounded-3xl border shadow-sm p-6 bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Net Operating Profit</span>
            <div className="h-10 w-10 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <PieChart className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <h2 className="text-3xl font-black text-foreground">{formatETB(netProfit)}</h2>
            <p className="text-xs text-blue-600 dark:text-blue-400 font-bold mt-1">
              {netProfitMargin}% Profit Margin Ratio
            </p>
          </div>
        </Card>

        <Card className="rounded-3xl border shadow-sm p-6 bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Expenses & Payroll</span>
            <div className="h-10 w-10 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
              <Receipt className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <h2 className="text-3xl font-black text-foreground">{formatETB(totalExpenseSum)}</h2>
            <p className="text-xs text-muted-foreground font-bold mt-1">
              {expenses.length} logged expense entries
            </p>
          </div>
        </Card>

        <Card className="rounded-3xl border shadow-sm p-6 bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Active Labor Force</span>
            <div className="h-10 w-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <h2 className="text-3xl font-black text-foreground">{activeStaffCount} Employees</h2>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold mt-1">
              100% Shift Coverage
            </p>
          </div>
        </Card>
      </div>

      {/* Strategic Insights & Expense Control Section */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="rounded-3xl border shadow-sm p-6 bg-card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-black text-lg">Top Revenue Generating Categories</h3>
              <p className="text-xs text-muted-foreground">Product line performance & profitability</p>
            </div>
            <Badge variant="outline" className="font-bold text-xs">High Margin</Badge>
          </div>

          <div className="space-y-3">
            {[
              { category: "Artisanal Dairy & Ergo", sales: 48500, margin: "72%", share: "38%" },
              { category: "Ethiopian Traditional Meats & Tibs", sales: 42100, margin: "64%", share: "33%" },
              { category: "Farm Fresh Milk (1L Glass)", sales: 22400, margin: "58%", share: "18%" },
              { category: "Beverages & Roasted Coffee", sales: 14200, margin: "81%", share: "11%" },
            ].map((item, i) => (
              <div key={i} className="p-3.5 rounded-2xl bg-muted/40 border flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm">{item.category}</h4>
                  <span className="text-[11px] text-muted-foreground font-semibold">
                    Margin: <strong className="text-emerald-600">{item.margin}</strong> • Share: {item.share}
                  </span>
                </div>
                <span className="font-black text-sm text-primary">{formatETB(item.sales)}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="rounded-3xl border shadow-sm p-6 bg-card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-black text-lg">Executive Expense Audit</h3>
              <p className="text-xs text-muted-foreground">Latest major operational expenditures</p>
            </div>
            <Button variant="ghost" size="sm" className="text-xs font-bold text-primary">View All</Button>
          </div>

          <div className="space-y-3">
            {expenses.slice(0, 4).map((exp: any) => (
              <div key={exp.id} className="p-3.5 rounded-2xl bg-muted/40 border flex items-center justify-between">
                <div className="space-y-0.5">
                  <h4 className="font-bold text-sm">{exp.description || exp.category}</h4>
                  <span className="text-[11px] text-muted-foreground font-medium">
                    Category: {exp.category} • Logged by Admin
                  </span>
                </div>
                <span className="font-black text-sm text-rose-500">-{formatETB(exp.amount)}</span>
              </div>
            ))}
            {expenses.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-6">No expense records logged yet.</p>
            )}
          </div>
        </Card>
      </div>

      {/* Enterprise System & Staff Audit Trail */}
      <ActivityLogsViewer
        title="Enterprise System & Staff Audit Trail"
        description="Full-spectrum audit log across all staff members, chefs, cashiers, managers, and owner settings with previous vs. current data diff inspection."
        isOwnerView={true}
      />
    </div>
  );
}
