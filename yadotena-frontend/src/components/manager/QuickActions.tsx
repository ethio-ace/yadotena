"use client";

import Link from "next/link";
import { Plus, Coffee, ShoppingBag, Receipt, ShieldCheck, EyeOff } from "lucide-react";

export function QuickActions() {
  const actions = [
    {
      label: "Add Menu Item",
      desc: "Prepared café food & drinks",
      href: "/dashboard/menu",
      icon: Coffee,
      chip: "text-amber-600 dark:text-amber-400 bg-amber-500/10",
    },
    {
      label: "Add Retail Product",
      desc: "Beans, powder & shop items",
      href: "/dashboard/menu",
      icon: ShoppingBag,
      chip: "text-blue-600 dark:text-blue-400 bg-blue-500/10",
    },
    {
      label: "Record Expense",
      desc: "Log a daily operational cost",
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
      desc: "Mark items in or out of stock",
      href: "/dashboard/menu",
      icon: EyeOff,
      chip: "text-zinc-600 dark:text-zinc-400 bg-zinc-500/10",
    },
  ];

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-black text-sm uppercase tracking-wider text-foreground">
          Quick Actions
        </h2>
        <span className="text-xs font-bold text-muted-foreground">Frequent tasks</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {actions.map((act) => {
          const Icon = act.icon;
          return (
            <Link
              key={act.label}
              href={act.href}
              className="group p-3.5 rounded-2xl border bg-card flex flex-col justify-between hover:border-primary/40 hover:shadow-md transition-all active:scale-[0.98]"
            >
              <div className="flex items-center justify-between mb-3">
                <span className={`p-2 rounded-xl ${act.chip}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <Plus className="h-3.5 w-3.5 text-muted-foreground opacity-60 group-hover:opacity-100 transition-opacity" />
              </div>
              <div>
                <h3 className="font-black text-xs uppercase tracking-tight leading-snug text-foreground">
                  {act.label}
                </h3>
                <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{act.desc}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
