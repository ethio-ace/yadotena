"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Receipt, Loader2 } from "lucide-react";

/**
 * Public "Track your order" lookup. Customers paste the order id (ORD-xxxxxx)
 * or the 6-character ticket number from their receipt — no login required.
 */
export function TrackOrderInput({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const number = value.trim();
    if (!number) {
      setError("Enter your order or ticket number.");
      return;
    }
    setError("");
    setSubmitting(true);
    // Server resolves both full ids and 6-char ticket numbers; the order page
    // shows a friendly not-found state if it can't be matched.
    router.push(`/order/${encodeURIComponent(number)}`);
    setSubmitting(false);
  };

  if (compact) {
    return (
      <form onSubmit={handleSubmit} className="w-full">
        <div className="flex gap-2">
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Order / ticket number"
            className="h-10 rounded-xl bg-card border-muted-foreground/20 text-sm font-medium"
          />
          <Button type="submit" size="sm" disabled={submitting} className="rounded-xl h-10 px-4 shrink-0 font-bold gap-1.5">
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">Track</span>
          </Button>
        </div>
        {error && <p className="text-[11px] text-destructive mt-1.5 font-semibold">{error}</p>}
      </form>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-card/80 backdrop-blur-md border border-muted-foreground/15 rounded-2xl p-4 sm:p-5 shadow-md flex flex-col sm:flex-row sm:items-center gap-3"
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="h-10 w-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
          <Receipt className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-black text-sm text-foreground leading-tight">Have an order?</p>
          <p className="text-[11px] text-muted-foreground font-medium">
            Track it live by entering your ticket number — no account needed.
          </p>
        </div>
      </div>
      <div className="flex gap-2 w-full sm:w-auto">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="e.g. 84K2M1 or ORD-482913"
          className="h-10 rounded-xl bg-background border-muted-foreground/20 text-sm font-medium flex-1 sm:w-56"
        />
        <Button type="submit" disabled={submitting} className="rounded-xl h-10 px-5 shrink-0 font-bold gap-1.5">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Track Order
        </Button>
      </div>
      {error && <p className="text-[11px] text-destructive font-semibold sm:ml-14">{error}</p>}
    </form>
  );
}
