"use client";

import { useState, useEffect } from "react";
import { MenuItem } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatETB } from "@/lib/currency";
import { X, Plus, Minus, Flame, Sparkles, Clock, Check } from "lucide-react";

interface ItemDetailModalProps {
  item: MenuItem | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (customItem: {
    menuItemId: string;
    name: string;
    price: number;
    quantity: number;
    specialInstructions?: string;
  }) => void;
}

const SPICE_LEVELS = [
  { label: "Mild", icon: "🌱" },
  { label: "Medium", icon: "🌶️" },
  { label: "Spicy", icon: "🔥" },
  { label: "Extra Hot", icon: "⚡" },
];

const DEFAULT_ADDONS = [
  { id: "cheese", name: "Extra Melted Cheese", price: 60 },
  { id: "truffle", name: "Truffle Aioli Dip", price: 80 },
  { id: "avocado", name: "Fresh Avocado Slices", price: 70 },
  { id: "beef_strips", name: "Crispy Beef Strips", price: 100 },
];

export function ItemDetailModal({ item, isOpen, onClose, onAddToCart }: ItemDetailModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [selectedSpice, setSelectedSpice] = useState("Medium");
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  const availableAddons = item?.customAddons && item.customAddons.length > 0 
    ? item.customAddons 
    : DEFAULT_ADDONS;

  useEffect(() => {
    if (isOpen) {
      setQuantity(1);
      setSelectedSpice("Medium");
      setSelectedAddons([]);
      setNotes("");
    }
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

  const toggleAddon = (id: string) => {
    setSelectedAddons(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const addonsTotal = selectedAddons.reduce((sum, id) => {
    const addon = availableAddons.find(a => a.id === id);
    return sum + (addon ? addon.price : 0);
  }, 0);

  const unitPrice = item.price + addonsTotal;
  const totalPrice = unitPrice * quantity;

  const handleAdd = () => {
    const addonNames = selectedAddons
      .map(id => availableAddons.find(a => a.id === id)?.name)
      .filter(Boolean);

    const instructions = [
      `Spice: ${selectedSpice}`,
      addonNames.length > 0 ? `Addons: ${addonNames.join(", ")}` : null,
      notes.trim() ? `Note: ${notes.trim()}` : null,
    ].filter(Boolean).join(" | ");

    onAddToCart({
      menuItemId: item.id,
      name: item.name,
      price: unitPrice,
      quantity,
      specialInstructions: instructions || undefined,
    });
    onClose();
  };

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
            src={item.image} 
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
              {item.category}
            </Badge>
            <div className="flex items-center gap-1.5 bg-background/80 backdrop-blur-md px-3 py-1 rounded-full text-xs font-medium text-muted-foreground shadow-sm">
              <Clock className="h-3.5 w-3.5 text-primary" />
              <span>15-20 min prep</span>
            </div>
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
              {item.description}
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

          {/* Spice Level */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-orange-500" />
              <h3 className="font-semibold text-sm">Spice Level</h3>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {SPICE_LEVELS.map(level => (
                <button
                  key={level.label}
                  type="button"
                  onClick={() => setSelectedSpice(level.label)}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-medium transition-all ${
                    selectedSpice === level.label 
                      ? "border-primary bg-primary/10 text-primary font-bold shadow-sm ring-1 ring-primary"
                      : "border-muted hover:border-muted-foreground/30 bg-card"
                  }`}
                >
                  <span className="text-base mb-1">{level.icon}</span>
                  {level.label}
                </button>
              ))}
            </div>
          </div>

          {/* Add-ons */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-sm">Popular Add-ons</h3>
              </div>
              <span className="text-xs text-muted-foreground">Optional</span>
            </div>
            <div className="space-y-2">
              {availableAddons.map(addon => {
                const isSelected = selectedAddons.includes(addon.id);
                return (
                  <div
                    key={addon.id}
                    onClick={() => toggleAddon(addon.id)}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      isSelected 
                        ? "border-primary bg-primary/5 shadow-sm" 
                        : "border-muted hover:border-muted-foreground/30 bg-card"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`h-5 w-5 rounded-md border flex items-center justify-center transition-colors ${
                        isSelected ? "bg-primary border-primary text-white" : "border-muted-foreground/30"
                      }`}>
                        {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                      </div>
                      <span className="text-sm font-medium">{addon.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-primary">+{formatETB(addon.price)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Special Instructions */}
          <div className="space-y-2">
            <label className="text-sm font-semibold">Special Instructions for Chef</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Dressing on the side, no onions, extra crispy..."
              rows={2}
              className="w-full rounded-2xl border border-muted bg-background/50 p-3.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-none"
            />
          </div>
        </div>

        {/* Footer CTA */}
        <div className="p-4 border-t bg-card/80 backdrop-blur-md flex items-center gap-4">
          <div className="flex items-center gap-3 bg-muted/60 rounded-full p-1.5 border">
            <Button
              size="icon"
              variant="ghost"
              className="h-9 w-9 rounded-full bg-background shadow-sm hover:bg-background/80"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="font-bold text-base w-6 text-center">{quantity}</span>
            <Button
              size="icon"
              variant="ghost"
              className="h-9 w-9 rounded-full bg-background shadow-sm hover:bg-background/80"
              onClick={() => setQuantity(quantity + 1)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <Button
            className="flex-1 h-12 rounded-full font-bold shadow-lg shadow-primary/25 text-base"
            onClick={handleAdd}
          >
            Add to Order • {formatETB(totalPrice)}
          </Button>
        </div>

      </div>
    </div>
  );
}
