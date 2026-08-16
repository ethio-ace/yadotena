"use client";

import Link from "next/link";
import { Coffee, Receipt, ShieldCheck, EyeOff } from "lucide-react";

export function QuickActions() {
  // Only high-frequency tasks, each pointing at a real destination. Retail
  // products are created from the same menu page as café items, so they are
  // not given a duplicate action.
  const actions = [
    {
      label: "Add Menu Item",
      desc: "Prepared food & drinks",
      href: "/dashboard/menu",
      icon: Coffee,
      chip: "text-amber-600 dark:text-amber-400 bg-amber-500/10",
    },
    {
      label: "Record Expense",
      desc: "Log a daily cost",
      href: "/dashboard/expenses",
      icon: Receipt,
      chip: "text-purple-600 dark:text-purple-400 bg-purple-500/10",
    },
    {
      label: "Verify Payments",
      desc: "Review digital transfers",
      href: "/dashboard/payments",
      icon: ShieldCheck,
      chip: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
    },
    {
      label: "Update Availability",
      desc: "Mark items in / out of stock",
      href: "/dashboard/menu",
      icon: EyeOff,
      chip: "text-zinc-600 dark:text-zinc-400 bg-zinc-500/10",
    },
  ];

  return (
    <section className="space-y-3">
      <h2 className="font-black text-sm uppercase tracking-wider text-foreground">
        Quick Actions
      </h2>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {actions.map((act) => {
          const Icon = act.icon;
          return (
            <Link
              key={act.label}
              href={act.href}
              className="group p-3.5 rounded-2xl border bg-card flex items-center gap-3 hover:border-primary/40 hover:shadow-md transition-all active:scale-[0.98]"
            >
              <span className={`p-2 rounded-xl shrink-0 ${act.chip}`}>
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block font-black text-xs uppercase tracking-tight leading-snug text-foreground">
                  {act.label}
                </span>
                <span className="block text-[10px] text-muted-foreground mt-0.5 truncate">
                  {act.desc}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
