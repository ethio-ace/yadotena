"use client";

import { useState, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatETB } from "@/lib/currency";
import { 
  X, CreditCard, Wallet, CheckCircle2, Upload, 
  Image as ImageIcon, Loader2, AlertCircle, Banknote 
} from "lucide-react";
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
  const [receiptUrl, setReceiptUrl] = useState<string>("");
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>("");
  const [validationError, setValidationError] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Query payment methods from backend
  const { data: paymentMethods = [] } = useQuery({
    queryKey: ["paymentMethods"],
    queryFn: () => api.paymentMethods.getAll(),
  });

  const settlePaymentMutation = useMutation({
    mutationFn: (data: { 
      orderId: string; 
      amount: number; 
      method: string; 
      reference?: string; 
      transactionRef?: string;
      receiptUrl?: string; 
      notes?: string; 
      status?: string 
    }) => api.payments.create(data),
    onSuccess: () => {
      onSuccess?.();
      onClose();
      resetForm();
    },
    onError: (err: any) => setValidationError(err.message || "Failed to settle payment"),
  });

  const resetForm = () => {
    setSelectedMethod("CASH");
    setCashTendered("");
    setTransactionRef("");
    setReceiptUrl("");
    setNotes("");
    setValidationError("");
  };

  if (!isOpen || !order) return null;

  const totalAmount = order.total || 0;
  const cashTenderedNum = parseFloat(cashTendered) || 0;
  const changeDue = Math.max(0, cashTenderedNum - totalAmount);

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setValidationError("");
    try {
      const result = await api.media.upload(file);
      setReceiptUrl(result.publicUrl || result.url);
    } catch (err: any) {
      setValidationError("Failed to upload receipt photo. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSettle = () => {
    setValidationError("");

    if (selectedMethod !== "CASH" && !transactionRef.trim()) {
      setValidationError("Transaction Reference ID is required for digital/bank payments.");
      return;
    }

    if (selectedMethod === "CASH" && cashTenderedNum > 0 && cashTenderedNum < totalAmount) {
      setValidationError(`Cash received (${formatETB(cashTenderedNum)}) is less than total amount due (${formatETB(totalAmount)}).`);
      return;
    }

    settlePaymentMutation.mutate({
      orderId: order.id,
      amount: totalAmount,
      method: selectedMethod,
      reference: transactionRef.trim() || undefined,
      transactionRef: transactionRef.trim() || undefined,
      receiptUrl: receiptUrl || undefined,
      notes: notes.trim() || undefined,
      status: "PAID",
    });
  };

  const cashPresets = [
    Math.ceil(totalAmount),
    Math.ceil(totalAmount / 100) * 100,
    500,
    1000,
  ].filter((v, i, self) => v >= totalAmount && self.indexOf(v) === i);

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-card border rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 relative max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b pb-3">
          <div>
            <h3 className="font-black text-lg flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <span>Settle Payment</span>
            </h3>
            <p className="text-xs text-muted-foreground font-medium">
              Order #{order.id.slice(-6).toUpperCase()} {order.tableId && `• Table #${order.tableId.replace("t", "")}`}
            </p>
          </div>
          <button 
            onClick={() => { resetForm(); onClose(); }} 
            className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Validation Alert */}
        {validationError && (
          <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-2xl flex items-center gap-2 text-xs font-bold text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Total Amount Card */}
        <div className="p-4 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-between shadow-sm">
          <div>
            <span className="text-xs font-bold text-muted-foreground uppercase block">Amount Due</span>
            <span className="text-2xl font-black text-primary">{formatETB(totalAmount)}</span>
          </div>
          <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-xs font-extrabold px-3 py-1">
            UNPAID
          </Badge>
        </div>

        {/* Payment Method Selector */}
        <div className="space-y-2">
          <label className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
            Select Payment Method
          </label>
          <div className="grid grid-cols-3 gap-2 text-xs font-bold">
            <button
              type="button"
              onClick={() => { setSelectedMethod("CASH"); setValidationError(""); }}
              className={`p-3 rounded-2xl border transition-all flex flex-col items-center gap-1 ${
                selectedMethod === "CASH"
                  ? "bg-primary text-primary-foreground border-primary shadow-md scale-102"
                  : "bg-card border-border text-muted-foreground hover:bg-muted/50"
              }`}
            >
              <Banknote className="h-5 w-5" />
              <span>Cash</span>
            </button>

            <button
              type="button"
              onClick={() => { setSelectedMethod("BANK_TRANSFER"); setValidationError(""); }}
              className={`p-3 rounded-2xl border transition-all flex flex-col items-center gap-1 ${
                selectedMethod === "BANK_TRANSFER" || selectedMethod === "BANK"
                  ? "bg-primary text-primary-foreground border-primary shadow-md scale-102"
                  : "bg-card border-border text-muted-foreground hover:bg-muted/50"
              }`}
            >
              <CreditCard className="h-5 w-5" />
              <span>Digital / Bank</span>
            </button>

            <button
              type="button"
              onClick={() => { setSelectedMethod("WALLET"); setValidationError(""); }}
              className={`p-3 rounded-2xl border transition-all flex flex-col items-center gap-1 ${
                selectedMethod === "WALLET"
                  ? "bg-primary text-primary-foreground border-primary shadow-md scale-102"
                  : "bg-card border-border text-muted-foreground hover:bg-muted/50"
              }`}
            >
              <Wallet className="h-5 w-5" />
              <span>Wallet</span>
            </button>
          </div>

          {paymentMethods.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {paymentMethods.map((pm: any) => (
                <button
                  key={pm.id}
                  type="button"
                  onClick={() => { setSelectedMethod(pm.code || pm.name); setValidationError(""); }}
                  className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold transition-all ${
                    selectedMethod === (pm.code || pm.name)
                      ? "bg-primary/20 border-primary text-primary"
                      : "bg-muted/30 border-transparent text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {pm.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* CASH SPECIFIC INPUT & CALCULATOR */}
        {selectedMethod === "CASH" ? (
          <div className="space-y-3 bg-muted/30 p-4 rounded-2xl border border-border">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground flex justify-between">
                <span>Cash Received (ETB)</span>
                {cashTenderedNum > 0 && cashTenderedNum >= totalAmount && (
                  <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">Valid Amount</span>
                )}
              </label>
              <Input
                type="number"
                placeholder={`e.g. ${totalAmount}`}
                value={cashTendered}
                onChange={(e) => setCashTendered(e.target.value)}
                className="text-base h-11 font-black rounded-xl bg-background border"
              />
            </div>

            {/* Quick Cash Presets */}
            {cashPresets.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                <span className="text-[10px] font-extrabold uppercase text-muted-foreground self-center mr-1">Presets:</span>
                {cashPresets.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setCashTendered(preset.toString())}
                    className="px-2.5 py-1 rounded-lg bg-background border text-xs font-extrabold text-foreground hover:border-primary hover:text-primary transition-all"
                  >
                    {formatETB(preset)}
                  </button>
                ))}
              </div>
            )}

            {cashTenderedNum > 0 && (
              <div className="flex justify-between items-center text-sm font-black pt-2 border-t border-border">
                <span className="text-muted-foreground">Change to Return:</span>
                <span className={cashTenderedNum >= totalAmount ? "text-emerald-600 dark:text-emerald-400 text-base font-black" : "text-destructive"}>
                  {cashTenderedNum >= totalAmount ? formatETB(changeDue) : "Insufficient cash"}
                </span>
              </div>
            )}
          </div>
        ) : (
          /* DIGITAL / BANK / WALLET SPECIFIC INPUT */
          <div className="space-y-3 bg-muted/30 p-4 rounded-2xl border border-border">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground flex justify-between">
                <span>Transaction Reference *</span>
                <span className="text-destructive text-[10px]">Required</span>
              </label>
              <Input
                placeholder="e.g. TXN-984210 or CBE-839284"
                value={transactionRef}
                onChange={(e) => {
                  setTransactionRef(e.target.value);
                  if (validationError) setValidationError("");
                }}
                className="text-xs h-10 rounded-xl bg-background font-mono border"
              />
            </div>

            {/* Optional Receipt Photo Upload */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground flex justify-between">
                <span>Receipt Photo (Optional)</span>
                {receiptUrl && <span className="text-emerald-600 text-[10px] font-bold">Uploaded ✓</span>}
              </label>

              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleReceiptUpload}
                className="hidden"
              />

              {receiptUrl ? (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-background border text-xs">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-primary shrink-0" />
                    <span className="truncate max-w-[180px] font-medium text-foreground">Receipt Uploaded</span>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setReceiptUrl("")}
                    className="h-7 text-[10px] text-destructive hover:bg-destructive/10"
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="w-full h-10 rounded-xl text-xs font-bold border-dashed border-muted-foreground/40 gap-2 hover:border-primary text-muted-foreground hover:text-foreground"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      Uploading Receipt...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Upload Receipt Image
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Submit Action */}
        <div className="pt-2">
          <Button
            onClick={handleSettle}
            disabled={settlePaymentMutation.isPending || isUploading}
            className="w-full h-12 rounded-2xl font-black text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 gap-2"
          >
            {settlePaymentMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Confirming Settlement...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Confirm Payment ({formatETB(totalAmount)})
              </>
            )}
          </Button>
        </div>

      </div>
    </div>
  );
}
