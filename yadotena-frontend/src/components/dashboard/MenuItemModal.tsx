"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { MenuItem, MenuItemAddon, AddonItem, AddonScope } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatETB } from "@/lib/currency";
import { getImageUrl } from "@/lib/utils";
import { 
  X, Plus, Trash2, Utensils, Image as ImageIcon, Sparkles, 
  Clock, Flame, Check, Eye, Layers, Globe, CheckCircle2
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

  const { data: availableAddons = [] } = useQuery({
    queryKey: ["addons"],
    queryFn: () => api.addons.getAll(),
    enabled: isOpen,
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

  // Addon Creator modal state
  const [showAddonCreator, setShowAddonCreator] = useState(false);
  const [addonName, setAddonName] = useState("");
  const [addonPrice, setAddonPrice] = useState<number | "">("");
  const [addonDescription, setAddonDescription] = useState("");
  const [addonScope, setAddonScope] = useState<AddonScope>("ITEM");
  const [addonImageFile, setAddonImageFile] = useState<File | null>(null);
  const [addonImagePreview, setAddonImagePreview] = useState("");

  const [error, setError] = useState("");
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>("");

  // Sync the form whenever the modal opens (or switches to a different item).
  // Keyed on the item id + isOpen so the effect can never re-trigger from a
  // transient array identity (categories) while a query is still loading.
  useEffect(() => {
    if (!isOpen) return;
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
    setShowAddonCreator(false);
  }, [isOpen, itemToEdit?.id]);

  // When categories finish loading while the create form is open, promote the
  // default category to a real one (runs at most once per load, guarded).
  useEffect(() => {
    if (!isOpen || itemToEdit) return;
    if (categories.length > 0 && !categories.some((c) => c.name === category)) {
      setCategory(categories[0].name);
    }
  }, [categories, isOpen, itemToEdit, category]);

  const createMutation = useMutation({
    mutationFn: api.menu.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu"] });
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormData | any }) => 
      api.menu.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu"] });
      onClose();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: api.menu.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu"] });
      onClose();
    },
  });

  const createAddonMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const token = localStorage.getItem("token") || localStorage.getItem("access_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://yadotena.onrender.com"}/api/v1/addons`, {
        method: "POST",
        headers: token ? { Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) throw new Error("Failed to create addon");
      return res.json() as Promise<AddonItem>;
    },
    onSuccess: (newAddon) => {
      queryClient.invalidateQueries({ queryKey: ["addons"] });
      setCustomAddons(prev => [...prev, { id: newAddon.id, name: newAddon.name, price: newAddon.price }]);
      setShowAddonCreator(false);
      setAddonName("");
      setAddonPrice("");
      setAddonDescription("");
      setAddonImageFile(null);
      setAddonImagePreview("");
    },
  });

  if (!isOpen) return null;

  const toggleTag = (tag: string) => {
    setDietaryTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const toggleSelectExistingAddon = (addon: AddonItem) => {
    const exists = customAddons.some(a => a.id === addon.id || a.name === addon.name);
    if (exists) {
      setCustomAddons(prev => prev.filter(a => a.id !== addon.id && a.name !== addon.name));
    } else {
      setCustomAddons(prev => [...prev, { id: addon.id, name: addon.name, price: addon.price }]);
    }
  };

  const handleRemoveAddon = (id: string) => {
    setCustomAddons(prev => prev.filter(a => a.id !== id));
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
      
      // Presign and obtain public URL instantly in background (~20ms)
      try {
        const res = await api.media.upload(file);
        if (res?.publicUrl) {
          setUploadedImageUrl(res.publicUrl);
        }
      } catch (err) {
        console.warn("Background image presign failed:", err);
      }
    }
  };

  const handleAddonImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAddonImageFile(file);
      setAddonImagePreview(URL.createObjectURL(file));
    }
  };

  const handleCreateNewAddonSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addonName.trim()) return;

    const selectedCat = categories.find(c => c.name === category);

    const formData = new FormData();
    formData.append("name", addonName.trim());
    formData.append("description", addonDescription.trim());
    formData.append("price", String(Number(addonPrice) || 0));
    formData.append("scope", addonScope);
    if (addonScope === "CATEGORY" && selectedCat) {
      formData.append("categoryId", selectedCat.id);
    }
    if (addonScope === "ITEM" && itemToEdit) {
      formData.append("menuItemId", itemToEdit.id);
    }
    if (addonImageFile) {
      formData.append("image", addonImageFile);
    }

    createAddonMutation.mutate(formData);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError("Dish title is required");
    if (!price || Number(price) <= 0) return setError("Please specify a valid ETB price");

    // Fast path: If image URL is presigned or string preview, use ultra-fast JSON submit (~2ms)
    const finalImage = uploadedImageUrl || (typeof imagePreview === "string" && !image ? imagePreview : "");
    if (finalImage || !image) {
      const payload = {
        name: name.trim(),
        description: description.trim() || "Artisanal specialty prepared with fresh local ingredients.",
        category: category || "Main Course",
        price: Number(price),
        preparationTime: Number(prepTime) || 15,
        available,
        dietaryTags,
        customAddons,
        image: finalImage,
      };

      if (itemToEdit) {
        updateMutation.mutate({ id: itemToEdit.id, data: payload });
      } else {
        createMutation.mutate(payload);
      }
      return;
    }

    // Fallback path: FormData multipart
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
                Set name, category, ETB price, photo, dietary attributes, and attach custom add-ons
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
                    <span className="text-sm font-bold text-foreground">Click to upload photo</span>
                    <span className="text-[11px] text-muted-foreground mt-1 text-center">SVG, PNG, JPG or GIF (max. 5MB)</span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
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

            {/* Add-ons & Extras Selection */}
            <div className="space-y-3 pt-3 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span>Attached Add-ons & Modifiers</span>
                  </label>
                  <p className="text-[11px] text-muted-foreground">Select system add-ons or create a new custom add-on</p>
                </div>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="rounded-2xl text-xs font-bold gap-1 border-primary/40 text-primary hover:bg-primary/10"
                  onClick={() => setShowAddonCreator(!showAddonCreator)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>{showAddonCreator ? "Close Form" : "Create New Addon"}</span>
                </Button>
              </div>

              {/* Inline Addon Creator Form */}
              {showAddonCreator && (
                <div className="p-4 rounded-2xl border border-primary/30 bg-primary/5 space-y-3 animate-in fade-in duration-200">
                  <div className="font-bold text-xs text-primary flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Create New System Add-on</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Input
                      placeholder="Addon name (e.g. Extra Cheese)"
                      value={addonName}
                      onChange={(e) => setAddonName(e.target.value)}
                      className="rounded-xl text-xs bg-background h-9"
                    />
                    <Input
                      type="number"
                      placeholder="Price in ETB (e.g. 35)"
                      value={addonPrice}
                      onChange={(e) => setAddonPrice(e.target.value ? Number(e.target.value) : "")}
                      className="rounded-xl text-xs bg-background h-9 font-bold"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Input
                      placeholder="Short description (optional)"
                      value={addonDescription}
                      onChange={(e) => setAddonDescription(e.target.value)}
                      className="rounded-xl text-xs bg-background h-9"
                    />
                    <div className="flex items-center gap-2">
                      <label className="cursor-pointer flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl border border-dashed border-input bg-background px-3 text-xs font-semibold text-muted-foreground hover:text-foreground">
                        <ImageIcon className="h-3.5 w-3.5" />
                        <span>{addonImageFile ? addonImageFile.name.substring(0, 15) : "Upload Photo"}</span>
                        <input type="file" accept="image/*" className="hidden" onChange={handleAddonImageChange} />
                      </label>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex gap-1.5 text-xs">
                      <button
                        type="button"
                        onClick={() => setAddonScope("ITEM")}
                        className={`px-2.5 py-1 rounded-xl font-bold border transition-colors ${addonScope === "ITEM" ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground"}`}
                      >
                        Item Only
                      </button>
                      <button
                        type="button"
                        onClick={() => setAddonScope("CATEGORY")}
                        className={`px-2.5 py-1 rounded-xl font-bold border transition-colors ${addonScope === "CATEGORY" ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground"}`}
                      >
                        Category
                      </button>
                      <button
                        type="button"
                        onClick={() => setAddonScope("GLOBAL")}
                        className={`px-2.5 py-1 rounded-xl font-bold border transition-colors ${addonScope === "GLOBAL" ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground"}`}
                      >
                        Global
                      </button>
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      disabled={createAddonMutation.isPending}
                      onClick={handleCreateNewAddonSubmit}
                      className="rounded-xl h-8 text-xs font-bold"
                    >
                      {createAddonMutation.isPending ? "Saving..." : "Save & Attach Addon"}
                    </Button>
                  </div>
                </div>
              )}

              {/* Available System Addons Pills / Grid */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-muted-foreground uppercase">Available System Add-ons</label>
                <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-2 border rounded-2xl bg-muted/20">
                  {availableAddons.map((addon) => {
                    const isSelected = customAddons.some(a => a.id === addon.id || a.name === addon.name);
                    return (
                      <button
                        key={addon.id}
                        type="button"
                        onClick={() => toggleSelectExistingAddon(addon)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl text-xs font-bold border transition-all ${
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary shadow-sm scale-105"
                            : "bg-card hover:bg-muted text-muted-foreground border-muted"
                        }`}
                      >
                        {addon.imageUrl && (
                          <img src={getImageUrl(addon.imageUrl)} alt={addon.name} className="h-4 w-4 rounded-full object-cover" />
                        )}
                        <span>{addon.name}</span>
                        <span className={`text-[10px] ${isSelected ? "text-primary-foreground/80" : "text-primary font-mono"}`}>
                          +{formatETB(addon.price)}
                        </span>
                        {isSelected && <Check className="h-3 w-3 ml-0.5" />}
                      </button>
                    );
                  })}

                  {availableAddons.length === 0 && (
                    <span className="text-xs text-muted-foreground italic p-2">
                      No system add-ons created yet. Click "Create New Addon" above to add your first customization!
                    </span>
                  )}
                </div>
              </div>

              {/* Attached Addons List */}
              {customAddons.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase">Selected Add-ons for this Dish ({customAddons.length})</label>
                  <div className="space-y-1">
                    {customAddons.map((addon) => (
                      <div key={addon.id} className="flex items-center justify-between px-3 py-1.5 rounded-xl border bg-card text-xs">
                        <span className="font-bold">{addon.name}</span>
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
                </div>
              )}

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
                    <div className="pt-2 border-t text-xs">
                      <span className="font-bold text-foreground block mb-1">Selectable Extras:</span>
                      <div className="flex flex-wrap gap-1">
                        {customAddons.map((a) => (
                          <span key={a.id} className="text-[10px] bg-muted px-2 py-0.5 rounded-lg border font-semibold">
                            {a.name} (+{formatETB(a.price)})
                          </span>
                        ))}
                      </div>
                    </div>
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
              {itemToEdit && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={deleteMutation.isPending}
                  onClick={() => {
                    if (window.confirm(`Delete \u201c${itemToEdit.name}\u201d? Customers will no longer be able to order it.`)) {
                      deleteMutation.mutate(itemToEdit.id);
                    }
                  }}
                  className="w-full rounded-2xl font-semibold text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
                >
                  {deleteMutation.isPending ? "Deleting..." : "Delete Item"}
                </Button>
              )}
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
