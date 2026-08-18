"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { ServiceRequest } from "@/types";
import { soundAlerts } from "@/lib/audioAlerts";
import { NotificationsView } from "@/components/notifications/NotificationsView";

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const { data: serviceRequests = [] } = useQuery<ServiceRequest[]>({
    queryKey: ["serviceRequests"],
    queryFn: api.serviceRequests.getAll,
  });

  const resolveMutation = useMutation({
    mutationFn: api.serviceRequests.resolve,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["serviceRequests"] });
      queryClient.invalidateQueries({ queryKey: ["tables"] });
    },
  });

  return (
    <div className="max-w-3xl mx-auto">
      <NotificationsView
        standalone
        serviceRequests={serviceRequests}
        onResolve={(id) => resolveMutation.mutate(id)}
      />
    </div>
  );
}
