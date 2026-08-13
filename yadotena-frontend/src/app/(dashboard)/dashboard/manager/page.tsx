"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatETB } from "@/lib/currency";
import { 
  BellRing, 
  CheckCircle2, 
  AlertTriangle, 
  Users, 
  Grid, 
  ShieldAlert, 
  Package, 
  Clock, 
  ArrowRight,
  TrendingUp,
  UserCheck
} from "lucide-react";
import { ActivityLogsViewer } from "@/components/dashboard/ActivityLogsViewer";

export default function ManagerDashboardPage() {
  const queryClient = useQueryClient();

  const { data: tables = [] } = useQuery({
    queryKey: ["tables"],
    queryFn: api.tables.getAll,
  });

  const { data: orders = [] } = useQuery({
    queryKey: ["orders"],
    queryFn: api.orders.getAll,
  });

  const { data: serviceRequests = [] } = useQuery({
    queryKey: ["serviceRequests"],
    queryFn: api.serviceRequests.getAll,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: api.employees.getAll,
  });

  const resolveRequestMutation = useMutation({
    mutationFn: (id: string) => api.serviceRequests.resolve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["serviceRequests"] });
    },
  });

  const activeOrders = orders.filter((o) => o.status !== "COMPLETED" && o.status !== "CANCELLED");
  const pendingRequests = serviceRequests.filter((r) => r.status === "PENDING");
  const occupiedTablesCount = tables.filter((t) => t.status === "OCCUPIED").length;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-16">
      {/* Manager Banner Header */}
      <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-950 text-emerald-50 p-6 md:p-8 rounded-3xl border border-emerald-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 font-black text-[10px] uppercase tracking-wider px-3 py-1">
              💼 Store Operations Control
            </Badge>
            <span className="text-xs text-emerald-300 font-medium">Shift Operations Command</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight">
            Manager Operational Overview
          </h1>
          <p className="text-sm text-emerald-200 max-w-xl">
            Realtime monitoring of floor table turnover, waiter service calls, active kitchen tickets, and staff shift coverage.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-emerald-900/60 p-4 rounded-2xl border border-emerald-700/60 text-right">
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-300 block">Pending Alerts</span>
            <span className="text-2xl font-black text-amber-400">{pendingRequests.length} Service Calls</span>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-3xl border shadow-sm p-6 bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Active Live Tickets</span>
            <div className="h-10 w-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <h2 className="text-3xl font-black text-foreground">{activeOrders.length} Tickets</h2>
            <p className="text-xs text-muted-foreground font-bold mt-1">In Preparation / Serving</p>
          </div>
        </Card>

        <Card className="rounded-3xl border shadow-sm p-6 bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Floor Table Occupancy</span>
            <div className="h-10 w-10 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <Grid className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <h2 className="text-3xl font-black text-foreground">{occupiedTablesCount} / {tables.length} Tables</h2>
            <p className="text-xs text-blue-600 dark:text-blue-400 font-bold mt-1">
              {tables.length > 0 ? Math.round((occupiedTablesCount / tables.length) * 100) : 0}% Occupancy Rate
            </p>
          </div>
        </Card>

        <Card className="rounded-3xl border shadow-sm p-6 bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Urgent Waiter Calls</span>
            <div className="h-10 w-10 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
              <BellRing className="h-5 w-5 animate-bounce" />
            </div>
          </div>
          <div className="mt-4">
            <h2 className="text-3xl font-black text-foreground">{pendingRequests.length} Calls</h2>
            <p className="text-xs text-rose-500 font-bold mt-1">Requires Waiter Action</p>
          </div>
        </Card>

        <Card className="rounded-3xl border shadow-sm p-6 bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Staff On Duty</span>
            <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <UserCheck className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <h2 className="text-3xl font-black text-foreground">{employees.length} Staff</h2>
            <p className="text-xs text-emerald-600 font-bold mt-1">Active Shift Roster</p>
          </div>
        </Card>
      </div>

      {/* Main Operations Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Urgent Service Calls Dispatch */}
        <Card className="rounded-3xl border shadow-sm p-6 bg-card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-black text-lg flex items-center gap-2">
                <BellRing className="h-5 w-5 text-rose-500" />
                <span>Live Table Service Requests</span>
              </h3>
              <p className="text-xs text-muted-foreground">Dispatched waiter calls and bill requests</p>
            </div>
            <Badge variant="secondary" className="font-bold text-xs">
              {pendingRequests.length} Pending
            </Badge>
          </div>

          <div className="space-y-3">
            {pendingRequests.map((req: any) => (
              <div key={req.id} className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-rose-500 text-white font-black text-[10px] uppercase">
                      Table {req.tableId?.replace("t", "")}
                    </Badge>
                    <span className="font-extrabold text-sm">{req.type === "WAITER" ? "Call Waiter" : "Request Bill"}</span>
                  </div>
                  <p className="text-xs text-muted-foreground italic font-medium">"{req.notes}"</p>
                </div>

                <Button
                  size="sm"
                  onClick={() => resolveRequestMutation.mutate(req.id)}
                  disabled={resolveRequestMutation.isPending}
                  className="rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Resolve
                </Button>
              </div>
            ))}

            {pendingRequests.length === 0 && (
              <div className="p-8 text-center space-y-2 border border-dashed rounded-2xl">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
                <p className="text-xs font-bold text-muted-foreground">All table service calls are currently resolved!</p>
              </div>
            )}
          </div>
        </Card>

        {/* Low Stock Inventory Warnings */}
        <Card className="rounded-3xl border shadow-sm p-6 bg-card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-black text-lg flex items-center gap-2">
                <Package className="h-5 w-5 text-amber-500" />
                <span>Dairy & Inventory Stock Monitor</span>
              </h3>
              <p className="text-xs text-muted-foreground">Realtime stock level tracking</p>
            </div>
            <Badge variant="outline" className="font-bold text-xs">Fresh Dairy</Badge>
          </div>

          <div className="space-y-3">
            {[
              { name: "Pasteurized Whole Milk (1L Glass)", stock: "14 Units", status: "NORMAL" },
              { name: "Spiced Ergo Yogurt (500g)", stock: "4 Units", status: "LOW" },
              { name: "Raw Highland Honey (1kg)", stock: "8 Units", status: "NORMAL" },
              { name: "Niter Kibbeh Clarified Butter (1kg)", stock: "2 Units", status: "CRITICAL" },
            ].map((item, idx) => (
              <div key={idx} className="p-3.5 rounded-2xl bg-muted/40 border flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm">{item.name}</h4>
                  <span className="text-[11px] text-muted-foreground font-medium">Stock: {item.stock}</span>
                </div>
                <Badge
                  className={`font-black text-[10px] uppercase rounded-xl px-2.5 py-0.5 ${
                    item.status === "CRITICAL"
                      ? "bg-rose-500 text-white"
                      : item.status === "LOW"
                      ? "bg-amber-500 text-amber-950"
                      : "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                  }`}
                >
                  {item.status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Staff Activity Audit Log Feed */}
      <ActivityLogsViewer
        title="Staff Shift Audit Feed"
        description="Comprehensive log of all waiter order entries, kitchen food preparation status updates, cashier settlements, and table changes."
        allowedRoles={["WAITER", "KITCHEN", "CASHIER"]}
      />
    </div>
  );
}
