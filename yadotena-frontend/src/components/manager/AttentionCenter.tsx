"use client";

import { CreditCard, EyeOff, ClipboardList, BellRing, ChevronRight } from "lucide-react";
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
        role="status"
        className="px-4 py-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 flex items-center justify-between gap-3 scroll-mt-24"
        aria-label="Attention status"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 truncate">
            All caught up
          </p>
          <p className="hidden sm:block text-xs text-muted-foreground font-medium truncate">
            · Nothing needs your attention right now.
          </p>
        </div>
        <span className="shrink-0 text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
          ● Operational
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
    <section
      id="attention-center"
      className="space-y-3 scroll-mt-24"
      aria-label="Needs attention"
    >
      <div className="flex items-center justify-between">
        <h2 className="font-black text-sm uppercase tracking-wider text-foreground">
          Needs attention ({totalAttentionItems})
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {cards.map((card) => {
          const Icon = card.icon;
          const isRose = card.tone === "rose";
          return (
            // The whole card is the action — one big touch target during a rush.
            <Link
              key={card.key}
              href={card.href}
              className={`group p-4 rounded-2xl border flex items-center justify-between gap-3 shadow-xs transition active:scale-[0.99] ${
                isRose
                  ? "border-rose-500/25 bg-rose-500/5 hover:border-rose-500/50"
                  : "border-amber-500/25 bg-amber-500/5 hover:border-amber-500/50"
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
              <span
                className={`shrink-0 flex items-center gap-0.5 text-xs font-black transition-transform group-hover:translate-x-0.5 ${
                  isRose ? "text-rose-600 dark:text-rose-400" : "text-amber-600 dark:text-amber-400"
                }`}
              >
                {card.action}
                <ChevronRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
