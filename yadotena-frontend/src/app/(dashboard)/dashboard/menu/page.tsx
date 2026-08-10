"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { MenuItem, MenuCategory } from "@/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatETB } from "@/lib/currency";
import { 
  Plus, Edit, Trash2, Search, Layers, LayoutGrid, List, 
  Clock, Eye, Sparkles, CheckCircle2, AlertCircle, Utensils
} from "lucide-react";
import { CategoryManageModal } from "@/components/dashboard/CategoryManageModal";
import { MenuItemModal } from "@/components/dashboard/MenuItemModal";
import { DishDetailModal } from "@/components/dashboard/DishDetailModal";
import { ErrorState } from "@/components/ui/empty-state";

export default function MenuManagementPage() {
  const queryClient = useQueryClient();

  const { data: menu = [], isLoading: isMenuLoading, isError: isMenuError, refetch: refetchMenu } = useQuery({
    queryKey: ["menu"],
    queryFn: api.menu.getAll,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: api.categories.getAll,
  });

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [availabilityFilter, setAvailabilityFilter] = useState<"ALL" | "AVAILABLE" | "UNAVAILABLE">("ALL");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  // Modals state
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<MenuItem | null>(null);
  const [selectedItemForDetail, setSelectedItemForDetail] = useState<MenuItem | null>(null);
  const [actionError, setActionError] = useState("");

  const toggleAvailability = useMutation({
    mutationFn: (id: string) => api.menu.toggleAvailability(id),
    onSuccess: () => {
      setActionError("");
      queryClient.invalidateQueries({ queryKey: ["menu"] });
    },
    onError: (err: Error) => setActionError(err.message || "Could not update availability"),
  });

  const deleteItem = useMutation({
    mutationFn: (id: string) => api.menu.delete(id),
    onSuccess: () => {
      setActionError("");
      queryClient.invalidateQueries({ queryKey: ["menu"] });
    },
    onError: (err: Error) => setActionError(err.message || "Could not delete dish"),
  });

  const handleOpenCreate = () => {
    setItemToEdit(null);
    setIsItemModalOpen(true);
  };

  const handleOpenEdit = (item: MenuItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setItemToEdit(item);
    setIsItemModalOpen(true);
  };

  const handleDelete = (item: MenuItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (confirm(`Remove "${item.name}" from the active menu?`)) {
      deleteItem.mutate(item.id);
    }
  };

  const handleToggle = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    toggleAvailability.mutate(id);
  };

  // Filtered menu logic
  const filteredMenu = menu.filter((item) => {
    const q = search.toLowerCase();
    const matchesSearch =
      (item.name || "").toLowerCase().includes(q) ||
      (item.description || "").toLowerCase().includes(q) ||
      (item.category || "").toLowerCase().includes(q);

    const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;

    const matchesAvailability = 
      availabilityFilter === "ALL" ||
      (availabilityFilter === "AVAILABLE" && item.available) ||
      (availabilityFilter === "UNAVAILABLE" && !item.available);

    return matchesSearch && matchesCategory && matchesAvailability;
  });

  // Calculate quick metrics
  const totalItems = menu.length;
  const availableCount = menu.filter(m => m.available).length;
  const outOfStockCount = totalItems - availableCount;
  const averagePrice = totalItems > 0 
    ? menu.reduce((acc, curr) => acc + curr.price, 0) / totalItems 
    : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      
      {/* Header with Title & Action Buttons */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight">Menu & Dishes</h2>
          <p className="text-muted-foreground mt-1">
            Organize categories, create artisan recipes, and control live dish availability.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <Button 
            variant="outline" 
            className="rounded-2xl font-bold gap-2 shadow-sm"
            onClick={() => setIsCategoryModalOpen(true)}
          >
            <Layers className="h-4 w-4 text-primary" />
            <span>Manage Categories</span>
          </Button>

          <Button 
            className="rounded-2xl font-bold gap-2 shadow-md shadow-primary/20"
            onClick={handleOpenCreate}
          >
            <Plus className="h-4 w-4" />
            <span>+ Add New Dish</span>
          </Button>
        </div>
      </div>

      {isMenuError ? (
        <ErrorState
          title="Could not load menu"
          description="Check your connection and try again."
          onRetry={() => refetchMenu()}
        />
      ) : null}

      {actionError ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {actionError}
        </div>
      ) : null}

      {/* Overview Stat Widgets */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-3xl border-muted-foreground/15 bg-card/60 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase">Total Dishes</span>
            <Utensils className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-black mt-2">{totalItems}</div>
          <span className="text-[11px] text-muted-foreground">{categories.length} Categories</span>
        </Card>

        <Card className="rounded-3xl border-emerald-500/20 bg-emerald-500/5 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase">Available / In Stock</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">{availableCount}</div>
          <span className="text-[11px] text-muted-foreground">Ready for ordering</span>
        </Card>

        <Card className="rounded-3xl border-amber-500/20 bg-amber-500/5 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase">Out of Stock</span>
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-2">{outOfStockCount}</div>
          <span className="text-[11px] text-muted-foreground">Temporarily disabled</span>
        </Card>

        <Card className="rounded-3xl border-muted-foreground/15 bg-card/60 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase">Average Dish Price</span>
            <span className="text-xs font-bold text-primary font-mono">ETB</span>
          </div>
          <div className="text-2xl font-black text-primary mt-2">{formatETB(averagePrice)}</div>
          <span className="text-[11px] text-muted-foreground">Across entire menu</span>
        </Card>
      </div>

      {/* Search, Filter & View Controls */}
      <div className="space-y-3">
        
        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedCategory("All")}
            className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${
              selectedCategory === "All"
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-105"
                : "bg-card border border-muted hover:border-muted-foreground/30 text-muted-foreground"
            }`}
          >
            All dishes ({totalItems})
          </button>

          {categories.map((cat) => {
            const count = menu.filter(m => m.category === cat.name).length;
            const isSelected = selectedCategory === cat.name;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.name)}
                className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-105"
                    : "bg-card border border-muted hover:border-muted-foreground/30 text-muted-foreground"
                }`}
              >
                <span>{cat.name}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 rounded-3xl border border-muted-foreground/15 shadow-sm">
          <div className="relative flex-1 w-full sm:max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search dishes by name, tag, or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 rounded-2xl bg-background/50 h-10 text-xs border-muted"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            
            {/* Status Filter */}
            <div className="flex gap-1 bg-muted/60 p-1 rounded-2xl border text-xs">
              <button
                onClick={() => setAvailabilityFilter("ALL")}
                className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${availabilityFilter === "ALL" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
              >
                All
              </button>
              <button
                onClick={() => setAvailabilityFilter("AVAILABLE")}
                className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${availabilityFilter === "AVAILABLE" ? "bg-background shadow-sm text-emerald-600" : "text-muted-foreground"}`}
              >
                In Stock
              </button>
              <button
                onClick={() => setAvailabilityFilter("UNAVAILABLE")}
                className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${availabilityFilter === "UNAVAILABLE" ? "bg-background shadow-sm text-amber-600" : "text-muted-foreground"}`}
              >
                Sold Out
              </button>
            </div>

            {/* View Mode Toggle */}
            <div className="flex gap-1 bg-muted/60 p-1 rounded-2xl border">
              <Button
                size="icon"
                variant={viewMode === "table" ? "default" : "ghost"}
                className="h-8 w-8 rounded-xl"
                onClick={() => setViewMode("table")}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant={viewMode === "grid" ? "default" : "ghost"}
                className="h-8 w-8 rounded-xl"
                onClick={() => setViewMode("grid")}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>

          </div>
        </div>

      </div>

      {/* Main Content: Table or Grid */}
      {isMenuLoading ? (
        <div className="p-12 text-center text-muted-foreground animate-pulse">
          Loading dishes and categories...
        </div>
      ) : viewMode === "table" ? (
        
        /* Table View */
        <Card className="rounded-3xl border-muted-foreground/15 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                  <tr>
                    <th className="px-6 py-3.5 font-bold">Dish / Item</th>
                    <th className="px-6 py-3.5 font-bold">Category</th>
                    <th className="px-6 py-3.5 font-bold">Price</th>
                    <th className="px-6 py-3.5 font-bold">Prep Time</th>
                    <th className="px-6 py-3.5 font-bold">Status</th>
                    <th className="px-6 py-3.5 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredMenu.map((item) => (
                    <tr 
                      key={item.id} 
                      onClick={() => setSelectedItemForDetail(item)}
                      className="hover:bg-muted/30 transition-colors cursor-pointer group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3.5">
                          <img 
                            src={item.image} 
                            alt={item.name} 
                            className="h-12 w-12 rounded-2xl object-cover shadow-sm group-hover:scale-105 transition-transform" 
                          />
                          <div>
                            <div className="font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-2">
                              <span>{item.name}</span>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-1 max-w-xs mt-0.5">
                              {item.description}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <Badge variant="secondary" className="font-bold text-xs">
                          {item.category}
                        </Badge>
                      </td>

                      <td className="px-6 py-4 font-black text-primary">
                        {formatETB(item.price)}
                      </td>

                      <td className="px-6 py-4 text-xs font-semibold text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-primary" />
                          {item.preparationTime || 15} min
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <button
                          type="button"
                          onClick={(e) => handleToggle(item.id, e)}
                          className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${
                            item.available
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                              : "bg-muted text-muted-foreground border-muted hover:bg-muted/80"
                          }`}
                        >
                          {item.available ? "✓ Available" : "Sold Out"}
                        </button>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-muted-foreground hover:text-primary rounded-xl"
                            onClick={(e) => { e.stopPropagation(); setSelectedItemForDetail(item); }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-blue-500 hover:bg-blue-500/10 rounded-xl"
                            onClick={(e) => handleOpenEdit(item, e)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-xl"
                            onClick={(e) => handleDelete(item, e)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filteredMenu.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-muted-foreground">
                        No dishes match your search and filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

      ) : (

        /* Grid View */
        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filteredMenu.map((item) => (
            <Card
              key={item.id}
              onClick={() => setSelectedItemForDetail(item)}
              className="rounded-3xl border-muted-foreground/15 bg-card/80 overflow-hidden cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col group"
            >
              <div className="relative h-44 w-full bg-muted overflow-hidden">
                <img 
                  src={item.image} 
                  alt={item.name} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                />
                <Badge variant="secondary" className="absolute top-3 left-3 bg-background/85 backdrop-blur-md font-bold text-xs">
                  {item.category}
                </Badge>
                <div className="absolute bottom-3 right-3">
                  <Badge variant="secondary" className="bg-background/85 backdrop-blur-md text-[11px] font-semibold flex items-center gap-1">
                    <Clock className="h-3 w-3 text-primary" />
                    {item.preparationTime || 15}m
                  </Badge>
                </div>
              </div>

              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div className="space-y-1">
                  <h4 className="font-bold text-base group-hover:text-primary transition-colors truncate">{item.name}</h4>
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{item.description}</p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-muted/50">
                  <span className="font-black text-primary text-lg">{formatETB(item.price)}</span>
                  
                  <div className="flex items-center gap-1">
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-8 w-8 text-blue-500 rounded-xl"
                      onClick={(e) => handleOpenEdit(item, e)}
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-8 w-8 text-destructive rounded-xl"
                      onClick={(e) => handleDelete(item, e)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}

          {filteredMenu.length === 0 && (
            <div className="col-span-full p-12 text-center text-muted-foreground border border-dashed rounded-3xl">
              No dishes match your search and filters.
            </div>
          )}
        </div>

      )}

      {/* Modals */}
      <CategoryManageModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
      />

      <MenuItemModal
        isOpen={isItemModalOpen}
        onClose={() => { setIsItemModalOpen(false); setItemToEdit(null); }}
        itemToEdit={itemToEdit}
      />

      <DishDetailModal
        item={selectedItemForDetail}
        isOpen={!!selectedItemForDetail}
        onClose={() => setSelectedItemForDetail(null)}
        onEdit={(item) => {
          setSelectedItemForDetail(null);
          setItemToEdit(item);
          setIsItemModalOpen(true);
        }}
      />

    </div>
  );
}
