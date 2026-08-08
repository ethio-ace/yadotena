"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { MenuCategory, MenuItem } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Trash2, FolderPlus, Tag, Layers, CheckCircle2 } from "lucide-react";

interface CategoryManageModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const EMOJI_PRESETS = [
  "🍔", "🍕", "🥩", "🍟", "☕", "🍰", "🍲", "🥗", "🥪", "🍣", "🍹", "🥞", "🍝", "🥣", "🍦", "🍷"
];

export function CategoryManageModal({ isOpen, onClose }: CategoryManageModalProps) {
  const queryClient = useQueryClient();

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: api.categories.getAll,
  });

  const { data: menu = [] } = useQuery({
    queryKey: ["menu"],
    queryFn: api.menu.getAll,
  });

  const [name, setName] = useState("");
  const [icon, setIcon] = useState("🍽️");
  const [description, setDescription] = useState("");
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [error, setError] = useState("");

  const createCategory = useMutation({
    mutationFn: api.categories.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setName("");
      setDescription("");
      setIcon("🍽️");
      setIsAddingNew(false);
      setError("");
    },
  });

  const deleteCategory = useMutation({
    mutationFn: api.categories.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });

  if (!isOpen) return null;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Category name is required");
      return;
    }
    const exists = categories.some(c => c.name.toLowerCase() === name.trim().toLowerCase());
    if (exists) {
      setError("A category with this name already exists");
      return;
    }

    createCategory.mutate({
      name: name.trim(),
      icon: icon || "🍽️",
      description: description.trim() || undefined,
    });
  };

  const getDishCount = (categoryName: string) => {
    return menu.filter(m => m.category.toLowerCase() === categoryName.toLowerCase()).length;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-card border rounded-3xl shadow-2xl overflow-hidden z-10 max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-5 border-b flex items-center justify-between bg-muted/40">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Manage Menu Categories</h2>
              <p className="text-xs text-muted-foreground">Add, organize, or remove dish categories for the menu</p>
            </div>
          </div>
          <Button size="icon" variant="ghost" className="rounded-full" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Top action bar */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-muted-foreground">
              Total Categories ({categories.length})
            </span>
            {!isAddingNew && (
              <Button 
                size="sm" 
                className="rounded-xl font-bold gap-1.5 shadow-sm"
                onClick={() => setIsAddingNew(true)}
              >
                <Plus className="h-4 w-4" />
                <span>+ Add Category</span>
              </Button>
            )}
          </div>

          {/* New Category Form */}
          {isAddingNew && (
            <form onSubmit={handleCreate} className="p-5 rounded-2xl bg-primary/5 border border-primary/20 space-y-4 animate-in slide-in-from-top-3 duration-200">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm flex items-center gap-2 text-primary">
                  <FolderPlus className="h-4 w-4" /> Create New Category
                </h3>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-xs text-muted-foreground"
                  onClick={() => { setIsAddingNew(false); setError(""); }}
                >
                  Cancel
                </Button>
              </div>

              {/* Emoji Icon Picker */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Select Category Icon</label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {EMOJI_PRESETS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setIcon(emoji)}
                      className={`h-9 w-9 text-lg rounded-xl flex items-center justify-center border transition-all ${
                        icon === emoji 
                          ? "bg-primary text-primary-foreground border-primary shadow-sm scale-110" 
                          : "bg-background border-muted hover:border-muted-foreground/40"
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category Name & Description */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Category Name *</label>
                  <Input
                    placeholder="e.g. Traditional Specials"
                    value={name}
                    onChange={(e) => { setName(e.target.value); setError(""); }}
                    className="rounded-xl bg-background"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Description (Optional)</label>
                  <Input
                    placeholder="e.g. Authentic Ethiopian cuisine"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="rounded-xl bg-background"
                  />
                </div>
              </div>

              {error && <p className="text-xs text-destructive font-medium">{error}</p>}

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="submit"
                  disabled={createCategory.isPending}
                  className="rounded-xl font-bold shadow-md"
                >
                  {createCategory.isPending ? "Creating..." : "Save Category"}
                </Button>
              </div>
            </form>
          )}

          {/* Categories List */}
          <div className="space-y-2.5">
            {categories.map((category) => {
              const dishCount = getDishCount(category.name);
              return (
                <div
                  key={category.id}
                  className="p-4 rounded-2xl border bg-card hover:border-muted-foreground/30 transition-all flex items-center justify-between gap-4 shadow-sm"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="h-11 w-11 rounded-2xl bg-muted flex items-center justify-center text-xl shrink-0">
                      {category.icon || "🍽️"}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-base text-foreground truncate">{category.name}</h4>
                        <Badge variant="secondary" className="text-[11px] font-semibold">
                          {dishCount} dish{dishCount !== 1 ? "es" : ""}
                        </Badge>
                      </div>
                      {category.description && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {category.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-xl"
                      onClick={() => {
                        if (dishCount > 0) {
                          if (!confirm(`Warning: "${category.name}" has ${dishCount} dishes assigned. Deleting this category will unassign them. Continue?`)) return;
                        } else {
                          if (!confirm(`Delete category "${category.name}"?`)) return;
                        }
                        deleteCategory.mutate(category.id);
                      }}
                      disabled={deleteCategory.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}

            {categories.length === 0 && !isLoading && (
              <div className="p-8 text-center text-muted-foreground border border-dashed rounded-3xl">
                No categories found. Click "+ Add Category" above to create your first category.
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-muted/20 flex justify-end">
          <Button variant="outline" className="rounded-xl font-bold" onClick={onClose}>
            Done
          </Button>
        </div>

      </div>
    </div>
  );
}
