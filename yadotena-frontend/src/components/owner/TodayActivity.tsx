"use client";

import Link from "next/link";
import { ScrollText, ChevronRight } from "lucide-react";
import { format } from "date-fns";

export interface ActivityLogItem {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  entityType: string;
  entityId: string;
  description: string;
  prevState?: unknown;
  nextState?: unknown;
  ipAddress?: string;
  createdAt: string;
}

interface TodayActivityProps {
  logs: ActivityLogItem[];
}

/**
 * The owner's window into what actually happened — recent audit events from
 * the backend. Read-only by design (spec §30): no edit/delete controls.
 */
export function TodayActivity({ logs }: TodayActivityProps) {
  if (logs.length === 0) {
    return (
      <div className="bg-card border rounded-2xl p-5 shadow-sm">
        <h3 className="font-black text-sm text-foreground">Recent Activity</h3>
        <p className="text-xs text-muted-foreground mt-3">No activity recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-card border rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-black text-sm text-foreground">Recent Activity</h3>
          <p className="text-[11px] text-muted-foreground font-medium">Latest audit events</p>
        </div>
        <Link
          href="/dashboard/logs"
          className="flex items-center gap-0.5 text-[11px] font-black text-amber-600 dark:text-amber-400 hover:underline"
        >
          FULL AUDIT LOG <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      <ul className="mt-4 space-y-1">
        {logs.map((log) => (
          <li key={log.id} className="flex items-start gap-3 py-2.5 border-b last:border-0">
            <div className="h-8 w-8 rounded-xl bg-muted/60 border flex items-center justify-center shrink-0 text-muted-foreground">
              <ScrollText className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-foreground truncate">
                {log.description || log.action.replace(/_/g, " ")}
              </p>
              <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">
                {log.userName || "Staff"} · {log.userRole || "—"} ·{" "}
                {format(new Date(log.createdAt), "MMM d, h:mm a")}
              </p>
            </div>
            <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground/60 mt-1 shrink-0">
              {log.action.replace(/_/g, " ")}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
