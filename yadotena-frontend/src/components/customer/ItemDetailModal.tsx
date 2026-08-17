"use client";

import { MenuItem, MenuItemAddon } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatETB } from "@/lib/currency";
import { isShopProductItem } from "@/lib/orderUtils";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { X, Flame, Sparkles, Clock, PackageCheck, Lock } from "lucide-react";

interface ItemDetailModalProps {
  item: MenuItem | null;
  isOpen: boolean;
  onClose: () => void;
}

const SPICE_LEVELS = [
  { label: "Mild", icon: "🌱" },
  { label: "Medium", icon: "🌶️" },
  { label: "Spicy", icon: "🔥" },
  { label: "Extra Hot", icon: "⚡" },
];

export function ItemDetailModal({ item, isOpen, onClose }: ItemDetailModalProps) {
  const isShopItem = isShopProductItem(item);

  // Fetch the full set of add-ons that apply to this dish (global + category + item scoped).
  // Public customers can see them but cannot select them — staff take the order.
  const { data: dbAddons = [] } = useQuery({
    queryKey: ["addons", "respective", item?.id],
    queryFn: () => api.addons.getRespectiveForMenuItem(item!.id),
    enabled: isOpen && !!item && !isShopItem,
  });

  if (!isOpen || !item) return null;

  // Merge inline custom add-ons with DB-scoped add-ons, de-duplicated by id.
  const inlineAddons: MenuItemAddon[] = item.customAddons && item.customAddons.length > 0 ? item.customAddons : [];
  const mergedAddons: MenuItemAddon[] = (() => {
    const seen = new Set<string>();
    const out: MenuItemAddon[] = [];
    const push = (a: { id?: string; name: string; price: number; description?: string }) => {
      if (!a.name) return;
      const key = a.id || a.name.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      out.push({ id: a.id || `addon-${key}`, name: a.name, price: a.price || 0, description: a.description });
    };
    inlineAddons.forEach(push);
    dbAddons.forEach((a) => push(a));
    return out;
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="fixed inset-0"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg bg-card border rounded-3xl shadow-2xl overflow-hidden z-10 max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">

        {/* Header Image */}
        <div className="relative h-64 w-full bg-muted flex-shrink-0">
          <img
            src={item.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80"}
            alt={item.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />

          <Button
            size="icon"
            variant="secondary"
            className="absolute top-4 right-4 rounded-full bg-background/80 backdrop-blur-md shadow-md hover:bg-background h-10 w-10"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>

          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
            <Badge variant="default" className="bg-primary text-primary-foreground font-semibold px-3 py-1 text-xs shadow-md">
              {item.category || (isShopItem ? "Packaged Retail" : "Cooked Dish")}
            </Badge>
            {!isShopItem && (
              <div className="flex items-center gap-1.5 bg-background/80 backdrop-blur-md px-3 py-1 rounded-full text-xs font-medium text-muted-foreground shadow-sm">
                <Clock className="h-3.5 w-3.5 text-primary" />
                <span>{item.preparationTime || 15} min prep time</span>
              </div>
            )}
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          <div>
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-2xl font-bold tracking-tight">{item.name}</h2>
              <span className="text-2xl font-black text-primary">{formatETB(item.price)}</span>
            </div>
            <p className="text-muted-foreground mt-2 leading-relaxed text-sm">
              {item.description || "Artisanal quality product."}
            </p>

            {item.dietaryTags && item.dietaryTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-3">
                {item.dietaryTags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="bg-primary/10 text-primary border border-primary/20 font-bold px-2.5 py-0.5 text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Conditional Options / Addons Display */}
          {isShopItem ? (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-extrabold text-sm">
                <PackageCheck className="h-4 w-4" />
                <span>Sealed Retail Product (No Add-ons)</span>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Over-the-counter packaged product. Sold in original factory-sealed packaging without kitchen add-ons.
              </p>
            </div>
          ) : (
            <>
              {/* Spice Level for Cooked Dishes (view-only) */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Flame className="h-4 w-4 text-orange-500" />
                  <h3 className="font-semibold text-sm">Available Spice Options</h3>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {SPICE_LEVELS.map((level) => (
                    <div
                      key={level.label}
                      className="flex flex-col items-center justify-center p-3 rounded-2xl border border-muted bg-card text-xs font-medium text-muted-foreground select-none"
                    >
                      <span className="text-base mb-1">{level.icon}</span>
                      {level.label}
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground/80 flex items-center gap-1.5">
                  <Lock className="h-3 w-3 shrink-0" />
                  Tell your waiter which spice level you prefer when ordering.
                </p>
              </div>

              {/* Add-ons for Cooked Dishes (view-only) */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-sm">Available Add-ons</h3>
                </div>
                {mergedAddons.length > 0 ? (
                  <div className="space-y-2">
                    {mergedAddons.map((addon) => (
                      <div
                        key={addon.id}
                        className="flex items-center justify-between p-3.5 rounded-2xl border border-muted bg-card select-none"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-5 w-5 rounded-md border border-muted-foreground/30 flex items-center justify-center shrink-0">
                            <Lock className="h-3 w-3 text-muted-foreground/50" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-sm font-medium block truncate">{addon.name}</span>
                            {addon.description && (
                              <span className="text-[11px] text-muted-foreground block truncate">{addon.description}</span>
                            )}
                          </div>
                        </div>
                        <span className="text-sm font-semibold text-primary shrink-0 ml-2">+{formatETB(addon.price)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground bg-muted/40 border border-dashed rounded-2xl p-3.5">
                    No add-ons currently available for this dish.
                  </p>
                )}
                <p className="text-[11px] text-muted-foreground/80 flex items-center gap-1.5">
                  <Lock className="h-3 w-3 shrink-0" />
                  Add-ons can&apos;t be added online — mention them to your waiter.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer Note */}
        <div className="p-3 border-t bg-muted/20 text-center text-xs text-muted-foreground font-medium">
          <span>{isShopItem ? "Available for over-the-counter retail purchase" : "Show selected options to your floor waiter when placing order"}</span>
        </div>
      </div>
    </div>
  );
}
