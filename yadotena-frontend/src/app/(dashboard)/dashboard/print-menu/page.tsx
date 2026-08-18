"use client";

import { useMemo } from "react";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { formatETB } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Printer, ShieldAlert, ChefHat, UtensilsCrossed } from "lucide-react";

export default function PrintableMenuPage() {
  const { data: session } = useSession();
  const role = (session?.user?.role || "").toUpperCase();
  const isOwner = role === "OWNER";

  const { data: menu = [], isLoading } = useQuery({
    queryKey: ["menu"],
    queryFn: api.menu.getAll,
  });
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: api.categories.getAll,
  });
  const { data: addons = [] } = useQuery({
    queryKey: ["addons"],
    queryFn: () => api.addons.getAll(),
  });

  const availableItems = useMemo(() => menu.filter((m) => m.available !== false), [menu]);

  // Group dishes into sections: database categories first (in sort order),
  // then any leftover raw category names, then uncategorized leftovers.
  const sections = useMemo(() => {
    const bucket = new Map<string, typeof availableItems>();
    const put = (key: string, item: (typeof availableItems)[number]) => {
      if (!bucket.has(key)) bucket.set(key, []);
      bucket.get(key)!.push(item);
    };
    for (const item of availableItems) {
      const belongsToDbCat = item.categoryId && categories.some((c) => c.id === item.categoryId);
      put(belongsToDbCat ? `cat:${item.categoryId}` : `name:${item.category || "Uncategorized"}`, item);
    }

    const ordered: { title: string; description?: string; items: typeof availableItems }[] = [];
    for (const cat of categories) {
      const items = bucket.get(`cat:${cat.id}`);
      if (items?.length) {
        ordered.push({ title: cat.name, description: cat.description, items });
        bucket.delete(`cat:${cat.id}`);
      }
    }
    for (const [key, items] of bucket) {
      if (!items.length) continue;
      ordered.push({
        title: key.startsWith("name:") ? key.slice(5) : key.replace(/^cat:/, ""),
        items,
      });
    }
    return ordered;
  }, [availableItems, categories]);

  const activeAddons = useMemo(() => addons.filter((a) => a.isActive !== false), [addons]);

  if (!isOwner) {
    return (
      <div className="space-y-6 animate-in fade-in duration-200 pb-16">
        <div className="max-w-2xl mx-auto rounded-2xl border border-amber-500/30 bg-amber-500/5 shadow-sm p-8 text-center">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h2 className="font-black text-xl text-foreground">Owner Access Required</h2>
          <p className="text-sm text-muted-foreground mt-1.5">
            The printable menu is a brand asset controlled by the business owner. Ask the owner to generate and print it.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-16">
      {/* Screen-only toolbar — hidden when printing */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2">
            <UtensilsCrossed className="h-6 w-6 text-primary" />
            <span>Printable Menu</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            A clean A4 menu sheet for print. Live prices and descriptions from the catalog — regenerate any time.
          </p>
        </div>
        <Button
          onClick={() => window.print()}
          className="rounded-2xl h-11 px-5 text-sm font-black bg-primary text-primary-foreground gap-2 shadow-md shadow-primary/25 hover:scale-[1.02] transition-transform"
        >
          <Printer className="h-4 w-4" />
          Print Menu
        </Button>
      </div>

      {isLoading ? (
        <div className="max-w-3xl mx-auto h-96 bg-muted/40 rounded-2xl animate-pulse" />
      ) : (
        <div className="mx-auto max-w-3xl bg-[#fdfaf3] text-[#241a10] rounded-2xl shadow-xl border border-[#e7dcc8] px-7 py-10 sm:px-14 sm:py-14">
          {/* Masthead */}
          <header className="text-center">
            <div className="flex items-center justify-center gap-3">
              <span className="h-px w-14 bg-[#b9975b]" />
              <ChefHat className="h-6 w-6 text-[#b9975b]" />
              <span className="h-px w-14 bg-[#b9975b]" />
            </div>
            <h1 className="mt-4 font-serif text-4xl sm:text-5xl font-black tracking-[0.18em] uppercase">
              Yadotena
            </h1>
            <p className="mt-1.5 font-serif italic text-lg text-[#7a5c2e]">
              Milk &amp; Foods — Café &amp; Artisan Kitchen
            </p>
            <p className="mt-2 text-[11px] uppercase tracking-[0.3em] text-[#8a6f45] font-bold">
              Bole Road · Addis Ababa
            </p>
            <div className="mt-6 flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[#8a6f45]">
              <span className="h-px flex-1 max-w-40 bg-[#d9c9a8]" />
              <span>Bon Appétit</span>
              <span className="h-px flex-1 max-w-40 bg-[#d9c9a8]" />
            </div>
          </header>

          {/* Menu sections */}
          <div className="mt-10 space-y-10">
            {sections.map((section) => (
              <section key={section.title}>
                <div className="flex items-center gap-4">
                  <h2 className="font-serif text-xl font-bold uppercase tracking-[0.14em] text-[#3d2c14]">
                    {section.title}
                  </h2>
                  <span className="h-px flex-1 bg-[#d9c9a8]" />
                </div>
                {section.description && (
                  <p className="mt-1.5 text-[13px] italic text-[#7a5c2e]">{section.description}</p>
                )}

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                  {section.items.map((item) => (
                    <div key={item.id} className="break-inside-avoid">
                      <div className="flex items-baseline gap-1">
                        <span className="font-bold text-[15px] text-[#241a10] leading-snug">
                          {item.name}
                        </span>
                        <span className="flex-1 border-b border-dotted border-[#b9975b] translate-y-[-3px]" />
                        <span className="font-bold text-[15px] text-[#a85a1f] whitespace-nowrap">
                          {formatETB(item.price)}
                        </span>
                      </div>
                      {item.description && (
                        <p className="mt-0.5 text-[12px] leading-relaxed text-[#6b5636]">
                          {item.description}
                        </p>
                      )}
                      {item.dietaryTags && item.dietaryTags.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {item.dietaryTags.map((tag) => (
                            <span
                              key={tag}
                              className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#8a6f45] border border-[#d9c9a8] rounded-full px-2 py-0.5"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            ))}

            {/* Extras & sides — real add-ons from the catalog */}
            {activeAddons.length > 0 && (
              <section>
                <div className="flex items-center gap-4">
                  <h2 className="font-serif text-xl font-bold uppercase tracking-[0.14em] text-[#3d2c14]">
                    Extras &amp; Sides
                  </h2>
                  <span className="h-px flex-1 bg-[#d9c9a8]" />
                </div>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                  {activeAddons.map((addon) => (
                    <div key={addon.id} className="flex items-baseline gap-1 break-inside-avoid">
                      <span className="text-sm font-semibold text-[#241a10]">{addon.name}</span>
                      <span className="flex-1 border-b border-dotted border-[#b9975b] translate-y-[-3px]" />
                      <span className="text-sm font-bold text-[#a85a1f] whitespace-nowrap">
                        {formatETB(addon.price)}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Footer */}
          <footer className="mt-12 border-t border-[#d9c9a8] pt-5 text-center space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#8a6f45]">
              All prices in Ethiopian Birr · 10% service charge &amp; 15% VAT apply
            </p>
            <p className="text-[11px] italic text-[#8a6f45]">
              We hope you enjoy your meal — mesgana, thank you!
            </p>
          </footer>
        </div>
      )}
    </div>
  );
}
