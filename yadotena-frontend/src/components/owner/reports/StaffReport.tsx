"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { DateRange, STAFF_ACTIVITY_CATEGORIES, StaffActivityCategory, computeStaffReport } from "@/lib/owner";
import { cn } from "@/lib/utils";
import { Users, ChefHat, Briefcase, ShieldCheck, ScrollText } from "lucide-react";

const ROLE_LABEL: Record<string, string> = {
  WAITER: "Waiter",
  KITCHEN: "Chef",
  MANAGER: "Manager",
  OWNER: "Owner",
};

const CATEGORY_LABEL: Record<StaffActivityCategory, string> = {
  ORDERS: "Orders",
  PAYMENTS: "Payments",
  MENU: "Menu",
  EXPENSES: "Expenses",
  STAFF: "Staff",
  OTHER: "Other",
};

const CATEGORY_COLOR: Record<StaffActivityCategory, string> = {
  ORDERS: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  PAYMENTS: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  MENU: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  EXPENSES: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
  STAFF: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
  OTHER: "bg-muted text-muted-foreground border-border",
};

const ROLE_ICON: Record<string, React.ElementType> = {
  WAITER: Users,
  KITCHEN: ChefHat,
  MANAGER: Briefcase,
  OWNER: ShieldCheck,
};

export function StaffReport({ range }: { range: DateRange }) {
  const employees = useQuery({
    queryKey: ["employees"],
    queryFn: api.employees.getAll,
  });

  const logs = useQuery({
    queryKey: ["activityLogs", { from: range.from, to: range.to, limit: 500 }],
    queryFn: () =>
      api.activityLogs.getAll({
        startDate: range.from,
        endDate: `${range.to}T23:59:59`,
        limit: 500,
      }),
  });

  const report = useMemo(
    () => computeStaffReport({ employees: employees.data ?? [], logs: logs.data ?? [] }),
    [employees.data, logs.data]
  );

  const loading = employees.isLoading || logs.isLoading;

  return (
    <div className="space-y-4">
      {/* Role rollups */}
      {!loading && report.roleRollup.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {report.roleRollup.map((r) => {
            const Icon = ROLE_ICON[r.role] ?? Users;
            return (
              <div key={r.role} className="bg-card border rounded-2xl p-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-black">{ROLE_LABEL[r.role] ?? r.role}</p>
                    <p className="text-[10px] text-muted-foreground font-semibold">{r.members} staff</p>
                  </div>
                </div>
                <p className="mt-2 text-xl font-black">{r.actions}</p>
                <p className="text-[11px] text-muted-foreground font-semibold">recorded actions</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Per-staff breakdown */}
      <div className="bg-card border rounded-2xl p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-black text-sm text-foreground flex items-center gap-1.5">
              <ScrollText className="h-4 w-4 text-amber-500" /> Staff Activity
            </h3>
            <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
              Action counts from the real audit log in this period
            </p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-2 mt-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 bg-muted/40 border rounded-xl animate-pulse" />
            ))}
          </div>
        ) : report.members.length === 0 ? (
          <div className="py-14 text-center border border-dashed rounded-2xl mt-4">
            <Users className="h-6 w-6 mx-auto text-muted-foreground opacity-50" />
            <p className="text-xs font-bold text-muted-foreground mt-2">
              No staff activity recorded in this period.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {report.members.map((m) => (
              <div key={m.userId} className="rounded-xl border bg-background/50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-sm font-black text-foreground truncate">{m.name}</span>
                    <span
                      className={cn(
                        "px-1.5 py-0.5 rounded-full text-[9px] font-black border",
                        m.role === "OWNER"
                          ? "bg-violet-500/10 text-violet-600 border-violet-500/20"
                          : m.role === "KITCHEN"
                            ? "bg-orange-500/10 text-orange-600 border-orange-500/20"
                            : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                      )}
                    >
                      {ROLE_LABEL[m.role] ?? m.role}
                    </span>
                    <span
                      className={cn(
                        "px-1.5 py-0.5 rounded-full text-[9px] font-black border",
                        m.active
                          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                          : "bg-muted text-muted-foreground border-border"
                      )}
                    >
                      {m.active ? "Active" : "Suspended"}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-black">{m.actions}</span>
                    <span className="text-[10px] text-muted-foreground font-semibold ml-1">actions</span>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {STAFF_ACTIVITY_CATEGORIES.map((cat) =>
                    m.byCategory[cat] > 0 ? (
                      <span
                        key={cat}
                        className={cn(
                          "px-2 py-0.5 rounded-full text-[9px] font-black border",
                          CATEGORY_COLOR[cat]
                        )}
                      >
                        {CATEGORY_LABEL[cat]} · {m.byCategory[cat]}
                      </span>
                    ) : null
                  )}
                  {m.lastActiveAt && (
                    <span className="text-[10px] text-muted-foreground font-semibold ml-auto">
                      Last active{" "}
                      {new Date(m.lastActiveAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
