"use client";

import { useMemo } from "react";
import { DateRange, formatPaymentMethod } from "@/lib/owner";
import { Order } from "@/types";
import { formatETB } from "@/lib/currency";
import { CreditCard, Smartphone, Banknote, Building2 } from "lucide-react";

interface PaymentRow {
  method: string;
  label: string;
  icon: React.ReactNode;
  transactions: number;
  revenue: number;
  share: number;
}

const METHOD_CONFIG: Record<string, { label: string; icon: React.ReactNode }> = {
  telebirr: { label: "Telebirr", icon: <Smartphone className="h-4 w-4 text-sky-500" /> },
  cbe_birr: { label: "CBE Birr", icon: <Smartphone className="h-4 w-4 text-purple-500" /> },
  cbe: { label: "CBE Bank Transfer", icon: <Building2 className="h-4 w-4 text-purple-600" /> },
  cash: { label: "Cash Payment", icon: <Banknote className="h-4 w-4 text-emerald-500" /> },
  boa: { label: "Bank of Abyssinia", icon: <CreditCard className="h-4 w-4 text-amber-500" /> },
};

function isPaid(o: Order): boolean {
  return o.paymentStatus === "PAID" || o.status === "COMPLETED" || o.status === "SERVED";
}

export function PaymentsReport({ range, orders }: { range: DateRange; orders: Order[] }) {
  const rows = useMemo(() => {
    const filtered = orders.filter(
      (o) => isPaid(o) && o.createdAt >= range.from && o.createdAt <= range.to
    );

    const map = new Map<string, { transactions: number; revenue: number }>();
    let totalRevenue = 0;

    for (const o of filtered) {
      // payment method from payment record or order paymentMethod
      const methodRaw = (o as any).paymentMethod || (o as any).payment_method || "CASH";
      const norm = formatPaymentMethod(methodRaw).toLowerCase();
      const cur = map.get(norm) || { transactions: 0, revenue: 0 };
      cur.transactions += 1;
      cur.revenue += o.total || 0;
      map.set(norm, cur);
      totalRevenue += o.total || 0;
    }

    const result: PaymentRow[] = [];
    map.forEach((data, norm) => {
      const cfg = METHOD_CONFIG[norm] || { label: norm.toUpperCase(), icon: <CreditCard className="h-4 w-4" /> };
      result.push({
        method: norm,
        label: cfg.label,
        icon: cfg.icon,
        transactions: data.transactions,
        revenue: data.revenue,
        share: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0,
      });
    });

    return result.sort((a, b) => b.revenue - a.revenue);
  }, [range, orders]);

  return (
    <div className="bg-card border rounded-2xl p-5 shadow-sm">
      <div>
        <h3 className="font-black text-sm text-foreground flex items-center gap-1.5">
          <CreditCard className="h-4 w-4 text-amber-500" /> Payment Breakdown
        </h3>
        <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
          Distribution of completed payments across payment gateways and cash collections
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="py-14 text-center border border-dashed rounded-2xl mt-4">
          <CreditCard className="h-6 w-6 mx-auto text-muted-foreground opacity-50" />
          <p className="text-xs font-bold text-muted-foreground mt-2">No paid transactions recorded in this period.</p>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {rows.map((r) => (
            <div key={r.method} className="border bg-background/50 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                    {r.icon}
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-foreground">{r.label}</h4>
                    <p className="text-[10px] text-muted-foreground font-semibold">
                      {r.transactions} transaction{r.transactions === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black block">{formatETB(r.revenue)}</span>
                  <span className="text-[10px] text-muted-foreground font-semibold">
                    {r.share.toFixed(1)}% share
                  </span>
                </div>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-amber-500/80 rounded-full transition-all"
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
