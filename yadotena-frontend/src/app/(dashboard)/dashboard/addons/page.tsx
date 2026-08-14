"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { AddonItem, AddonScope } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatETB } from "@/lib/currency";
import { getImageUrl } from "@/lib/utils";
import { 
  Plus, Edit, Trash2, Search, Layers, Globe, Utensils, 
  Sparkles, X, Image as ImageIcon
} from "lucide-react";

export default function AddonManagementPage() {
  const queryClient = useQueryClient();

  const { data: addons = [], isLoading: isAddonsLoading } = useQuery({
    queryKey: ["addons"],
    queryFn: () => api.addons.getAll(),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: api.categories.getAll,
  });

  const { data: menu = [] } = useQuery({
    queryKey: ["menu"],
    queryFn: api.menu.getAll,
  });

  const [search, setSearch] = useState("");
  const [scopeFilter, setScopeFilter] = useState<"ALL" | AddonScope>("ALL");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAddon, setEditingAddon] = useState<AddonItem | null>(null);

  // Form State
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formScope, setFormScope] = useState<AddonScope>("GLOBAL");
  const [formCategoryId, setFormCategoryId] = useState("");
  const [formMenuItemId, setFormMenuItemId] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);
  const [formImageFile, setFormImageFile] = useState<File | null>(null);
  const [formImagePreview, setFormImagePreview] = useState("");

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const token = localStorage.getItem("token") || localStorage.getItem("access_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://yadotena.onrender.com"}/api/v1/addons`, {
        method: "POST",
        headers: token ? { Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) throw new Error("Failed to create addon");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["addons"] });
      closeModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, formData }: { id: string; formData: FormData }) => {
      const token = localStorage.getItem("token") || localStorage.getItem("access_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://yadotena.onrender.com"}/api/v1/addons/${id}`, {
        method: "PATCH",
        headers: token ? { Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) throw new Error("Failed to update addon");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["addons"] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.addons.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["addons"] });
    },
  });

  const openCreateModal = () => {
    setEditingAddon(null);
    setFormName("");
    setFormDescription("");
    setFormPrice("");
    setFormScope("GLOBAL");
    setFormCategoryId("");
    setFormMenuItemId("");
    setFormIsActive(true);
    setFormImageFile(null);
    setFormImagePreview("");
    setIsModalOpen(true);
  };

  const openEditModal = (addon: AddonItem) => {
    setEditingAddon(addon);
    setFormName(addon.name);
    setFormDescription(addon.description || "");
    setFormPrice(addon.price.toString());
    setFormScope(addon.scope || (addon.isGlobal ? "GLOBAL" : addon.categoryId ? "CATEGORY" : "ITEM"));
    setFormCategoryId(addon.categoryId || "");
    setFormMenuItemId(addon.menuItemId || "");
    setFormIsActive(addon.isActive);
    setFormImageFile(null);
    setFormImagePreview(addon.imageUrl || "");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingAddon(null);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormImageFile(file);
      setFormImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const formData = new FormData();
    formData.append("name", formName.trim());
    formData.append("description", formDescription.trim());
    formData.append("price", String(parseFloat(formPrice) || 0));
    formData.append("scope", formScope);
    formData.append("isGlobal", String(formScope === "GLOBAL"));
    formData.append("isActive", String(formIsActive));

    if (formScope === "CATEGORY" && formCategoryId) {
      formData.append("categoryId", formCategoryId);
    }
    if (formScope === "ITEM" && formMenuItemId) {
      formData.append("menuItemId", formMenuItemId);
    }
    if (formImageFile) {
      formData.append("image", formImageFile);
    }

    if (editingAddon) {
      updateMutation.mutate({ id: editingAddon.id, formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (addon: AddonItem) => {
    if (confirm(`Are you sure you want to delete addon "${addon.name}"?`)) {
      deleteMutation.mutate(addon.id);
    }
  };

  // Filtered addons logic
  const filteredAddons = addons.filter((addon) => {
    const matchesSearch =
      addon.name.toLowerCase().includes(search.toLowerCase()) ||
      (addon.description && addon.description.toLowerCase().includes(search.toLowerCase())) ||
      (addon.categoryName && addon.categoryName.toLowerCase().includes(search.toLowerCase())) ||
      (addon.menuItemName && addon.menuItemName.toLowerCase().includes(search.toLowerCase()));

    const matchesScope = scopeFilter === "ALL" || addon.scope === scopeFilter;

    return matchesSearch && matchesScope;
  });

  // Metrics
  const totalCount = addons.length;
  const globalCount = addons.filter((a) => a.isGlobal || a.scope === "GLOBAL").length;
  const categoryCount = addons.filter((a) => a.scope === "CATEGORY" || (a.categoryId && !a.isGlobal)).length;
  const itemCount = addons.filter((a) => a.scope === "ITEM" || (a.menuItemId && !a.isGlobal)).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight flex items-center gap-2.5">
            <Sparkles className="h-7 w-7 text-primary" />
            <span>Add-ons & Modifiers Catalog</span>
          </h2>
          <p className="text-muted-foreground mt-1">
            Manage photos, pricing, and assignments for global, category-wide, and dish-specific extras.
          </p>
        </div>

        <Button 
          className="rounded-2xl font-bold gap-2 shadow-md shadow-primary/20"
          onClick={openCreateModal}
        >
          <Plus className="h-4 w-4" />
          <span>+ Create New Addon</span>
        </Button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-3xl border-muted-foreground/15 bg-card/60 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase">Total Addons</span>
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-black mt-2">{totalCount}</div>
          <span className="text-[11px] text-muted-foreground">Active in system</span>
        </Card>

        <Card className="rounded-3xl border-blue-500/20 bg-blue-500/5 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase">Global Addons</span>
            <Globe className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-2">{globalCount}</div>
          <span className="text-[11px] text-muted-foreground">Available menu-wide</span>
        </Card>

        <Card className="rounded-3xl border-amber-500/20 bg-amber-500/5 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase">Category Addons</span>
            <Layers className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-2">{categoryCount}</div>
          <span className="text-[11px] text-muted-foreground">Whole category scope</span>
        </Card>

        <Card className="rounded-3xl border-emerald-500/20 bg-emerald-500/5 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase">Item Specific</span>
            <Utensils className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">{itemCount}</div>
          <span className="text-[11px] text-muted-foreground">Tied to single dish</span>
        </Card>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 rounded-3xl border border-muted-foreground/15 shadow-sm">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search add-ons by name, description, or target..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 rounded-2xl bg-background/50 h-10 text-xs border-muted"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          {/* Scope Filter Pills */}
          <div className="flex gap-1 bg-muted/60 p-1 rounded-2xl border text-xs">
            <button
              onClick={() => setScopeFilter("ALL")}
              className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${scopeFilter === "ALL" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
            >
              All
            </button>
            <button
              onClick={() => setScopeFilter("GLOBAL")}
              className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${scopeFilter === "GLOBAL" ? "bg-background shadow-sm text-blue-600" : "text-muted-foreground"}`}
            >
              🌐 Global
            </button>
            <button
              onClick={() => setScopeFilter("CATEGORY")}
              className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${scopeFilter === "CATEGORY" ? "bg-background shadow-sm text-amber-600" : "text-muted-foreground"}`}
            >
              📁 Category
            </button>
            <button
              onClick={() => setScopeFilter("ITEM")}
              className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${scopeFilter === "ITEM" ? "bg-background shadow-sm text-emerald-600" : "text-muted-foreground"}`}
            >
              🍽️ Item Only
            </button>
          </div>
        </div>
      </div>

      {/* Main Table */}
      {isAddonsLoading ? (
        <div className="p-12 text-center text-muted-foreground animate-pulse">
          Loading add-ons catalog...
        </div>
      ) : (
        <Card className="rounded-3xl border-muted-foreground/15 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                  <tr>
                    <th className="px-6 py-3.5 font-bold">Addon Item</th>
                    <th className="px-6 py-3.5 font-bold">Price (ETB)</th>
                    <th className="px-6 py-3.5 font-bold">Scope / Level</th>
                    <th className="px-6 py-3.5 font-bold">Assigned Target</th>
                    <th className="px-6 py-3.5 font-bold">Status</th>
                    <th className="px-6 py-3.5 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredAddons.map((addon) => (
                    <tr key={addon.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {addon.imageUrl ? (
                            <img 
                              src={getImageUrl(addon.imageUrl)} 
                              alt={addon.name} 
                              className="h-10 w-10 rounded-xl object-cover border shadow-sm" 
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                              ✨
                            </div>
                          )}
                          <div>
                            <span className="font-bold text-foreground block">{addon.name}</span>
                            {addon.description && (
                              <span className="text-xs text-muted-foreground line-clamp-1 max-w-xs">
                                {addon.description}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 font-black text-primary">
                        {formatETB(addon.price)}
                      </td>

                      <td className="px-6 py-4">
                        {addon.isGlobal || addon.scope === "GLOBAL" ? (
                          <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 font-bold text-xs gap-1">
                            <Globe className="h-3 w-3" />
                            <span>Global</span>
                          </Badge>
                        ) : addon.scope === "CATEGORY" || addon.categoryId ? (
                          <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 font-bold text-xs gap-1">
                            <Layers className="h-3 w-3" />
                            <span>Whole Category</span>
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-bold text-xs gap-1">
                            <Utensils className="h-3 w-3" />
                            <span>Single Dish</span>
                          </Badge>
                        )}
                      </td>

                      <td className="px-6 py-4 text-xs font-semibold text-muted-foreground">
                        {addon.isGlobal ? (
                          <span className="text-muted-foreground font-normal">All menu items</span>
                        ) : addon.categoryName ? (
                          <span className="text-amber-600 font-bold">📁 {addon.categoryName}</span>
                        ) : addon.menuItemName ? (
                          <span className="text-emerald-600 font-bold">🍽️ {addon.menuItemName}</span>
                        ) : (
                          <span>—</span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${addon.isActive ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" : "bg-muted text-muted-foreground border-muted"}`}>
                          {addon.isActive ? "Active" : "Disabled"}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-blue-500 hover:bg-blue-500/10 rounded-xl"
                            onClick={() => openEditModal(addon)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-xl"
                            onClick={() => handleDelete(addon)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filteredAddons.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-muted-foreground">
                        No add-ons match your search filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal for Creating / Editing Addons */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-muted-foreground/20 rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-4 border-b border-muted/50">
              <h3 className="text-xl font-black">
                {editingAddon ? "Edit Add-on" : "Create New Add-on"}
              </h3>
              <Button variant="ghost" size="icon" className="rounded-full" onClick={closeModal}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground">Addon Name *</label>
                  <Input
                    required
                    placeholder="e.g., Extra Cheese, Takeaway Box"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="rounded-2xl text-xs h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground">Price in ETB *</label>
                  <Input
                    type="number"
                    step="0.5"
                    required
                    placeholder="e.g., 35.00"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    className="rounded-2xl text-xs h-10 font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground">Description (Optional)</label>
                <Input
                  placeholder="e.g. Fresh melted cheddar cheese topping"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="rounded-2xl text-xs h-10"
                />
              </div>

              {/* Photo Upload */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground">Addon Photo</label>
                <label className="cursor-pointer flex items-center justify-between p-3 rounded-2xl border border-dashed border-input bg-muted/20 hover:bg-muted/40 transition-colors">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-5 w-5 text-muted-foreground" />
                    <span className="text-xs font-semibold">
                      {formImageFile ? formImageFile.name : formImagePreview ? "Change Photo" : "Upload Addon Photo"}
                    </span>
                  </div>
                  {formImagePreview && (
                    <img src={getImageUrl(formImagePreview)} alt="Preview" className="h-8 w-8 rounded-lg object-cover" />
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                </label>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground">Assign Scope *</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormScope("GLOBAL")}
                    className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                      formScope === "GLOBAL"
                        ? "bg-blue-500/10 border-blue-500 text-blue-600 shadow-sm"
                        : "border-muted text-muted-foreground hover:bg-muted/50"
                    }`}
                  >
                    <Globe className="h-4 w-4" />
                    <span>🌐 Global</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormScope("CATEGORY")}
                    className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                      formScope === "CATEGORY"
                        ? "bg-amber-500/10 border-amber-500 text-amber-600 shadow-sm"
                        : "border-muted text-muted-foreground hover:bg-muted/50"
                    }`}
                  >
                    <Layers className="h-4 w-4" />
                    <span>📁 Category</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormScope("ITEM")}
                    className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                      formScope === "ITEM"
                        ? "bg-emerald-500/10 border-emerald-500 text-emerald-600 shadow-sm"
                        : "border-muted text-muted-foreground hover:bg-muted/50"
                    }`}
                  >
                    <Utensils className="h-4 w-4" />
                    <span>🍽️ Single Item</span>
                  </button>
                </div>
              </div>

              {/* Target Selection Dropdown */}
              {formScope === "CATEGORY" && (
                <div className="space-y-1.5 animate-in fade-in duration-200">
                  <label className="text-xs font-bold text-muted-foreground">Select Category *</label>
                  <select
                    value={formCategoryId}
                    onChange={(e) => setFormCategoryId(e.target.value)}
                    className="w-full h-10 rounded-2xl border border-muted bg-background px-3 text-xs font-semibold"
                  >
                    <option value="">-- Choose Category --</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.icon || "📁"} {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {formScope === "ITEM" && (
                <div className="space-y-1.5 animate-in fade-in duration-200">
                  <label className="text-xs font-bold text-muted-foreground">Select Menu Dish *</label>
                  <select
                    value={formMenuItemId}
                    onChange={(e) => setFormMenuItemId(e.target.value)}
                    className="w-full h-10 rounded-2xl border border-muted bg-background px-3 text-xs font-semibold"
                  >
                    <option value="">-- Choose Dish --</option>
                    {menu.map((m) => (
                      <option key={m.id} value={m.id}>
                        🍽️ {m.name} ({formatETB(m.price)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-3">
                <Button type="button" variant="outline" className="rounded-2xl" onClick={closeModal}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="rounded-2xl font-bold shadow-md shadow-primary/20"
                >
                  {createMutation.isPending || updateMutation.isPending ? "Saving..." : editingAddon ? "Save Changes" : "Create Addon"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
