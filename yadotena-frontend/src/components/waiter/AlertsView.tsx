"use client";

import { ServiceRequest } from "@/types";
import { NotificationsView } from "@/components/notifications/NotificationsView";

interface AlertsViewProps {
  serviceRequests: ServiceRequest[];
  onBack: () => void;
  onResolve: (id: string, type: string) => void;
}

/** Waiter-workspace wrapper around the full notifications experience. */
export function AlertsView({ serviceRequests, onBack, onResolve }: AlertsViewProps) {
  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto animate-in fade-in duration-200">
      <NotificationsView serviceRequests={serviceRequests} onResolve={onResolve} onBack={onBack} />
    </div>
  );
}
