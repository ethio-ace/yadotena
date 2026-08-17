"use client";

import { useMemo, useState } from "react";
import { RoundCard } from "@/lib/kitchen";
import { KitchenOrderCard } from "./KitchenOrderCard";
import { KitchenEmptyState } from "./KitchenEmptyState";
import { ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE = 12;

interface StatusQueuePageProps {
  title: string;
  status: "PENDING" | "PREPARING" | "READY";
  cards: RoundCard[];
  newCardKeys?: Set<string>;
  addonMap?: Record<string, string>;
  tableLabels?: Record<string, string>;
  onStartPreparing?: (orderId: string, round: number) => void;
  onMarkReady?: (orderId: string, round: number) => void;
  onInspect?: (order: RoundCard["order"]) => void;
  updatingKey?: string | null;
}

/**
 * Full-width, paginated page for one kitchen status. The QUEUE overview is the
 * glanceable 3-lane board; when a lane grows large (or a chef wants to focus on
 * one stage), these pages turn the same cards into a calm, bounded grid —
 * oldest first, PAGE_SIZE per page — so a 64-ticket lane never means an
 * endless wall of cards.
 */
export function StatusQueuePage({
  title,
  status,
  cards,
  newCardKeys,
  addonMap,
  tableLabels,
  onStartPreparing,
  onMarkReady,
  onInspect,
  updatingKey,
}: StatusQueuePageProps) {
  const [page, setPage] = useState(1);

  const sorted = useMemo(
    () => [...cards].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [cards]
  );

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  // Clamp when the queue shrinks underneath the current page.
  const safePage = Math.min(page, totalPages);
  const slice = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 max-w-[1800px] mx-auto w-full">
      {/* Page header */}
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-zinc-500">{title}</h2>
        <span className="text-sm font-extrabold text-zinc-300 tabular-nums">
          {sorted.length} ticket{sorted.length === 1 ? "" : "s"}
        </span>
      </div>

      {sorted.length === 0 ? (
        <KitchenEmptyState type={status} />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
            {slice.map((card) => (
              <KitchenOrderCard
                key={card.key}
                card={card}
                isNew={newCardKeys?.has(card.key)}
                addonMap={addonMap}
                tableLabels={tableLabels}
                onStartPreparing={onStartPreparing}
                onMarkReady={onMarkReady}
                onInspect={onInspect}
                updatingKey={updatingKey}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 pt-5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="h-9 px-3 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-300 text-xs font-bold flex items-center gap-1.5 transition-colors hover:bg-zinc-800 disabled:opacity-40 disabled:hover:bg-zinc-900"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Prev
              </button>
              <span className="text-xs font-bold text-zinc-500 tabular-nums">
                Page {safePage} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="h-9 px-3 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-300 text-xs font-bold flex items-center gap-1.5 transition-colors hover:bg-zinc-800 disabled:opacity-40 disabled:hover:bg-zinc-900"
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
