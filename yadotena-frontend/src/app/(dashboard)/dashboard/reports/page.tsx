"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatETB } from "@/lib/currency";
import { 
  Area, AreaChart, Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell 
} from "recharts";
import { 
  Download, Printer, TrendingUp, DollarSign, Receipt, ShoppingBag, 
  ArrowUpRight, Sparkles, Calendar, Utensils, CheckCircle2, ChevronRight,
  Maximize2, X, Filter, Users, Clock, ShieldCheck, Flame, Layers, Eye, BarChart3
} from "lucide-react";

// Parameterized sales datasets
const rangeDatasets: Record<string, { label: string; gross: number; expenses: number; ordersCount: number; data: any[] }> = {
  today: {
    label: "Today (Sunday)",
    gross: 42800,
    expenses: 12400,
    ordersCount: 48,
    data: [
      { name: "08:00", dineIn: 3200, delivery: 800, cash: 2400, digital: 1600 },
      { name: "10:00", dineIn: 4800, delivery: 1200, cash: 3600, digital: 2400 },
      { name: "12:00", dineIn: 9800, delivery: 3400, cash: 7200, digital: 6000 },
      { name: "14:00", dineIn: 8400, delivery: 2600, cash: 6000, digital: 5000 },
      { name: "16:00", dineIn: 4100, delivery: 1500, cash: 3100, digital: 2500 },
      { name: "18:00", dineIn: 10500, delivery: 3800, cash: 8500, digital: 5800 },
      { name: "20:00", dineIn: 7200, delivery: 2200, cash: 5400, digital: 4000 },
    ],
  },
  week: {
    label: "Last 7 Days",
    gross: 298400,
    expenses: 84500,
    ordersCount: 342,
    data: [
      { name: "Mon", dineIn: 28000, delivery: 9500, cash: 22000, digital: 15500 },
      { name: "Tue", dineIn: 32000, delivery: 11000, cash: 25000, digital: 18000 },
      { name: "Wed", dineIn: 26500, delivery: 8200, cash: 20000, digital: 14700 },
      { name: "Thu", dineIn: 38000, delivery: 14000, cash: 30000, digital: 22000 },
      { name: "Fri", dineIn: 58000, delivery: 21000, cash: 45000, digital: 34000 },
      { name: "Sat", dineIn: 72000, delivery: 26000, cash: 56000, digital: 42000 },
      { name: "Sun", dineIn: 64000, delivery: 22000, cash: 50000, digital: 36000 },
    ],
  },
  month: {
    label: "This Month (30 Days)",
    gross: 1245000,
    expenses: 395000,
    ordersCount: 1480,
    data: [
      { name: "Week 1", dineIn: 220000, delivery: 75000, cash: 170000, digital: 125000 },
      { name: "Week 2", dineIn: 245000, delivery: 82000, cash: 190000, digital: 137000 },
      { name: "Week 3", dineIn: 280000, delivery: 94000, cash: 215000, digital: 159000 },
      { name: "Week 4", dineIn: 310000, delivery: 105000, cash: 240000, digital: 175000 },
    ],
  },
  ytd: {
    label: "Year to Date (2026)",
    gross: 9850000,
    expenses: 3150000,
    ordersCount: 11840,
    data: [
      { name: "Jan", dineIn: 880000, delivery: 290000, cash: 680000, digital: 490000 },
      { name: "Feb", dineIn: 920000, delivery: 310000, cash: 710000, digital: 520000 },
      { name: "Mar", dineIn: 1050000, delivery: 340000, cash: 800000, digital: 590000 },
      { name: "Apr", dineIn: 1120000, delivery: 360000, cash: 850000, digital: 630000 },
      { name: "May", dineIn: 1250000, delivery: 410000, cash: 960000, digital: 700000 },
      { name: "Jun", dineIn: 1380000, delivery: 440000, cash: 1050000, digital: 770000 },
      { name: "Jul", dineIn: 1420000, delivery: 460000, cash: 1080000, digital: 800000 },
      { name: "Aug", dineIn: 1510000, delivery: 490000, cash: 1150000, digital: 850000 },
    ],
  },
};

const topSellers = [
  { id: "d1", name: "Pasteurized Whole Milk (1L)", category: "Fresh Dairy", price: 120, cost: 70, unitsSold: 420, revenue: 50400, profitMargin: "41.6%", prepTime: "1 min" },
  { id: "d2", name: "Traditional Ergo Yogurt", category: "Fresh Dairy", price: 180, cost: 95, unitsSold: 310, revenue: 55800, profitMargin: "47.2%", prepTime: "2 mins" },
  { id: "d3", name: "Clarified Niter Kibbeh (1kg)", category: "Dairy Butter", price: 850, cost: 480, unitsSold: 142, revenue: 120700, profitMargin: "43.5%", prepTime: "3 mins" },
  { id: "d4", name: "Special Chechebsa with Honey", category: "Breakfast", price: 350, cost: 160, unitsSold: 210, revenue: 73500, profitMargin: "54.2%", prepTime: "8 mins" },
  { id: "d5", name: "Raw Highland Honey (1kg Jar)", category: "Artisanal", price: 650, cost: 380, unitsSold: 115, revenue: 74750, profitMargin: "41.5%", prepTime: "1 min" },
];

const staffLeaderboard = [
  { name: "Tigist Haile", role: "WAITER", tablesServed: 84, revenueGenerated: 68400, avgFulfillment: "11 mins", rating: "4.9 ★" },
  { name: "Dawit Worku", role: "WAITER", tablesServed: 76, revenueGenerated: 59200, avgFulfillment: "12 mins", rating: "4.8 ★" },
  { name: "Chef Solomon", role: "KITCHEN", ordersCooked: 194, avgPrepSpeed: "7.5 mins", errorRate: "0.2%", rating: "5.0 ★" },
  { name: "Helen Assefa", role: "CASHIER", settlements: 142, volumeSettled: 124500, cashReconciliation: "100% Match", rating: "5.0 ★" },
];

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState<"today" | "week" | "month" | "ytd">("week");
  const [activeTab, setActiveTab] = useState<"OVERVIEW" | "CHANNELS" | "DISHES" | "STAFF" | "EXPENSES">("OVERVIEW");
  const [activeDetailModal, setActiveDetailModal] = useState<string | null>(null);

  const currentSet = rangeDatasets[dateRange];

  const netProfit = currentSet.gross - currentSet.expenses;
  const profitMargin = ((netProfit / currentSet.gross) * 100).toFixed(1);
  const avgTicket = currentSet.gross / currentSet.ordersCount;

  const handleExportCSV = () => {
    const headers = "Period,DineIn_Revenue_ETB,Takeaway_Delivery_Revenue_ETB,Total_Revenue_ETB\n";
    const rows = currentSet.data
      .map(d => `${d.name},${d.dineIn},${d.delivery},${d.dineIn + d.delivery}`)
      .join("\n");
    const summary = `\n\nSummary for ${currentSet.label}\nGross Revenue,${currentSet.gross} ETB\nOperating Expenses,${currentSet.expenses} ETB\nNet Operating Profit,${netProfit} ETB\nTotal Orders,${currentSet.ordersCount}\nAverage Ticket,${avgTicket.toFixed(2)} ETB`;
    
    const blob = new Blob([headers + rows + summary], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Yadotena_Financial_Report_${dateRange}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-20">
      
      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-card p-5 rounded-2xl border shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              <span>Financial & Operational Analytics</span>
            </h2>
            <Badge className="bg-primary text-primary-foreground font-black text-xs px-2.5 py-0.5">
              ETB Currency
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Click any metric card to expand in-depth audit breakdowns, item margins, and shift performance.
          </p>
        </div>

        {/* Date Filter & Export Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-muted/50 p-1 rounded-xl flex items-center gap-1 border text-xs">
            {(["today", "week", "month", "ytd"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setDateRange(r)}
                className={`px-3 py-1.5 rounded-lg font-black transition-all ${
                  dateRange === r
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {r === "today" ? "Today" : r === "week" ? "Last 7D" : r === "month" ? "30 Days" : "YTD 2026"}
              </button>
            ))}
          </div>

          <Button 
            variant="outline" 
            size="sm" 
            className="rounded-xl font-bold text-xs gap-1.5 h-9"
            onClick={handleExportCSV}
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </Button>

          <Button 
            size="sm" 
            className="rounded-xl font-black text-xs gap-1.5 h-9 bg-primary text-primary-foreground shadow-sm"
            onClick={() => window.print()}
          >
            <Printer className="h-4 w-4" />
            <span>Print Report</span>
          </Button>
        </div>
      </div>

      {/* Analytics Sub-Nav Tabs */}
      <div className="bg-card border p-3 rounded-2xl flex flex-wrap items-center justify-between gap-2 shadow-sm">
        <div className="flex items-center gap-2 overflow-x-auto text-xs pb-0.5 scrollbar-none">
          <button
            onClick={() => setActiveTab("OVERVIEW")}
            className={`px-3.5 py-2 rounded-xl font-black transition-all border ${
              activeTab === "OVERVIEW"
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-muted/40 border-transparent text-muted-foreground hover:bg-muted"
            }`}
          >
            📊 Executive Overview
          </button>

          <button
            onClick={() => setActiveTab("CHANNELS")}
            className={`px-3.5 py-2 rounded-xl font-black transition-all border ${
              activeTab === "CHANNELS"
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-muted/40 border-transparent text-muted-foreground hover:bg-muted"
            }`}
          >
            💳 Channels & Payments
          </button>

          <button
            onClick={() => setActiveTab("DISHES")}
            className={`px-3.5 py-2 rounded-xl font-black transition-all border ${
              activeTab === "DISHES"
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-muted/40 border-transparent text-muted-foreground hover:bg-muted"
            }`}
          >
            🍔 Dish & Menu Profitability
          </button>

          <button
            onClick={() => setActiveTab("STAFF")}
            className={`px-3.5 py-2 rounded-xl font-black transition-all border ${
              activeTab === "STAFF"
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-muted/40 border-transparent text-muted-foreground hover:bg-muted"
            }`}
          >
            👥 Staff Performance
          </button>

          <button
            onClick={() => setActiveTab("EXPENSES")}
            className={`px-3.5 py-2 rounded-xl font-black transition-all border ${
              activeTab === "EXPENSES"
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-muted/40 border-transparent text-muted-foreground hover:bg-muted"
            }`}
          >
            💸 Expenses & Ledger Audit
          </button>
        </div>
      </div>

      {/* CLICKABLE INTERACTIVE METRICS ROW */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        
        {/* Gross Revenue (Clickable) */}
        <Card 
          onClick={() => setActiveDetailModal("GROSS_REVENUE")}
          className="rounded-2xl shadow-sm border bg-card hover:border-primary/50 transition-all cursor-pointer group"
        >
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Gross Revenue</span>
              <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-xs group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <Maximize2 className="h-4 w-4" />
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl font-black text-foreground">{formatETB(currentSet.gross)}</h3>
              <p className="text-[11px] text-primary font-bold flex items-center justify-between">
                <span>+14.8% vs last period</span>
                <span className="text-muted-foreground group-hover:text-primary underline">Tap to Expand ➔</span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Operating Expenses (Clickable) */}
        <Card 
          onClick={() => setActiveDetailModal("EXPENSES")}
          className="rounded-2xl shadow-sm border bg-card hover:border-primary/50 transition-all cursor-pointer group"
        >
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Operating Expenses</span>
              <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-xs group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <Receipt className="h-4 w-4" />
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl font-black text-foreground">{formatETB(currentSet.expenses)}</h3>
              <p className="text-[11px] text-muted-foreground font-bold flex items-center justify-between">
                <span>Ingredients & Overhead</span>
                <span className="text-muted-foreground group-hover:text-primary underline">Breakdown ➔</span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Net Profit (Clickable) */}
        <Card 
          onClick={() => setActiveDetailModal("NET_PROFIT")}
          className="rounded-2xl shadow-sm border bg-card hover:border-primary/50 transition-all cursor-pointer group"
        >
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-primary uppercase tracking-wider">Net Operating Profit</span>
              <Badge className="bg-primary text-primary-foreground font-black text-[10px] px-2 py-0.5">
                {profitMargin}% Margin
              </Badge>
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl font-black text-primary">{formatETB(netProfit)}</h3>
              <p className="text-[11px] text-muted-foreground font-bold flex items-center justify-between">
                <span>Net Earnings</span>
                <span className="text-muted-foreground group-hover:text-primary underline">Details ➔</span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Order Volume (Clickable) */}
        <Card 
          onClick={() => setActiveDetailModal("ORDER_VOLUME")}
          className="rounded-2xl shadow-sm border bg-card hover:border-primary/50 transition-all cursor-pointer group"
        >
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Order Volume & Check</span>
              <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-xs group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <ShoppingBag className="h-4 w-4" />
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl font-black text-foreground">{currentSet.ordersCount} Tickets</h3>
              <p className="text-[11px] text-muted-foreground font-bold flex items-center justify-between">
                <span>Avg Ticket: {formatETB(avgTicket)}</span>
                <span className="text-muted-foreground group-hover:text-primary underline">Expand ➔</span>
              </p>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* VISUAL CHARTS & TABBED ANALYTICS */}
      {(activeTab === "OVERVIEW" || activeTab === "CHANNELS") && (
        <div className="grid gap-5 md:grid-cols-2">
          
          {/* Revenue Channel Distribution */}
          <Card className="rounded-2xl shadow-sm border bg-card p-5 space-y-3">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-black text-base">Revenue by Order Channel</h3>
                <p className="text-xs text-muted-foreground">Dine-In Seated vs Takeaway & Express</p>
              </div>
              <Badge variant="outline" className="font-bold text-xs">
                {currentSet.label}
              </Badge>
            </div>

            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={currentSet.data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                  <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `${val / 1000}k`} />
                  <Tooltip 
                    contentStyle={{ borderRadius: "12px", border: "1px solid hsl(var(--border))" }}
                    formatter={(value: any, name: any) => [`${formatETB(Number(value))}`, name === "dineIn" ? "Dine-In" : "Takeaway/Express"]}
                  />
                  <Bar dataKey="dineIn" stackId="a" fill="var(--primary)" radius={[0, 0, 4, 4]} />
                  <Bar dataKey="delivery" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Continuous Sales Trajectory */}
          <Card className="rounded-2xl shadow-sm border bg-card p-5 space-y-3">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-black text-base">Continuous Revenue Trajectory</h3>
                <p className="text-xs text-muted-foreground">Gross sales curve across {currentSet.label}</p>
              </div>
              <Badge variant="outline" className="font-bold text-xs">
                Sales Velocity
              </Badge>
            </div>

            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={currentSet.data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTotalETB" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                  <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `${val / 1000}k`} />
                  <Tooltip 
                    contentStyle={{ borderRadius: "12px", border: "1px solid hsl(var(--border))" }}
                    formatter={(value: any) => [`${formatETB(Number(value))}`, "Gross Revenue"]}
                  />
                  <Area
                    type="monotone"
                    dataKey={(data) => data.dineIn + data.delivery}
                    stroke="var(--primary)"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorTotalETB)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

        </div>
      )}

      {/* DISH PROFITABILITY & MARGINS TAB */}
      {(activeTab === "OVERVIEW" || activeTab === "DISHES") && (
        <Card className="rounded-2xl border bg-card p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h3 className="font-black text-lg flex items-center gap-2">
                <Utensils className="h-5 w-5 text-primary" />
                <span>Dish Profitability & Sales Contribution</span>
              </h3>
              <p className="text-xs text-muted-foreground">Item unit margins, reorder velocity, and preparation speed</p>
            </div>
            <Badge className="bg-primary text-primary-foreground font-black text-xs">
              Menu Financials
            </Badge>
          </div>

          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-xs text-left">
              <thead className="text-[11px] font-black text-muted-foreground uppercase bg-muted/50 border-b">
                <tr>
                  <th className="px-4 py-3">Menu Item</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Price / Cost</th>
                  <th className="px-4 py-3">Units Sold</th>
                  <th className="px-4 py-3">Profit Margin</th>
                  <th className="px-4 py-3 text-right">Total Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {topSellers.map((dish) => (
                  <tr key={dish.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-black text-foreground">{dish.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{dish.category}</td>
                    <td className="px-4 py-3 font-bold">
                      {formatETB(dish.price)} <span className="text-muted-foreground text-[10px] font-normal">(Cost: {formatETB(dish.cost)})</span>
                    </td>
                    <td className="px-4 py-3 font-black">{dish.unitsSold} orders</td>
                    <td className="px-4 py-3">
                      <Badge className="bg-primary/10 text-primary font-black border border-primary/20 text-[10px]">
                        {dish.profitMargin}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-black text-primary text-sm">
                      {formatETB(dish.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* STAFF & SHIFT PERFORMANCE TAB */}
      {(activeTab === "OVERVIEW" || activeTab === "STAFF") && (
        <Card className="rounded-2xl border bg-card p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h3 className="font-black text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <span>Staff Shift Performance & Throughput</span>
              </h3>
              <p className="text-xs text-muted-foreground">Order volume and fulfillment speed per employee</p>
            </div>
            <Badge variant="outline" className="font-bold text-xs">Shift Roster</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {staffLeaderboard.map((staff, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-muted/20 border flex items-center justify-between text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-sm text-foreground">{staff.name}</span>
                    <Badge variant="outline" className="font-mono text-[9px] uppercase">{staff.role}</Badge>
                  </div>
                  <p className="text-muted-foreground font-medium">
                    {staff.tablesServed ? `${staff.tablesServed} Tables Served` : staff.ordersCooked ? `${staff.ordersCooked} Dishes Prepared` : `${staff.settlements} Cashier Settlements`}
                  </p>
                </div>

                <div className="text-right space-y-0.5">
                  <span className="font-black text-primary text-sm block">
                    {staff.revenueGenerated ? formatETB(staff.revenueGenerated) : staff.volumeSettled ? formatETB(staff.volumeSettled) : staff.avgPrepSpeed}
                  </span>
                  <span className="text-[10px] font-bold text-muted-foreground block">{staff.rating}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* EXPANDABLE IN-DEPTH DETAIL MODAL */}
      {activeDetailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-2xl bg-card border rounded-2xl shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h3 className="text-xl font-black text-foreground flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  <span>
                    {activeDetailModal === "GROSS_REVENUE" && "Gross Revenue Audit Breakdown"}
                    {activeDetailModal === "EXPENSES" && "Operating Expenses Audit Breakdown"}
                    {activeDetailModal === "NET_PROFIT" && "Net Operating Profitability Breakdown"}
                    {activeDetailModal === "ORDER_VOLUME" && "Order Volume & Ticket Audit"}
                  </span>
                </h3>
                <p className="text-xs text-muted-foreground">In-depth financial details for {currentSet.label}</p>
              </div>
              <button 
                onClick={() => setActiveDetailModal(null)}
                className="h-8 w-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Content depending on clicked metric */}
            {activeDetailModal === "GROSS_REVENUE" && (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3 p-4 bg-muted/30 rounded-xl border">
                  <div>
                    <span className="text-muted-foreground font-bold block">Total Gross Revenue:</span>
                    <span className="text-xl font-black text-primary">{formatETB(currentSet.gross)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground font-bold block">Total Tickets Settled:</span>
                    <span className="text-xl font-black text-foreground">{currentSet.ordersCount} Orders</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-black text-sm">Hourly / Daily Revenue Stream</h4>
                  <div className="space-y-1.5">
                    {currentSet.data.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2.5 bg-card border rounded-lg">
                        <span className="font-bold">{item.name}</span>
                        <div className="space-x-4">
                          <span className="text-muted-foreground">Dine-In: {formatETB(item.dineIn)}</span>
                          <span className="text-muted-foreground">Takeaway: {formatETB(item.delivery)}</span>
                          <span className="font-black text-primary">Total: {formatETB(item.dineIn + item.delivery)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeDetailModal === "EXPENSES" && (
              <div className="space-y-4 text-xs">
                <div className="p-4 bg-muted/30 rounded-xl border">
                  <span className="text-muted-foreground font-bold block">Total Operating Expenses:</span>
                  <span className="text-xl font-black text-foreground">{formatETB(currentSet.expenses)}</span>
                </div>

                <div className="space-y-2">
                  <h4 className="font-black text-sm">Expense Categories & Ingredient Costs</h4>
                  <div className="space-y-1.5">
                    {[
                      { cat: "Raw Whole Milk & Dairy Supplies", amount: Math.round(currentSet.expenses * 0.45) },
                      { cat: "Fresh Meat, Produce & Ingredients", amount: Math.round(currentSet.expenses * 0.30) },
                      { cat: "Utilities, Power & Water", amount: Math.round(currentSet.expenses * 0.15) },
                      { cat: "Kitchen Equipment & Maintenance", amount: Math.round(currentSet.expenses * 0.10) },
                    ].map((exp, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2.5 bg-card border rounded-lg">
                        <span className="font-bold">{exp.cat}</span>
                        <span className="font-black text-foreground">{formatETB(exp.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeDetailModal === "NET_PROFIT" && (
              <div className="space-y-4 text-xs">
                <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl space-y-1">
                  <span className="text-primary font-bold block">Net Profit:</span>
                  <span className="text-2xl font-black text-primary">{formatETB(netProfit)}</span>
                  <span className="text-muted-foreground block text-[11px]">Net Profit Margin: {profitMargin}%</span>
                </div>
              </div>
            )}

            {activeDetailModal === "ORDER_VOLUME" && (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3 p-4 bg-muted/30 rounded-xl border">
                  <div>
                    <span className="text-muted-foreground font-bold block">Total Orders:</span>
                    <span className="text-xl font-black text-foreground">{currentSet.ordersCount} Tickets</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground font-bold block">Average Ticket Size:</span>
                    <span className="text-xl font-black text-primary">{formatETB(avgTicket)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex justify-end pt-3 border-t">
              <Button 
                onClick={() => setActiveDetailModal(null)}
                className="rounded-xl font-black bg-primary text-primary-foreground text-xs"
              >
                Close Audit View
              </Button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
