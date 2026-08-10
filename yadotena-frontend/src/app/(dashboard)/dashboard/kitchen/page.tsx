"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/empty-state";
import { Order, OrderStatus } from "@/types";
import { Clock, Flame, Check, UtensilsCrossed, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { soundAlerts } from "@/lib/audioAlerts";
import { useStaffRealtime, ssePollInterval } from "@/lib/realtime";
import { orderTypeLabel } from "@/lib/order-type-label";
import { isKitchenVisible } from "@/lib/kitchen-visible";

export default function KitchenDashboard() {
  const { connected } = useStaffRealtime();
  const queryClient = useQueryClient();
  const { data: orders, isLoading, isError, refetch } = useQuery({
    queryKey: ["orders"],
    queryFn: api.orders.getAll,
    refetchInterval: ssePollInterval(connected),
  });

  const seenIds = useRef<Set<string>>(new Set());
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set());
  const [actionError, setActionError] = useState("");
  const bootstrapped = useRef(false);

  const kitchenOrders = (orders ?? []).filter(isKitchenVisible);

  useEffect(() => {
    if (!orders) return;
    const ids = orders.filter(isKitchenVisible).map((o) => o.id);
    if (!bootstrapped.current) {
      ids.forEach((id) => seenIds.current.add(id));
      bootstrapped.current = true;
      return;
    }
    const fresh = ids.filter((id) => !seenIds.current.has(id));
    if (fresh.length === 0) return;
    fresh.forEach((id) => seenIds.current.add(id));
    setFlashIds((prev) => {
      const next = new Set(prev);
      fresh.forEach((id) => next.add(id));
      return next;
    });
    const t = setTimeout(() => {
      setFlashIds((prev) => {
        const next = new Set(prev);
        fresh.forEach((id) => next.delete(id));
        return next;
      });
    }, 8000);
    return () => clearTimeout(t);
  }, [orders]);

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      api.orders.updateStatus(id, status),
    onSuccess: () => {
      setActionError("");
      soundAlerts.playActionPing();
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (err: Error) => {
      setActionError(err.message || "Could not update kitchen status");
    },
  });

  if (isLoading) {
    return (
      <div className="p-8 text-center text-muted-foreground animate-pulse font-medium">
        Loading kitchen orders...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8 max-w-lg mx-auto">
        <ErrorState
          title="Could not load kitchen queue"
          description="Check your connection and try again."
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const newOrders = kitchenOrders.filter((o) => o.status === "PENDING" || o.status === "CONFIRMED");
  const preparingOrders = kitchenOrders.filter((o) => o.status === "PREPARING");
  const readyOrders = kitchenOrders.filter((o) => o.status === "READY");

  return (
    <div className="h-full flex flex-col space-y-4 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-3xl font-black tracking-tight flex items-center gap-2">
            <UtensilsCrossed className="h-7 w-7 text-primary" />
            <span>Kitchen Display System</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Live via SSE · Shop and unpaid takeaway/delivery stay off this board.
          </p>
        </div>

        {newOrders.length > 0 && (
          <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 px-3 py-1.5 rounded-full text-xs font-bold animate-pulse">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{newOrders.length} New Orders Alerting</span>
          </div>
        )}
      </div>

      {actionError ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {actionError}
        </div>
      ) : null}

      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-hidden min-h-[500px]">
        <div className="flex flex-col bg-rose-500/5 rounded-2xl p-4 overflow-hidden border border-rose-500/20">
          <h3 className="font-extrabold text-base mb-4 flex items-center justify-between text-rose-600 dark:text-rose-400">
            <span className="flex items-center gap-1.5">
              <Flame className="h-4 w-4" />
              <span>New / Needs Prep</span>
            </span>
            <span className="bg-rose-500 text-white px-2.5 py-0.5 rounded-full text-xs font-bold">
              {newOrders.length}
            </span>
          </h3>
          <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
            {newOrders.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground/70 text-xs">
                No new orders waiting. System will chime when an order arrives.
              </div>
            ) : (
              newOrders.map((order) => (
                <KitchenOrderCard
                  key={order.id}
                  order={order}
                  isUrgent
                  isFlash={flashIds.has(order.id)}
                  actionText="Start Preparing"
                  actionVariant="default"
                  onAction={() => updateStatus.mutate({ id: order.id, status: "PREPARING" })}
                  isLoading={updateStatus.isPending}
                />
              ))
            )}
          </div>
        </div>

        <div className="flex flex-col bg-amber-500/5 rounded-2xl p-4 overflow-hidden border border-amber-500/20">
          <h3 className="font-extrabold text-base mb-4 flex items-center justify-between text-amber-600 dark:text-amber-400">
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              <span>Cooking in Progress</span>
            </span>
            <span className="bg-amber-500/20 px-2.5 py-0.5 rounded-full text-xs font-bold">
              {preparingOrders.length}
            </span>
          </h3>
          <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
            {preparingOrders.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground/70 text-xs">
                No dishes currently in preparation.
              </div>
            ) : (
              preparingOrders.map((order) => (
                <KitchenOrderCard
                  key={order.id}
                  order={order}
                  actionText="Mark as Ready to Serve"
                  actionVariant="secondary"
                  onAction={() => updateStatus.mutate({ id: order.id, status: "READY" })}
                  isLoading={updateStatus.isPending}
                />
              ))
            )}
          </div>
        </div>

        <div className="flex flex-col bg-emerald-500/5 rounded-2xl p-4 overflow-hidden border border-emerald-500/20">
          <h3 className="font-extrabold text-base mb-4 flex items-center justify-between text-emerald-600 dark:text-emerald-400">
            <span className="flex items-center gap-1.5">
              <Check className="h-4 w-4" />
              <span>Ready for Waiter Pickup</span>
            </span>
            <span className="bg-emerald-500/20 px-2.5 py-0.5 rounded-full text-xs font-bold">
              {readyOrders.length}
            </span>
          </h3>
          <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
            {readyOrders.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground/70 text-xs">
                No orders waiting on pickup counter.
              </div>
            ) : (
              readyOrders.map((order) => (
                <KitchenOrderCard key={order.id} order={order} hideAction />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function KitchenOrderCard({
  order,
  actionText,
  actionVariant = "secondary",
  onAction,
  isLoading,
  hideAction,
  isUrgent,
  isFlash,
}: {
  order: Order;
  actionText?: string;
  actionVariant?: "default" | "secondary";
  onAction?: () => void;
  isLoading?: boolean;
  hideAction?: boolean;
  isUrgent?: boolean;
  isFlash?: boolean;
}) {
  return (
    <Card
      className={`shadow-sm rounded-2xl transition-all duration-500 ${
        isFlash
          ? "border-2 border-primary ring-2 ring-primary/30 scale-[1.01]"
          : isUrgent
            ? "border-2 border-rose-500/60 shadow-lg shadow-rose-500/10 ring-2 ring-rose-500/10"
            : "border"
      }`}
    >
      <CardHeader className={`p-4 pb-2 border-b rounded-t-2xl ${isUrgent ? "bg-rose-500/10" : "bg-muted/10"}`}>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-base font-black flex items-center gap-1.5">
              <span>#{order.id.slice(-6).toUpperCase()}</span>
              {(isUrgent || isFlash) && (
                <span className="text-[10px] font-extrabold bg-rose-500 text-white px-2 py-0.5 rounded-full">
                  NEW
                </span>
              )}
            </CardTitle>
            <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
              {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
              {order.tableName ? ` · ${order.tableName}` : ""}
              {order.type ? ` · ${orderTypeLabel(order.type)}` : ""}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-2">
        {(order.items || []).map((item) => (
          <div key={item.id || `${item.name}-${item.quantity}`} className="flex justify-between text-sm">
            <span className="font-semibold">
              {item.quantity}× {item.name}
            </span>
          </div>
        ))}
      </CardContent>
      {!hideAction && onAction && actionText ? (
        <CardFooter className="p-3 pt-0">
          <Button
            className="w-full rounded-xl font-bold"
            variant={actionVariant}
            disabled={isLoading}
            onClick={onAction}
          >
            {actionText}
          </Button>
        </CardFooter>
      ) : null}
    </Card>
  );
}
