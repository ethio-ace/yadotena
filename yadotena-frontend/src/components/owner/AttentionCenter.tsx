"use client";

import Link from "next/link";
import { OwnerMetrics } from "@/lib/owner";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Receipt, PackageX, ShieldAlert, ChevronRight } from "lucide-react";

interface AttentionCenterProps {
  metrics: OwnerMetrics;
}

export function AttentionCenter({ metrics }: AttentionCenterProps) {
  const { unpaidOrders, outOfStock, pendingVerification } = metrics;

  const items: {
    key: string;
    count: number;
    title: string;
    body: string;
    href: string;
    cta: string;
    icon: typeof Receipt;
  }[] = [
    {
      key: "verification",
      count: pendingVerification,
      title: `${pendingVerification} payment${pendingVerification === 1 ? "" : "s"} need${pendingVerification === 1 ? "s" : ""} verification`,
      body: "Review submitted payment references.",
      href: "/dashboard/payments",
      cta: "REVIEW",
      icon: ShieldAlert,
    },
    {
      key: "stock",
      count: outOfStock,
      title: `${outOfStock} product${outOfStock === 1 ? " is" : "s are"} unavailable`,
      body: "Update availability when stock has arrived.",
      href: "/dashboard/menu",
      cta: "VIEW",
      icon: PackageX,
    },
    {
      key: "unpaid",
      count: unpaidOrders,
      title: `${unpaidOrders} order${unpaidOrders === 1 ? " remains" : "s remain"} unpaid`,
      body: "Open orders still awaiting settlement.",
      href: "/dashboard/orders",
      cta: "VIEW",
      icon: Receipt,
    },
  ];

  const active = items.filter((i) => i.count > 0);

  return (
    <section id="attention-center" aria-label="Needs attention" className="scroll-mt-20">
      {active.length === 0 ? (
        <div className="bg-card border rounded-2xl p-5 shadow-sm flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-black text-sm text-foreground">ALL CAUGHT UP</h2>
            <p className="text-xs text-muted-foreground font-medium">
              No action required for {metrics.range.label.toLowerCase()}.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-wider text-muted-foreground">
              Needs your attention
            </h2>
            <Badge variant="outline" className="text-[10px] font-bold">
              {active.length} item{active.length === 1 ? "" : "s"}
            </Badge>
          </div>
          <div className="grid gap-2 md:grid-cols-3">
            {active.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.key}
                  className="bg-card border rounded-2xl p-4 shadow-sm flex items-start justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-foreground">{item.title}</h3>
                      <p className="text-[11px] text-muted-foreground font-medium mt-0.5">{item.body}</p>
                    </div>
                  </div>
                  <Link
                    href={item.href}
                    className="flex items-center gap-0.5 px-2.5 py-1.5 rounded-lg bg-muted hover:bg-amber-500/10 text-[10px] font-black text-foreground hover:text-amber-600 transition-colors shrink-0"
                  >
                    {item.cta}
                    <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
