"use client";

import { useMemo } from "react";
import { DateRange } from "@/lib/owner";
import { Order } from "@/types";
import { formatETB } from "@/lib/currency";
import { ShoppingBag, UtensilsCrossed, Store } from "lucide-react";

interface OrderTypeRow {
  type: string;
  label: string;
  icon: React.ReactNode;
  orders: number;
  revenue: number;
  avgTicket: number;
  share: number;
}

const TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode }> = {
  DINE_IN: { label: "Dine-in", icon: <UtensilsCrossed className="h-4 w-4" /> },
  TAKEAWAY: { label: "Takeaway", icon: <ShoppingBag className="h-4 w-4" /> },
  DELIVERY: { label: "Delivery", icon: <ShoppingBag className="h-4 w-4" /> },
  SHOP: { label: "Shop / Retail", icon: <Store className="h-4 w-4" /> },
};

function isPaid(o: Order): boolean {
  return o.paymentStatus === "PAID" || o.status === "COMPLETED" || o.status === "SERVED";
}

function classifyOrder(o: Order): string {
  // Shop/retail orders are typically COMPLETED with no table
  if (o.type === "TAKEAWAY" && !o.tableId) return "SHOP";
  return o.type || "DINE_IN";
}

export function OrderTypesReport({ range, orders }: { range: DateRange; orders: Order[] }) {
  const rows = useMemo(() => {      const filtered = orders.filter(
        (o) => isPaid(o) && o.createdAt >= range.from && o.createdAt <= range.to
      );

    const grouped: Record<string, { orders: number; revenue: number }> = {};
    for (const o of filtered) {
      const type = classifyOrder(o);
      if (!grouped[type]) grouped[type] = { orders: 0, revenue: 0 };
      grouped[type].orders += 1;
      grouped[type].revenue += o.total || 0;
    }

    const totalRevenue = Object.values(grouped).reduce((s, g) => s + g.revenue, 0);

    const result: OrderTypeRow[] = Object.entries(grouped)
      .map(([type, data]) => ({
        type,
        label: TYPE_CONFIG[type]?.label || type,
        icon: TYPE_CONFIG[type]?.icon || <ShoppingBag className="h-4 w-4" />,
        orders: data.orders,
        revenue: data.revenue,
        avgTicket: data.orders > 0 ? data.revenue / data.orders : 0,
        share: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    return result;
  }, [range, orders]);

  const maxRevenue = rows.length > 0 ? rows[0].revenue : 0;

  return (
    <div className="bg-card border rounded-2xl p-5 shadow-sm">
      <div>
        <h3 className="font-black text-sm text-foreground flex items-center gap-1.5">
          <Store className="h-4 w-4 text-amber-500" /> Order Types
        </h3>
        <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
          Revenue breakdown by order type — paid orders only
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="py-14 text-center border border-dashed rounded-2xl mt-4">
          <Store className="h-6 w-6 mx-auto text-muted-foreground opacity-50" />
          <p className="text-xs font-bold text-muted-foreground mt-2">No paid orders in this period.</p>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {rows.map((r) => (
            <div key={r.type}>
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-foreground flex items-center gap-1.5">
                  {r.icon}
                  {r.label}
                </span>
                <span className="text-muted-foreground">
                  {r.orders} order{r.orders === 1 ? "" : "s"} · {formatETB(r.revenue)} · avg {formatETB(r.avgTicket)}
                </span>
              </div>
              <div className="mt-1.5 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-amber-500/70 rounded-full transition-all"
                  style={{ width: `${r.share}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
