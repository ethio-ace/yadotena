"use client";

import { useMemo } from "react";
import { Table, Order, AddonItem } from "@/types";
import { formatETB } from "@/lib/currency";
import {
  addonNames, groupItemsByRound, roundStatus, roundTotal, itemStatus, hasItemStatuses,
  statusChipClass, statusLabel, statusDotClass, orderProgress, orderTicketNumber,
} from "@/lib/kitchen";
import { OrderProgressLine } from "@/components/waiter/OrderProgressLine";
import { ArrowLeft, Plus, Receipt, CreditCard, FilePlus, CheckCircle2, MessageSquareText, Check, X, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

interface TableDetailViewProps {
  table: Table;
  activeOrder: Order;
  /** Every open ticket on this table (newest first); a switcher shows when > 1. */
  tableOrders?: Order[];
  onSelectOrder?: (order: Order) => void;
  /** Start a separate ticket on this table (new party, separate bill). */
  onNewOrder: (table: Table) => void;
  allAddons: AddonItem[];
  isServing: boolean;
  onBack: () => void;
  onAddItems: (table: Table, order: Order) => void;
  onServeReady: (order: Order) => void;
  onViewOrder: (order: Order) => void;
  onSettleOrder: (order: Order) => void;
  /** Review a guest round placed from the public menu (DRAFT items). */
  onReviewRound: (order: Order, round: number, action: "approve" | "reject") => void;
}

/**
 * A busy table: what's on the ticket, where each round is in the kitchen, and
 * the next thing the waiter can do (add items, serve what's ready, settle).
 */
export function TableDetailView({
  table, activeOrder, tableOrders = [], allAddons, isServing,
  onBack, onAddItems, onNewOrder, onSelectOrder, onServeReady, onViewOrder, onSettleOrder, onReviewRound,
}: TableDetailViewProps) {
  const addonMap = useMemo(() => Object.fromEntries(allAddons.map((a) => [a.id, a.name])), [allAddons]);
  const rounds = groupItemsByRound(activeOrder.items);
  const legacy = hasItemStatuses(activeOrder.items) ? undefined : activeOrder.status;
  const progress = orderProgress(activeOrder);
  const ready = progress.ready;
  const paid = activeOrder.paymentStatus === "PAID";

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-150">
      {/* Header */}
      <div className="px-4 sm:px-6 py-3 border-b bg-card shrink-0">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button onClick={onBack} aria-label="Back to tables" className="h-10 w-10 -ml-2 rounded-xl flex items-center justify-center hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-black leading-tight truncate">{table.name}</h1>
            <p className="text-xs text-muted-foreground font-medium truncate">
              <span className="font-mono font-bold">#{orderTicketNumber(activeOrder)}</span>
              <span className="mx-1.5">·</span>
              <OrderProgressLine order={activeOrder} />
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-lg font-black leading-tight tabular-nums">{formatETB(activeOrder.total)}</p>
            <p className={cn("text-[11px] font-black uppercase", paid ? "text-emerald-600 dark:text-emerald-400" : "text-red-500")}>
              {paid ? "Paid" : "Unpaid"}
            </p>
          </div>
        </div>
      </div>

      {tableOrders.length > 1 && (
        <div className="px-4 sm:px-6 py-2 border-b bg-card shrink-0">
          <div className="max-w-3xl mx-auto flex gap-1.5 overflow-x-auto scrollbar-none" role="tablist" aria-label="Tickets on this table">
            {tableOrders.map((o) => {
              const active = o.id === activeOrder.id;
              return (
                <button
                  key={o.id}
                  role="tab"
                  aria-selected={active}
                  onClick={() => onSelectOrder?.(o)}
                  className={cn(
                    "h-9 px-3.5 rounded-full text-xs font-black whitespace-nowrap border-2 transition-colors tabular-nums",
                    active ? "bg-foreground border-foreground text-background" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  #{orderTicketNumber(o)} · {formatETB(o.total)}
                  {o.paymentStatus !== "PAID" && !active && <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-red-500 align-middle" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Ticket */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-3 pb-40">
          {progress.approval > 0 && (
            <div className="rounded-2xl bg-orange-500 text-white px-4 py-3 flex items-center gap-3">
              <Smartphone className="h-5 w-5 shrink-0" />
              <p className="text-sm font-bold">
                The guest ordered {progress.approval} item{progress.approval === 1 ? "" : "s"} from the menu. Check with them, then approve to send to the kitchen.
              </p>
            </div>
          )}
          {rounds.map(({ round, items }) => {
            const rStatus = roundStatus(items, legacy);
            const isGuestRound = rStatus === "DRAFT";
            return (
              <section key={round} className={cn("rounded-2xl border bg-card overflow-hidden", isGuestRound && "border-2 border-orange-500")}>
                <div className={cn("flex items-center justify-between px-4 py-2.5 border-b", isGuestRound ? "bg-orange-50 dark:bg-orange-950/20" : "bg-muted/40")}>
                  <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                    {isGuestRound ? "Guest order · from the menu" : round > 1 ? `Round ${round} · added later` : "First round"}
                  </span>
                  <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-black uppercase", statusChipClass(rStatus))}>
                    {statusLabel(rStatus)}
                  </span>
                </div>
                <ul className="divide-y divide-border/50">
                  {items.map((item, i) => {
                    const st = item.status || (legacy as typeof rStatus) || itemStatus(item);
                    const aNames = addonNames(item.selectedAddons, addonMap);
                    return (
                      <li key={item.id || i} className="flex items-start gap-3 px-4 py-2.5">
                        <span className={cn("mt-1.5 h-2 w-2 rounded-full shrink-0", statusDotClass(st))} title={statusLabel(st)} />
                        <div className="flex-1 min-w-0">
                          <p className={cn("text-sm font-bold", st === "SERVED" && "text-muted-foreground")}>
                            <span className="tabular-nums">{item.quantity}×</span> {item.name}
                          </p>
                          {aNames.length > 0 && <p className="text-xs text-muted-foreground">+ {aNames.join(", ")}</p>}
                          {item.specialInstructions && (
                            <p className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                              <MessageSquareText className="h-3 w-3 shrink-0" />
                              {item.specialInstructions}
                            </p>
                          )}
                        </div>
                        <span className="text-xs font-bold text-muted-foreground tabular-nums shrink-0">{statusLabel(st)}</span>
                      </li>
                    );
                  })}
                </ul>
                {isGuestRound ? (
                  <div className="p-3 border-t grid grid-cols-[auto_1fr] gap-2">
                    <button
                      onClick={() => onReviewRound(activeOrder, round, "reject")}
                      className="h-11 px-4 rounded-xl border-2 text-sm font-bold text-red-600 dark:text-red-400 hover:bg-red-500/10 flex items-center gap-1.5"
                    >
                      <X className="h-4 w-4" /> Reject
                    </button>
                    <button
                      onClick={() => onReviewRound(activeOrder, round, "approve")}
                      className="h-11 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-black flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                    >
                      <Check className="h-4 w-4" strokeWidth={3} />
                      Approve · {formatETB(roundTotal(items))}
                    </button>
                  </div>
                ) : (
                  <div className="px-4 py-2 border-t text-right text-xs font-bold text-muted-foreground tabular-nums">
                    {formatETB(roundTotal(items))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </div>

      {/* Action bar — the next steps, always in thumb reach */}
      <div className="shrink-0 border-t bg-card/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-3xl mx-auto p-3 sm:px-6 grid grid-cols-2 sm:flex gap-2">
          <button
            onClick={() => onAddItems(table, activeOrder)}
            className="sm:flex-1 h-14 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-base flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
          >
            <Plus className="h-5 w-5" strokeWidth={3} />
            Add items
          </button>
          <button
            onClick={() => onNewOrder(table)}
            className="sm:px-5 h-14 rounded-2xl border-2 border-primary text-primary font-black text-sm flex items-center justify-center gap-2 hover:bg-primary/10 active:scale-[0.98] transition-all"
          >
            <FilePlus className="h-4 w-4" />
            New order
          </button>
          {ready > 0 && (
            <button
              onClick={() => onServeReady(activeOrder)}
              disabled={isServing}
              className="col-span-2 sm:flex-1 h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-black text-base flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
            >
              <CheckCircle2 className="h-5 w-5" />
              Mark {ready} served
            </button>
          )}
          {!paid && (
            <button
              onClick={() => onSettleOrder(activeOrder)}
              className="h-14 sm:px-5 rounded-2xl border-2 font-black text-sm flex items-center justify-center gap-2 hover:bg-muted active:scale-[0.98] transition-all"
            >
              <CreditCard className="h-4 w-4" />
              Settle bill
            </button>
          )}
          <button
            onClick={() => onViewOrder(activeOrder)}
            className={cn(
              "h-14 sm:px-5 rounded-2xl border-2 font-bold text-sm text-muted-foreground flex items-center justify-center gap-2 hover:bg-muted hover:text-foreground active:scale-[0.98] transition-all",
              paid && "col-span-2"
            )}
          >
            <Receipt className="h-4 w-4" />
            Ticket
          </button>
        </div>
      </div>
    </div>
  );
}
