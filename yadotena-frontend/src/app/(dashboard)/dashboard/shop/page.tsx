"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import type { Order } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState, ErrorState } from "@/components/ui/empty-state";
import { formatETB } from "@/lib/currency";
import { useStaffRealtime, ssePollInterval } from "@/lib/realtime";
import { orderTypeLabel } from "@/lib/order-type-label";
import Link from "next/link";

function isShop(o: Order) {
  return o.type === "SHOP_PICKUP" || o.type === "SHOP_DELIVERY";
}

export default function ShopQueuePage() {
  const { connected } = useStaffRealtime();
  const qc = useQueryClient();
  const [actionError, setActionError] = useState("");
  const { data: orders = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["orders"],
    queryFn: api.orders.getAll,
    refetchInterval: ssePollInterval(connected),
  });

  const patchStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Order["status"] }) =>
      api.orders.updateStatus(id, status),
    onSuccess: () => {
      setActionError("");
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (err: Error) => {
      setActionError(err.message || "Could not update shop order");
    },
  });

  const shopOrders = orders.filter(
    (o) =>
      isShop(o) &&
      o.status !== "COMPLETED" &&
      o.status !== "CANCELLED",
  );

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Shop queue</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Retail orders to pack. Kitchen never sees these. Confirm payment on{" "}
          <Link href="/dashboard/payments" className="underline font-semibold">
            Payments
          </Link>{" "}
          when needed.
        </p>
      </div>

      {actionError ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {actionError}
        </div>
      ) : null}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : isError ? (
        <ErrorState
          title="Could not load shop orders"
          description="Check your connection and try again."
          onRetry={() => refetch()}
        />
      ) : shopOrders.length === 0 ? (
        <EmptyState
          title="No open shop orders"
          description="Guest retail pickups and deliveries will appear here."
        />
      ) : (
        <ul className="space-y-3">
          {shopOrders.map((o) => (
            <li key={o.id} className="rounded-2xl border p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-bold">
                    #{o.id.slice(-6).toUpperCase()} · {o.customerName}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {orderTypeLabel(o.type)} · {o.customerPhone}
                    {o.deliveryAddress ? ` · ${o.deliveryAddress}` : ""}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Badge variant="secondary">{o.status}</Badge>
                  <Badge
                    variant={
                      o.paymentStatus === "PAID" ? "success" : "warning"
                    }
                  >
                    {o.paymentStatus}
                  </Badge>
                </div>
              </div>
              <ul className="text-sm text-muted-foreground">
                {o.items.map((i) => (
                  <li key={i.id}>
                    {i.quantity}× {i.name}
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-black text-primary">{formatETB(o.total)}</span>
                <div className="flex gap-2">
                  {o.status !== "READY" && (
                    <Button
                      size="sm"
                      variant="outline"
                      type="button"
                      disabled={patchStatus.isPending}
                      onClick={() =>
                        patchStatus.mutate({ id: o.id, status: "READY" })
                      }
                    >
                      Mark ready
                    </Button>
                  )}
                  <Button
                    size="sm"
                    type="button"
                    disabled={
                      patchStatus.isPending || o.paymentStatus !== "PAID"
                    }
                    title={
                      o.paymentStatus !== "PAID"
                        ? "Payment must be PAID before complete"
                        : undefined
                    }
                    onClick={() =>
                      patchStatus.mutate({ id: o.id, status: "COMPLETED" })
                    }
                  >
                    Complete
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
