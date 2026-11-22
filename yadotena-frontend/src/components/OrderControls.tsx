"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { Order, Table } from "@/types";
import { formatETB } from "@/lib/currency";
import { isOrderActive } from "@/lib/tableUtils";
import { cn } from "@/lib/utils";
import { ArrowRightLeft, Ban, Loader2, ShieldCheck, Undo2, XCircle } from "lucide-react";

type Mode = null | "void" | "refund" | "cancel" | "move";

const STARTED = new Set(["PREPARING", "READY", "SERVED"]);

/**
 * "Manage ticket" panel. The server is the real gate; this only hides what
 * the signed-in role can't do:
 *  - anyone: move a dine-in ticket to another table (merges if it's busy);
 *    cancel a ticket the kitchen hasn't started and nobody has paid.
 *  - managers: void cooked/served lines, refund, cancel anything.
 * Every void/refund/cancel needs a reason; it lands in the day-close report.
 */
export function OrderControls({ order, onUpdated }: { order: Order; onUpdated: (order: Order) => void }) {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const isManager = role === "OWNER" || role === "MANAGER";
  const queryClient = useQueryClient();

  const [mode, setMode] = useState<Mode>(null);
  const [reason, setReason] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [amount, setAmount] = useState("");
  const [targetTable, setTargetTable] = useState("");
  const [error, setError] = useState<string | null>(null);

  const open = isOrderActive(order);
  const paid = order.amountPaid ?? 0;
  const started = (order.items || []).some((i) => STARTED.has(i.status || ""));
  const voidable = (order.items || []).filter((i) => i.status && !["CANCELLED", "DRAFT"].includes(i.status));
  const floorCanCancel = open && !started && paid <= 0;

  const canMove = open && order.type === "DINE_IN";
  const canCancel = order.status !== "CANCELLED" && (isManager || floorCanCancel);
  const canVoid = isManager && voidable.length > 0;
  const canRefund = isManager && paid > 0;

  const { data: tables = [] } = useQuery<Table[]>({
    queryKey: ["tables"],
    queryFn: api.tables.getAll,
    enabled: mode === "move",
  });
  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ["orders"],
    queryFn: api.orders.getAll,
    enabled: mode === "move",
  });
  const busyTables = useMemo(
    () => new Set(orders.filter((o) => isOrderActive(o) && o.tableId && o.id !== order.id).map((o) => o.tableId!)),
    [orders, order.id]
  );

  const mutation = useMutation({
    mutationFn: async (): Promise<Order> => {
      const why = reason.trim();
      switch (mode) {
        case "void":
          return api.orders.voidItems(order.id, selected, why);
        case "refund":
          return api.orders.refund(order.id, Number(amount), why);
        case "cancel":
          return api.orders.cancel(order.id, why);
        case "move":
          return api.orders.move(order.id, targetTable);
        default:
          throw new Error("Nothing to do");
      }
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["tables"] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      reset();
      onUpdated(updated);
    },
    onError: (err: Error) => setError(err.message || "That didn't go through."),
  });

  function reset() {
    setMode(null);
    setReason("");
    setSelected([]);
    setAmount("");
    setTargetTable("");
    setError(null);
  }

  function start(next: Mode) {
    reset();
    setMode(next);
    if (next === "refund") setAmount(String(paid));
  }

  if (!canMove && !canCancel && !canVoid && !canRefund) return null;

  const needsReason = mode === "void" || mode === "refund" || mode === "cancel";
  const reasonOk = reason.trim().length >= 3;
  const ready =
    mode === "void" ? selected.length > 0 && reasonOk
    : mode === "refund" ? Number(amount) > 0 && Number(amount) <= paid && reasonOk
    : mode === "cancel" ? reasonOk
    : mode === "move" ? !!targetTable
    : false;

  const voidValue = voidable
    .filter((i) => selected.includes(i.id))
    .reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <div className="rounded-xl border p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5" /> Manage ticket
        </h3>
        {!isManager && open && !floorCanCancel && (
          <span className="text-[11px] text-muted-foreground">Voids &amp; refunds need a manager</span>
        )}
      </div>

      {mode === null && (
        <div className="flex flex-wrap gap-2">
          {canMove && (
            <ActionButton onClick={() => start("move")} icon={<ArrowRightLeft className="h-3.5 w-3.5" />}>Move table</ActionButton>
          )}
          {canVoid && (
            <ActionButton onClick={() => start("void")} icon={<Ban className="h-3.5 w-3.5" />}>Void items</ActionButton>
          )}
          {canRefund && (
            <ActionButton onClick={() => start("refund")} icon={<Undo2 className="h-3.5 w-3.5" />}>Refund</ActionButton>
          )}
          {canCancel && (
            <ActionButton destructive onClick={() => start("cancel")} icon={<XCircle className="h-3.5 w-3.5" />}>Cancel ticket</ActionButton>
          )}
        </div>
      )}

      {mode === "move" && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Pick the new table. If it already has a ticket, this one is added to it as a new round (payments move too).
          </p>
          <select
            value={targetTable}
            onChange={(e) => setTargetTable(e.target.value)}
            className="w-full h-10 rounded-xl border bg-background px-3 text-sm font-semibold"
          >
            <option value="">Choose a table…</option>
            {tables
              .filter((t) => t.id !== order.tableId)
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}{busyTables.has(t.id) ? " — busy, will merge" : ""}
                </option>
              ))}
          </select>
        </div>
      )}

      {mode === "void" && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Take lines off the bill (wrong dish, complaint, comp). If the bill was already paid, the difference is recorded as a refund.
          </p>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {voidable.map((item) => (
              <label key={item.id} className="flex items-center justify-between gap-3 p-2 rounded-lg border bg-background/50 cursor-pointer">
                <span className="flex items-center gap-2 min-w-0">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-red-600"
                    checked={selected.includes(item.id)}
                    onChange={(e) =>
                      setSelected((prev) => (e.target.checked ? [...prev, item.id] : prev.filter((id) => id !== item.id)))
                    }
                  />
                  <span className="text-sm font-semibold truncate">{item.quantity}× {item.name}</span>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground shrink-0">{item.status?.toLowerCase()}</span>
                </span>
                <span className="font-mono text-xs font-bold shrink-0">{formatETB(item.price * item.quantity)}</span>
              </label>
            ))}
          </div>
          {selected.length > 0 && (
            <p className="text-xs font-bold text-red-600 dark:text-red-400">Removes {formatETB(voidValue)} (plus its service charge) from the bill.</p>
          )}
        </div>
      )}

      {mode === "refund" && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {formatETB(paid)} is held on this ticket. The refund is recorded as its own line, by you.
          </p>
          <input
            type="number"
            min={0}
            max={paid}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full h-10 rounded-xl border bg-background px-3 text-sm font-mono font-bold"
            aria-label="Refund amount"
          />
        </div>
      )}

      {mode === "cancel" && (
        <p className="text-xs text-muted-foreground">
          {paid > 0
            ? `Cancels every line and records a refund of ${formatETB(paid)}.`
            : "Cancels every line on this ticket and frees the table."}
        </p>
      )}

      {needsReason && (
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason (required) — e.g. wrong dish, guest left"
          maxLength={255}
          className="w-full h-10 rounded-xl border bg-background px-3 text-sm"
          autoFocus
        />
      )}

      {error && <p className="text-xs font-semibold text-red-600 dark:text-red-400">{error}</p>}

      {mode !== null && (
        <div className="flex gap-2">
          <button
            onClick={reset}
            className="flex-1 h-10 rounded-xl border text-xs font-bold hover:bg-accent transition-colors"
          >
            Back
          </button>
          <button
            disabled={!ready || mutation.isPending}
            onClick={() => { setError(null); mutation.mutate(); }}
            className={cn(
              "flex-1 h-10 rounded-xl text-xs font-bold text-white transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5",
              mode === "move" ? "bg-primary hover:bg-primary/90 text-primary-foreground" : "bg-red-600 hover:bg-red-700"
            )}
          >
            {mutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {mode === "move" ? "Move ticket" : mode === "void" ? "Void selected" : mode === "refund" ? "Record refund" : "Cancel ticket"}
          </button>
        </div>
      )}
    </div>
  );
}

function ActionButton({
  children, icon, onClick, destructive,
}: { children: React.ReactNode; icon: React.ReactNode; onClick: () => void; destructive?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "h-9 px-3 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors",
        destructive
          ? "border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/10"
          : "hover:bg-accent"
      )}
    >
      {icon}
      {children}
    </button>
  );
}
