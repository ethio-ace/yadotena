"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatETB } from "@/lib/currency";
import { 
  Wallet, Plus, Edit, Trash2, CheckCircle2, AlertCircle, 
  Smartphone, Building2, Landmark, Banknote, ShieldCheck, 
  ArrowUpRight, BarChart3, Receipt, FileText, QrCode
} from "lucide-react";
import { format } from "date-fns";

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

interface PaymentRecord {
  id: string;
  orderId: string;
  method: string;
  amount: number;
  status: string;
  transactionRef?: string;
  receiptUrl?: string;
  createdAt: string;
}

export default function PaymentMethodsPage() {
  const queryClient = useQueryClient();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    type: "DIGITAL" as "CASH" | "DIGITAL",
    accountNumber: "",
    accountName: "",
    instructions: "",
    isActive: true,
  });

  // Queries
  const { data: methods = [], isLoading: isMethodsLoading } = useQuery<PaymentMethod[]>({
    queryKey: ["paymentMethods"],
    queryFn: () => api.paymentMethods.getAll(true),
  });

  const { data: payments = [] } = useQuery<PaymentRecord[]>({
    queryKey: ["payments"],
    queryFn: api.payments.getAll,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: any) => api.paymentMethods.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["paymentMethods"] });
      closeModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.paymentMethods.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["paymentMethods"] });
      closeModal();
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.paymentMethods.update(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["paymentMethods"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.paymentMethods.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["paymentMethods"] });
    },
  });

  const openCreateModal = () => {
    setEditingMethod(null);
    setFormData({
      name: "",
      code: "",
      type: "DIGITAL",
      accountNumber: "",
      accountName: "",
      instructions: "",
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (method: PaymentMethod) => {
    setEditingMethod(method);
    setFormData({
      name: method.name,
      code: method.code,
      type: method.type,
      accountNumber: method.accountNumber || "",
      accountName: method.accountName || "",
      instructions: method.instructions || "",
      isActive: method.isActive,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingMethod(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.code) {
      alert("Name and Code are required.");
      return;
    }

    if (editingMethod) {
      updateMutation.mutate({ id: editingMethod.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (method: PaymentMethod) => {
    if (confirm(`Are you sure you want to delete payment method "${method.name}"?`)) {
      deleteMutation.mutate(method.id);
    }
  };

  // Derive Statistics from Payments
  const totalSettledRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalPaymentsCount = payments.length;

  const getMethodStats = (code: string) => {
    const matching = payments.filter(
      (p) => p.method.toLowerCase() === code.toLowerCase() || p.method.toLowerCase().includes(code.toLowerCase())
    );
    const count = matching.length;
    const amount = matching.reduce((sum, p) => sum + p.amount, 0);
    const percentage = totalSettledRevenue > 0 ? (amount / totalSettledRevenue) * 100 : 0;
    return { count, amount, percentage };
  };

  const digitalPayments = payments.filter((p) => p.method.toUpperCase() !== "CASH");
  const digitalVolume = digitalPayments.reduce((sum, p) => sum + p.amount, 0);

  const cashPayments = payments.filter((p) => p.method.toUpperCase() === "CASH");
  const cashVolume = cashPayments.reduce((sum, p) => sum + p.amount, 0);

  const getProviderIcon = (code: string) => {
    const lower = code.toLowerCase();
    if (lower.includes("telebirr")) return <Smartphone className="h-5 w-5 text-emerald-500" />;
    if (lower.includes("cbe")) return <Building2 className="h-5 w-5 text-purple-500" />;
    if (lower.includes("boa") || lower.includes("abyssinia")) return <Landmark className="h-5 w-5 text-amber-500" />;
    if (lower.includes("cash")) return <Banknote className="h-5 w-5 text-blue-500" />;
    return <Wallet className="h-5 w-5 text-primary" />;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-16">
      
      {/* Header with Title & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-3xl font-black tracking-tight">Payment Methods</h2>
            <Badge variant="outline" className="rounded-full px-3 py-0.5 font-bold border-primary/30 text-primary">
              Staff & POS Sync
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            Configure digital transfer accounts, Telebirr/CBE gateways, and view payment analytics.
          </p>
        </div>

        <Button 
          onClick={openCreateModal}
          className="rounded-2xl font-bold gap-2 shadow-md shadow-primary/20"
        >
          <Plus className="h-4 w-4" />
          <span>+ Add Payment Gateway</span>
        </Button>
      </div>

      {/* Derived Financial Analytics Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <Card className="rounded-3xl border-muted-foreground/15 bg-card/60 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Configured Channels</span>
            <Wallet className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-black mt-2">{methods.length} Gateways</div>
          <span className="text-[11px] text-emerald-600 font-semibold">
            {methods.filter((m) => m.isActive).length} Currently Active
          </span>
        </Card>

        <Card className="rounded-3xl border-emerald-500/20 bg-emerald-500/5 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Total Settled</span>
            <Receipt className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
            {formatETB(totalSettledRevenue)}
          </div>
          <span className="text-[11px] text-muted-foreground">{totalPaymentsCount} Order Settlements</span>
        </Card>

        <Card className="rounded-3xl border-purple-500/20 bg-purple-500/5 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">Digital Transfers</span>
            <Smartphone className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-2">
            {formatETB(digitalVolume)}
          </div>
          <span className="text-[11px] text-muted-foreground">{digitalPayments.length} Digital Transactions</span>
        </Card>

        <Card className="rounded-3xl border-blue-500/20 bg-blue-500/5 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Cash Register</span>
            <Banknote className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-2">
            {formatETB(cashVolume)}
          </div>
          <span className="text-[11px] text-muted-foreground">{cashPayments.length} Cash Receipts</span>
        </Card>

      </div>

      {/* Payment Methods Grid Cards */}
      {isMethodsLoading ? (
        <div className="p-12 text-center text-muted-foreground animate-pulse">
          Loading active payment methods...
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {methods.map((method) => {
            const stats = getMethodStats(method.code);
            return (
              <Card
                key={method.id}
                className={`rounded-3xl border transition-all duration-300 shadow-sm overflow-hidden flex flex-col justify-between ${
                  method.isActive
                    ? "bg-card border-muted-foreground/15 hover:border-primary/40 hover:shadow-lg"
                    : "bg-muted/20 border-muted opacity-75"
                }`}
              >
                <div className="p-6 space-y-4">
                  
                  {/* Title & Icon Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-2xl bg-muted/50 border flex items-center justify-center shrink-0">
                        {getProviderIcon(method.code)}
                      </div>
                      <div>
                        <h3 className="font-black text-lg text-foreground flex items-center gap-2">
                          <span>{method.name}</span>
                        </h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs font-mono font-bold text-muted-foreground uppercase">
                            Code: {method.code}
                          </span>
                          <Badge
                            variant={method.type === "DIGITAL" ? "default" : "secondary"}
                            className="text-[10px] font-bold px-2 py-0.2 rounded-full"
                          >
                            {method.type}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        toggleMutation.mutate({ id: method.id, isActive: !method.isActive })
                      }
                      className={`px-3 py-1 rounded-full text-[11px] font-bold border transition-colors ${
                        method.isActive
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                          : "bg-muted text-muted-foreground border-muted"
                      }`}
                    >
                      {method.isActive ? "Active" : "Disabled"}
                    </button>
                  </div>

                  {/* Account Info Details */}
                  {method.type === "DIGITAL" && (
                    <div className="bg-muted/40 p-3.5 rounded-2xl border space-y-1.5 text-xs font-mono">
                      {method.accountNumber && (
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground font-sans">Account No:</span>
                          <span className="font-bold text-foreground">{method.accountNumber}</span>
                        </div>
                      )}
                      {method.accountName && (
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground font-sans">Holder Name:</span>
                          <span className="font-bold text-foreground">{method.accountName}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Instructions */}
                  {method.instructions && (
                    <p className="text-xs text-muted-foreground leading-relaxed italic bg-card/60 p-2.5 rounded-xl border border-dashed">
                      "{method.instructions}"
                    </p>
                  )}

                  {/* Derived Stats Badge */}
                  <div className="pt-3 border-t space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground font-semibold flex items-center gap-1">
                        <BarChart3 className="h-3.5 w-3.5 text-primary" /> Volume Settled
                      </span>
                      <span className="font-black text-primary">{formatETB(stats.amount)}</span>
                    </div>

                    <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-primary h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(stats.percentage, 100)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>{stats.count} Transactions</span>
                      <span>{stats.percentage.toFixed(1)}% Share</span>
                    </div>
                  </div>

                </div>

                {/* Card Actions */}
                <div className="p-4 bg-muted/30 border-t flex items-center justify-end gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl text-xs font-bold gap-1.5"
                    onClick={() => openEditModal(method)}
                  >
                    <Edit className="h-3.5 w-3.5 text-blue-500" />
                    <span>Edit</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="rounded-xl text-xs font-bold text-destructive hover:bg-destructive/10 gap-1.5"
                    onClick={() => handleDelete(method)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete</span>
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal for Creating & Editing Payment Method */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="fixed inset-0" onClick={closeModal} />

          <div className="relative w-full max-w-lg bg-card border rounded-3xl shadow-2xl overflow-hidden z-10 p-6 space-y-6 animate-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between border-b pb-4">
              <h3 className="text-xl font-black tracking-tight">
                {editingMethod ? "Edit Payment Method" : "Add Payment Method"}
              </h3>
              <Button size="icon" variant="ghost" className="rounded-full h-8 w-8" onClick={closeModal}>
                ✕
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Method Name *</label>
                  <Input
                    placeholder="e.g. Telebirr, CBE Birr"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="rounded-xl text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Unique Code *</label>
                  <Input
                    placeholder="e.g. telebirr, cbe"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toLowerCase() })}
                    required
                    className="rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase">Payment Type</label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={formData.type === "DIGITAL" ? "default" : "outline"}
                    className="flex-1 rounded-xl text-xs font-bold"
                    onClick={() => setFormData({ ...formData, type: "DIGITAL" })}
                  >
                    DIGITAL WALLET / BANK
                  </Button>
                  <Button
                    type="button"
                    variant={formData.type === "CASH" ? "default" : "outline"}
                    className="flex-1 rounded-xl text-xs font-bold"
                    onClick={() => setFormData({ ...formData, type: "CASH" })}
                  >
                    CASH REGISTER
                  </Button>
                </div>
              </div>

              {formData.type === "DIGITAL" && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase">Account Number / Phone</label>
                    <Input
                      placeholder="e.g. 100012345678 or 0911234567"
                      value={formData.accountNumber}
                      onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                      className="rounded-xl text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase">Account Holder Name</label>
                    <Input
                      placeholder="e.g. Yadotena Milk & Foods PLC"
                      value={formData.accountName}
                      onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                      className="rounded-xl text-xs"
                    />
                  </div>
                </>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase">Staff Instructions</label>
                <Input
                  placeholder="e.g. Verify 12-digit SMS transaction reference code before settling."
                  value={formData.instructions}
                  onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                  className="rounded-xl text-xs"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl border bg-muted/30">
                <span className="text-xs font-bold">Enable this Payment Method for Staff</span>
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="h-4 w-4 rounded accent-primary cursor-pointer"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" className="rounded-xl font-bold" onClick={closeModal}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="rounded-xl font-bold shadow-md"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {editingMethod ? "Save Changes" : "Create Payment Gateway"}
                </Button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
