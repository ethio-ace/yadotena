"use client";

import Link from "next/link";
import { EyeOff, ChevronRight } from "lucide-react";
import { MenuItem } from "@/types";

interface StockWatchProps {
  items: MenuItem[];
}

export function StockWatch({ items = [] }: StockWatchProps) {
  return (
    <section aria-label="Stock watch" className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-black text-sm uppercase tracking-wider text-foreground">
          Stock Watch{" "}
          {items.length > 0 && <span className="text-muted-foreground">({items.length})</span>}
        </h2>
        <Link
          href="/dashboard/menu"
          className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
        >
          Manage <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>

      <div className="rounded-2xl border bg-card overflow-hidden divide-y divide-border/60 shadow-xs">
        {items.length === 0 ? (
          <div className="p-4 text-center">
            <EyeOff className="h-5 w-5 mx-auto text-emerald-500 opacity-60" aria-hidden="true" />
            <p className="text-xs font-bold text-muted-foreground mt-1.5">Full catalog available</p>
            <p className="text-[11px] text-muted-foreground/80 mt-0.5">
              No menu items are marked out of stock.
            </p>
          </div>
        ) : (
          items.slice(0, 5).map((item) => (
            <Link
              key={item.id}
              href="/dashboard/menu"
              className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground truncate">{item.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {item.category || "Uncategorized"}
                </p>
              </div>
              <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-black uppercase border bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20">
                Unavailable
              </span>
            </Link>
          ))
        )}
      </div>
    </section>
  );
}
