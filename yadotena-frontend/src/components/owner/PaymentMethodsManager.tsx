"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { cn } from "@/lib/utils";
import { Plus, Pencil, Smartphone, Building2, X } from "lucide-react";

interface PaymentMethod {
  id: string;
  name: string;
  code: string;
  type: "CASH" | "DIGITAL";
  accountNumber: string;
  accountName: string;
  instructions: string;
  qrCodeUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Draft {
  name: string;
  type: "CASH" | "DIGITAL";
  accountNumber: string;
  accountName: string;
  instructions: string;
  isActive: boolean;
}

const EMPTY_DRAFT: Draft = {
  name: "",
  type: "DIGITAL",
  accountNumber: "",
  accountName: "",
  instructions: "",
  isActive: true,
};

function MethodIcon({ type }: { type: string }) {
  const isDigital = type === "DIGITAL";
  return (
    <div
      className={cn(
        "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
        isDigital ? "bg-sky-500/10 text-sky-600 dark:text-sky-400" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
      )}
    >
      {isDigital ? <Smartphone className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}
    </div>
  );
}

function MethodEditor({
  initial,
  onClose,
}: {
  initial: PaymentMethod | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const isEdit = initial !== null;
  const [draft, setDraft] = useState<Draft>(
    initial
      ? {
          name: initial.name,
          type: initial.type,
          accountNumber: initial.accountNumber,
          accountName: initial.accountName,
          instructions: initial.instructions,
          isActive: initial.isActive,
        }
      : EMPTY_DRAFT
  );
  const [error, setError] = useState("");

  const save = useMutation({
    mutationFn: () =>
      isEdit
        ? api.paymentMethods.update(initial!.id, draft)
        : api.paymentMethods.create(draft),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-methods"] });
      onClose();
    },
  });

  const remove = useMutation({
    mutationFn: () => api.paymentMethods.delete(initial!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-methods"] });
      onClose();
    },
  });

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const handleSubmit = () => {
    if (!draft.name.trim()) return setError("Payment method name is required.");
    if (draft.type === "DIGITAL" && !draft.accountNumber.trim())
      return setError("Account / merchant number is required for digital methods.");
    setError("");
    save.mutate();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative w-full max-w-md bg-card border rounded-2xl shadow-2xl z-10 overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-5 py-4 border-b flex items-center justify-between bg-muted/40">
          <div>
            <h3 className="font-black text-sm text-foreground">
              {isEdit ? `Edit ${initial!.name}` : "Add Payment Method"}
            </h3>
            <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
              Waiters present these exact details when settling payments.
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Method Name</label>
            <input
              value={draft.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. CBE Birr"
              className="w-full h-10 px-3 rounded-xl border bg-background text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Type</label>
            <div className="flex items-center gap-1 p-1 bg-muted/50 border rounded-xl w-fit">
              {(["DIGITAL", "CASH"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => set("type", t)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all",
                    draft.type === t ? "bg-card text-foreground border shadow-sm" : "text-muted-foreground border border-transparent"
                  )}
                >
                  {t === "DIGITAL" ? "Digital" : "Cash"}
                </button>
              ))}
            </div>
          </div>

          {draft.type === "DIGITAL" && (
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Account / Merchant Number</label>
                <input
                  value={draft.accountNumber}
                  onChange={(e) => set("accountNumber", e.target.value)}
                  placeholder="e.g. 0911234567"
                  className="w-full h-10 px-3 rounded-xl border bg-background text-sm font-medium font-mono outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Account Holder Name</label>
                <input
                  value={draft.accountName}
                  onChange={(e) => set("accountName", e.target.value)}
                  placeholder="e.g. Yadotena Milk & Foods PLC"
                  className="w-full h-10 px-3 rounded-xl border bg-background text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50"
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Instructions (shown to customers)</label>
            <textarea
              rows={2}
              value={draft.instructions}
              onChange={(e) => set("instructions", e.target.value)}
              placeholder="e.g. Send to this number, then enter the reference on the payment screen."
              className="w-full p-3 rounded-xl border bg-background text-xs outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 resize-none"
            />
          </div>

          <button
            type="button"
            onClick={() => set("isActive", !draft.isActive)}
            className={cn(
              "w-full p-3 rounded-xl border flex items-center justify-between transition-colors",
              draft.isActive
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "border-border bg-card text-muted-foreground"
            )}
          >
            <span className="text-xs font-bold">
              {draft.isActive ? "● Enabled — customers can select it" : "○ Disabled — hidden from new payments"}
            </span>
          </button>

          {error && <p className="text-xs font-bold text-destructive">{error}</p>}

          <div className="flex items-center gap-2 pt-1">
            {isEdit && (
              <button
                type="button"
                disabled={remove.isPending}
                onClick={() => {
                  if (window.confirm(`Delete "${initial!.name}"? Existing payments stay recorded; customers can no longer select it.`)) {
                    remove.mutate();
                  }
                }}
                className="h-10 px-3 rounded-xl border border-destructive/40 text-destructive text-xs font-bold hover:bg-destructive/10 transition-colors"
              >
                {remove.isPending ? "Deleting..." : "Delete"}
              </button>
            )}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={save.isPending}
              className="flex-1 h-10 rounded-xl bg-amber-500 text-white font-black text-xs hover:bg-amber-600 transition-colors shadow-sm"
            >
              {save.isPending ? "Saving..." : isEdit ? "Save Changes" : "Add Method"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Owner payment-accounts manager — backed by the real `payment_methods` rows. */
export function PaymentMethodsManager() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<PaymentMethod | null>(null);
  const [adding, setAdding] = useState(false);

  const { data: methods = [], isLoading } = useQuery<PaymentMethod[]>({
    queryKey: ["payment-methods"],
    queryFn: () => api.paymentMethods.getAll(true),
  });

  const toggleActive = useMutation({
    mutationFn: (m: PaymentMethod) => api.paymentMethods.update(m.id, { isActive: !m.isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["payment-methods"] }),
  });

  const sorted = [...methods].sort((a, b) => {
    if (a.type !== b.type) return a.type === "DIGITAL" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-muted-foreground">
          {methods.length} payment method{methods.length !== 1 ? "s" : ""} on file
        </p>
        <button
          onClick={() => setAdding(true)}
          className="h-8 px-3 rounded-xl bg-amber-500 text-white font-black text-[11px] flex items-center gap-1.5 hover:bg-amber-600 transition-colors shadow-sm"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Method
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-muted/40 border rounded-xl animate-pulse" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <p className="py-8 text-center text-xs font-bold text-muted-foreground border border-dashed rounded-xl">
          No payment methods yet — add Telebirr, CBE, or your first bank account.
        </p>
      ) : (
        <div className="space-y-2">
          {sorted.map((m) => (
            <div
              key={m.id}
              onClick={() => setEditing(m)}
              className="flex items-center justify-between gap-3 p-3.5 rounded-xl border bg-background hover:border-amber-500/40 hover:bg-muted/20 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <MethodIcon type={m.type} />
                <div className="min-w-0">
                  <p className="text-sm font-black text-foreground flex items-center gap-2">
                    {m.name}
                    <span
                      className={cn(
                        "px-1.5 py-0.5 rounded-full text-[9px] font-black border",
                        m.isActive
                          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                          : "bg-muted text-muted-foreground border-border"
                      )}
                    >
                      {m.isActive ? "Enabled" : "Disabled"}
                    </span>
                  </p>
                  <p className="text-[11px] text-muted-foreground font-medium truncate">
                    {m.type === "DIGITAL"
                      ? `${m.accountName ? `${m.accountName} · ` : ""}${m.accountNumber || "—"}`
                      : "Cash register"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleActive.mutate(m);
                  }}
                  disabled={toggleActive.isPending && toggleActive.variables?.id === m.id}
                  className={cn(
                    "px-2.5 py-1 rounded-full text-[10px] font-black border transition-colors",
                    m.isActive
                      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20"
                      : "bg-muted text-muted-foreground border-border hover:text-foreground"
                  )}
                >
                  {m.isActive ? "Disable" : "Enable"}
                </button>
                <Pencil className="h-3.5 w-3.5 text-muted-foreground opacity-50" />
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && <MethodEditor initial={editing} onClose={() => setEditing(null)} />}
      {adding && <MethodEditor initial={null} onClose={() => setAdding(false)} />}
    </div>
  );
}
