"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { MenuItem } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatETB } from "@/lib/currency";
import { X, Utensils, Image as ImageIcon, Clock, Check, Eye } from "lucide-react";

interface MenuItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemToEdit?: MenuItem | null;
}

const PHOTO_PRESETS = [
  {
    label: "Prime Steak",
    url: "https://images.unsplash.com/photo-1600891964092-4316c288032e?auto=format&fit=crop&w=800&q=80",
  },
  {
    label: "Gourmet Burger",
    url: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80",
  },
  {
    label: "Artisanal Pizza",
    url: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=800&q=80",
  },
  {
    label: "Ethiopian Platter",
    url: "https://images.unsplash.com/photo-1541518763669-27fef04b14ea?auto=format&fit=crop&w=800&q=80",
  },
  {
    label: "Truffle Fries",
    url: "https://images.unsplash.com/photo-1576107232684-1279f390859f?auto=format&fit=crop&w=800&q=80",
  },
  {
    label: "Specialty Coffee",
    url: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=800&q=80",
  },
  {
    label: "Lava Cake Dessert",
    url: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=800&q=80",
  },
  {
    label: "Fresh Salad",
    url: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80",
  },
];

export function MenuItemModal({ isOpen, onClose, itemToEdit }: MenuItemModalProps) {
  const queryClient = useQueryClient();

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: api.categories.getAll,
  });

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Main Course");
  const [price, setPrice] = useState<number | "">("");
  const [prepTime, setPrepTime] = useState<number>(15);
  const [image, setImage] = useState(PHOTO_PRESETS[0].url);
  const [available, setAvailable] = useState(true);

  const [error, setError] = useState("");

  useEffect(() => {
    if (itemToEdit) {
      setName(itemToEdit.name);
      setDescription(itemToEdit.description);
      setCategory(itemToEdit.category);
      setPrice(itemToEdit.price);
      setPrepTime(itemToEdit.preparationTime || 15);
      setImage(itemToEdit.image || PHOTO_PRESETS[0].url);
      setAvailable(itemToEdit.available);
    } else {
      setName("");
      setDescription("");
      setCategory(categories[0]?.name || "Main Course");
      setPrice("");
      setPrepTime(15);
      setImage(PHOTO_PRESETS[0].url);
      setAvailable(true);
    }
    setError("");
  }, [itemToEdit, isOpen, categories]);

  const createMutation = useMutation({
    mutationFn: api.menu.create,
    onSuccess: () => {
      setError("");
      queryClient.invalidateQueries({ queryKey: ["menu"] });
      onClose();
    },
    onError: (err: Error) => setError(err.message || "Could not create dish"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<MenuItem> }) => 
      api.menu.update(id, data),
    onSuccess: () => {
      setError("");
      queryClient.invalidateQueries({ queryKey: ["menu"] });
      onClose();
    },
    onError: (err: Error) => setError(err.message || "Could not update dish"),
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError("Dish title is required");
    if (!price || Number(price) <= 0) return setError("Please specify a valid ETB price");
    if (!description.trim()) return setError("Description is required");

    const payload = {
      name: name.trim(),
      description: description.trim(),
      category: category || "Main Course",
      price: Number(price),
      preparationTime: Number(prepTime) || 15,
      image: image.trim(),
      available,
    };

    if (itemToEdit) {
      updateMutation.mutate({ id: itemToEdit.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative w-full max-w-4xl bg-card border rounded-3xl shadow-2xl overflow-hidden z-10 max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between bg-muted/40">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <Utensils className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold">
                {itemToEdit ? "Edit Dish Details" : "Create New Menu Item"}
              </h2>
              <p className="text-xs text-muted-foreground">
                Set name, category, ETB price, photo, and availability
              </p>
            </div>
          </div>
          <Button size="icon" variant="ghost" className="rounded-full" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content Layout */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Form (7 cols) */}
          <div className="lg:col-span-7 space-y-5">
            
            {/* Dish Name & Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Dish / Item Name *</label>
                <Input
                  placeholder="e.g. Special Tibs Platter"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setError(""); }}
                  className="rounded-xl bg-background"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Category *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm font-medium focus:ring-1 focus:ring-primary outline-none"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.icon} {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Price & Prep Time */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Price (in ETB) *</label>
                <div className="relative">
                  <Input
                    type="number"
                    step="1"
                    placeholder="e.g. 450"
                    value={price}
                    onChange={(e) => { setPrice(e.target.value ? Number(e.target.value) : ""); setError(""); }}
                    className="rounded-xl bg-background pr-12 font-bold"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground pointer-events-none">
                    ETB
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Avg Preparation Time</label>
                <div className="relative">
                  <Input
                    type="number"
                    step="1"
                    placeholder="15"
                    value={prepTime}
                    onChange={(e) => setPrepTime(Number(e.target.value))}
                    className="rounded-xl bg-background pr-14"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                    mins
                  </span>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Description & Ingredients</label>
              <textarea
                rows={2}
                placeholder="Describe flavors, key ingredients, preparation method, and presentation..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-3 rounded-2xl border border-input bg-background text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none"
              />
            </div>

            {/* Photo Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground flex items-center justify-between">
                <span>Select High-Res Dish Photo</span>
                <span className="text-[11px] text-muted-foreground font-normal">Click a preset or enter URL</span>
              </label>

              {/* Presets Grid */}
              <div className="grid grid-cols-4 gap-2">
                {PHOTO_PRESETS.map((preset) => {
                  const isSelected = image === preset.url;
                  return (
                    <div
                      key={preset.label}
                      onClick={() => setImage(preset.url)}
                      className={`relative rounded-xl overflow-hidden cursor-pointer border-2 transition-all aspect-video group ${
                        isSelected ? "border-primary ring-2 ring-primary/40 shadow-sm" : "border-transparent opacity-75 hover:opacity-100"
                      }`}
                    >
                      <img src={preset.url} alt={preset.label} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 flex items-end p-1">
                        <span className="text-[10px] font-bold text-white leading-tight truncate">{preset.label}</span>
                      </div>
                      {isSelected && (
                        <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-0.5">
                          <Check className="h-2.5 w-2.5 stroke-[3]" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <Input
                placeholder="Or paste custom image URL: https://..."
                value={image}
                onChange={(e) => setImage(e.target.value)}
                className="rounded-xl text-xs bg-background mt-2"
              />
            </div>

            {/* Availability Toggle */}
            <div 
              onClick={() => setAvailable(!available)}
              className={`p-3.5 rounded-2xl border cursor-pointer flex items-center justify-between transition-colors ${
                available ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "border-muted bg-card text-muted-foreground"
              }`}
            >
              <div>
                <span className="text-xs font-bold block">{available ? "✓ Dish is In Stock & Available" : "⏳ Currently Unavailable / Sold Out"}</span>
                <span className="text-[11px] text-muted-foreground">Customers can order this dish immediately</span>
              </div>
              <Badge variant={available ? "success" : "secondary"}>
                {available ? "Available" : "Sold Out"}
              </Badge>
            </div>

            {error && <p className="text-xs text-destructive font-bold">{error}</p>}

          </div>

          {/* Right Preview (5 cols) */}
          <div className="lg:col-span-5 bg-muted/20 p-5 rounded-3xl border flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground pb-2 border-b">
                <Eye className="h-4 w-4 text-primary" />
                <span>Customer Menu Live Preview</span>
              </div>

              {/* Preview Card */}
              <div className="mt-4 rounded-3xl border bg-card shadow-lg overflow-hidden flex flex-col">
                <div className="relative h-44 w-full bg-muted">
                  <img 
                    src={image || PHOTO_PRESETS[0].url} 
                    alt="Preview" 
                    className="w-full h-full object-cover" 
                  />
                  <Badge variant="secondary" className="absolute top-3 left-3 bg-background/85 backdrop-blur-md font-bold text-xs">
                    {category || "Main Course"}
                  </Badge>
                  <Badge variant="secondary" className="absolute bottom-3 right-3 bg-background/85 backdrop-blur-md text-[11px] font-semibold flex items-center gap-1">
                    <Clock className="h-3 w-3 text-primary" />
                    {prepTime || 15}m
                  </Badge>
                </div>

                <div className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-bold text-base line-clamp-1">
                      {name || "Untitled Dish"}
                    </h4>
                    <span className="font-black text-primary text-base shrink-0">
                      {formatETB(Number(price) || 0)}
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {description || "Dish description will appear here..."}
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-4">
              <Button
                type="submit"
                disabled={isSaving}
                className="w-full h-12 rounded-2xl font-bold shadow-lg shadow-primary/25 text-sm"
              >
                {isSaving ? "Saving Dish..." : itemToEdit ? "Update Dish Changes" : "Create & Publish Dish"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full rounded-2xl font-semibold"
                onClick={onClose}
              >
                Cancel
              </Button>
            </div>

          </div>

        </form>

      </div>
    </div>
  );
}
