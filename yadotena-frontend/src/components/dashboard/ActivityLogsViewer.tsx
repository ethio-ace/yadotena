"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { 
  Activity, Search, Shield, User, ChefHat, Wallet, ShoppingCart, 
  CreditCard, Grid, MenuSquare, ArrowRight, Eye, RefreshCw, X, 
  FileDiff, Clock, Sparkles
} from "lucide-react";

export interface ActivityLogItem {
  id: string;
  userId: string;
  userName: string;
  userRole: "WAITER" | "KITCHEN" | "MANAGER" | "OWNER" | string;
  action: string;
  entityType: string;
  entityId: string;
  description: string;
  prevState?: any;
  nextState?: any;
  ipAddress?: string;
  createdAt: string;
}

interface ActivityLogsViewerProps {
  title?: string;
  description?: string;
  allowedRoles?: string[]; // If provided, limits default view to these roles
  isOwnerView?: boolean;
}

export function ActivityLogsViewer({
  title = "Staff Activity Audit Log",
  description = "Track each staff action, order modification, status update, and financial transaction with full previous vs. current data diffs.",
  allowedRoles,
  isOwnerView = false,
}: ActivityLogsViewerProps) {
  const [search, setSearch] = useState("");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>("ALL");
  const [selectedEntityTypeFilter, setSelectedEntityTypeFilter] = useState<string>("ALL");
  const [inspectingLog, setInspectingLog] = useState<ActivityLogItem | null>(null);

  // Queries
  const { data: logs = [], isLoading, refetch } = useQuery<ActivityLogItem[]>({
    queryKey: ["activityLogs", selectedRoleFilter, selectedEntityTypeFilter, search],
    queryFn: () => api.activityLogs.getAll({
      role: selectedRoleFilter !== "ALL" ? selectedRoleFilter : undefined,
      entityType: selectedEntityTypeFilter !== "ALL" ? selectedEntityTypeFilter : undefined,
      search: search.trim() || undefined,
    }),
  });

  // Filter logs if role-restricted
  const displayLogs = logs.filter((log) => {
    if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(log.userRole)) {
      return false;
    }
    return true;
  });

  const getRoleIcon = (role: string) => {
    switch (role?.toUpperCase()) {
      case "WAITER":
        return <User className="h-4 w-4 text-amber-500" />;
      case "KITCHEN":
        return <ChefHat className="h-4 w-4 text-orange-500" />;
      case "MANAGER":
        return <Shield className="h-4 w-4 text-purple-500" />;
      case "OWNER":
        return <Sparkles className="h-4 w-4 text-primary" />;
      default:
        return <Activity className="h-4 w-4 text-blue-500" />;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role?.toUpperCase()) {
      case "WAITER":
        return "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30";
      case "KITCHEN":
        return "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30";
      case "MANAGER":
        return "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30";
      case "OWNER":
        return "bg-primary/15 text-primary border-primary/30";
      default:
        return "bg-muted text-muted-foreground border-muted";
    }
  };

  const getEntityIcon = (entityType: string) => {
    switch (entityType?.toUpperCase()) {
      case "ORDER":
        return <ShoppingCart className="h-4 w-4 text-sky-500" />;
      case "PAYMENT":
        return <CreditCard className="h-4 w-4 text-emerald-500" />;
      case "TABLE":
        return <Grid className="h-4 w-4 text-amber-500" />;
      case "MENU_ITEM":
        return <MenuSquare className="h-4 w-4 text-purple-500" />;
      default:
        return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
  };

  // Helper to safely render diff comparison tables
  const renderStateDiff = (prevState: any, nextState: any) => {
    if (!prevState && !nextState) {
      return (
        <div className="p-4 text-center text-xs text-muted-foreground italic bg-muted/20 rounded-2xl border">
          No state snapshot payload recorded for this action.
        </div>
      );
    }

    let prevObj: Record<string, any> = {};
    let nextObj: Record<string, any> = {};

    try {
      prevObj = typeof prevState === "string" ? JSON.parse(prevState) : prevState || {};
    } catch (e) {
      prevObj = {};
    }

    try {
      nextObj = typeof nextState === "string" ? JSON.parse(nextState) : nextState || {};
    } catch (e) {
      nextObj = {};
    }

    const allKeys = Array.from(
      new Set([...Object.keys(prevObj || {}), ...Object.keys(nextObj || {})])
    ).filter((k) => k !== "updatedAt" && k !== "createdAt");

    if (allKeys.length === 0) {
      return (
        <div className="p-4 text-center text-xs text-muted-foreground italic bg-muted/20 rounded-2xl border">
          No changed attributes detected.
        </div>
      );
    }

    return (
      <div className="overflow-hidden rounded-2xl border bg-card text-xs">
        <table className="w-full text-left">
          <thead className="bg-muted/60 text-[11px] font-bold uppercase text-muted-foreground border-b">
            <tr>
              <th className="px-4 py-2.5">Attribute Field</th>
              <th className="px-4 py-2.5 bg-rose-500/5 text-rose-600 dark:text-rose-400">Previous Data</th>
              <th className="px-4 py-2.5 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400">Updated Data</th>
            </tr>
          </thead>
          <tbody className="divide-y font-mono">
            {allKeys.map((key) => {
              const prevVal = prevObj[key];
              const nextVal = nextObj[key];
              const isModified = JSON.stringify(prevVal) !== JSON.stringify(nextVal);

              const formatVal = (v: any) => {
                if (v === undefined || v === null) return <span className="text-muted-foreground/50 font-sans italic">empty</span>;
                if (typeof v === "object") return JSON.stringify(v);
                return String(v);
              };

              return (
                <tr key={key} className={isModified ? "bg-amber-500/5" : ""}>
                  <td className="px-4 py-3 font-bold font-sans text-foreground flex items-center gap-1.5">
                    {isModified && <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>}
                    {key}
                  </td>
                  <td className="px-4 py-3 bg-rose-500/5 text-rose-700 dark:text-rose-300 font-semibold line-through decoration-rose-400/50">
                    {formatVal(prevVal)}
                  </td>
                  <td className="px-4 py-3 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300 font-black">
                    {formatVal(nextVal)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* Visual Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            <span>{title}</span>
          </h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-2xl">{description}</p>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={() => refetch()}
          className="rounded-2xl text-xs font-bold gap-1.5 shrink-0"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh Audit Feed
        </Button>
      </div>

      {/* Filter Controls Bar */}
      <div className="flex flex-col md:flex-row gap-3 bg-card p-4 rounded-3xl border shadow-sm">
        
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by staff member, order ID, or action..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-2xl h-10 text-xs bg-muted/30"
          />
        </div>

        {/* Role Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-bold">
          <button
            onClick={() => setSelectedRoleFilter("ALL")}
            className={`px-3 py-2 rounded-2xl border transition-all ${
              selectedRoleFilter === "ALL"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted/40 border-transparent text-muted-foreground hover:bg-muted"
            }`}
          >
            All Roles
          </button>
          <button
            onClick={() => setSelectedRoleFilter("WAITER")}
            className={`px-3 py-2 rounded-2xl border transition-all ${
              selectedRoleFilter === "WAITER"
                ? "bg-amber-500 text-amber-950 border-amber-500"
                : "bg-muted/40 border-transparent text-muted-foreground hover:bg-muted"
            }`}
          >
            Waiters
          </button>
          <button
            onClick={() => setSelectedRoleFilter("KITCHEN")}
            className={`px-3 py-2 rounded-2xl border transition-all ${
              selectedRoleFilter === "KITCHEN"
                ? "bg-orange-500 text-white border-orange-500"
                : "bg-muted/40 border-transparent text-muted-foreground hover:bg-muted"
            }`}
          >
            Chefs
          </button>
          {isOwnerView && (
            <button
              onClick={() => setSelectedRoleFilter("MANAGER")}
              className={`px-3 py-2 rounded-2xl border transition-all ${
                selectedRoleFilter === "MANAGER"
                  ? "bg-purple-500 text-white border-purple-500"
                  : "bg-muted/40 border-transparent text-muted-foreground hover:bg-muted"
              }`}
            >
              Managers
            </button>
          )}
        </div>

      </div>

      {/* Activity Logs Timeline Table */}
      <Card className="rounded-3xl border-muted-foreground/15 shadow-sm overflow-hidden bg-card">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-xs text-muted-foreground animate-pulse">
              Loading staff activity history...
            </div>
          ) : displayLogs.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <Activity className="h-8 w-8 text-muted-foreground mx-auto opacity-50" />
              <p className="text-sm font-bold text-muted-foreground">No audit activity logs recorded matching criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/40 border-b">
                  <tr>
                    <th className="px-6 py-3 font-bold">Staff Member</th>
                    <th className="px-6 py-3 font-bold">Action Performed</th>
                    <th className="px-6 py-3 font-bold">Target Entity</th>
                    <th className="px-6 py-3 font-bold">Timestamp</th>
                    <th className="px-6 py-3 font-bold text-right">Data Audit Diff</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {displayLogs.map((logItem) => {
                    const hasDiff = logItem.prevState || logItem.nextState;

                    return (
                      <tr key={logItem.id} className="hover:bg-muted/30 transition-colors">
                        
                        {/* Staff Member & Role */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-2xl bg-muted/60 border flex items-center justify-center shrink-0">
                              {getRoleIcon(logItem.userRole)}
                            </div>
                            <div>
                              <div className="font-bold text-sm text-foreground flex items-center gap-2">
                                <span>{logItem.userName}</span>
                              </div>
                              <Badge className={`text-[9px] font-black uppercase rounded-full px-2 py-0 border ${getRoleBadgeVariant(logItem.userRole)}`}>
                                {logItem.userRole}
                              </Badge>
                            </div>
                          </div>
                        </td>

                        {/* Action Description */}
                        <td className="px-6 py-4">
                          <div className="space-y-0.5">
                            <span className="font-mono text-xs font-black uppercase tracking-wider text-primary">
                              {logItem.action.replace(/_/g, " ")}
                            </span>
                            <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                              {logItem.description}
                            </p>
                          </div>
                        </td>

                        {/* Entity */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {getEntityIcon(logItem.entityType)}
                            <span className="font-mono text-xs font-bold text-foreground">
                              {logItem.entityType}: {logItem.entityId.slice(-8).toUpperCase()}
                            </span>
                          </div>
                        </td>

                        {/* Timestamp */}
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-muted-foreground">
                          <div className="flex items-center gap-1.5 font-medium">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>{format(new Date(logItem.createdAt), "MMM d, h:mm:ss a")}</span>
                          </div>
                        </td>

                        {/* Inspect Action */}
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <Button
                            size="sm"
                            variant={hasDiff ? "default" : "outline"}
                            className="rounded-xl text-xs font-bold gap-1 px-3"
                            onClick={() => setInspectingLog(logItem)}
                          >
                            <FileDiff className="h-3.5 w-3.5" />
                            <span>Inspect Data</span>
                          </Button>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Inspect Diff Modal */}
      {inspectingLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="fixed inset-0" onClick={() => setInspectingLog(null)} />

          <div className="relative w-full max-w-3xl bg-card border rounded-3xl shadow-2xl overflow-hidden z-10 p-6 space-y-6 max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b pb-4 shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <Badge className={`text-[10px] font-black uppercase rounded-full border ${getRoleBadgeVariant(inspectingLog.userRole)}`}>
                    {inspectingLog.userRole}
                  </Badge>
                  <h3 className="text-xl font-black tracking-tight">{inspectingLog.action.replace(/_/g, " ")}</h3>
                </div>
                <p className="text-xs text-muted-foreground mt-1 font-medium">{inspectingLog.description}</p>
              </div>

              <Button size="icon" variant="ghost" className="rounded-full" onClick={() => setInspectingLog(null)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Metadata Card */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-muted/30 p-3.5 rounded-2xl border text-xs shrink-0">
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase block">Staff Member</span>
                <span className="font-bold text-foreground">{inspectingLog.userName}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase block">Entity ID</span>
                <span className="font-mono font-bold text-foreground">{inspectingLog.entityId}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase block">Timestamp</span>
                <span className="font-bold text-foreground">{format(new Date(inspectingLog.createdAt), "MMM d, h:mm:ss a")}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase block">IP Address</span>
                <span className="font-mono font-bold text-foreground">{inspectingLog.ipAddress || "Internal"}</span>
              </div>
            </div>

            {/* Side-by-Side Data Diff Visualizer */}
            <div className="flex-1 overflow-y-auto space-y-2">
              <h4 className="font-black text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <FileDiff className="h-4 w-4 text-primary" />
                <span>Attribute State Comparison (Previous vs. Current)</span>
              </h4>

              {renderStateDiff(inspectingLog.prevState, inspectingLog.nextState)}
            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t flex justify-end shrink-0">
              <Button className="rounded-xl font-bold" onClick={() => setInspectingLog(null)}>
                Close Audit View
              </Button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
