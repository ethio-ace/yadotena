"use client";

import { ServiceRequest } from "@/types";
import { formatTableRef, useTableLabels } from "@/hooks/useTableLabels";
import { ArrowLeft, Bell, CheckCircle } from "lucide-react";

interface AlertsViewProps {
  serviceRequests: ServiceRequest[];
  onBack: () => void;
  onResolve: (id: string) => void;
}

export function AlertsView({ serviceRequests, onBack, onResolve }: AlertsViewProps) {
  const tableLabels = useTableLabels();
  const tableRef = (r: ServiceRequest) => r.tableName || formatTableRef(r.tableId, tableLabels) || "Table";
  const pending = serviceRequests.filter(r => r.status === "PENDING");
  const resolved = serviceRequests.filter(r => r.status === "RESOLVED").slice(0, 10);

  const typeLabel = (t: string) => {
    switch (t) {
      case "BILL": return "Requested Bill";
      case "WAITER": return "Called Waiter";
      case "ASSISTANCE": return "Needs Assistance";
      default: return t;
    }
  };

  const ago = (d: string) => {
    const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ago`;
  };

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto animate-in fade-in duration-200">
      <button onClick={onBack} className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Home
      </button>
      <h1 className="text-xl font-bold mb-4 flex items-center gap-2">
        Alerts
        {pending.length > 0 && (
          <span className="h-6 min-w-6 px-1.5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
            {pending.length}
          </span>
        )}
      </h1>

      {pending.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <CheckCircle className="h-10 w-10 mx-auto mb-3 text-emerald-500 opacity-60" />
          <p className="font-medium">All clear!</p>
          <p className="text-sm mt-1">No pending requests from customers.</p>
        </div>
      )}

      <div className="space-y-3">
        {pending.map(r => (
          <div key={r.id} className="p-4 rounded-xl border-2 border-red-500/30 bg-red-50/30 dark:bg-red-950/10 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-red-500 animate-pulse" />
                  <span className="font-bold">{tableRef(r)}</span>
                </div>
                <p className="text-sm text-foreground mt-1">{typeLabel(r.type)}</p>
                {r.notes && <p className="text-xs text-muted-foreground mt-0.5 italic">"{r.notes}"</p>}
              </div>
              <span className="text-xs text-muted-foreground">{ago(r.createdAt)}</span>
            </div>
            <button
              onClick={() => onResolve(r.id)}
              className="w-full h-11 rounded-xl border-2 border-emerald-600 text-emerald-700 dark:text-emerald-400 font-bold text-sm hover:bg-emerald-50 dark:hover:bg-emerald-950/20 active:scale-[0.97] transition-all"
            >
              Resolve
            </button>
          </div>
        ))}
      </div>

      {resolved.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xs font-bold uppercase text-muted-foreground mb-3">Recently Resolved</h2>
          <div className="space-y-2">
            {resolved.map(r => (
              <div key={r.id} className="flex items-center justify-between p-3 rounded-xl border text-sm text-muted-foreground">
                <span>{tableRef(r)} · {typeLabel(r.type)}</span>
                <span className="text-xs">{ago(r.createdAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
