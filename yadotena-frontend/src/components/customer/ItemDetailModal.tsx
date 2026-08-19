"use client";

import { useState, useEffect } from "react";
import { MenuItem, MenuItemAddon } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatETB } from "@/lib/currency";
import { isShopProductItem } from "@/lib/orderUtils";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { useCustomerDineIn, SelectedAddon } from "@/contexts/CustomerDineInContext";
import { X, Flame, Sparkles, Clock, PackageCheck, Plus, Minus, Check, Utensils, ShoppingBag } from "lucide-react";

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
  const { tableId, addToCart, setIsTablePickerOpen, setIsCartOpen } = useCustomerDineIn();

  const [quantity, setQuantity] = useState(1);
  const [selectedAddons, setSelectedAddons] = useState<SelectedAddon[]>([]);
  const [selectedSpice, setSelectedSpice] = useState<string>("Mild");
  const [note, setNote] = useState("");

  // Reset local selection when modal opens/changes item
  useEffect(() => {
    if (isOpen) {
      setQuantity(1);
      setSelectedAddons([]);
      setSelectedSpice("Mild");
      setNote("");
    }
  }, [isOpen, item]);

  // Fetch the full set of add-ons that apply to this dish (global + category + item scoped).
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

  const toggleAddon = (addon: MenuItemAddon) => {
    const id = addon.id || addon.name;
    const exists = selectedAddons.some((a) => a.id === id);
    if (exists) {
      setSelectedAddons(selectedAddons.filter((a) => a.id !== id));
    } else {
      setSelectedAddons([...selectedAddons, { id, name: addon.name, price: addon.price || 0 }]);
    }
  };

  const addonsTotal = selectedAddons.reduce((sum, a) => sum + a.price, 0);
  const unitPrice = item.price + addonsTotal;
  const grandTotal = unitPrice * quantity;

  const handleAddToCart = () => {
    const combinedInstructions = isShopItem
      ? note.trim()
      : [selectedSpice ? `Spice: ${selectedSpice}` : "", note.trim()].filter(Boolean).join(" · ");

    addToCart(item, quantity, selectedAddons, combinedInstructions);
    onClose();
    setIsCartOpen(true);
    if (!tableId) {
      setIsTablePickerOpen(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-card border rounded-3xl shadow-2xl overflow-hidden z-10 max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">

        {/* Header Image */}
        <div className="relative h-56 md:h-64 w-full bg-muted flex-shrink-0">
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
            <Badge variant="default" className="bg-primary text-primary-foreground font-bold px-3 py-1 text-xs shadow-md">
              {item.category || (isShopItem ? "Packaged Retail" : "Cooked Dish")}
            </Badge>
            {!isShopItem && (
              <div className="flex items-center gap-1.5 bg-background/80 backdrop-blur-md px-3 py-1 rounded-full text-xs font-medium text-muted-foreground shadow-sm">
                <Clock className="h-3.5 w-3.5 text-primary" />
                <span>{item.preparationTime || 15} min prep</span>
              </div>
            )}
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          <div>
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-2xl font-black tracking-tight text-foreground">{item.name}</h2>
              <span className="text-2xl font-black text-primary">{formatETB(item.price)}</span>
            </div>
            <p className="text-muted-foreground mt-2 leading-relaxed text-sm">
              {item.description || "Freshly prepared artisanal dish."}
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

          {/* Options & Customization */}
          {isShopItem ? (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-extrabold text-sm">
                  <PackageCheck className="h-4 w-4" />
                  <span>Sealed Over-The-Counter Retail Item</span>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  Authentic packaged retail product. You can add this item to your table order for counter collection or take-home.
                </p>
              </div>

              {/* Special Instructions Note */}
              <div className="space-y-2">
                <label className="font-extrabold text-sm text-foreground block">
                  Optional Request / Packaging Note
                </label>
                <Input
                  placeholder="e.g. Extra gift wrap, double bag..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="rounded-2xl h-11 text-xs bg-muted/20"
                />
              </div>

              {/* Quantity Stepper */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 border">
                <span className="font-extrabold text-sm text-foreground">Quantity</span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="h-9 w-9 rounded-xl bg-card border flex items-center justify-center hover:bg-muted font-bold text-foreground transition-colors"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="font-black text-base w-6 text-center">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity(quantity + 1)}
                    className="h-9 w-9 rounded-xl bg-card border flex items-center justify-center hover:bg-muted font-bold text-foreground transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Spice Level Selector */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Flame className="h-4 w-4 text-orange-500" />
                  <h3 className="font-extrabold text-sm text-foreground">Select Spice Level</h3>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {SPICE_LEVELS.map((level) => {
                    const isSelected = selectedSpice === level.label;
                    return (
                      <button
                        key={level.label}
                        type="button"
                        onClick={() => setSelectedSpice(level.label)}
                        className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-bold transition-all ${
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary shadow-md scale-105"
                            : "bg-card border-muted text-muted-foreground hover:text-foreground hover:border-primary/40"
                        }`}
                      >
                        <span className="text-base mb-1">{level.icon}</span>
                        {level.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Add-ons Selector */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <h3 className="font-extrabold text-sm text-foreground">Customize Add-ons</h3>
                </div>
                {mergedAddons.length > 0 ? (
                  <div className="space-y-2">
                    {mergedAddons.map((addon) => {
                      const id = addon.id || addon.name;
                      const isSelected = selectedAddons.some((a) => a.id === id);
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => toggleAddon(addon)}
                          className={`w-full flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all ${
                            isSelected
                              ? "bg-primary/10 border-primary text-foreground shadow-sm"
                              : "bg-card border-muted hover:border-primary/30"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`h-5 w-5 rounded-lg border flex items-center justify-center transition-colors ${
                              isSelected ? "bg-primary text-primary-foreground border-primary" : "border-muted-foreground/40 bg-card"
                            }`}>
                              {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                            </div>
                            <span className="text-sm font-bold">{addon.name}</span>
                          </div>
                          <span className="text-sm font-black text-primary">
                            +{formatETB(addon.price)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground bg-muted/40 border border-dashed rounded-2xl p-3.5">
                    No custom add-ons available for this dish.
                  </p>
                )}
              </div>

              {/* Special Instructions Note */}
              <div className="space-y-2">
                <label className="font-extrabold text-sm text-foreground block">
                  Special Kitchen Request
                </label>
                <Input
                  placeholder="e.g. Extra sauce, no onions, well done..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="rounded-2xl h-11 text-xs bg-muted/20"
                />
              </div>

              {/* Quantity Stepper */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 border">
                <span className="font-extrabold text-sm text-foreground">Quantity</span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="h-9 w-9 rounded-xl bg-card border flex items-center justify-center hover:bg-muted font-bold text-foreground transition-colors"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="font-black text-base w-6 text-center">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity(quantity + 1)}
                    className="h-9 w-9 rounded-xl bg-card border flex items-center justify-center hover:bg-muted font-bold text-foreground transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Order Button */}
        <div className="p-4 border-t bg-muted/20">
          <Button
            onClick={handleAddToCart}
            className="w-full rounded-2xl font-black h-13 shadow-xl shadow-primary/25 text-base flex items-center justify-center gap-2"
          >
            {isShopItem ? <ShoppingBag className="h-5 w-5" /> : <Utensils className="h-5 w-5" />}
            <span>Add to Cart · {formatETB(grandTotal)}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
