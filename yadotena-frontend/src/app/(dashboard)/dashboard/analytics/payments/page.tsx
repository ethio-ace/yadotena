"use client";

import { useState, useEffect } from "react";
import { analytics, PeriodPreset, PaymentAnalytics } from "@/services/analytics";
import { AnalyticsToolbar } from "@/components/analytics/AnalyticsToolbar";
import { formatETB } from "@/lib/currency";
import { CreditCard, Banknote, Smartphone, Building2 } from "lucide-react";

const METHOD_ICONS: Record<string, React.ReactNode> = {
  cash: <Banknote className="h-4 w-4 text-emerald-500" />,
  cbe_birr: <Smartphone className="h-4 w-4 text-purple-500" />,
  telebirr: <Smartphone className="h-4 w-4 text-sky-500" />,
  cbe: <Building2 className="h-4 w-4 text-purple-600" />,
  boa: <CreditCard className="h-4 w-4 text-amber-500" />,
  bank: <CreditCard className="h-4 w-4 text-amber-500" />,
};

export default function PaymentsAnalyticsPage() {
  const [period, setPeriod] = useState<PeriodPreset>("today");
  const [data, setData] = useState<PaymentAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    analytics.payments(period)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [period]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black">Payment Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">Collection status, payment methods, and transaction breakdown</p>
      </div>

      <AnalyticsToolbar period={period} onPeriodChange={setPeriod} />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 bg-muted/40 border rounded-xl animate-pulse" />
          ))}
        </div>
      ) : data ? (
        <>
          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border bg-card shadow-sm">
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Collected</span>
              <p className="text-2xl font-black mt-1 text-emerald-600 dark:text-emerald-400">{formatETB(data.collected)}</p>
            </div>
            <div className="p-4 rounded-xl border bg-card shadow-sm">
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Outstanding</span>
              <p className="text-2xl font-black mt-1 text-amber-600 dark:text-amber-400">{formatETB(data.outstanding)}</p>
            </div>
            <div className="p-4 rounded-xl border bg-card shadow-sm">
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Transactions</span>
              <p className="text-2xl font-black mt-1 text-foreground">{data.paymentCount}</p>
            </div>
            <div className="p-4 rounded-xl border bg-card shadow-sm">
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Avg Payment</span>
              <p className="text-2xl font-black mt-1 text-foreground">{formatETB(data.avgPayment)}</p>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="p-6 rounded-xl border bg-card shadow-sm">
            <h3 className="text-sm font-black mb-4 text-foreground">Payment Methods Breakdown</h3>
            <div className="space-y-4">
              {data.methods.map((method) => (
                <div key={method.method} className="border bg-background/50 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                      {METHOD_ICONS[method.method.toLowerCase()] || <CreditCard className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-wider text-foreground">{method.method.replace(/_/g, " ")}</span>
                        <span className="text-sm font-black text-foreground">{formatETB(method.amount)}</span>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="text-[10px] text-muted-foreground font-semibold">
                          {method.transactions} transaction{method.transactions === 1 ? "" : "s"}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-semibold">
                          {method.share.toFixed(1)}% share
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500/80 rounded-full transition-all"
                      style={{ width: `${method.share}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            {data.methods.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">No payments recorded for this period.</p>
            )}
          </div>

          {/* Collection Status */}
          <div className="p-6 rounded-xl border bg-card shadow-sm">
            <h3 className="text-sm font-black mb-2 text-foreground">Collection Status</h3>
            <div className="flex items-center gap-4">
              <div className="flex-1 h-3.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${data.collected + data.outstanding > 0 ? (data.collected / (data.collected + data.outstanding)) * 100 : 0}%` }}
                />
              </div>
              <span className="text-sm font-black text-foreground">
                {data.collected + data.outstanding > 0
                  ? `${((data.collected / (data.collected + data.outstanding)) * 100).toFixed(0)}%`
                  : "—"}
              </span>
            </div>
            <div className="flex items-center justify-between mt-2 text-xs font-semibold text-muted-foreground">
              <span>{formatETB(data.collected)} collected</span>
              <span>{formatETB(data.outstanding)} outstanding</span>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
