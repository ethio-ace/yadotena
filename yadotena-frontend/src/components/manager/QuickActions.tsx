"use client";

import Link from "next/link";
import { Plus, Coffee, ShoppingBag, Receipt, ShieldCheck, EyeOff, Layers } from "lucide-react";

interface QuickActionsProps {
  onAction?: (action: string) => void;
}

export function QuickActions({ onAction }: QuickActionsProps) {
  const actions = [
    {
      label: "+ ADD MENU ITEM",
      desc: "Prepared cafe food & drinks",
      href: "/dashboard/menu?action=new-menu",
      icon: Coffee,
      color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/20",
    },
    {
      label: "+ ADD RETAIL PRODUCT",
      desc: "Beans, powder & shop items",
      href: "/dashboard/menu?action=new-retail",
      icon: ShoppingBag,
      color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 hover:bg-blue-500/20",
    },
    {
      label: "+ RECORD EXPENSE",
      desc: "Log daily operational cost",
      href: "/dashboard/expenses?action=new",
      icon: Receipt,
      color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 hover:bg-purple-500/20",
    },
    {
      label: "VERIFY PAYMENTS",
      desc: "Digital transfers review",
      href: "/dashboard/payments",
      icon: ShieldCheck,
      color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20",
    },
    {
      label: "TOGGLE AVAILABILITY",
      desc: "Mark items out of stock",
      href: "/dashboard/menu?view=availability",
      icon: EyeOff,
      color: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20 hover:bg-zinc-500/20",
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-black text-sm uppercase tracking-wider text-foreground">
          QUICK ACTIONS
        </h2>
        <span className="text-xs text-muted-foreground font-medium">Frequent Tasks</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {actions.map((act) => {
          const Icon = act.icon;
          return (
            <Link key={act.label} href={act.href}>
              <div className={`p-3.5 rounded-2xl border transition-all duration-150 h-full flex flex-col justify-between cursor-pointer group active:scale-95 shadow-sm ${act.color}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-xl bg-background border shadow-xs group-hover:scale-110 transition-transform">
                    <Icon className="h-4 w-4" />
                  </div>
                  <Plus className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100" />
                </div>
                <div>
                  <h3 className="font-black text-xs uppercase tracking-tight leading-snug">
                    {act.label}
                  </h3>
                  <p className="text-[10px] opacity-80 mt-0.5 line-clamp-1">
                    {act.desc}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
