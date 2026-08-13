"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatETB } from "@/lib/currency";
import { X, CreditCard, Wallet, CheckCircle2 } from "lucide-react";
import { Order } from "@/types";

interface PaymentSettlementModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function PaymentSettlementModal({
  order,
  isOpen,
  onClose,
  onSuccess,
}: PaymentSettlementModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<string>("CASH");
  const [cashTendered, setCashTendered] = useState<string>("");
  const [transactionRef, setTransactionRef] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  // Query payment methods from owner setup
  const { data: paymentMethods = [] } = useQuery({
    queryKey: ["paymentMethods"],
    queryFn: () => api.paymentMethods.getAll(),
  });

  const settlePaymentMutation = useMutation({
    mutationFn: (data: { orderId: string; amount: number; method: string; reference?: string; notes?: string }) =>
      api.payments.create(data),
    onSuccess: () => {
      onSuccess?.();
      onClose();
      alert("Payment settled successfully!");
    },
    onError: (err: any) => alert(err.message || "Failed to settle payment"),
  });

  if (!isOpen || !order) return null;

  const totalAmount = order.total || 0;
  const cashTenderedNum = parseFloat(cashTendered) || 0;
  const changeDue = Math.max(0, cashTenderedNum - totalAmount);

  const handleSettle = () => {
    settlePaymentMutation.mutate({
      orderId: order.id,
      amount: totalAmount,
      method: selectedMethod,
      reference: transactionRef.trim() || undefined,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border rounded-2xl shadow-xl max-w-md w-full p-5 space-y-4 relative">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b pb-3">
          <div>
            <h3 className="font-black text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" />
              <span>Settle Payment</span>
            </h3>
            <p className="text-xs text-muted-foreground">
              Order #{order.id.slice(-6).toUpperCase()} {order.tableId && `• Table #${order.tableId.replace("t", "")}`}
            </p>
          </div>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Total Display */}
        <div className="p-3 bg-muted/40 rounded-xl border flex items-center justify-between">
          <span className="text-xs font-bold text-muted-foreground">Total Bill Amount</span>
          <span className="text-lg font-black text-primary">{formatETB(totalAmount)}</span>
        </div>

        {/* Payment Methods Options */}
        <div className="space-y-2">
          <label className="text-xs font-extrabold uppercase text-muted-foreground">
            Select Payment Method
          </label>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              onClick={() => setSelectedMethod("CASH")}
              className={`p-2.5 rounded-xl border font-bold flex items-center justify-center gap-1.5 transition-all ${
                selectedMethod === "CASH"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/30 border-transparent text-muted-foreground hover:bg-muted"
              }`}
            >
              💵 Cash
            </button>

            {paymentMethods.map((pm: any) => (
              <button
                key={pm.id}
                onClick={() => setSelectedMethod(pm.code || pm.name)}
                className={`p-2.5 rounded-xl border font-bold flex items-center justify-center gap-1.5 transition-all ${
                  selectedMethod === (pm.code || pm.name)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/30 border-transparent text-muted-foreground hover:bg-muted"
                }`}
              >
                🏦 {pm.name}
              </button>
            ))}
          </div>
        </div>

        {/* Cash Tendered & Change Calculator */}
        {selectedMethod === "CASH" ? (
          <div className="space-y-2 bg-muted/20 p-3 rounded-xl border">
            <label className="text-xs font-bold text-muted-foreground">Cash Received (ETB)</label>
            <Input
              type="number"
              placeholder="e.g. 500"
              value={cashTendered}
              onChange={(e) => setCashTendered(e.target.value)}
              className="text-xs h-9 rounded-xl"
            />
            {cashTenderedNum > 0 && (
              <div className="flex justify-between text-xs font-black pt-1 border-t">
                <span>Change to Return:</span>
                <span className="text-emerald-600 dark:text-emerald-400">{formatETB(changeDue)}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2 bg-muted/20 p-3 rounded-xl border">
            <label className="text-xs font-bold text-muted-foreground">Digital Transaction Reference ID</label>
            <Input
              placeholder="e.g. TXN-984210"
              value={transactionRef}
              onChange={(e) => setTransactionRef(e.target.value)}
              className="text-xs h-9 rounded-xl"
            />
          </div>
        )}

        {/* Submit */}
        <Button
          onClick={handleSettle}
          disabled={settlePaymentMutation.isPending}
          className="w-full h-11 rounded-xl font-black text-xs bg-primary text-primary-foreground shadow-md"
        >
          {settlePaymentMutation.isPending ? "Processing Settlement..." : `Complete Settlement (${formatETB(totalAmount)})`}
        </Button>

      </div>
    </div>
  );
}
