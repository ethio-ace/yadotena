"use client";

import { useState, useEffect } from "react";
import { MenuItem } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatETB } from "@/lib/currency";
import { X, Plus, Minus, Clock } from "lucide-react";

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

export function ItemDetailModal({ item, isOpen, onClose, onAddToCart }: ItemDetailModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (isOpen) {
      setQuantity(1);
      setNotes("");
    }
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

  const totalPrice = item.price * quantity;

  const handleAdd = () => {
    onAddToCart({
      menuItemId: item.id,
      name: item.name,
      price: item.price,
      quantity,
      specialInstructions: notes.trim() || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-card border rounded-3xl shadow-2xl overflow-hidden z-10 max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
        <div className="relative h-64 w-full bg-muted flex-shrink-0">
          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
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
            {item.preparationTime ? (
              <Badge variant="secondary" className="bg-background/80 backdrop-blur-md font-medium gap-1">
                <Clock className="h-3 w-3" /> {item.preparationTime} min
              </Badge>
            ) : null}
          </div>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          <div>
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-2xl font-bold tracking-tight">{item.name}</h2>
              <span className="text-2xl font-black text-primary">{formatETB(item.price)}</span>
            </div>
            <p className="text-muted-foreground mt-2 leading-relaxed text-sm">{item.description}</p>
          </div>

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

        <div className="p-4 border-t bg-card/80 backdrop-blur-md flex items-center gap-4">
          <div className="flex items-center gap-3 bg-muted/60 rounded-full p-1.5 border">
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 rounded-full"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="w-6 text-center font-bold">{quantity}</span>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 rounded-full"
              onClick={() => setQuantity((q) => q + 1)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <Button className="flex-1 h-12 rounded-full font-bold text-base" onClick={handleAdd}>
            Add · {formatETB(totalPrice)}
          </Button>
        </div>
      </div>
    </div>
  );
}
