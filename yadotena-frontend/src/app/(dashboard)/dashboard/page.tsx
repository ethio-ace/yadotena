"use client";

import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight, DollarSign, ShoppingBag, Users, Utensils } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import WaiterDashboard from "@/components/dashboard/WaiterDashboard";

const revenueData = [
  { name: "8 AM", total: 120 },
  { name: "10 AM", total: 450 },
  { name: "12 PM", total: 1800 },
  { name: "2 PM", total: 2400 },
  { name: "4 PM", total: 1100 },
  { name: "6 PM", total: 2900 },
  { name: "8 PM", total: 4280 },
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
          Good morning, {session?.user?.name?.split(" ")[0] || "User"}
        </h2>
        <p className="text-muted-foreground mt-1">
          Here's what's happening with your restaurant today.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Today's Revenue"
          value="$4,280.00"
          trend="+12.5%"
          trendLabel="vs yesterday"
          icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
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
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Revenue Overview</CardTitle>
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
                    tickFormatter={(value) => `$${value}`}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                    formatter={(value: any) => [`$${value}`, "Revenue"]}
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
        
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Top Selling Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {[
                { name: "Classic Chicken Burger", sales: 48, amount: "$456.00" },
                { name: "Margherita Pizza", sales: 36, amount: "$522.00" },
                { name: "French Fries", sales: 62, amount: "$310.00" },
                { name: "Beef Steak", sales: 18, amount: "$432.00" },
                { name: "Iced Latte", sales: 45, amount: "$202.50" },
              ].map((product, i) => (
                <div key={i} className="flex items-center">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold mr-4">
                    {i + 1}
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">{product.name}</p>
                    <p className="text-sm text-muted-foreground">{product.sales} sales</p>
                  </div>
                  <div className="font-medium">{product.amount}</div>
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1 flex items-center">
          <span className="text-emerald-500 font-medium flex items-center mr-1">
            <ArrowUpRight className="h-3 w-3 mr-0.5" />
            {trend}
          </span>
          {trendLabel}
        </p>
      </CardContent>
    </Card>
  );
}
