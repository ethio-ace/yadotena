"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatETB } from "@/lib/currency";
import {
  X, CreditCard, Wallet, Banknote, Copy, Check, BellRing, Loader2, Landmark,
} from "lucide-react";
import { Order } from "@/types";

interface PaymentMethodsModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onRequestBillSettlement: (methodName: string, methodCode: string) => void;
  isRequestingBill?: boolean;
}

interface PaymentMethodInfo {
  id?: string;
  name: string;
  code?: string;
  type?: string;
  accountNumber?: string;
  accountName?: string;
  instructions?: string;
}

const FALLBACK_METHODS = [
  { id: "cash", name: "Cash", code: "CASH", type: "CASH", accountNumber: "", accountName: "", instructions: "Pay cash directly to your waiter." },
  { id: "cbe", name: "Commercial Bank of Ethiopia (CBE)", code: "CBE", type: "DIGITAL", accountNumber: "1000123456789", accountName: "Yadotena Milk & Foods", instructions: "Transfer the exact bill amount to the CBE account above, then call your waiter to verify and settle." },
  { id: "telebirr", name: "Telebirr SuperApp", code: "TELEBIRR", type: "DIGITAL", accountNumber: "0911234567", accountName: "Yadotena Milk & Foods PLC", instructions: "Send via Telebirr app to the merchant number above, then call your waiter to verify and settle." },
  { id: "boa", name: "Bank of Abyssinia (BOA)", code: "BOA", type: "DIGITAL", accountNumber: "987654321", accountName: "Yadotena Milk & Foods", instructions: "Transfer to the BOA account above, then call your waiter to verify and settle." },
];

export function PaymentMethodsModal({
  order,
  isOpen,
  onClose,
  onRequestBillSettlement,
  isRequestingBill,
}: PaymentMethodsModalProps) {
  const [selectedCode, setSelectedCode] = useState<string>("");
  const [copiedAccount, setCopiedAccount] = useState<string>("");

  const { data: dbMethods = [] } = useQuery({
    queryKey: ["paymentMethods"],
    queryFn: () => api.paymentMethods.getAll(),
  });

  if (!isOpen || !order) return null;

  const methods: PaymentMethodInfo[] = dbMethods.length > 0 ? (dbMethods as PaymentMethodInfo[]) : FALLBACK_METHODS;
  const activeCode = selectedCode || methods.find((m) => m.type === "CASH" || m.code === "CASH")?.code || methods[0]?.code;
  const current = methods.find((m) => m.code === activeCode || m.id === activeCode) || methods[0];
  const isCash = current?.type === "CASH" || String(current?.code).toUpperCase() === "CASH";

  const handleCopy = (text?: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedAccount(text);
    setTimeout(() => setCopiedAccount(""), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="bg-card border rounded-3xl shadow-2xl max-w-md w-full flex flex-col max-h-[90vh] overflow-hidden z-10 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 pb-3 border-b flex items-start justify-between shrink-0">
          <div>
            <h3 className="font-black text-lg flex items-center gap-2">
              <Landmark className="h-5 w-5 text-primary" />
              <span>Payment Methods & Accounts</span>
            </h3>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">
              Order {order.id.slice(-6).toUpperCase()} — send your payment, then call your waiter to settle.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Amount Due */}
          <div className="p-4 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-between shadow-sm">
            <div>
              <span className="text-xs font-bold text-muted-foreground uppercase block">Amount Due</span>
              <span className="text-2xl font-black text-primary">{formatETB(order.total)}</span>
            </div>
            <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-xs font-extrabold px-3 py-1">
              UNPAID
            </Badge>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed bg-muted/40 border border-border rounded-2xl p-3">
            💡 You can pay digitally using any account below. After sending, tap <b>Call Waiter to Settle Bill</b> — our
            waiter will confirm the transfer and close your bill for you.
          </p>

          {/* Method Selector */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-bold">
            {methods.map((pm) => {
              const code = pm.code || pm.name;
              const isSelected = activeCode === code || (activeCode === "CASH" && pm.type === "CASH");
              const isCashMethod = pm.type === "CASH" || String(code).toUpperCase() === "CASH";
              return (
                <button
                  key={pm.id || code}
                  type="button"
                  onClick={() => setSelectedCode(code)}
                  className={`p-3 rounded-2xl border transition-all flex flex-col items-center justify-center gap-1 text-center ${
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary shadow-md font-black"
                      : "bg-card border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  }`}
                >
                  {isCashMethod ? (
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

          {/* Account Details (view-only) */}
          {!isCash && current?.accountNumber ? (
            <div className="space-y-3 bg-muted/30 p-4 rounded-2xl border border-border">
              <div className="flex items-center justify-between border-b border-border pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase">
                    {current.code || "PAY"}
                  </div>
                  <div>
                    <span className="font-extrabold text-sm text-foreground block leading-tight">{current.name}</span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">
                      Official Payment Receiver
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-card border border-border flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-[10px] font-extrabold text-muted-foreground uppercase block tracking-wider">
                    Account / Merchant Number
                  </span>
                  <span className="font-mono text-lg font-black text-primary select-all tracking-wide block truncate">
                    {current.accountNumber}
                  </span>
                  {current.accountName && (
                    <span className="text-xs font-semibold text-foreground block mt-0.5 truncate">
                      Account Holder: <span className="font-bold text-primary">{current.accountName}</span>
                    </span>
                  )}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => handleCopy(current.accountNumber)}
                  className="h-9 px-3 text-xs font-bold rounded-xl gap-1.5 shrink-0 bg-background hover:bg-primary hover:text-primary-foreground border shadow-sm transition-all"
                >
                  {copiedAccount === current.accountNumber ? (
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

              {current.instructions && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-1">
                  <span className="font-extrabold text-amber-600 dark:text-amber-400 block text-[11px] uppercase tracking-wider">
                    How to pay
                  </span>
                  <p className="text-muted-foreground font-medium leading-relaxed">{current.instructions}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-muted/30 border border-border text-xs text-muted-foreground font-medium">
              {isCash ? "Pay cash directly to your waiter when they come to your table." : "Select a digital payment method above to see the account details."}
            </div>
          )}

          {/* Call Waiter to Settle */}
          <Button
            onClick={() => onRequestBillSettlement(current?.name || "Digital Payment", current?.code || "")}
            disabled={isRequestingBill}
            className="w-full h-12 rounded-2xl font-black text-xs bg-primary text-primary-foreground shadow-lg shadow-primary/20 gap-2"
          >
            {isRequestingBill ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Alerting your waiter...
              </>
            ) : (
              <>
                <BellRing className="h-4 w-4" />
                Call Waiter to Settle Bill
              </>
            )}
          </Button>

          <p className="text-center text-[10px] text-muted-foreground font-medium">
            You cannot settle bills yourself — a floor waiter will confirm your payment.
          </p>
        </div>
      </div>
    </div>
  );
}
