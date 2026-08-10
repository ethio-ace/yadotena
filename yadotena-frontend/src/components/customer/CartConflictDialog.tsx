"use client";

import { Button } from "@/components/ui/button";
import { useCartConflictStore } from "@/lib/cart-guard";

/** In-app confirm when switching between menu and shop carts. */
export function CartConflictDialog() {
  const open = useCartConflictStore((s) => s.open);
  const message = useCartConflictStore((s) => s.message);
  const confirm = useCartConflictStore((s) => s.confirm);
  const cancel = useCartConflictStore((s) => s.cancel);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-conflict-title"
        className="w-full max-w-md rounded-2xl border bg-card p-5 shadow-xl space-y-4"
      >
        <div className="space-y-1">
          <h2 id="cart-conflict-title" className="text-base font-bold">
            Switch carts?
          </h2>
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" className="rounded-xl" onClick={cancel}>
            Cancel
          </Button>
          <Button type="button" className="rounded-xl font-bold" onClick={confirm}>
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
