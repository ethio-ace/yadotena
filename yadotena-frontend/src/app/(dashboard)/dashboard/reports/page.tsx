"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatETB } from "@/lib/currency";
import { 
  Area, AreaChart, Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid 
} from "recharts";
import { 
  Download, Printer, TrendingUp, DollarSign, Receipt, ShoppingBag, 
  ArrowUpRight, Sparkles, Calendar, Utensils, PieChart, CheckCircle2 
} from "lucide-react";

// Sales datasets parameterized by time range
const rangeDatasets: Record<string, { label: string; data: any[]; gross: number; expenses: number; ordersCount: number }> = {
  today: {
    label: "Today (Sunday)",
    gross: 42800,
    expenses: 12400,
    ordersCount: 48,
    data: [
      { name: "08:00", dineIn: 3200, delivery: 800 },
      { name: "10:00", dineIn: 4800, delivery: 1200 },
      { name: "12:00", dineIn: 9800, delivery: 3400 },
      { name: "14:00", dineIn: 8400, delivery: 2600 },
      { name: "16:00", dineIn: 4100, delivery: 1500 },
      { name: "18:00", dineIn: 10500, delivery: 3800 },
      { name: "20:00", dineIn: 7200, delivery: 2200 },
    ],
  },
  week: {
    label: "Last 7 Days",
    gross: 298400,
    expenses: 84500,
    ordersCount: 342,
    data: [
      { name: "Mon", dineIn: 28000, delivery: 9500 },
      { name: "Tue", dineIn: 32000, delivery: 11000 },
      { name: "Wed", dineIn: 26500, delivery: 8200 },
      { name: "Thu", dineIn: 38000, delivery: 14000 },
      { name: "Fri", dineIn: 58000, delivery: 21000 },
      { name: "Sat", dineIn: 72000, delivery: 26000 },
      { name: "Sun", dineIn: 64000, delivery: 22000 },
    ],
  },
  month: {
    label: "This Month (30 Days)",
    gross: 1245000,
    expenses: 395000,
    ordersCount: 1480,
    data: [
      { name: "Week 1", dineIn: 220000, delivery: 75000 },
      { name: "Week 2", dineIn: 245000, delivery: 82000 },
      { name: "Week 3", dineIn: 280000, delivery: 94000 },
      { name: "Week 4", dineIn: 310000, delivery: 105000 },
    ],
  },
  ytd: {
    label: "Year to Date (2026)",
    gross: 9850000,
    expenses: 3150000,
    ordersCount: 11840,
    data: [
      { name: "Jan", dineIn: 880000, delivery: 290000 },
      { name: "Feb", dineIn: 920000, delivery: 310000 },
      { name: "Mar", dineIn: 1050000, delivery: 340000 },
      { name: "Apr", dineIn: 1120000, delivery: 360000 },
      { name: "May", dineIn: 1250000, delivery: 410000 },
      { name: "Jun", dineIn: 1380000, delivery: 440000 },
      { name: "Jul", dineIn: 1420000, delivery: 460000 },
      { name: "Aug", dineIn: 1510000, delivery: 490000 },
    ],
  },
};

const topSellers = [
  { name: "Prime Beef Ribeye Steak", category: "Main Course", price: 850, unitsSold: 142, revenue: 120700, share: "28.5%" },
  { name: "Artisanal Margherita Pizza", category: "Pizza", price: 550, unitsSold: 184, revenue: 101200, share: "24.0%" },
  { name: "Classic Chicken Burger", category: "Main Course", price: 380, unitsSold: 210, revenue: 79800, share: "18.9%" },
  { name: "Truffle Parmesan Fries", category: "Appetizers", price: 220, unitsSold: 265, revenue: 58300, share: "13.8%" },
  { name: "Signature Iced Caramel Latte", category: "Beverages", price: 160, unitsSold: 320, revenue: 51200, share: "12.1%" },
];

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState<"today" | "week" | "month" | "ytd">("week");
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
    link.setAttribute("download", `Yadotena_Milk_and_Foods_Financial_Report_${dateRange}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-16">
      
      {/* Page Header & Controls */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-3xl font-extrabold tracking-tight">Financial & Sales Analytics</h2>
            <Badge variant="outline" className="font-bold text-xs bg-primary/10 text-primary border-primary/20">
              ETB Currency
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Executive performance analytics, dish profitability, and audit-ready report exports.
          </p>
        </div>

        {/* Date Filter & Export Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="bg-muted/70 p-1 rounded-2xl flex items-center gap-1 border">
            {(["today", "week", "month", "ytd"] as const).map((r) => (
              <Button
                key={r}
                size="sm"
                variant={dateRange === r ? "default" : "ghost"}
                className={`rounded-xl text-xs font-bold h-8 px-3 transition-all ${
                  dateRange === r ? "shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setDateRange(r)}
              >
                {r === "today" ? "Today" : r === "week" ? "Last 7D" : r === "month" ? "30 Days" : "YTD 2026"}
              </Button>
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
            className="rounded-xl font-bold text-xs gap-1.5 h-9 shadow-md shadow-primary/20"
            onClick={handlePrint}
          >
            <Printer className="h-4 w-4" />
            <span>Print Report</span>
          </Button>
        </div>
      </div>

      {/* High-Level Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        
        {/* Gross Revenue */}
        <Card className="rounded-3xl shadow-sm border-muted-foreground/15 hover:shadow-md transition-shadow">
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Gross Revenue</span>
              <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-black text-xs">
                ETB
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl font-black">{formatETB(currentSet.gross)}</h3>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5" />
                <span>+14.8% vs previous period</span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Operating Expenses */}
        <Card className="rounded-3xl shadow-sm border-muted-foreground/15 hover:shadow-md transition-shadow">
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Operating Expenses</span>
              <div className="h-8 w-8 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
                <Receipt className="h-4 w-4" />
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl font-black">{formatETB(currentSet.expenses)}</h3>
              <p className="text-xs text-muted-foreground font-medium">
                Ingredients, utilities, and kitchen overhead
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Net Operating Profit */}
        <Card className="rounded-3xl shadow-sm border-primary/20 bg-gradient-to-br from-card to-primary/5 hover:shadow-md transition-shadow">
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-primary uppercase tracking-wider">Net Operating Profit</span>
              <Badge className="bg-primary/20 text-primary border-primary/30 text-xs font-black">
                {profitMargin}% Margin
              </Badge>
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl font-black text-primary">{formatETB(netProfit)}</h3>
              <p className="text-xs text-muted-foreground font-medium">
                Net earnings after operational cost deduction
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Order Volume & Average Check */}
        <Card className="rounded-3xl shadow-sm border-muted-foreground/15 hover:shadow-md transition-shadow">
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Orders & Avg Ticket</span>
              <div className="h-8 w-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                <ShoppingBag className="h-4 w-4" />
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl font-black">{currentSet.ordersCount} <span className="text-sm font-normal text-muted-foreground">Orders</span></h3>
              <p className="text-xs font-bold text-muted-foreground">
                Avg. Check: <span className="text-foreground">{formatETB(avgTicket)}</span>
              </p>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Visual Analytics Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        
        {/* Revenue by Order Type */}
        <Card className="rounded-3xl shadow-sm border-muted-foreground/15">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-black">Revenue by Channel</CardTitle>
                <CardDescription className="text-xs">Dine-In Seated vs Takeaway/Delivery</CardDescription>
              </div>
              <div className="flex items-center gap-3 text-xs font-bold">
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-md bg-primary inline-block"></span> Dine-In
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-md bg-emerald-500 inline-block"></span> Takeaway/Delivery
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={currentSet.data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                  <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `${val / 1000}k`} />
                  <Tooltip 
                    contentStyle={{ borderRadius: "16px", border: "1px solid hsl(var(--border))", boxShadow: "0 10px 25px -5px rgb(0 0 0 / 0.1)" }}
                    formatter={(value: any, name: any) => [`${formatETB(Number(value))}`, name === "dineIn" ? "Dine-In" : "Takeaway/Delivery"]}
                  />
                  <Bar dataKey="dineIn" stackId="a" fill="var(--primary)" radius={[0, 0, 6, 6]} />
                  <Bar dataKey="delivery" stackId="a" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Total Sales Trend */}
        <Card className="rounded-3xl shadow-sm border-muted-foreground/15">
          <CardHeader className="pb-2">
            <div>
              <CardTitle className="text-lg font-black">Gross Sales Trend</CardTitle>
              <CardDescription className="text-xs">Continuous revenue trajectory across {currentSet.label}</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={currentSet.data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTotalETB" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                  <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `${val / 1000}k`} />
                  <Tooltip 
                    contentStyle={{ borderRadius: "16px", border: "1px solid hsl(var(--border))", boxShadow: "0 10px 25px -5px rgb(0 0 0 / 0.1)" }}
                    formatter={(value: any) => [`${formatETB(Number(value))}`, "Gross Sales"]}
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
          </CardContent>
        </Card>

      </div>

      {/* Top 5 Best-Selling Dishes */}
      <Card className="rounded-3xl shadow-sm border-muted-foreground/15">
        <CardHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-black flex items-center gap-2">
                <Utensils className="h-4 w-4 text-primary" />
                <span>Top-Selling Gourmet Dishes</span>
              </CardTitle>
              <CardDescription className="text-xs">Highest volume menu items ranked by total sales contribution</CardDescription>
            </div>
            <Badge variant="secondary" className="font-bold text-xs">
              Menu Analytics
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="divide-y">
            {topSellers.map((dish, idx) => (
              <div key={dish.name} className="p-4 md:px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3.5">
                  <div className="h-8 w-8 rounded-xl bg-muted flex items-center justify-center font-black text-xs text-muted-foreground">
                    #{idx + 1}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-foreground">{dish.name}</h4>
                    <p className="text-xs text-muted-foreground">{dish.category} · {formatETB(dish.price)} per portion</p>
                  </div>
                </div>

                <div className="flex items-center gap-6 self-end sm:self-center text-right">
                  <div>
                    <span className="text-xs text-muted-foreground block font-medium">Units Sold</span>
                    <span className="font-extrabold text-sm">{dish.unitsSold} orders</span>
                  </div>
                  <div className="min-w-[120px]">
                    <span className="text-xs text-muted-foreground block font-medium">Gross Revenue</span>
                    <span className="font-black text-sm text-primary">{formatETB(dish.revenue)}</span>
                  </div>
                  <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-black text-xs">
                    {dish.share}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
