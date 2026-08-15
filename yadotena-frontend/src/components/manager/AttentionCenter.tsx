"use client";

import { CheckCircle2, AlertTriangle, CreditCard, EyeOff, ClipboardList, BellRing, ArrowRight } from "lucide-react";
import Link from "next/link";

interface AttentionCenterProps {
  unverifiedPaymentsCount: number;
  unavailableItemsCount: number;
  unpaidOrdersCount: number;
  activeServiceCallsCount: number;
  onSelectAction?: (action: string) => void;
}

export function AttentionCenter({
  unverifiedPaymentsCount = 0,
  unavailableItemsCount = 0,
  unpaidOrdersCount = 0,
  activeServiceCallsCount = 0,
  onSelectAction,
}: AttentionCenterProps) {
  const totalAttentionItems =
    unverifiedPaymentsCount +
    unavailableItemsCount +
    unpaidOrdersCount +
    activeServiceCallsCount;

  if (totalAttentionItems === 0) {
    return (
      <div className="p-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3 text-center sm:text-left">
          <div className="h-10 w-10 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-black text-base text-emerald-700 dark:text-emerald-400 uppercase tracking-tight">
              ALL CAUGHT UP
            </h3>
            <p className="text-xs text-muted-foreground font-medium">
              No operational issues require manager intervention right now. Café running smoothly!
            </p>
          </div>
        </div>
        <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-500/30 shrink-0">
          ● All Systems Operational
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <h2 className="font-black text-sm uppercase tracking-wider text-foreground">
            NEEDS ATTENTION ({totalAttentionItems})
          </h2>
        </div>
        <span className="text-xs font-bold text-muted-foreground">
          Action Required
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Unverified Payments */}
        {unverifiedPaymentsCount > 0 && (
          <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/20 flex items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 font-bold">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-foreground">
                  {unverifiedPaymentsCount} Payment(s) Pending Verification
                </h4>
                <p className="text-xs text-muted-foreground">
                  Review digital transfers & receipt uploads
                </p>
              </div>
            </div>
            <Link href="/dashboard/payments">
              <button className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-black text-xs shadow-sm flex items-center gap-1 shrink-0 transition-all active:scale-95">
                <span>REVIEW</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </Link>
          </div>
        )}

        {/* Unavailable Menu Items */}
        {unavailableItemsCount > 0 && (
          <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/20 flex items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 font-bold">
                <EyeOff className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-foreground">
                  {unavailableItemsCount} Item(s) Out of Stock
                </h4>
                <p className="text-xs text-muted-foreground">
                  Update availability when stock arrives
                </p>
              </div>
            </div>
            <Link href="/dashboard/menu">
              <button className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-black text-xs shadow-sm flex items-center gap-1 shrink-0 transition-all active:scale-95">
                <span>MANAGE</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </Link>
          </div>
        )}

        {/* Unpaid Active Orders */}
        {unpaidOrdersCount > 0 && (
          <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/20 flex items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 font-bold">
                <ClipboardList className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-foreground">
                  {unpaidOrdersCount} Open Unpaid Order(s)
                </h4>
                <p className="text-xs text-muted-foreground">
                  Dine-in or takeaway pending settlement
                </p>
              </div>
            </div>
            <Link href="/dashboard/orders">
              <button className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-black text-xs shadow-sm flex items-center gap-1 shrink-0 transition-all active:scale-95">
                <span>VIEW</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </Link>
          </div>
        )}

        {/* Active Table Assistance Calls */}
        {activeServiceCallsCount > 0 && (
          <div className="p-4 rounded-2xl border border-rose-500/30 bg-rose-500/5 dark:bg-rose-950/20 flex items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 font-bold animate-bounce">
                <BellRing className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-foreground">
                  {activeServiceCallsCount} Table Assistance Call(s)
                </h4>
                <p className="text-xs text-muted-foreground">
                  Guests requesting waiter service or bill
                </p>
              </div>
            </div>
            <Link href="/dashboard/tables">
              <button className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-sm flex items-center gap-1 shrink-0 transition-all active:scale-95">
                <span>DISPATCH</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
