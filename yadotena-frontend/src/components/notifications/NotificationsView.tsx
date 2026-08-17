"use client";

import { useEffect, useMemo, useState } from "react";
import { ServiceRequest } from "@/types";
import { formatTableRef, useTableLabels } from "@/hooks/useTableLabels";
import {
  ArrowLeft, BellRing, Check, CheckCircle2, ChevronDown, Clock, LifeBuoy, Receipt, ShieldCheck, X,
} from "lucide-react";

interface NotificationsViewProps {
  serviceRequests: ServiceRequest[];
  onResolve: (id: string) => void;
  /** Render with a back affordance (used inside the waiter workspace). */
  onBack?: () => void;
  /** Render a full-page heading (used on the standalone /notifications route). */
  standalone?: boolean;
}

type StatusFilter = "ALL" | "PENDING" | "RESOLVED";
type TypeFilter = "ALL" | "WAITER" | "BILL" | "ASSISTANCE";

const typeMeta: Record<string, { label: string; icon: React.ElementType; chip: string; iconBg: string }> = {
  BILL: { label: "Bill Request", icon: Receipt, chip: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/25", iconBg: "bg-purple-500/15 text-purple-600 dark:text-purple-400" },
  WAITER: { label: "Waiter Call", icon: BellRing, chip: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/25", iconBg: "bg-rose-500/15 text-rose-600 dark:text-rose-400" },
  ASSISTANCE: { label: "Assistance", icon: LifeBuoy, chip: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25", iconBg: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
};

function timeAgo(iso: string, now: number): string {
  const mins = Math.floor((now - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (mins < 60 * 24) return `${Math.floor(mins / 60)}h ago`;
  return `${Math.floor(mins / (60 * 24))}d ago`;
}

export function NotificationsView({
  serviceRequests, onResolve, onBack, standalone,
}: NotificationsViewProps) {
  const tableLabels = useTableLabels();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("PENDING");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // Keep relative timestamps honest without re-rendering on every tick.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const pending = serviceRequests.filter((r) => r.status === "PENDING");
  const resolved = serviceRequests.filter((r) => r.status === "RESOLVED");

  const filtered = useMemo(() => {
    let list = [...serviceRequests];
    if (statusFilter === "PENDING") list = list.filter((r) => r.status === "PENDING");
    if (statusFilter === "RESOLVED") list = list.filter((r) => r.status === "RESOLVED");
    if (typeFilter !== "ALL") list = list.filter((r) => r.type === typeFilter);
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [serviceRequests, statusFilter, typeFilter]);

  const tableRef = (r: ServiceRequest) =>
    formatTableRef(r.tableId, tableLabels) || (r.tableName ? r.tableName : "Table");

  const expanded = expandedId ? serviceRequests.find((r) => r.id === expandedId) || null : null;

  return (
    <div className="animate-in fade-in duration-200">
      {/* Heading */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground shrink-0 active:scale-95 transition-all"
            >
              <ArrowLeft className="h-4 w-4" /> Home
            </button>
          )}
          <div className="min-w-0">
            {standalone && <h1 className="text-xl font-bold flex items-center gap-2">Notifications</h1>}
            <div className="flex items-center gap-2">
              {pending.length > 0 && (
                <span className="h-6 min-w-6 px-1.5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center animate-pulse">
                  {pending.length}
                </span>
              )}
              <span className="text-xs font-bold text-muted-foreground">
                {pending.length} pending · {resolved.length} resolved
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex gap-1.5 p-1 bg-muted/70 rounded-xl">
          {(["PENDING", "RESOLVED", "ALL"] as StatusFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                statusFilter === f ? "bg-foreground text-background shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f === "ALL" ? "All" : f === "PENDING" ? "Pending" : "Resolved"}
            </button>
          ))}
        </div>

        <div className="flex gap-1.5 flex-wrap">
          {(["ALL", "BILL", "WAITER", "ASSISTANCE"] as TypeFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setTypeFilter(f)}
              className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-colors ${
                typeFilter === f
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground hover:bg-accent/50"
              }`}
            >
              {f === "ALL" ? "All types" : typeMeta[f]?.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-emerald-500 opacity-60" />
          <p className="font-medium">{statusFilter === "PENDING" ? "All clear!" : "Nothing here yet."}</p>
          <p className="text-sm mt-1">
            {statusFilter === "PENDING"
              ? "No pending requests from customers."
              : "Resolved notifications will appear here."}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((r) => {
            const meta = typeMeta[r.type] || typeMeta.WAITER;
            const isOpen = expandedId === r.id;
            const isPending = r.status === "PENDING";
            return (
              <div
                key={r.id}
                className={`rounded-2xl border bg-card transition-all ${
                  isPending
                    ? "border-rose-500/25 shadow-sm"
                    : "border-border opacity-80 hover:opacity-100"
                } ${isOpen ? "ring-2 ring-primary/20" : ""}`}
              >
                {/* Row */}
                <button
                  onClick={() => setExpandedId(isOpen ? null : r.id)}
                  className="w-full text-left p-4 flex items-start gap-3"
                >
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${meta.iconBg}`}>
                    <meta.icon className={`h-5 w-5 ${isPending ? "animate-pulse" : ""}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-sm">{tableRef(r)}</span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${meta.chip}`}>
                        {meta.label}
                      </span>
                      {isPending ? (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/25">
                          PENDING
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                          RESOLVED
                        </span>
                      )}
                    </div>
                    {r.notes && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.notes}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5 text-[11px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{timeAgo(r.createdAt, now)}</span>
                      <span className="opacity-50">·</span>
                      <span>{new Date(r.createdAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}</span>
                    </div>
                  </div>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform mt-1 ${isOpen ? "rotate-180" : ""}`} />
                </button>

                {/* Detail panel */}
                {isOpen && expanded && (
                  <div className="px-4 pb-4">
                    <div className="rounded-xl border bg-muted/30 p-3.5 space-y-2.5">
                      {expanded.notes && (
                        <div>
                          <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Message</p>
                          <p className="text-sm text-foreground">{expanded.notes}</p>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2.5 rounded-lg border bg-background/60">
                          <p className="text-[10px] font-bold uppercase text-muted-foreground">Table</p>
                          <p className="font-bold mt-0.5">{tableRef(expanded)}</p>
                        </div>
                        <div className="p-2.5 rounded-lg border bg-background/60">
                          <p className="text-[10px] font-bold uppercase text-muted-foreground">Requested</p>
                          <p className="font-bold mt-0.5">{new Date(expanded.createdAt).toLocaleString()}</p>
                        </div>
                      </div>
                      {expanded.status === "RESOLVED" && expanded.resolvedAt && (
                        <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                          <ShieldCheck className="h-3.5 w-3.5" />
                          Resolved at {new Date(expanded.resolvedAt).toLocaleString()}
                        </div>
                      )}

                      {isPending && (
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={() => { onResolve(expanded.id); setExpandedId(null); }}
                            className="flex-1 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.97] transition-all shadow-sm"
                          >
                            <Check className="h-4 w-4" /> Mark as Resolved
                          </button>
                          <button
                            onClick={() => setExpandedId(null)}
                            className="h-11 w-11 rounded-xl border flex items-center justify-center text-muted-foreground hover:text-foreground active:scale-95 transition-all"
                            aria-label="Close details"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
