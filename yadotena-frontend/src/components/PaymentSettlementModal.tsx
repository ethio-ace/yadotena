"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatETB } from "@/lib/currency";
import { api } from "@/services/api";
import { Order } from "@/types";
import { 
  Banknote, Smartphone, Building2, CreditCard, Copy, Check, Upload, Camera, X, ShieldCheck
} from "lucide-react";

interface PaymentSettlementModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function PaymentSettlementModal({ order, isOpen, onClose, onSuccess }: PaymentSettlementModalProps) {
  const [method, setMethod] = useState<string>("TELEBIRR");
  const [cashTendered, setCashTendered] = useState<string>("");
  const [transactionRef, setTransactionRef] = useState<string>("");
  const [receiptUrl, setReceiptUrl] = useState<string>("");
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  // Dynamic digital payment settings set by Owner
  const [settings, setSettings] = useState({
    telebirrNo: "0911234567",
    telebirrName: "Yadotena Milk & Foods PLC",
    cbeAccount: "1000123456789",
    cbeName: "Yadotena Milk & Foods",
    boaAccount: "987654321",
    boaName: "Yadotena Milk & Foods",
    ebirrAccount: "0911234567",
    ebirrName: "Yadotena Milk & Foods PLC",
  });

  useEffect(() => {
    if (isOpen) {
      api.paymentMethods.getAll()
        .then((methods) => {
          if (methods && methods.length > 0) {
            setPaymentMethods(methods);
          }
        })
        .catch(() => {});

      api.settings.get()
        .then((data) => {
          if (data) {
            setSettings({
              telebirrNo: data.telebirrNo || "0911234567",
              telebirrName: data.telebirrName || "Yadotena Milk & Foods PLC",
              cbeAccount: data.cbeAccount || "1000123456789",
              cbeName: data.cbeName || "Yadotena Milk & Foods",
              boaAccount: data.boaAccount || "987654321",
              boaName: data.boaName || "Yadotena Milk & Foods",
              ebirrAccount: data.ebirrAccount || "0911234567",
              ebirrName: data.ebirrName || "Yadotena Milk & Foods PLC",
            });
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen || !order) return null;

  const totalAmount = order.total || 0;
  const tenderedNum = parseFloat(cashTendered) || 0;
  const changeDue = Math.max(0, tenderedNum - totalAmount);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const res = await api.media.upload(file);
      if (res && (res.publicUrl || res.url)) {
        setReceiptUrl(res.publicUrl || res.url);
      }
    } catch (err: any) {
      alert("Failed to upload transaction photo: " + (err.message || "Unknown error"));
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (method !== "CASH" && !transactionRef.trim()) {
      alert("Please enter the actual digital transfer reference number.");
      return;
    }

    try {
      setIsSubmitting(true);
      await api.payments.create({
        orderId: order.id,
        amount: totalAmount,
        method,
        transactionRef: method === "CASH" ? undefined : transactionRef.trim(),
        receiptUrl: receiptUrl || undefined,
        status: "PAID",
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      alert("Payment settlement failed: " + (err.message || "Please check connection"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDigitalAccountDetails = () => {
    const dbPm = paymentMethods.find((pm) => pm.code === method || pm.id === method);
    if (dbPm && dbPm.type === "DIGITAL") {
      return {
        number: dbPm.accountNumber || "N/A",
        name: dbPm.accountName || "Yadotena Restaurant",
        label: `${dbPm.name} Transfer Account`,
      };
    }

    switch (method) {
      case "TELEBIRR":
        return { number: settings.telebirrNo, name: settings.telebirrName, label: "Telebirr Merchant / Phone" };
      case "CBE":
        return { number: settings.cbeAccount, name: settings.cbeName, label: "CBE Account Number" };
      case "BOA":
        return { number: settings.boaAccount, name: settings.boaName, label: "Bank of Abyssinia Account" };
      case "EBIRR":
        return { number: settings.ebirrAccount, name: settings.ebirrName, label: "E-Birr Merchant Number" };
      default:
        return null;
    }
  };

  const digitalInfo = getDigitalAccountDetails();

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-card border border-muted-foreground/20 rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-6 max-h-[92vh] overflow-y-auto relative">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black tracking-tight">Settle Order Payment</h2>
              <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold border-emerald-500/20">
                Ticket #{order.id.slice(-6).toUpperCase()}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {order.tableName ? `Table ${order.tableName}` : order.tableId ? `Table ${order.tableId.replace("t", "")}` : order.type} • Total Amount: <span className="text-foreground font-black">{formatETB(totalAmount)}</span>
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Payment Method Tabs */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Select Payment Method</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <Button
              variant={method === "CASH" ? "default" : "outline"}
              className={`rounded-2xl h-14 font-bold flex flex-col items-center justify-center gap-1 ${method === "CASH" ? "shadow-md shadow-primary/20" : ""}`}
              onClick={() => setMethod("CASH")}
            >
              <Banknote className="h-4 w-4 text-emerald-500" />
              <span className="text-xs">Cash</span>
            </Button>

            <Button
              variant={method === "TELEBIRR" ? "default" : "outline"}
              className={`rounded-2xl h-14 font-bold flex flex-col items-center justify-center gap-1 ${method === "TELEBIRR" ? "shadow-md shadow-primary/20" : ""}`}
              onClick={() => setMethod("TELEBIRR")}
            >
              <Smartphone className="h-4 w-4 text-sky-500" />
              <span className="text-xs">Telebirr</span>
            </Button>

            <Button
              variant={method === "CBE" ? "default" : "outline"}
              className={`rounded-2xl h-14 font-bold flex flex-col items-center justify-center gap-1 ${method === "CBE" ? "shadow-md shadow-primary/20" : ""}`}
              onClick={() => setMethod("CBE")}
            >
              <Building2 className="h-4 w-4 text-purple-500" />
              <span className="text-xs">CBE Birr</span>
            </Button>

            <Button
              variant={method === "BOA" ? "default" : "outline"}
              className={`rounded-2xl h-14 font-bold flex flex-col items-center justify-center gap-1 ${method === "BOA" ? "shadow-md shadow-primary/20" : ""}`}
              onClick={() => setMethod("BOA")}
            >
              <Building2 className="h-4 w-4 text-amber-500" />
              <span className="text-xs">Bank of Abyssinia</span>
            </Button>

            <Button
              variant={method === "EBIRR" ? "default" : "outline"}
              className={`rounded-2xl h-14 font-bold flex flex-col items-center justify-center gap-1 ${method === "EBIRR" ? "shadow-md shadow-primary/20" : ""}`}
              onClick={() => setMethod("EBIRR")}
            >
              <CreditCard className="h-4 w-4 text-blue-500" />
              <span className="text-xs">Other Wallet</span>
            </Button>
          </div>
        </div>

        {/* Method-Specific Form */}
        {method === "CASH" ? (
          <Card className="bg-emerald-500/5 border-emerald-500/20 rounded-2xl">
            <CardContent className="p-4 space-y-4">
              <div className="flex justify-between items-center text-sm font-bold">
                <span>Total Amount Due:</span>
                <span className="text-xl text-primary font-black">{formatETB(totalAmount)}</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground">Cash Amount Received (ETB)</label>
                <Input
                  type="number"
                  placeholder="e.g. 500"
                  value={cashTendered}
                  onChange={(e) => setCashTendered(e.target.value)}
                  className="rounded-xl h-12 text-lg font-bold bg-background"
                />
              </div>

              {tenderedNum > 0 && (
                <div className="p-3 bg-background rounded-xl border flex justify-between items-center font-bold">
                  <span className="text-xs text-muted-foreground">Calculated Change to Return:</span>
                  <span className={`text-lg font-black ${tenderedNum >= totalAmount ? "text-emerald-500" : "text-amber-500"}`}>
                    {formatETB(changeDue)}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Owner Account Details Box */}
            {digitalInfo && (
              <Card className="bg-primary/10 border-primary/30 rounded-2xl overflow-hidden">
                <CardContent className="p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-primary tracking-wider">{digitalInfo.label}</span>
                    <Badge variant="outline" className="border-primary/40 text-primary font-bold text-[10px]">
                      Owner Configured
                    </Badge>
                  </div>

                  <div className="flex justify-between items-center bg-background/80 p-3 rounded-xl border">
                    <div>
                      <p className="text-xs text-muted-foreground font-semibold">Account / Phone No.</p>
                      <p className="text-base font-black tracking-tight text-foreground">{digitalInfo.number}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="rounded-lg h-8 px-2.5 text-xs font-bold gap-1 text-primary hover:bg-primary/15"
                      onClick={() => copyToClipboard(digitalInfo.number, "num")}
                    >
                      {copiedField === "num" ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copiedField === "num" ? "Copied" : "Copy"}</span>
                    </Button>
                  </div>

                  <div className="flex justify-between items-center bg-background/80 p-3 rounded-xl border">
                    <div>
                      <p className="text-xs text-muted-foreground font-semibold">Account Holder Name</p>
                      <p className="text-sm font-bold text-foreground">{digitalInfo.name}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Reference Number Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground flex items-center justify-between">
                <span>Actual Transaction Reference No. <span className="text-destructive">*</span></span>
                <span className="text-[10px] text-muted-foreground font-normal">e.g., TXN-98471203</span>
              </label>
              <Input
                placeholder="Enter digital transfer reference code..."
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                className="rounded-xl h-12 text-sm font-bold bg-background"
              />
            </div>

            {/* Attachment Photo / Receipt Upload */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground">Attach Transfer Receipt / Photo (Optional)</label>
              {receiptUrl ? (
                <div className="relative rounded-2xl border p-2 bg-muted/40 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src={receiptUrl} alt="Receipt" className="h-12 w-12 rounded-xl object-cover border" />
                    <div>
                      <span className="text-xs font-bold block text-emerald-600 dark:text-emerald-400">Photo Attached</span>
                      <span className="text-[10px] text-muted-foreground truncate block max-w-[200px]">{receiptUrl}</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setReceiptUrl("")} className="rounded-full h-8 w-8 text-destructive">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <label className="border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 rounded-2xl p-4 flex items-center justify-center gap-2 cursor-pointer bg-muted/20 hover:bg-muted/40 transition-colors">
                  {isUploading ? (
                    <span className="text-xs font-bold animate-pulse text-primary">Uploading photo...</span>
                  ) : (
                    <>
                      <Camera className="h-5 w-5 text-muted-foreground" />
                      <span className="text-xs font-bold text-muted-foreground">Upload Photo / Take Screenshot</span>
                    </>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
                </label>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-2 flex items-center gap-3">
          <Button variant="outline" className="flex-1 rounded-2xl font-bold h-12" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            className="flex-1 rounded-2xl font-extrabold h-12 text-sm bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 gap-1.5"
            onClick={handleSubmit}
            disabled={isSubmitting || (method !== "CASH" && !transactionRef.trim())}
          >
            <ShieldCheck className="h-4 w-4" />
            <span>{isSubmitting ? "Settling Payment..." : `Settle ${formatETB(totalAmount)}`}</span>
          </Button>
        </div>

      </div>
    </div>
  );
}
