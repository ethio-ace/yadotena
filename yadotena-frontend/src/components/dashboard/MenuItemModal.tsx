"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { MenuItem, MenuItemAddon } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatETB } from "@/lib/currency";
import { 
  X, Plus, Trash2, Utensils, Image as ImageIcon, Sparkles, 
  Clock, Flame, Check, HelpCircle, Eye
} from "lucide-react";

interface MenuItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemToEdit?: MenuItem | null;
}



const DIETARY_TAG_OPTIONS = [
  "Chef's Special",
  "Popular",
  "Spicy",
  "Vegetarian",
  "Vegan",
  "Halal",
  "Gluten-Free",
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
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [available, setAvailable] = useState(true);
  const [dietaryTags, setDietaryTags] = useState<string[]>([]);
  const [customAddons, setCustomAddons] = useState<MenuItemAddon[]>([]);

  // Local Addon inputs
  const [newAddonName, setNewAddonName] = useState("");
  const [newAddonPrice, setNewAddonPrice] = useState<number | "">("");

  const [error, setError] = useState("");

  useEffect(() => {
    if (itemToEdit) {
      setName(itemToEdit.name);
      setDescription(itemToEdit.description);
      setCategory(itemToEdit.category);
      setPrice(itemToEdit.price);
      setPrepTime(itemToEdit.preparationTime || 15);
      setImagePreview(itemToEdit.image || "");
      setImage(null);
      setAvailable(itemToEdit.available);
      setDietaryTags(itemToEdit.dietaryTags || []);
      setCustomAddons(itemToEdit.customAddons || []);
    } else {
      setName("");
      setDescription("");
      setCategory(categories[0]?.name || "Main Course");
      setPrice("");
      setPrepTime(15);
      setImagePreview("");
      setImage(null);
      setAvailable(true);
      setDietaryTags([]);
      setCustomAddons([]);
    }
    setError("");
  }, [itemToEdit, isOpen, categories]);

  const createMutation = useMutation({
    mutationFn: api.menu.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu"] });
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormData }) => 
      api.menu.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu"] });
      onClose();
    },
  });

  if (!isOpen) return null;

  const toggleTag = (tag: string) => {
    setDietaryTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleAddAddon = () => {
    if (!newAddonName.trim()) return;
    const addonPriceNum = Number(newAddonPrice) || 0;
    const newAddon: MenuItemAddon = {
      id: `add-${Date.now()}`,
      name: newAddonName.trim(),
      price: addonPriceNum,
    };
    setCustomAddons(prev => [...prev, newAddon]);
    setNewAddonName("");
    setNewAddonPrice("");
  };

  const handleRemoveAddon = (id: string) => {
    setCustomAddons(prev => prev.filter(a => a.id !== id));
  };
  
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError("Dish title is required");
    if (!price || Number(price) <= 0) return setError("Please specify a valid ETB price");

    const formData = new FormData();
    formData.append("name", name.trim());
    formData.append("description", description.trim() || "Artisanal specialty prepared with fresh local ingredients.");
    formData.append("category", category || "Main Course");
    formData.append("price", String(Number(price)));
    formData.append("preparationTime", String(Number(prepTime) || 15));
    formData.append("available", String(available));
    formData.append("dietaryTags", JSON.stringify(dietaryTags));
    formData.append("customAddons", JSON.stringify(customAddons));
    
    if (image) {
      formData.append("image", image);
    }

    if (itemToEdit) {
      updateMutation.mutate({ id: itemToEdit.id, data: formData });
    } else {
      createMutation.mutate(formData);
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
                Set name, category, ETB price, photo, dietary attributes, and customize add-ons
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
                <span className="text-[11px] text-muted-foreground font-normal">Upload or take a photo</span>
              </label>

              <div className="flex items-center gap-4">
                <label className="flex-1 cursor-pointer">
                  <div className="border-2 border-dashed border-input rounded-xl p-6 flex flex-col items-center justify-center bg-muted/20 hover:bg-muted/40 transition-colors">
                    <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" />
                    <span className="text-sm font-bold text-foreground">Click to upload</span>
                    <span className="text-[11px] text-muted-foreground mt-1 text-center">SVG, PNG, JPG or GIF (max. 5MB)</span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                </label>
              </div>
            </div>

            {/* Dietary Tags Multi-Select */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Dietary & Highlight Tags</label>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {DIETARY_TAG_OPTIONS.map((tag) => {
                  const isSelected = dietaryTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary shadow-sm"
                          : "bg-background border-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {isSelected && "✓ "}
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Addons Builder */}
            <div className="space-y-2 pt-2 border-t">
              <label className="text-xs font-bold text-foreground flex items-center justify-between">
                <span>Custom Add-ons (Optional)</span>
                <span className="text-[11px] text-muted-foreground font-normal">Customer selectable extras</span>
              </label>

              {/* Existing Addons */}
              <div className="space-y-1.5">
                {customAddons.map((addon) => (
                  <div key={addon.id} className="flex items-center justify-between p-2 rounded-xl border bg-muted/30 text-xs">
                    <span className="font-semibold">{addon.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-primary">+{formatETB(addon.price)}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive rounded-lg"
                        onClick={() => handleRemoveAddon(addon.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Addon Input */}
              <div className="flex gap-2">
                <Input
                  placeholder="Addon name (e.g. Extra Cheese)"
                  value={newAddonName}
                  onChange={(e) => setNewAddonName(e.target.value)}
                  className="rounded-xl text-xs bg-background flex-1 h-9"
                />
                <Input
                  type="number"
                  placeholder="Price (ETB)"
                  value={newAddonPrice}
                  onChange={(e) => setNewAddonPrice(e.target.value ? Number(e.target.value) : "")}
                  className="rounded-xl text-xs bg-background w-28 h-9 font-bold"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="rounded-xl h-9 text-xs font-bold px-3"
                  onClick={handleAddAddon}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add
                </Button>
              </div>
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
                    src={imagePreview || "https://images.unsplash.com/photo-1541518763669-27fef04b14ea?auto=format&fit=crop&w=800&q=80"} 
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

                  {dietaryTags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {dietaryTags.map((t) => (
                        <span key={t} className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full border border-primary/20">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}

                  {customAddons.length > 0 && (
                    <p className="text-[11px] text-muted-foreground italic pt-1">
                      +{customAddons.length} custom add-on option{customAddons.length > 1 ? "s" : ""} available
                    </p>
                  )}
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
