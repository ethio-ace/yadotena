"use client";

import { useEffect, useState } from "react";
import { ServiceRequest } from "@/types";
import { formatTableRef, useTableLabels } from "@/hooks/useTableLabels";
import { formatWait } from "@/lib/kitchen";
import { BellRing, Check, Receipt, Hand } from "lucide-react";

interface AlertsViewProps {
  serviceRequests: ServiceRequest[];
  resolvingId?: string | null;
  onResolve: (id: string, type: string) => void;
  onGoToTable: (tableId: string) => void;
}

/** Customer table calls: "call waiter" and "bring the bill", oldest first. */
export function AlertsView({ serviceRequests, resolvingId, onResolve, onGoToTable }: AlertsViewProps) {
  const tableLabels = useTableLabels();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const pending = serviceRequests
    .filter((r) => r.status === "PENDING")
    .sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
  const resolved = serviceRequests.filter((r) => r.status !== "PENDING").slice(0, 8);
  const ago = (iso?: string) => {
    const w = formatWait(iso, now);
    return w && w !== "just now" ? `${w} ago` : w;
  };
  const tableName = (id?: string) => (id ? formatTableRef(id, tableLabels) : "Unknown table");

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 sm:px-6 pt-4 pb-3 border-b bg-card shrink-0">
        <h1 className="text-xl font-black">Table calls</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto p-4 sm:p-6 pb-24 md:pb-6 space-y-2.5">
          {pending.map((req) => {
            const isBill = req.type === "BILL";
            return (
              <div key={req.id} className="rounded-2xl border-2 border-red-500/50 bg-red-50/50 dark:bg-red-950/10 p-4">
                <div className="flex items-start gap-3">
                  <span className="h-10 w-10 rounded-xl bg-red-500 text-white flex items-center justify-center shrink-0">
                    {isBill ? <Receipt className="h-5 w-5" /> : <Hand className="h-5 w-5" />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-base leading-tight">{tableName(req.tableId)}</p>
                    <p className="text-sm font-bold text-red-600 dark:text-red-400">{isBill ? "Wants the bill" : "Calling a waiter"}</p>
                    {req.notes && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{req.notes}</p>}
                    <p className="text-[11px] text-muted-foreground mt-1">{ago(req.createdAt)}</p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {req.tableId ? (
                    <button
                      onClick={() => onGoToTable(req.tableId!)}
                      className="h-11 rounded-xl border-2 bg-card text-sm font-bold hover:bg-muted"
                    >
                      Open table
                    </button>
                  ) : <span />}
                  <button
                    onClick={() => onResolve(req.id, req.type)}
                    disabled={resolvingId === req.id}
                    className="h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-black flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all"
                  >
                    <Check className="h-4 w-4" />
                    Done
                  </button>
                </div>
              </div>
            );
          })}

          {pending.length === 0 && (
            <div className="text-center py-14 text-muted-foreground">
              <BellRing className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-bold">No tables are calling.</p>
            </div>
          )}

          {resolved.length > 0 && (
            <div className="pt-4 space-y-1.5">
              <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Handled</p>
              {resolved.map((req) => (
                <div key={req.id} className="flex items-center gap-2 text-sm text-muted-foreground px-1 py-1.5">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span className="font-bold text-foreground/80">{tableName(req.tableId)}</span>
                  <span>· {req.type === "BILL" ? "bill" : "call"}</span>
                  <span className="ml-auto text-xs">{ago(req.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
