"use client";

import { CheckCircle2, Clock } from "lucide-react";

interface KitchenEmptyStateProps {
  type: "PENDING" | "PREPARING" | "READY" | "ALL_CLEAR";
}

export function KitchenEmptyState({ type }: KitchenEmptyStateProps) {
  const copy = {
    PENDING: { title: "No new tickets", message: "Incoming orders will appear here." },
    PREPARING: { title: "Nothing on the line", message: "Start a ticket to begin cooking." },
    READY: { title: "Pickup counter clear", message: "Ready tickets will appear here." },
    ALL_CLEAR: { title: "Kitchen caught up", message: "All tickets are complete." },
  }[type];

  const Icon = type === "PREPARING" ? Clock : CheckCircle2;

  return (
    <div className="py-12 px-6 text-center border border-dashed border-zinc-800 rounded-xl">
      <Icon className="h-6 w-6 mx-auto text-zinc-700 mb-2.5" />
      <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">{copy.title}</p>
      <p className="text-xs text-zinc-600 mt-1">{copy.message}</p>
    </div>
  );
}
