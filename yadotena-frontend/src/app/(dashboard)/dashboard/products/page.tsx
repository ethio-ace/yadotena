"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import type { Product } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState, ErrorState } from "@/components/ui/empty-state";
import { formatETB } from "@/lib/currency";
import { Plus } from "lucide-react";

export default function ProductsAdminPage() {
  const qc = useQueryClient();
  const { data: products = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["staff-products"],
    queryFn: () => api.products.getAll(),
  });
  const { data: categories = [] } = useQuery({
    queryKey: ["staff-product-categories"],
    queryFn: () => api.products.getCategories(),
  });

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [newCat, setNewCat] = useState("");
  const [formError, setFormError] = useState("");

  const createCat = useMutation({
    mutationFn: () => api.products.createCategory(newCat.trim()),
    onSuccess: () => {
      setFormError("");
      setNewCat("");
      qc.invalidateQueries({ queryKey: ["staff-product-categories"] });
    },
    onError: (err: Error) => setFormError(err.message || "Could not create category"),
  });

  const createProduct = useMutation({
    mutationFn: () =>
      api.products.create({
        categoryId: categoryId || categories[0]?.id,
        name: name.trim(),
        description: description.trim(),
        price: Number(price),
      }),
    onSuccess: () => {
      setFormError("");
      setName("");
      setPrice("");
      setDescription("");
      qc.invalidateQueries({ queryKey: ["staff-products"] });
    },
    onError: (err: Error) => setFormError(err.message || "Could not create product"),
  });

  const toggle = useMutation({
    mutationFn: ({ id, available }: { id: string; available: boolean }) =>
      api.products.setAvailable(id, available),
    onSuccess: () => {
      setFormError("");
      qc.invalidateQueries({ queryKey: ["staff-products"] });
    },
    onError: (err: Error) => setFormError(err.message || "Could not update availability"),
  });

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Retail products</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Catalog for the guest shop — not kitchen menu items.
        </p>
      </div>

      {formError ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {formError}
        </div>
      ) : null}

      <section className="rounded-2xl border p-4 space-y-3">
        <h2 className="font-bold text-sm">Add category</h2>
        <div className="flex gap-2">
          <Input
            value={newCat}
            onChange={(e) => setNewCat(e.target.value)}
            placeholder="Category name"
            className="rounded-xl"
          />
          <Button
            type="button"
            disabled={!newCat.trim() || createCat.isPending}
            onClick={() => createCat.mutate()}
          >
            Add
          </Button>
        </div>
      </section>

      <section className="rounded-2xl border p-4 space-y-3">
        <h2 className="font-bold text-sm">Add product</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          <select
            className="h-10 rounded-xl border bg-background px-3 text-sm"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">Select category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Product name"
            className="rounded-xl"
          />
          <Input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Price ETB"
            className="rounded-xl"
            inputMode="decimal"
          />
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description"
            className="rounded-xl"
          />
        </div>
        <Button
          type="button"
          className="gap-1"
          disabled={
            !name.trim() ||
            !price ||
            !(categoryId || categories[0]?.id) ||
            createProduct.isPending
          }
          onClick={() => createProduct.mutate()}
        >
          <Plus className="h-4 w-4" /> Create product
        </Button>
      </section>

      <section className="space-y-3">
        <h2 className="font-bold">Catalog</h2>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : isError ? (
          <ErrorState
            title="Could not load products"
            description="Check your connection and try again."
            onRetry={() => refetch()}
          />
        ) : products.length === 0 ? (
          <EmptyState
            title="No retail products yet"
            description="Add a category, then create products for the guest shop."
          />
        ) : (
          <ul className="divide-y rounded-2xl border">
            {products.map((p: Product) => (
              <li
                key={p.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4"
              >
                <div>
                  <div className="font-bold">{p.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {p.category} · {formatETB(p.price)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={p.available ? "success" : "secondary"}>
                    {p.available ? "Available" : "Hidden"}
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    type="button"
                    disabled={toggle.isPending}
                    onClick={() =>
                      toggle.mutate({ id: p.id, available: !p.available })
                    }
                  >
                    {p.available ? "Hide" : "Show"}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
