"use client";

import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight, DollarSign, ShoppingBag, Users, Utensils } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatETB } from "@/lib/currency";
import WaiterDashboard from "@/components/dashboard/WaiterDashboard";

const revenueData = [
  { name: "8 AM", total: 4200 },
  { name: "10 AM", total: 8500 },
  { name: "12 PM", total: 18400 },
  { name: "2 PM", total: 24200 },
  { name: "4 PM", total: 11500 },
  { name: "6 PM", total: 29800 },
  { name: "8 PM", total: 42800 },
];

export default function DashboardPage() {
  const { data: session } = useSession();

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
          Here's what's happening with your restaurant today in Addis Ababa.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Today's Revenue"
          value={formatETB(42800)}
          trend="+12.5%"
          trendLabel="vs yesterday"
          icon={<div className="font-bold text-xs text-muted-foreground">ETB</div>}
        />
        <KpiCard
          title="Today's Orders"
          value="142"
          trend="+8.2%"
          trendLabel="vs yesterday"
          icon={<ShoppingBag className="h-4 w-4 text-muted-foreground" />}
        />
        <KpiCard
          title="Active Tables"
          value="18 / 24"
          trend="75%"
          trendLabel="occupancy rate"
          icon={<Utensils className="h-4 w-4 text-muted-foreground" />}
        />
        <KpiCard
          title="Total Customers"
          value="312"
          trend="+15.3%"
          trendLabel="vs last week"
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
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="name"
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value / 1000}k`}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: "12px", border: "1px solid hsl(var(--border))", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                    formatter={(value: any) => [`${formatETB(Number(value))}`, "Revenue"]}
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
            </div>
          </CardContent>
        </Card>
        
        <Card className="col-span-3 rounded-3xl shadow-sm">
          <CardHeader>
            <CardTitle>Top Selling Gourmet Dishes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {[
                { name: "Prime Beef Ribeye Steak", sales: 48, amount: 40800 },
                { name: "Artisanal Margherita Pizza", sales: 36, amount: 19800 },
                { name: "Truffle Parmesan Fries", sales: 62, amount: 13640 },
                { name: "Classic Chicken Burger", sales: 38, amount: 14440 },
                { name: "Signature Iced Caramel Latte", sales: 45, amount: 7200 },
              ].map((product, i) => (
                <div key={i} className="flex items-center">
                  <div className="h-9 w-9 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-xs mr-4">
                    {i + 1}
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-bold leading-none">{product.name}</p>
                    <p className="text-xs text-muted-foreground">{product.sales} sales</p>
                  </div>
                  <div className="font-extrabold text-sm text-primary">{formatETB(product.amount)}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({ title, value, trend, trendLabel, icon }: any) {
  return (
    <Card className="rounded-3xl shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{title}</CardTitle>
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
