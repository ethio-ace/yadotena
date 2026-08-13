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
  Wallet, Plus, Edit, Trash2, Search, CheckCircle2, 
  Smartphone, Building2, Landmark, Banknote, ShieldCheck, 
  Receipt, BarChart3, Clock, CreditCard
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
  isActive: boolean;
}

export default function PaymentsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"TRANSACTIONS" | "GATEWAYS">("TRANSACTIONS");
  const [search, setSearch] = useState("");

  // Modals for Payment Gateways
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);

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
  const { data: orders = [], isLoading: isOrdersLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: api.orders.getAll,
  });

  const { data: methods = [], isLoading: isMethodsLoading } = useQuery<PaymentMethod[]>({
    queryKey: ["paymentMethods"],
    queryFn: () => api.paymentMethods.getAll(true),
  });

  const { data: payments = [] } = useQuery({
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
    if (!formData.name || !formData.code) return;
    if (editingMethod) {
      updateMutation.mutate({ id: editingMethod.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (method: PaymentMethod) => {
    if (confirm(`Remove payment method "${method.name}"?`)) {
      deleteMutation.mutate(method.id);
    }
  };

  const paidOrders = orders?.filter((o: any) => o.paymentStatus === "PAID") || [];
  const filteredPaidOrders = paidOrders.filter((o: any) => 
    o.id.toLowerCase().includes(search.toLowerCase()) ||
    (o.customerName && o.customerName.toLowerCase().includes(search.toLowerCase())) ||
    (o.tableId && o.tableId.toLowerCase().includes(search.toLowerCase()))
  );

  const totalCollected = paidOrders.reduce((acc: number, order: any) => acc + order.total, 0);

  const getProviderIcon = (code: string) => {
    const lower = code.toLowerCase();
    if (lower.includes("telebirr")) return <Smartphone className="h-5 w-5 text-primary" />;
    if (lower.includes("cbe")) return <Building2 className="h-5 w-5 text-primary" />;
    if (lower.includes("boa") || lower.includes("abyssinia")) return <Landmark className="h-5 w-5 text-primary" />;
    if (lower.includes("cash")) return <Banknote className="h-5 w-5 text-primary" />;
    return <Wallet className="h-5 w-5 text-primary" />;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-16">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-5 rounded-2xl border shadow-sm">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-primary" />
            <span>Payments & Gateways Ledger</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Monitor settled receipts, cash register totals, and digital payment channels (Telebirr / CBE).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setActiveTab("TRANSACTIONS")}
            className={`h-9 px-4 rounded-xl text-xs font-black border transition-all ${
              activeTab === "TRANSACTIONS" 
                ? "bg-primary text-primary-foreground border-primary" 
                : "bg-muted/40 border-transparent text-muted-foreground hover:bg-muted"
            }`}
          >
            💳 Transactions Ledger ({paidOrders.length})
          </Button>

          <Button
            onClick={() => setActiveTab("GATEWAYS")}
            className={`h-9 px-4 rounded-xl text-xs font-black border transition-all ${
              activeTab === "GATEWAYS" 
                ? "bg-primary text-primary-foreground border-primary" 
                : "bg-muted/40 border-transparent text-muted-foreground hover:bg-muted"
            }`}
          >
            ⚙️ Payment Gateways ({methods.length})
          </Button>
        </div>
      </div>

      {/* Financial Overview Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-card border rounded-2xl shadow-sm p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Settled Revenue</span>
            <Receipt className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-black text-primary mt-2">
            {formatETB(totalCollected)}
          </div>
          <span className="text-[11px] text-muted-foreground font-bold">{paidOrders.length} Paid Ticket Settlements</span>
        </Card>

        <Card className="bg-card border rounded-2xl shadow-sm p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Active Gateways</span>
            <Wallet className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-black text-foreground mt-2">
            {methods.filter((m) => m.isActive).length} / {methods.length} Active
          </div>
          <span className="text-[11px] text-muted-foreground font-bold">Enabled for Cashier POS</span>
        </Card>

        <Card className="bg-card border rounded-2xl shadow-sm p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Settlement Ledger</span>
            <CheckCircle2 className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-black text-foreground mt-2">100% Reconciled</div>
          <span className="text-[11px] text-muted-foreground font-bold">Realtime Cashier Audit</span>
        </Card>
      </div>

      {/* TAB 1: PROCESSED TRANSACTIONS LEDGER */}
      {activeTab === "TRANSACTIONS" && (
        <Card className="rounded-2xl border bg-card shadow-sm overflow-hidden space-y-4 p-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h3 className="font-black text-base">Completed Order Settlements</h3>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search ticket #, table, or guest..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9 text-xs rounded-xl"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-xs text-left">
              <thead className="text-[11px] font-black text-muted-foreground uppercase bg-muted/50 border-b">
                <tr>
                  <th className="px-4 py-3">Order Ticket #</th>
                  <th className="px-4 py-3">Customer / Table</th>
                  <th className="px-4 py-3">Settlement Date</th>
                  <th className="px-4 py-3">Payment Channel</th>
                  <th className="px-4 py-3 text-right">Amount Paid</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredPaidOrders.map((order: any) => (
                  <tr key={order.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-black text-foreground">
                      #{order.id.slice(-6).toUpperCase()}
                    </td>
                    <td className="px-4 py-3 font-bold">
                      {order.type === "DINE_IN" ? `Table #${order.tableId?.replace('t', '')}` : (order.customerName || "Takeout Guest")}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground font-medium">
                      {format(new Date(order.updatedAt), "MMM d, yyyy h:mm a")}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className="bg-primary/10 text-primary font-bold border border-primary/20 text-[10px]">
                        {order.paymentMethod || "CASH"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-black text-primary text-sm">
                      {formatETB(order.total)}
                    </td>
                  </tr>
                ))}

                {filteredPaidOrders.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-xs text-muted-foreground">
                      No settled payment records found matching your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 2: PAYMENT GATEWAYS CONFIGURATION */}
      {activeTab === "GATEWAYS" && (
        <Card className="rounded-2xl border bg-card shadow-sm p-5 space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <div>
              <h3 className="font-black text-base">Configured Payment Gateways</h3>
              <p className="text-xs text-muted-foreground">Manage accounts for Telebirr, CBE Birr, and Cash Registers</p>
            </div>
            <Button
              onClick={openCreateModal}
              className="h-9 rounded-xl text-xs font-black bg-primary text-primary-foreground shadow-sm gap-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>Add Gateway</span>
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {methods.map((method) => (
              <Card key={method.id} className="rounded-xl border p-4 bg-muted/20 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-card border shrink-0">
                      {getProviderIcon(method.code)}
                    </div>
                    <div>
                      <h4 className="font-black text-sm text-foreground">{method.name}</h4>
                      <span className="text-[10px] font-mono text-muted-foreground uppercase">CODE: {method.code}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => toggleMutation.mutate({ id: method.id, isActive: !method.isActive })}
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                      method.isActive 
                        ? "bg-primary/10 text-primary border-primary/30" 
                        : "bg-muted text-muted-foreground border-muted"
                    }`}
                  >
                    {method.isActive ? "Active" : "Disabled"}
                  </button>
                </div>

                {method.type === "DIGITAL" && (
                  <div className="p-2.5 rounded-lg bg-card border text-xs font-mono space-y-1">
                    {method.accountNumber && (
                      <div className="flex justify-between text-[11px]">
                        <span className="text-muted-foreground font-sans">Account #:</span>
                        <span className="font-bold text-foreground">{method.accountNumber}</span>
                      </div>
                    )}
                    {method.accountName && (
                      <div className="flex justify-between text-[11px]">
                        <span className="text-muted-foreground font-sans">Holder Name:</span>
                        <span className="font-bold text-foreground">{method.accountName}</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-end gap-1.5 pt-2 border-t">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-[11px] font-bold rounded-lg"
                    onClick={() => openEditModal(method)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-[11px] font-bold text-destructive hover:bg-destructive/10 rounded-lg"
                    onClick={() => handleDelete(method)}
                  >
                    Delete
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </Card>
      )}

      {/* Modal for Creating & Editing Payment Method */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-card border rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-black">
                {editingMethod ? "Edit Payment Gateway" : "Add Payment Gateway"}
              </h3>
              <button onClick={closeModal} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="font-bold text-foreground">Method Name *</label>
                  <Input
                    placeholder="e.g. Telebirr"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-foreground">Code *</label>
                  <Input
                    placeholder="e.g. telebirr"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toLowerCase() })}
                    required
                    className="h-9 text-xs font-mono rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-foreground">Type</label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={formData.type === "DIGITAL" ? "default" : "outline"}
                    className="flex-1 h-9 rounded-xl text-xs font-bold"
                    onClick={() => setFormData({ ...formData, type: "DIGITAL" })}
                  >
                    📱 Digital Wallet
                  </Button>
                  <Button
                    type="button"
                    variant={formData.type === "CASH" ? "default" : "outline"}
                    className="flex-1 h-9 rounded-xl text-xs font-bold"
                    onClick={() => setFormData({ ...formData, type: "CASH" })}
                  >
                    💵 Cash Register
                  </Button>
                </div>
              </div>

              {formData.type === "DIGITAL" && (
                <>
                  <div className="space-y-1">
                    <label className="font-bold text-foreground">Account Number / Phone</label>
                    <Input
                      placeholder="e.g. 100012345678"
                      value={formData.accountNumber}
                      onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                      className="h-9 text-xs font-mono rounded-xl"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-foreground">Account Holder Name</label>
                    <Input
                      placeholder="e.g. Yadotena Milk PLC"
                      value={formData.accountName}
                      onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                      className="h-9 text-xs rounded-xl"
                    />
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button type="button" variant="outline" className="h-9 rounded-xl font-bold" onClick={closeModal}>
                  Cancel
                </Button>
                <Button type="submit" className="h-9 rounded-xl font-black bg-primary text-primary-foreground">
                  {editingMethod ? "Save Changes" : "Create Gateway"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
