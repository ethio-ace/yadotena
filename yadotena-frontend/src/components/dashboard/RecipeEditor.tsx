"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { MenuIngredient, Product } from "@/types";
import { Loader2, Milk, Plus, Trash2 } from "lucide-react";

/**
 * Stock used per serving of a dish ("Macchiato uses 0.15 L Milk"). The
 * backend takes this from Products stock once, when the kitchen starts the
 * dish (or straight away for a counter sale). Changes save immediately.
 */
export function RecipeEditor({ menuItemId }: { menuItemId: string }) {
  const queryClient = useQueryClient();
  const key = ["menu-ingredients", menuItemId];
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: recipe = [], isLoading } = useQuery<MenuIngredient[]>({
    queryKey: key,
    queryFn: () => api.menuIngredients.getForItem(menuItemId),
  });
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: api.products.getAll,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: key });
  const onError = (err: Error) => setError(err.message || "Couldn't save the recipe.");

  const add = useMutation({
    mutationFn: () => api.menuIngredients.create({ menuItemId, productId, quantity: Number(quantity) }),
    onSuccess: () => { setProductId(""); setQuantity(""); setError(null); refresh(); },
    onError,
  });
  const remove = useMutation({
    mutationFn: (id: number) => api.menuIngredients.delete(id),
    onSuccess: refresh,
    onError,
  });

  const used = new Set(recipe.map((r) => r.productId));
  const available = products.filter((p) => p.is_active !== false && !used.has(p.id));
  const unit = products.find((p) => p.id === productId)?.unit;

  return (
    <div className="p-3.5 rounded-2xl border space-y-3">
      <div>
        <span className="text-xs font-bold flex items-center gap-1.5"><Milk className="h-3.5 w-3.5" /> Stock used per serving</span>
        <span className="text-[11px] text-muted-foreground">Taken from Products stock when the kitchen starts this dish.</span>
      </div>

      {isLoading ? (
        <div className="h-8 rounded-lg bg-muted/40 animate-pulse" />
      ) : recipe.length === 0 ? (
        <p className="text-[11px] text-muted-foreground italic">No stock linked yet.</p>
      ) : (
        <ul className="space-y-1.5">
          {recipe.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-2 text-xs p-2 rounded-lg border bg-background/50">
              <span className="font-semibold truncate">{r.productName}</span>
              <span className="flex items-center gap-2 shrink-0">
                <span className="font-mono">{Number(r.quantity)} {r.unit}</span>
                <button
                  type="button"
                  onClick={() => remove.mutate(r.id)}
                  className="p-1 rounded-md text-muted-foreground hover:text-red-600 hover:bg-red-500/10"
                  aria-label={`Remove ${r.productName}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {products.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">Add stock items (e.g. Milk, unit L) on the Products page first.</p>
      ) : (
        <div className="flex gap-2">
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="flex-1 min-w-0 h-9 rounded-xl border bg-background px-2 text-xs font-semibold"
            aria-label="Stock product"
          >
            <option value="">Add stock item…</option>
            {available.map((p) => (
              <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>
            ))}
          </select>
          <input
            type="number"
            min={0}
            step="0.001"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder={unit ? `qty (${unit})` : "qty"}
            className="w-24 h-9 rounded-xl border bg-background px-2 text-xs font-mono"
            aria-label="Quantity per serving"
          />
          <button
            type="button"
            disabled={!productId || !(Number(quantity) > 0) || add.isPending}
            onClick={() => add.mutate()}
            className="h-9 px-3 rounded-xl bg-primary text-primary-foreground text-xs font-bold disabled:opacity-40 flex items-center gap-1"
          >
            {add.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Add
          </button>
        </div>
      )}
      {error && <p className="text-[11px] font-semibold text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
