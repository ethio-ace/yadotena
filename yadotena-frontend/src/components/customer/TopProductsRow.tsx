"use client";

import { MenuItem } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Flame, TrendingUp } from "lucide-react";
import { formatETB } from "@/lib/currency";
import { getImageUrl } from "@/lib/utils";

interface TopProductsRowProps {
  items: (MenuItem & { orderCount?: number })[];
  title?: string;
  subtitle?: string;
  onSelect: (item: MenuItem) => void;
}

/** Horizontal "Top Sellers / Most Popular" strip shown on the public menu & shop pages. */
export function TopProductsRow({ items, title = "Top Sellers", subtitle, onSelect }: TopProductsRowProps) {
  if (!items || items.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
          <Flame className="h-4 w-4" />
        </div>
        <div>
          <h2 className="font-black text-base text-foreground leading-none tracking-tight">{title}</h2>
          {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">{subtitle}</p>}
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-none -mx-1 px-1 pt-1">
        {items.map((item, idx) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item)}
            className="group relative flex flex-col w-40 sm:w-44 shrink-0 rounded-2xl border border-muted-foreground/15 bg-card overflow-hidden text-left hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/40 transition-all duration-300"
          >
            <div className="relative h-28 w-full bg-muted overflow-hidden">
              <img
                src={getImageUrl(item.image)}
                alt={item.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <span className="absolute top-2 left-2 h-6 w-6 rounded-full bg-background/90 backdrop-blur-sm border border-border text-[11px] font-black text-primary flex items-center justify-center shadow-sm">
                {idx + 1}
              </span>
              <Badge className="absolute bottom-2 right-2 bg-amber-500/95 text-white font-bold text-[9px] px-2 py-0.5 rounded-full shadow-sm gap-0.5">
                <TrendingUp className="h-2.5 w-2.5" />
                {item.orderCount ? `${item.orderCount} sold` : "Popular"}
              </Badge>
            </div>
            <div className="p-3 flex flex-col gap-1 flex-1">
              <h3 className="font-bold text-xs leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                {item.name}
              </h3>
              <span className="text-primary font-black text-sm mt-auto">{formatETB(item.price)}</span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
