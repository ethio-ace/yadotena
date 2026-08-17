"use client";

import { Order } from "@/types";
import { KitchenColumn } from "./KitchenColumn";
import { KitchenOrderCard } from "./KitchenOrderCard";
import { KitchenEmptyState } from "./KitchenEmptyState";
import { buildRoundCards, activeRoundCards } from "@/lib/kitchen";

interface KitchenBoardProps {
  orders: Order[];
  newCardKeys?: Set<string>;
  addonMap?: Record<string, string>;
  tableLabels?: Record<string, string>;
  onStartPreparing: (orderId: string, round: number) => void;
  onMarkReady: (orderId: string, round: number) => void;
  onInspectOrder: (order: Order) => void;
  updatingKey?: string | null;
  /** Jump to the paginated page for a status (e.g. lane "view all" link). */
  onShowAll?: (status: "PENDING" | "PREPARING" | "READY") => void;
}

// Each lane in the overview is capped so a huge queue stays glanceable; the
// "view all" footer links to that status's paginated page.
const OVERVIEW_LANE_CAP = 10;
const MOBILE_QUEUE_LIMIT = 15;

/**
 * QUEUE view: at-a-glance 3-lane overview (capped lanes on desktop, merged
 * oldest-first scroll on mobile). Large queues are handled by the dedicated
 * NEW / PREP / READY pages, which paginate the same cards.
 */
export function KitchenBoard({
  orders,
  newCardKeys,
  addonMap,
  tableLabels,
  onStartPreparing,
  onMarkReady,
  onInspectOrder,
  updatingKey,
  onShowAll,
}: KitchenBoardProps) {
  // One card per kitchen round, not per order: a ticket with round 1 cooking
  // and round 2 just arrived shows in both PREPARING and NEW simultaneously.
  // Stable FIFO: oldest round on top; new arrivals slot in at the bottom.
  const cards = activeRoundCards(buildRoundCards(orders)).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const pendingCards = cards.filter((c) => c.status === "PENDING");
  const preparingCards = cards.filter((c) => c.status === "PREPARING");
  const readyCards = cards.filter((c) => c.status === "READY");

  return (
    <div className="flex flex-col flex-1 p-4 max-w-[1800px] mx-auto w-full">
      {/* DESKTOP & TABLET 3-LANE OVERVIEW (md+) */}
      <div className="hidden md:grid md:grid-cols-3 gap-5 flex-1 items-start">
        <KitchenColumn
          title="New Tickets"
          status="PENDING"
          cards={pendingCards}
          maxCards={OVERVIEW_LANE_CAP}
          onShowAll={() => onShowAll?.("PENDING")}
          newCardKeys={newCardKeys}
          addonMap={addonMap}
          tableLabels={tableLabels}
          onStartPreparing={onStartPreparing}
          onInspect={onInspectOrder}
          updatingKey={updatingKey}
        />

        <KitchenColumn
          title="Preparing"
          status="PREPARING"
          cards={preparingCards}
          maxCards={OVERVIEW_LANE_CAP}
          onShowAll={() => onShowAll?.("PREPARING")}
          addonMap={addonMap}
          tableLabels={tableLabels}
          onMarkReady={onMarkReady}
          onInspect={onInspectOrder}
          updatingKey={updatingKey}
        />

        <KitchenColumn
          title="Ready"
          status="READY"
          cards={readyCards}
          maxCards={OVERVIEW_LANE_CAP}
          onShowAll={() => onShowAll?.("READY")}
          addonMap={addonMap}
          tableLabels={tableLabels}
          onInspect={onInspectOrder}
          updatingKey={updatingKey}
        />
      </div>

      {/* MOBILE MERGED QUEUE (<md): everything oldest-first; the header's
          NEW / PREP / READY segments open the focused paginated pages. */}
      <div className="md:hidden space-y-3">
        {cards.slice(0, MOBILE_QUEUE_LIMIT).map((card) => (
          <KitchenOrderCard
            key={card.key}
            card={card}
            isNew={newCardKeys?.has(card.key)}
            addonMap={addonMap}
            tableLabels={tableLabels}
            onStartPreparing={onStartPreparing}
            onMarkReady={onMarkReady}
            onInspect={onInspectOrder}
            updatingKey={updatingKey}
          />
        ))}

        {cards.length === 0 && <KitchenEmptyState type="ALL_CLEAR" />}

        {cards.length > MOBILE_QUEUE_LIMIT && (
          <p className="text-center text-[11px] text-zinc-600 font-medium pt-1">
            Showing {MOBILE_QUEUE_LIMIT} of {cards.length} — use NEW / PREP / READY to focus.
          </p>
        )}
      </div>
    </div>
  );
}
