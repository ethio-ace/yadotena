"use client";

import { MenuItem } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatETB } from "@/lib/currency";
import { getImageUrl } from "@/lib/utils";
import { 
  X, Clock, Edit, Trash2, CheckCircle2, AlertCircle, 
  Sparkles, Flame, Layers, Utensils
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";

interface DishDetailModalProps {
  item: MenuItem | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (item: MenuItem) => void;
}

export function DishDetailModal({ item, isOpen, onClose, onEdit }: DishDetailModalProps) {
  const queryClient = useQueryClient();

  const toggleAvailability = useMutation({
    mutationFn: (id: string) => api.menu.toggleAvailability(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.menu.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu"] });
      onClose();
    },
  });

  if (!isOpen || !item) return null;

  const handleDelete = () => {
    if (confirm(`Are you sure you want to remove "${item.name}" from the active menu?`)) {
      deleteMutation.mutate(item.id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-card border rounded-3xl shadow-2xl overflow-hidden z-10 max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* Cover Photo */}
        <div className="relative h-60 w-full bg-muted flex-shrink-0">
          <img 
            src={getImageUrl(item.image)} 
            alt={item.name} 
            className="w-full h-full object-cover" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/30 to-transparent" />
          
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
              {item.category}
            </Badge>
            <div className="flex items-center gap-1.5 bg-background/80 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold text-muted-foreground shadow-sm">
              <Clock className="h-3.5 w-3.5 text-primary" />
              <span>{item.preparationTime || 15} min prep</span>
            </div>
          </div>
        </div>

        {/* Details Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black tracking-tight">{item.name}</h2>
              <span className="text-xs text-muted-foreground font-mono">Item ID: #{item.id}</span>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-primary block">{formatETB(item.price)}</span>
              <Badge variant={item.available ? "success" : "secondary"} className="mt-1 font-bold">
                {item.available ? "In Stock" : "Unavailable"}
              </Badge>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Description</h3>
            <p className="text-sm text-foreground/90 leading-relaxed bg-muted/30 p-3.5 rounded-2xl border">
              {item.description}
            </p>
          </div>

          {/* Dietary & Highlights */}
          {item.dietaryTags && item.dietaryTags.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Dietary Attributes</h3>
              <div className="flex flex-wrap gap-1.5">
                {item.dietaryTags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="bg-primary/10 text-primary border border-primary/20 font-bold px-3 py-1">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Configured Add-ons */}
          {item.customAddons && item.customAddons.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Available Add-ons</h3>
              <div className="divide-y rounded-2xl border bg-muted/20 overflow-hidden">
                {item.customAddons.map((addon) => (
                  <div key={addon.id} className="p-3 flex items-center justify-between text-xs">
                    <span className="font-semibold">{addon.name}</span>
                    <span className="font-bold text-primary">+{formatETB(addon.price)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Toggle Status */}
          <div 
            onClick={() => toggleAvailability.mutate(item.id)}
            className="p-3.5 rounded-2xl border bg-card hover:bg-muted/40 cursor-pointer flex items-center justify-between transition-colors shadow-sm"
          >
            <div className="flex items-center gap-3">
              {item.available ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
              ) : (
                <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
              )}
              <div>
                <span className="text-xs font-bold block">
                  {item.available ? "Dish is currently Active" : "Dish is currently Disabled"}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Click to {item.available ? "mark as Sold Out / Out of Stock" : "restore to Active Menu"}
                </span>
              </div>
            </div>
            <Button size="sm" variant="outline" className="rounded-xl text-xs font-bold pointer-events-none">
              Toggle
            </Button>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t bg-muted/30 flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:bg-destructive/10 rounded-xl font-bold gap-1.5"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="h-4 w-4" />
            <span>Delete Dish</span>
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="rounded-xl font-bold"
              onClick={onClose}
            >
              Close
            </Button>
            <Button
              className="rounded-xl font-bold gap-1.5 shadow-md"
              onClick={() => {
                onClose();
                onEdit(item);
              }}
            >
              <Edit className="h-4 w-4" />
              <span>Edit Dish</span>
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}
