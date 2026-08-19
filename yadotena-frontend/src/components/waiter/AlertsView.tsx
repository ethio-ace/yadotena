"use client";

import { ServiceRequest } from "@/types";
import { ArrowLeft, Bell, BellRing, Check, Table2 } from "lucide-react";

interface AlertsViewProps {
  serviceRequests: ServiceRequest[];
  onBack: () => void;
  onResolve: (id: string, type: string) => void;
  onGoToTable?: (tableId: string) => void;
}

export function AlertsView({ serviceRequests, onBack, onResolve, onGoToTable }: AlertsViewProps) {
  const pending = serviceRequests.filter((r) => r.status === "PENDING");
  const resolved = serviceRequests.filter((r) => r.status !== "PENDING");

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 sm:px-6 pt-4 pb-3 border-b bg-card shrink-0">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Home
          </button>
        </div>

        <div className="flex items-center justify-between">
          <h1 className="text-lg font-black">Alerts</h1>
          {pending.length > 0 && (
            <span className="h-6 min-w-6 px-2 rounded-full bg-red-500 text-white text-xs font-black flex items-center justify-center">
              {pending.length}
            </span>
          )}
        </div>
      </div>

      {/* Pending alerts */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2">
        {pending.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-[10px] font-black uppercase tracking-wider text-red-500">
              Needs Attention ({pending.length})
            </h2>
            {pending.map((req) => (
              <div
                key={req.id}
                onClick={() => req.tableId && onGoToTable?.(req.tableId)}
                className={`p-3.5 rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50/50 dark:bg-red-950/10 ${req.tableId ? "cursor-pointer hover:border-red-400 dark:hover:border-red-500/50 transition-colors" : ""}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {req.type === "BILL" ? (
                        <span className="text-xs font-black text-amber-600 dark:text-amber-400 uppercase">Bill</span>
                      ) : (
                        <span className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase">Waiter</span>
                      )}
                      <span className="text-xs font-bold text-muted-foreground">
                        Table {req.tableId?.replace(/^t/i, "") || "?"}
                      </span>
                    </div>
                    {req.notes && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{req.notes}</p>
                    )}
                    {req.createdAt && (
                      <p className="text-[10px] text-muted-foreground/60 mt-1">
                        {new Date(req.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {req.tableId && onGoToTable && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onGoToTable(req.tableId!); }}
                        className="h-10 px-3 rounded-xl border text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-accent/50 flex items-center gap-1.5 transition-colors"
                      >
                        <Table2 className="h-3.5 w-3.5" />
                        Table
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); onResolve(req.id, req.type); }}
                      className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Resolve
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {pending.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-medium">All clear.</p>
            <p className="text-xs mt-1">No pending customer requests.</p>
          </div>
        )}

        {resolved.length > 0 && (
          <div className="space-y-2 pt-4 border-t">
            <h2 className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              Recently Resolved
            </h2>
            {resolved.slice(0, 10).map((req) => (
              <div
                key={req.id}
                className="p-3 rounded-xl border bg-background/50 opacity-60"
              >
                <div className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span className="text-xs font-bold text-muted-foreground">
                    {req.type === "BILL" ? "Bill" : "Waiter"} · Table {req.tableId?.replace(/^t/i, "") || "?"}
                  </span>
                  {req.createdAt && (
                    <span className="text-[10px] text-muted-foreground/60 ml-auto">
                      {new Date(req.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
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
