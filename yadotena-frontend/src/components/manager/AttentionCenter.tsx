"use client";

import { CheckCircle2, CreditCard, EyeOff, ClipboardList, BellRing, ArrowRight } from "lucide-react";
import Link from "next/link";

interface AttentionCenterProps {
  unverifiedPaymentsCount: number;
  unavailableItemsCount: number;
  unpaidOrdersCount: number;
  activeServiceCallsCount: number;
}

export function AttentionCenter({
  unverifiedPaymentsCount = 0,
  unavailableItemsCount = 0,
  unpaidOrdersCount = 0,
  activeServiceCallsCount = 0,
}: AttentionCenterProps) {
  const totalAttentionItems =
    unverifiedPaymentsCount +
    unavailableItemsCount +
    unpaidOrdersCount +
    activeServiceCallsCount;

  if (totalAttentionItems === 0) {
    return (
      <section
        id="attention-center"
        className="p-4 rounded-2xl border border-emerald-500/25 bg-emerald-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
      >
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-black text-sm text-emerald-700 dark:text-emerald-400 uppercase tracking-tight">
              All caught up
            </h2>
            <p className="text-xs text-muted-foreground font-medium">
              No action required right now. New items will appear here.
            </p>
          </div>
        </div>
        <span className="shrink-0 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-black border border-emerald-500/20 uppercase tracking-wider">
          ● All systems operational
        </span>
      </section>
    );
  }

  const cards = [
    {
      key: "payments",
      count: unverifiedPaymentsCount,
      title: (n: number) => `${n} digital payment${n === 1 ? "" : "s"} need verification`,
      description: "Review submitted payment references",
      action: "Review",
      href: "/dashboard/payments",
      icon: CreditCard,
      tone: "amber",
    },
    {
      key: "stock",
      count: unavailableItemsCount,
      title: (n: number) => `${n} product${n === 1 ? " is" : "s are"} unavailable`,
      description: "Update availability when stock arrives",
      action: "Manage",
      href: "/dashboard/menu",
      icon: EyeOff,
      tone: "amber",
    },
    {
      key: "unpaid",
      count: unpaidOrdersCount,
      title: (n: number) => `${n} order${n === 1 ? " remains" : "s remain"} unpaid`,
      description: "Open tickets awaiting settlement",
      action: "View",
      href: "/dashboard/orders",
      icon: ClipboardList,
      tone: "amber",
    },
    {
      key: "calls",
      count: activeServiceCallsCount,
      title: (n: number) => `${n} table assistance call${n === 1 ? "" : "s"} active`,
      description: "Guests waiting for a waiter",
      action: "Dispatch",
      href: "/dashboard/tables",
      icon: BellRing,
      tone: "rose",
    },
  ].filter((c) => c.count > 0);

  return (
    <section id="attention-center" className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-black text-sm uppercase tracking-wider text-foreground">
          Needs attention ({totalAttentionItems})
        </h2>
        <span className="text-xs font-bold text-muted-foreground">Action required</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {cards.map((card) => {
          const Icon = card.icon;
          const isRose = card.tone === "rose";
          return (
            <div
              key={card.key}
              className={`p-4 rounded-2xl border flex items-center justify-between gap-3 shadow-xs ${
                isRose
                  ? "border-rose-500/25 bg-rose-500/5"
                  : "border-amber-500/25 bg-amber-500/5"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 font-bold ${
                    isRose
                      ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                      : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm text-foreground leading-snug">
                    {card.title(card.count)}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{card.description}</p>
                </div>
              </div>
              <Link href={card.href}>
                <button
                  className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 border transition-all active:scale-95 ${
                    isRose
                      ? "bg-rose-600 hover:bg-rose-700 text-white border-rose-600"
                      : "bg-amber-500 hover:bg-amber-600 text-zinc-950 border-amber-500"
                  }`}
                >
                  <span>{card.action}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}
