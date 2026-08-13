"use client";

import { ActivityLogsViewer } from "@/components/dashboard/ActivityLogsViewer";
import { Badge } from "@/components/ui/badge";
import { Activity } from "lucide-react";

export default function LogsPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-16">
      <div className="bg-card border p-5 rounded-2xl shadow-sm flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2">
              <Activity className="h-6 w-6 text-primary" />
              <span>Shift Operations Audit Logs</span>
            </h2>
            <Badge className="bg-primary text-primary-foreground font-black text-xs px-2.5 py-0.5">
              Live Audit Stream
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Realtime audit log tracking waiter orders, kitchen preparation status changes, cashier settlements, and manager actions.
          </p>
        </div>
      </div>

      <ActivityLogsViewer
        title="Manager Activity Audit Stream"
        description="Detailed diff inspection for all store transactions, table status updates, and staff actions."
        allowedRoles={["WAITER", "KITCHEN", "CASHIER", "MANAGER", "OWNER"]}
        isOwnerView={true}
      />
    </div>
  );
}
