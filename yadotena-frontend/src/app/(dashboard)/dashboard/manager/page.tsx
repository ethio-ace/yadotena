"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatETB } from "@/lib/currency";
import { 
  BellRing, 
  CheckCircle2, 
  Users, 
  Grid, 
  Package, 
  Clock, 
  ArrowRight,
  UserCheck,
  Briefcase,
  Utensils,
  ShoppingCart,
  MenuSquare,
  Receipt,
  BarChart3,
  ShieldCheck,
  Check,
  Activity
} from "lucide-react";
import Link from "next/link";
import { ActivityLogsViewer } from "@/components/dashboard/ActivityLogsViewer";

export default function ManagerDashboardPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"OVERVIEW" | "CALLS" | "STOCK" | "LOGS">("OVERVIEW");

  const { data: tables = [] } = useQuery({
    queryKey: ["tables"],
    queryFn: api.tables.getAll,
    refetchInterval: 3000,
  });

  const { data: orders = [] } = useQuery({
    queryKey: ["orders"],
    queryFn: api.orders.getAll,
    refetchInterval: 3000,
  });

  const { data: serviceRequests = [] } = useQuery({
    queryKey: ["serviceRequests"],
    queryFn: api.serviceRequests.getAll,
    refetchInterval: 3000,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: api.employees.getAll,
  });

  const resolveRequestMutation = useMutation({
    mutationFn: (id: string) => api.serviceRequests.resolve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["serviceRequests"] });
      queryClient.invalidateQueries({ queryKey: ["tables"] });
    },
  });

  const activeOrders = orders.filter((o) => o.status !== "COMPLETED" && o.status !== "CANCELLED");
  const pendingRequests = serviceRequests.filter((r) => r.status === "PENDING");
  const occupiedTablesCount = tables.filter((t) => t.status === "OCCUPIED").length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-20">
      
      {/* Manager Header Banner */}
      <div className="bg-card border p-6 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge className="bg-primary text-primary-foreground font-black text-[10px] uppercase tracking-wider px-2.5 py-0.5">
              Store Operations
            </Badge>
            <span className="text-xs text-muted-foreground font-bold">Manager Shift Command</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-foreground">
            Manager Control Dashboard
          </h1>
          <p className="text-xs text-muted-foreground max-w-xl">
            Realtime monitoring of floor tables, customer service calls, kitchen tickets, staff shifts, and audit logs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-muted/40 p-3.5 rounded-xl border text-right">
            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">
              Pending Waiter Calls
            </span>
            <span className="text-xl font-black text-primary">
              {pendingRequests.length} Call(s) Active
            </span>
          </div>
        </div>
      </div>

      {/* Manager Quick Navigation Bar */}
      <div className="bg-card border p-3 rounded-2xl flex flex-wrap items-center justify-between gap-2 shadow-sm">
        
        {/* Tab Switchers */}
        <div className="flex items-center gap-2 overflow-x-auto text-xs pb-0.5 scrollbar-none">
          <button
            onClick={() => setActiveTab("OVERVIEW")}
            className={`px-3.5 py-2 rounded-xl font-black transition-all border ${
              activeTab === "OVERVIEW"
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-muted/40 border-transparent text-muted-foreground hover:bg-muted"
            }`}
          >
            Operations Overview
          </button>

          <button
            onClick={() => setActiveTab("CALLS")}
            className={`px-3.5 py-2 rounded-xl font-black transition-all border ${
              activeTab === "CALLS"
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-muted/40 border-transparent text-muted-foreground hover:bg-muted"
            }`}
          >
            Service Calls ({pendingRequests.length})
          </button>

          <button
            onClick={() => setActiveTab("STOCK")}
            className={`px-3.5 py-2 rounded-xl font-black transition-all border ${
              activeTab === "STOCK"
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-muted/40 border-transparent text-muted-foreground hover:bg-muted"
            }`}
          >
            Inventory & Stock
          </button>

          <button
            onClick={() => setActiveTab("LOGS")}
            className={`px-3.5 py-2 rounded-xl font-black transition-all border ${
              activeTab === "LOGS"
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-muted/40 border-transparent text-muted-foreground hover:bg-muted"
            }`}
          >
            Staff Audit Logs
          </button>
        </div>

        {/* Manager Quick Action Links */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          <Link href="/dashboard/tables">
            <Button size="sm" variant="outline" className="h-8 text-[11px] font-bold rounded-xl gap-1">
              <Grid className="h-3.5 w-3.5 text-primary" /> Tables
            </Button>
          </Link>

          <Link href="/dashboard/waiter">
            <Button size="sm" variant="outline" className="h-8 text-[11px] font-bold rounded-xl gap-1">
              <ShoppingCart className="h-3.5 w-3.5 text-primary" /> Waiter POS
            </Button>
          </Link>

          <Link href="/dashboard/menu">
            <Button size="sm" variant="outline" className="h-8 text-[11px] font-bold rounded-xl gap-1">
              <MenuSquare className="h-3.5 w-3.5 text-primary" /> Menu
            </Button>
          </Link>

          <Link href="/dashboard/employees">
            <Button size="sm" variant="outline" className="h-8 text-[11px] font-bold rounded-xl gap-1">
              <Users className="h-3.5 w-3.5 text-primary" /> Staff
            </Button>
          </Link>

          <Link href="/dashboard/expenses">
            <Button size="sm" variant="outline" className="h-8 text-[11px] font-bold rounded-xl gap-1">
              <Receipt className="h-3.5 w-3.5 text-primary" /> Expenses
            </Button>
          </Link>

          <Link href="/dashboard/logs">
            <Button size="sm" variant="outline" className="h-8 text-[11px] font-bold rounded-xl gap-1">
              <Activity className="h-3.5 w-3.5 text-primary" /> Activity Logs
            </Button>
          </Link>
        </div>

      </div>

      {/* Metrics Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-2xl border shadow-sm p-4 bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Active Tickets</span>
            <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <h2 className="text-2xl font-black text-foreground">{activeOrders.length} Tickets</h2>
            <p className="text-[11px] text-muted-foreground font-bold mt-0.5">Cooking or Serving</p>
          </div>
        </Card>

        <Card className="rounded-2xl border shadow-sm p-4 bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Floor Occupancy</span>
            <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Grid className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <h2 className="text-2xl font-black text-foreground">{occupiedTablesCount} / {tables.length} Tables</h2>
            <p className="text-[11px] text-primary font-bold mt-0.5">
              {tables.length > 0 ? Math.round((occupiedTablesCount / tables.length) * 100) : 0}% Floor Capacity
            </p>
          </div>
        </Card>

        <Card className="rounded-2xl border shadow-sm p-4 bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Urgent Waiter Calls</span>
            <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <BellRing className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <h2 className="text-2xl font-black text-foreground">{pendingRequests.length} Calls</h2>
            <p className="text-[11px] text-primary font-bold mt-0.5">Requires Waiter Action</p>
          </div>
        </Card>

        <Card className="rounded-2xl border shadow-sm p-4 bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Shift Roster</span>
            <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <UserCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <h2 className="text-2xl font-black text-foreground">{employees.length} Staff</h2>
            <p className="text-[11px] text-muted-foreground font-bold mt-0.5">Active Shift Employees</p>
          </div>
        </Card>
      </div>

      {/* TAB CONTENT 1: OVERVIEW & SERVICE DISPATCH */}
      {(activeTab === "OVERVIEW" || activeTab === "CALLS") && (
        <div className="grid gap-6 md:grid-cols-2">
          
          {/* Urgent Service Calls Dispatch */}
          <Card className="rounded-2xl border shadow-sm p-5 bg-card space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-black text-base flex items-center gap-2">
                  <BellRing className="h-4 w-4 text-primary" />
                  <span>Live Table Service Requests</span>
                </h3>
                <p className="text-xs text-muted-foreground">Dispatched waiter assistance and bill calls</p>
              </div>
              <Badge className="bg-primary text-primary-foreground font-bold text-xs">
                {pendingRequests.length} Pending
              </Badge>
            </div>

            <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
              {pendingRequests.map((req: any) => (
                <div key={req.id} className="p-3.5 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-primary text-primary-foreground font-black text-[9px] uppercase">
                        Table #{req.tableId?.replace("t", "")}
                      </Badge>
                      <span className="font-extrabold text-foreground">{req.type === "WAITER" ? "Call Waiter" : "Request Bill"}</span>
                    </div>
                    {req.notes && <p className="text-[11px] text-muted-foreground italic font-medium">"{req.notes}"</p>}
                  </div>

                  <Button
                    size="sm"
                    onClick={() => resolveRequestMutation.mutate(req.id)}
                    disabled={resolveRequestMutation.isPending}
                    className="rounded-xl font-bold text-xs bg-primary text-primary-foreground h-8 px-3"
                  >
                    <Check className="h-3.5 w-3.5 mr-1" /> Resolve
                  </Button>
                </div>
              ))}

              {pendingRequests.length === 0 && (
                <div className="py-12 text-center space-y-2 border border-dashed rounded-xl">
                  <CheckCircle2 className="h-7 w-7 text-primary mx-auto" />
                  <p className="text-xs font-bold text-muted-foreground">All table service calls are currently resolved!</p>
                </div>
              )}
            </div>
          </Card>

          {/* Active Shift Employee Roster */}
          <Card className="rounded-2xl border shadow-sm p-5 bg-card space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-black text-base flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-primary" />
                  <span>Active Shift Roster</span>
                </h3>
                <p className="text-xs text-muted-foreground">Staff assigned to floor and kitchen shifts</p>
              </div>
              <Link href="/dashboard/employees">
                <Button size="sm" variant="ghost" className="h-7 text-xs font-bold text-primary underline p-0">
                  Manage Staff
                </Button>
              </Link>
            </div>

            <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
              {employees.slice(0, 6).map((emp: any) => (
                <div key={emp.id} className="p-3 rounded-xl bg-muted/40 border flex items-center justify-between text-xs">
                  <div>
                    <h4 className="font-bold text-foreground">{emp.name}</h4>
                    <span className="text-[10px] text-muted-foreground font-medium">{emp.phone || emp.email || "Staff Member"}</span>
                  </div>
                  <Badge variant="outline" className="font-black text-[9px] uppercase">
                    {emp.role}
                  </Badge>
                </div>
              ))}

              {employees.length === 0 && (
                <div className="py-12 text-center text-xs text-muted-foreground border border-dashed rounded-xl">
                  No employee roster entries found.
                </div>
              )}
            </div>
          </Card>

        </div>
      )}

      {/* TAB CONTENT 2: INVENTORY & STOCK MONITOR */}
      {activeTab === "STOCK" && (
        <Card className="rounded-2xl border shadow-sm p-5 bg-card space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h3 className="font-black text-base flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                <span>Dairy & Inventory Stock Monitor</span>
              </h3>
              <p className="text-xs text-muted-foreground">Realtime stock level tracking and reorder warnings</p>
            </div>
            <Badge variant="outline" className="font-bold text-xs">Fresh Stock</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { name: "Pasteurized Whole Milk (1L Glass)", stock: "14 Units", status: "NORMAL" },
              { name: "Spiced Ergo Yogurt (500g)", stock: "4 Units", status: "LOW" },
              { name: "Raw Highland Honey (1kg)", stock: "8 Units", status: "NORMAL" },
              { name: "Niter Kibbeh Clarified Butter (1kg)", stock: "2 Units", status: "CRITICAL" },
              { name: "Injera Flatbread (50 Count Pack)", stock: "25 Packs", status: "NORMAL" },
              { name: "Ethiopian Coffee Beans (1kg Bag)", stock: "3 Bags", status: "LOW" },
            ].map((item, idx) => (
              <div key={idx} className="p-3.5 rounded-xl bg-muted/40 border flex items-center justify-between text-xs">
                <div>
                  <h4 className="font-bold text-foreground">{item.name}</h4>
                  <span className="text-[11px] text-muted-foreground font-medium">Stock: {item.stock}</span>
                </div>
                <Badge
                  className={`font-black text-[9px] uppercase px-2 py-0.5 ${
                    item.status === "CRITICAL"
                      ? "bg-destructive text-destructive-foreground"
                      : item.status === "LOW"
                      ? "bg-primary/20 text-primary border border-primary/30"
                      : "bg-muted text-muted-foreground border"
                  }`}
                >
                  {item.status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* TAB CONTENT 3: STAFF AUDIT LOGS */}
      {(activeTab === "OVERVIEW" || activeTab === "LOGS") && (
        <ActivityLogsViewer
          title="Staff Shift Audit Feed"
          description="Comprehensive log of all waiter order entries, kitchen food preparation status updates, cashier settlements, and table changes."
          allowedRoles={["WAITER", "KITCHEN", "MANAGER", "OWNER"]}
        />
      )}

    </div>
  );
}
