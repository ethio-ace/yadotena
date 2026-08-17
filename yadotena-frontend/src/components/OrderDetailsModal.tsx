import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { Order, MenuItem, AddonItem } from "@/types";
import { formatETB } from "@/lib/currency";
import { addonNames, groupItemsByRound, roundStatus, roundTotal, roundCount, hasItemStatuses } from "@/lib/kitchen";
import { formatTableRef, useTableLabels } from "@/hooks/useTableLabels";
import { X, CreditCard, CheckCircle2, Receipt, Eye, ExternalLink, Image as ImageIcon, RotateCcw } from "lucide-react";
import { OrderProgressStepper } from "@/components/dashboard/OrderProgressStepper";

interface OrderDetailsModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  menu?: MenuItem[];
  onSettle?: (order: Order) => void;
}

export function OrderDetailsModal({ order, isOpen, onClose, menu = [], onSettle }: OrderDetailsModalProps) {
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);
  const tableLabels = useTableLabels();

  const { data: addons = [] } = useQuery<AddonItem[]>({
    queryKey: ["addons"],
    queryFn: () => api.addons.getAll(),
    enabled: isOpen && !!order,
  });
  const addonMap = useMemo(() => Object.fromEntries(addons.map(a => [a.id, a.name])), [addons]);

  if (!isOpen || !order) return null;

  const isPaid = order.paymentStatus === "PAID";
  const payments = order.payments || [];

  const getItemImage = (menuItemId: string) => {
    const mi = menu.find(m => m.id === menuItemId);
    if (!mi) return null;
    const path = mi.imageUrl || mi.image;
    if (!path) return null;
    return path.startsWith("http") || path.startsWith("/") ? path : `/uploads/${path}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED": return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
      case "READY": return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border-emerald-300";
      case "SERVED": return "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 border-blue-300";
      case "PREPARING": return "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400 border-purple-300";
      case "CANCELLED": return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 border-red-300";
      default: return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 border-amber-300";
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-card w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="p-5 border-b bg-muted/20 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black tracking-tight">{order.id.slice(-6).toUpperCase()}</h2>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStatusColor(order.status)}`}>
                {order.status}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${isPaid ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" : "bg-amber-500/10 text-amber-600 border-amber-500/30"}`}>
                {isPaid ? "PAID" : "UNPAID"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
              <span>{order.tableId ? formatTableRef(order.tableId, tableLabels) : order.type}</span>
              {roundCount(order) > 1 && (
                <>
                  <span>•</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">{roundCount(order)} rounds</span>
                </>
              )}
              <span>•</span>
              <span>{new Date(order.createdAt).toLocaleString()}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Live Stepper */}
          <OrderProgressStepper status={order.status} />

          {/* Order Items — grouped into round tickets, each with its own state */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
              <Receipt className="h-3.5 w-3.5" /> Round Tickets ({order.items?.length || 0} items)
            </h3>
            <div className="space-y-4">
              {groupItemsByRound(order.items).map(({ round, items }) => {
                const fallback = hasItemStatuses(order.items) ? undefined : order.status;
                const rStatus = roundStatus(items, fallback);
                const extended = round > 1;
                const rStatusChip =
                  rStatus === "READY"
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                    : rStatus === "PREPARING"
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
                      : rStatus === "SERVED"
                        ? "bg-muted text-muted-foreground"
                        : rStatus === "CANCELLED"
                          ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
                          : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400";
                return (
                  <div key={round} className="rounded-2xl border overflow-hidden">
                    {/* Ticket header */}
                    <div className="flex items-center justify-between gap-2 px-3.5 py-2 bg-muted/40 border-b">
                      <div className="flex items-center gap-2 min-w-0">
                        {extended && <RotateCcw className="h-3.5 w-3.5 shrink-0 text-amber-500" />}
                        <span className={`text-[10px] font-black uppercase tracking-wider ${extended ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>
                          {extended ? `Round ${round} · Added later` : "Original ticket"}
                        </span>
                        <span className="text-[11px] text-muted-foreground font-medium">
                          {items.length} item{items.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wide ${rStatusChip}`}>
                          {rStatus === "PENDING" ? "Waiting" : rStatus.charAt(0) + rStatus.slice(1).toLowerCase()}
                        </span>
                        <span className="font-mono text-xs font-bold text-muted-foreground">{formatETB(roundTotal(items))}</span>
                      </div>
                    </div>

                    <div className="p-3 space-y-2.5">
                      {items.map((item, idx) => {
                        const img = getItemImage(item.menuItemId);
                        const aNames = addonNames(item.selectedAddons, addonMap);

                        return (
                          <div key={item.id || idx} className="p-3 rounded-xl border bg-background/50 space-y-1.5">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                {img ? (
                                  <img src={img} alt={item.name} className="h-10 w-10 rounded-lg object-cover shrink-0 border" />
                                ) : (
                                  <div className="h-10 w-10 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold flex items-center justify-center text-xs shrink-0 border border-amber-500/20">
                                    {item.quantity}×
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <div className="font-bold text-sm truncate">{item.quantity}× {item.name}</div>
                                  {item.specialInstructions && (
                                    <p className="text-xs text-amber-600 dark:text-amber-400 italic truncate">
                                      &ldquo;{item.specialInstructions}&rdquo;
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="font-mono font-bold text-sm shrink-0">
                                {formatETB(item.price * item.quantity)}
                              </div>
                            </div>

                            {/* Add-ons */}
                            {aNames.length > 0 && (
                              <div className="pl-4 space-y-0.5 text-xs text-muted-foreground border-l-2 border-amber-500/40">
                                {aNames.map((aName, aIdx) => (
                                  <div key={aIdx} className="flex items-center gap-1 text-foreground">
                                    <span className="text-amber-500 font-bold">+</span>
                                    <span>{aName}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Financial Breakdown */}
          <div className="p-4 rounded-xl border bg-muted/10 space-y-2 text-sm">
            {order.subtotal !== undefined && order.subtotal > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>{formatETB(order.subtotal)}</span>
              </div>
            )}
            {order.tax !== undefined && order.tax > 0 && (
              <div className="flex justify-between text-muted-foreground text-xs">
                <span>VAT (15%)</span>
                <span>{formatETB(order.tax)}</span>
              </div>
            )}
            {order.serviceCharge !== undefined && order.serviceCharge > 0 && (
              <div className="flex justify-between text-muted-foreground text-xs">
                <span>Service Charge (10%)</span>
                <span>{formatETB(order.serviceCharge)}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-2 border-t font-black text-base">
              <span>Total Amount</span>
              <span className="text-lg text-emerald-600 dark:text-emerald-400">{formatETB(order.total)}</span>
            </div>
          </div>

          {/* Settled Payment Breakdown Section */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5" /> Payment Details
            </h3>

            {payments.length > 0 ? (
              <div className="space-y-3">
                {payments.map(p => (
                  <div key={p.id} className="p-4 rounded-xl border bg-emerald-500/5 dark:bg-emerald-950/20 border-emerald-500/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        <span className="font-bold text-sm uppercase tracking-wide">{p.method || "Settled"}</span>
                      </div>
                      <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                        {formatETB(p.amount || order.total)}
                      </span>
                    </div>

                    {p.transactionRef && (
                      <div className="flex items-center justify-between text-xs bg-background/80 p-2 rounded-lg border">
                        <span className="text-muted-foreground font-medium">Reference / TXN:</span>
                        <span className="font-mono font-bold text-foreground">{p.transactionRef}</span>
                      </div>
                    )}

                    {p.createdAt && (
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Paid At:</span>
                        <span>{new Date(p.createdAt).toLocaleString()}</span>
                      </div>
                    )}

                    {p.receiptUrl && (
                      <div className="pt-2 border-t border-emerald-500/20">
                        <p className="text-xs font-bold text-muted-foreground mb-2 flex items-center gap-1">
                          <ImageIcon className="h-3.5 w-3.5" /> Payment Proof / Receipt:
                        </p>
                        <button
                          onClick={() => setSelectedReceipt(p.receiptUrl!.startsWith("http") || p.receiptUrl!.startsWith("/") ? p.receiptUrl! : `/uploads/${p.receiptUrl}`)}
                          className="group relative w-full h-32 rounded-lg border bg-black/5 overflow-hidden hover:opacity-90 transition-opacity">
                          <img
                            src={p.receiptUrl.startsWith("http") || p.receiptUrl.startsWith("/") ? p.receiptUrl : `/uploads/${p.receiptUrl}`}
                            alt="Receipt proof"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white font-bold text-xs gap-1.5 transition-opacity">
                            <Eye className="h-4 w-4" /> Expand Receipt
                          </div>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : isPaid ? (
              <div className="p-4 rounded-xl border bg-emerald-500/5 dark:bg-emerald-950/20 border-emerald-500/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <div className="font-bold text-sm text-emerald-700 dark:text-emerald-400">Paid & Settled</div>
                    <div className="text-xs text-muted-foreground">Full bill of {formatETB(order.total)} cleared.</div>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-xs">Settled</span>
              </div>
            ) : (
              <div className="p-4 rounded-xl border bg-amber-500/5 border-amber-500/20 flex items-center justify-between">
                <div>
                  <div className="font-bold text-sm text-amber-700 dark:text-amber-400">Payment Pending</div>
                  <div className="text-xs text-muted-foreground">Amount due: {formatETB(order.total)}</div>
                </div>
                {onSettle && (
                  <button
                    onClick={() => { onClose(); onSettle(order); }}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md active:scale-95 transition-all">
                    Settle Payment
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t bg-muted/20 text-center">
          <span className="text-[11px] text-muted-foreground font-medium">Tap outside to close</span>
        </div>
      </div>

      {/* Receipt Lightbox Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setSelectedReceipt(null)}>
          <div className="relative max-w-2xl w-full bg-card rounded-2xl overflow-hidden border p-2" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-3 border-b">
              <span className="font-bold text-sm flex items-center gap-1.5">
                <Receipt className="h-4 w-4" /> Payment Receipt Proof
              </span>
              <button onClick={() => setSelectedReceipt(null)} className="p-1 rounded-lg hover:bg-accent">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-2 max-h-[80vh] overflow-auto flex items-center justify-center bg-black/5">
              <img src={selectedReceipt} alt="Receipt proof expanded" className="max-w-full max-h-[70vh] rounded-lg object-contain shadow-lg" />
            </div>
            <div className="p-3 border-t flex justify-end">
              <a href={selectedReceipt} target="_blank" rel="noopener noreferrer" className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs flex items-center gap-1.5">
                <ExternalLink className="h-3.5 w-3.5" /> Open Full Image
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
