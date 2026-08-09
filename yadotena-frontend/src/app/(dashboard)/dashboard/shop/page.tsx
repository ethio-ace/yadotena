"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import type { Order } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatETB } from "@/lib/currency";
import Link from "next/link";

function isShop(o: Order) {
  return o.type === "SHOP_PICKUP" || o.type === "SHOP_DELIVERY";
}

export default function ShopQueuePage() {
  const qc = useQueryClient();
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: api.orders.getAll,
    refetchInterval: 5000,
  });

  const patchStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Order["status"] }) =>
      api.orders.updateStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["orders"] }),
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

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : shopOrders.length === 0 ? (
        <p className="text-sm text-muted-foreground py-12 text-center">
          No open shop orders.
        </p>
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
                    {o.type} · {o.customerPhone}
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
