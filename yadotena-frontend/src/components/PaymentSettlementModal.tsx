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
  Image as ImageIcon, Loader2, AlertCircle, Banknote,
  Copy, Check
} from "lucide-react";
import { Order } from "@/types";
import { roundCount, groupItemsByRound, roundTotal } from "@/lib/kitchen";
import { formatTableRef, useTableLabels } from "@/hooks/useTableLabels";

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
  const [copiedAccount, setCopiedAccount] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tableLabels = useTableLabels();

  // Query payment methods from backend
  const { data: paymentMethods = [] } = useQuery({
    queryKey: ["paymentMethods"],
    queryFn: () => api.paymentMethods.getAll(),
  });

  const handleCopyAccount = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedAccount(true);
    setTimeout(() => setCopiedAccount(false), 2000);
  };

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
      <div 
        className="fixed inset-0" 
        onClick={() => { resetForm(); onClose(); }} 
      />
      <div className="bg-card border rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 relative max-h-[90vh] overflow-y-auto z-10">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b pb-3">
          <div>
            <h3 className="font-black text-lg flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <span>Settle Payment</span>
            </h3>
            <p className="text-xs text-muted-foreground font-medium">
              Order {order.id.slice(-6).toUpperCase()} {order.tableId && `• ${formatTableRef(order.tableId, tableLabels)}`}
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

        {/* One payment settles every round of the ticket */}
        {(() => {
          const rounds = groupItemsByRound(order.items);
          if (rounds.length <= 1) return null;
          return (
            <div className="p-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 space-y-2">
              <p className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5" /> Single payment · {roundCount(order)} rounds on this ticket
              </p>
              <div className="space-y-1">
                {rounds.map(({ round, items }) => (
                  <div key={round} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-medium">
                      Round {round} · {items.length} item{items.length !== 1 ? "s" : ""}
                    </span>
                    <span className="font-mono font-bold text-foreground">{formatETB(roundTotal(items))}</span>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground font-medium border-t border-amber-500/15 pt-1.5">
                One payment method settles the whole bill — all rounds in a single transaction.
              </p>
            </div>
          );
        })()}

        {/* Payment Method Selector (Dynamically Loaded from DB) */}
        <div className="space-y-2">
          <label className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground flex justify-between items-center">
            <span>Select Payment Method (DB)</span>
            <span className="text-[10px] text-muted-foreground font-normal">
              {paymentMethods.length > 0 ? `${paymentMethods.length} Available` : "Loading DB Methods..."}
            </span>
          </label>

          {/* Dynamic Grid of DB Payment Methods */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-bold">
            {(paymentMethods.length > 0 ? paymentMethods : [
              { id: "cash", name: "Cash", code: "CASH", type: "CASH" },
              { id: "cbe", name: "CBE Birr / Transfer", code: "CBE_BIRR", type: "DIGITAL", accountNumber: "1000123456789", accountName: "Yadotena Restaurant", instructions: "Transfer to CBE Account 1000123456789 and input Txn ID" },
              { id: "telebirr", name: "Telebirr", code: "TELEBIRR", type: "WALLET", accountNumber: "0911223344", accountName: "Yadotena Merchant", instructions: "Pay via Telebirr Merchant ID 0911223344" },
              { id: "boa", name: "Bank of Abyssinia", code: "BOA", type: "DIGITAL", accountNumber: "88990011", accountName: "Yadotena POS" },
            ]).map((pm: any) => {
              const code = pm.code || pm.name;
              const isSelected = selectedMethod === code || (selectedMethod === "CASH" && pm.type === "CASH");
              const isCash = pm.type === "CASH" || code.toUpperCase() === "CASH";

              return (
                <button
                  key={pm.id || code}
                  type="button"
                  onClick={() => {
                    setSelectedMethod(code);
                    setValidationError("");
                  }}
                  className={`p-3 rounded-2xl border transition-all flex flex-col items-center justify-center gap-1 text-center ${
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary shadow-md scale-102 font-black"
                      : "bg-card border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  }`}
                >
                  {isCash ? (
                    <Banknote className="h-5 w-5 shrink-0" />
                  ) : pm.type === "WALLET" ? (
                    <Wallet className="h-5 w-5 shrink-0" />
                  ) : (
                    <CreditCard className="h-5 w-5 shrink-0" />
                  )}
                  <span className="truncate max-w-full text-xs">{pm.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic Payment Details & Inputs based on Selected DB Method */}
        {(() => {
          const fallbackMethods = [
            { id: "cbe", name: "Commercial Bank of Ethiopia (CBE)", code: "CBE", type: "DIGITAL", accountNumber: "1000123456789", accountName: "Yadotena Milk & Foods", instructions: "Transfer exact bill amount to CBE Account 1000123456789 and input TXN Ref ID" },
            { id: "telebirr", name: "Telebirr SuperApp", code: "TELEBIRR", type: "DIGITAL", accountNumber: "0911234567", accountName: "Yadotena Milk & Foods PLC", instructions: "Transfer via Telebirr App/Merchant to 0911234567 and input reference code" },
            { id: "boa", name: "Bank of Abyssinia (BOA)", code: "BOA", type: "DIGITAL", accountNumber: "987654321", accountName: "Yadotena Milk & Foods", instructions: "Transfer to BOA Account 987654321 and input transaction reference" },
            { id: "ebirr", name: "E-Birr / Mobile Wallet", code: "EBIRR", type: "DIGITAL", accountNumber: "0911234567", accountName: "Yadotena Milk & Foods PLC", instructions: "Transfer via E-Birr mobile agent or shortcode" },
          ];

          const allMethods = paymentMethods.length > 0 ? paymentMethods : fallbackMethods;

          const currentMethodObj = allMethods.find(
            (pm: any) =>
              (pm.code || "").toUpperCase() === selectedMethod.toUpperCase() ||
              (pm.name || "").toUpperCase() === selectedMethod.toUpperCase() ||
              pm.id === selectedMethod ||
              (selectedMethod === "CBE_BIRR" && pm.code === "CBE")
          ) || fallbackMethods.find((pm: any) => pm.code === selectedMethod || pm.id === selectedMethod) || fallbackMethods[0];

          const isCash = selectedMethod === "CASH" || currentMethodObj?.type === "CASH";

          if (isCash) {
            return (
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
            );
          }

          return (
            <div className="space-y-3.5 bg-muted/30 p-4 rounded-2xl border border-border">
              {/* Account Details Display Card */}
              <div className="p-4 bg-card border border-primary/30 rounded-2xl space-y-3 shadow-sm">
                <div className="flex items-center justify-between border-b border-border pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase">
                      {currentMethodObj?.code || "PAY"}
                    </div>
                    <div>
                      <span className="font-extrabold text-sm text-foreground block leading-tight">
                        {currentMethodObj?.name || selectedMethod}
                      </span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">
                        Official Payment Receiver
                      </span>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-bold border-primary/30 text-primary">
                    Digital Transfer
                  </Badge>
                </div>

                {/* Account Number & Copy Button */}
                {currentMethodObj?.accountNumber && (
                  <div className="p-3.5 rounded-xl bg-muted/70 border border-border flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <span className="text-[10px] font-extrabold text-muted-foreground uppercase block tracking-wider">
                        Account / Merchant Number
                      </span>
                      <span className="font-mono text-lg font-black text-primary select-all tracking-wide block truncate">
                        {currentMethodObj.accountNumber}
                      </span>
                      {currentMethodObj.accountName && (
                        <span className="text-xs font-semibold text-foreground block mt-0.5 truncate">
                          Account Holder: <span className="font-bold text-primary">{currentMethodObj.accountName}</span>
                        </span>
                      )}
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => handleCopyAccount(currentMethodObj.accountNumber)}
                      className="h-9 px-3 text-xs font-bold rounded-xl gap-1.5 shrink-0 bg-background hover:bg-primary hover:text-primary-foreground border shadow-sm transition-all"
                    >
                      {copiedAccount ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-500" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>Copy No.</span>
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {/* Payment Instructions for Waiter / Customer */}
                {currentMethodObj?.instructions && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-1">
                    <span className="font-extrabold text-amber-600 dark:text-amber-400 block flex items-center gap-1 text-[11px] uppercase tracking-wider">
                      💡 Payment Instructions for Customer:
                    </span>
                    <p className="text-muted-foreground font-medium leading-relaxed">
                      {currentMethodObj.instructions}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground flex justify-between">
                  <span>Transaction Reference / Txn ID *</span>
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
          );
        })()}

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
