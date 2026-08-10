"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, ErrorState } from "@/components/ui/empty-state";
import { format } from "date-fns";
import { useStaffRealtime, ssePollInterval } from "@/lib/realtime";

export default function ActivityPage() {
  const { connected } = useStaffRealtime();
  const { data = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["activity"],
    queryFn: api.activity.list,
    refetchInterval: ssePollInterval(connected),
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Activity log</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Recent staff and guest actions (orders, payments, status changes).
        </p>
      </div>

      {isError ? (
        <ErrorState
          title="Could not load activity"
          description="Owner/manager access required."
          onRetry={() => refetch()}
        />
      ) : (
      <Card className="rounded-3xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-bold">Latest events</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-sm text-muted-foreground animate-pulse">Loading…</div>
          ) : data.length === 0 ? (
            <EmptyState
              className="border-0 rounded-none"
              title="No activity yet"
              description="Place an order or update a payment to see entries here."
            />
          ) : (
            <ul className="divide-y">
              {data.map((row) => (
                <li key={row.id} className="px-6 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <div className="min-w-0">
                    <p className="text-sm font-bold">
                      <span className="text-primary">{row.action}</span>
                      <span className="text-muted-foreground font-medium"> · {row.entity_type}</span>
                      {row.entity_id ? (
                        <span className="font-mono text-xs text-muted-foreground">
                          {" "}
                          #{String(row.entity_id).slice(-6)}
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {row.actor_name || "System"}
                    </p>
                  </div>
                  <time className="text-[11px] text-muted-foreground font-mono shrink-0">
                    {format(new Date(row.created_at), "MMM d, yyyy · h:mm a")}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      )}
    </div>
  );
}
