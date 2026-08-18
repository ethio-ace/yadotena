"use client";

import { useSession } from "next-auth/react";
import { ActivityLogsViewer } from "@/components/dashboard/ActivityLogsViewer";
import { Badge } from "@/components/ui/badge";
import { Activity, ShieldAlert } from "lucide-react";

export default function LogsPage() {
  const { data: session } = useSession();
  const role = (session?.user?.role || "").toUpperCase();
  const isOwner = role === "OWNER";

  // Managers may audit waiters and kitchen staff only — never managers/owners.
  // Owners see the full stream across every role.
  const allowedRoles = isOwner ? ["WAITER", "KITCHEN", "MANAGER", "OWNER"] : ["WAITER", "KITCHEN"];

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
            {isOwner
              ? "Realtime audit log tracking waiter orders, kitchen preparation status changes, payment settlements, manager actions, and owner activity."
              : "Realtime audit log of waiter orders and kitchen preparation activity. Manager and owner actions are only visible to the business owner."}
          </p>
        </div>
      </div>

      {!isOwner && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 flex items-start gap-3">
          <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground font-medium">
            Your view is scoped to <span className="font-black text-foreground">waiters &amp; kitchen staff</span>.
            Full audit visibility (including manager and owner actions) is reserved for the business owner.
          </p>
        </div>
      )}

      <ActivityLogsViewer
        title={isOwner ? "Business-Wide Audit Stream" : "Waiter & Kitchen Activity Stream"}
        description={
          isOwner
            ? "Detailed diff inspection for all store transactions, table status updates, staff actions, and account changes."
            : "Track waiter order punching, table status changes, and kitchen preparation progress with full attribution."
        }
        allowedRoles={allowedRoles}
        isOwnerView={isOwner}
      />
    </div>
  );
}
