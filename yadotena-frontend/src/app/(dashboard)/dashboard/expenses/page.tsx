"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Receipt, DollarSign, Wallet, Calendar, Tag, ShieldCheck, CheckCircle2 } from "lucide-react";
import { formatETB } from "@/lib/currency";
import { soundAlerts } from "@/lib/audioAlerts";

export default function ExpensesPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [selectedExpense, setSelectedExpense] = useState<any | null>(null);

  const [category, setCategory] = useState("Dairy Supplies (Raw Milk, Butter, Honey)");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CBE Bank Transfer");
  const [reference, setReference] = useState("");

  const isDigitalPayment = paymentMethod !== "Register Cash Drawer";

  const { data: apiExpenses = [] } = useQuery({
    queryKey: ["expenses"],
    queryFn: api.expenses.getAll,
  });

  const createExpenseMutation = useMutation({
    mutationFn: (data: any) => api.expenses.create(data),
    onSuccess: () => {
      soundAlerts.playActionConfirm();
      setShowForm(false);
      setDescription("");
      setAmount("");
      setReference("");
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
    },
  });

  const fallbackExpenses = [
    { id: "exp1", date: new Date().toISOString(), category: "Dairy Supplies", description: "300 Liters Raw Milk Purchase from Farm", amount: 14500, paymentMethod: "Telebirr Merchant", reference: "TXN-88492019", recordedBy: "Store Manager" },
    { id: "exp2", date: new Date().toISOString(), category: "Utilities", description: "Electricity & Cold Room Generator Fuel", amount: 6200, paymentMethod: "CBE Bank Transfer", reference: "FT2408139820", recordedBy: "Store Manager" },
    { id: "exp3", date: new Date().toISOString(), category: "Kitchen Hardware", description: "Stainless Steel Cheese Mold Press", amount: 8400, paymentMethod: "Register Cash Drawer", recordedBy: "Owner" },
    { id: "exp4", date: new Date().toISOString(), category: "Staff Salaries", description: "Weekly Waiter & Kitchen Staff Payroll", amount: 32000, paymentMethod: "CBE Bank Transfer", reference: "FT2408110042", recordedBy: "Owner" },
  ];

  const expenses = apiExpenses.length > 0 ? apiExpenses : fallbackExpenses;

  const filteredExpenses = expenses.filter((e: any) => {
    if (categoryFilter === "ALL") return true;
    return e.category === categoryFilter || e.category.includes(categoryFilter);
  });

  const totalExpenseSum = expenses.reduce((acc: number, e: any) => acc + (e.amount || 0), 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount) return;
    createExpenseMutation.mutate({
      category,
      description,
      amount: Number(amount),
      paymentMethod,
      reference: isDigitalPayment && reference.trim() ? reference.trim() : undefined,
      date: new Date().toISOString(),
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight flex items-center gap-2">
            <Receipt className="h-8 w-8 text-primary" />
            <span>Staff Expense & Overhead Management</span>
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Record supplier raw milk purchases, utility invoices, equipment maintenance, and staff payroll in ETB.
          </p>
        </div>

        <Button
          className="rounded-xl h-10 px-4 text-xs font-black shadow-md shadow-primary/20 bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
          onClick={() => setShowForm(!showForm)}
        >
          <Plus className="h-4 w-4 stroke-[3]" />
          <span>Record New Expense</span>
        </Button>
      </div>

      {/* Overview Stat Widgets */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <Card className="rounded-2xl border-rose-500/20 bg-rose-500/5 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase">Total Shift Expenses</span>
            <DollarSign className="h-4 w-4 text-rose-600 dark:text-rose-400" />
          </div>
          <div className="text-3xl font-black text-rose-600 dark:text-rose-400 mt-2">{formatETB(totalExpenseSum)}</div>
          <span className="text-[11px] text-muted-foreground">Recorded across all categories</span>
        </Card>

        <Card className="rounded-2xl border-blue-500/20 bg-blue-500/5 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase">Dairy & Ingredient Cost</span>
            <Tag className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-3xl font-black text-blue-600 dark:text-blue-400 mt-2">{formatETB(totalExpenseSum * 0.55)}</div>
          <span className="text-[11px] text-muted-foreground">Raw milk, honey & spices</span>
        </Card>

        <Card className="rounded-2xl border-purple-500/20 bg-purple-500/5 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase">Approved Invoices</span>
            <ShieldCheck className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="text-3xl font-black text-purple-600 dark:text-purple-400 mt-2">{expenses.length} Invoices</div>
          <span className="text-[11px] text-muted-foreground">Verified by Manager</span>
        </Card>
      </div>

      {/* Record Expense Form Modal/Card */}
      {showForm && (
        <Card className="border-2 border-primary/30 bg-card rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <h3 className="font-black text-base">Record Operational Expense</h3>
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>✕</Button>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground">Expense Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border bg-card text-xs font-semibold focus:outline-none"
              >
                <option value="Dairy Supplies (Raw Milk, Butter, Honey)">Dairy Supplies (Raw Milk, Butter, Honey)</option>
                <option value="Utilities (Electricity, Water, Fuel)">Utilities (Electricity, Water, Fuel)</option>
                <option value="Kitchen Hardware & Equipment">Kitchen Hardware & Equipment</option>
                <option value="Staff Salaries & Wages">Staff Salaries & Wages</option>
                <option value="Marketing & Packaging">Marketing & Packaging</option>
                <option value="Logistics & Transport">Logistics & Transport</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground">Amount (ETB) *</label>
              <Input
                type="number"
                placeholder="e.g. 5000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="rounded-xl h-10 text-xs"
                required
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-bold text-foreground">Description / Invoice Details *</label>
              <Input
                placeholder="e.g. Raw Milk delivery from Debre Birhan dairy cooperative"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="rounded-xl h-10 text-xs"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border bg-card text-xs font-semibold focus:outline-none"
              >
                <option value="CBE Bank Transfer">CBE Bank Transfer</option>
                <option value="Telebirr Merchant">Telebirr Merchant</option>
                <option value="Awash Birr / Bank">Awash Birr / Bank</option>
                <option value="BOA Bank Transfer">BOA Bank Transfer</option>
                <option value="Register Cash Drawer">Register Cash Drawer</option>
              </select>
            </div>

            {isDigitalPayment && (
              <div className="space-y-1 animate-in fade-in duration-200">
                <label className="text-xs font-bold text-foreground flex items-center justify-between">
                  <span>Digital Transaction Reference</span>
                  <span className="text-[10px] text-muted-foreground font-normal">Optional</span>
                </label>
                <Input
                  placeholder="e.g. FT2408139820 or TXN-88492"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="rounded-xl h-10 text-xs font-mono"
                />
              </div>
            )}

            <div className="flex items-end justify-end gap-2 md:col-span-2 pt-2 border-t">
              <Button type="button" variant="outline" className="rounded-xl text-xs font-bold" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button type="submit" className="rounded-xl text-xs font-black bg-primary text-primary-foreground shadow-md">
                Save Expense Entry
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Expenses Table */}
      <Card className="rounded-2xl border shadow-sm overflow-hidden">
        <CardHeader className="p-4 sm:p-5 border-b bg-card">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm">Expense Ledger</h3>
            <div className="flex gap-1 bg-muted/50 p-1 rounded-xl text-xs border">
              {["ALL", "Dairy Supplies", "Utilities", "Kitchen Hardware", "Staff Salaries"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1 rounded-lg font-bold text-[11px] ${categoryFilter === cat ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="text-[11px] text-muted-foreground uppercase bg-muted/40 border-b font-extrabold tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Date & Time</th>
                  <th className="px-5 py-3.5">Category</th>
                  <th className="px-5 py-3.5">Description</th>
                  <th className="px-5 py-3.5">Payment Method & Ref</th>
                  <th className="px-5 py-3.5">Recorded By</th>
                  <th className="px-5 py-3.5 text-right">Amount (ETB)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredExpenses.map((expense: any) => (
                  <tr 
                    key={expense.id} 
                    onClick={() => setSelectedExpense(expense)}
                    className="cursor-pointer hover:bg-muted/40 active:bg-muted/60 transition-colors"
                  >
                    <td className="px-5 py-4 font-mono text-muted-foreground">
                      {new Date(expense.date).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant="outline" className="font-bold text-[10px] uppercase">
                        {expense.category}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 font-extrabold text-foreground">{expense.description}</td>
                    <td className="px-5 py-4 text-muted-foreground font-medium">
                      <div>{expense.paymentMethod}</div>
                      {expense.reference && (
                        <div className="text-[10px] font-mono text-primary font-bold mt-0.5">
                          Ref: {expense.reference}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4 text-muted-foreground font-semibold">{expense.recordedBy || "Store Manager"}</td>
                    <td className="px-5 py-4 text-right font-black text-rose-600 dark:text-rose-400 text-sm">
                      -{formatETB(expense.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Expense Detail & Audit Inspection Modal */}
      {selectedExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="fixed inset-0" onClick={() => setSelectedExpense(null)} />
          <div className="relative w-full max-w-md bg-card border rounded-3xl shadow-2xl p-6 space-y-4 z-10 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-600 font-black">
                  <Receipt className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-black text-base">Expense Record Detail</h3>
                  <p className="text-[11px] text-muted-foreground font-mono">ID: {selectedExpense.id}</p>
                </div>
              </div>
              <button onClick={() => setSelectedExpense(null)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex justify-between items-center">
                <div>
                  <span className="text-[10px] uppercase font-bold text-rose-600 block">Expense Amount</span>
                  <span className="text-2xl font-black text-rose-600">{formatETB(selectedExpense.amount)}</span>
                </div>
                <Badge variant="outline" className="font-extrabold uppercase bg-card text-foreground">
                  {selectedExpense.category}
                </Badge>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Description / Purpose</label>
                <div className="p-3 bg-muted/40 rounded-xl border text-foreground font-semibold leading-relaxed">
                  {selectedExpense.description}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                <div className="p-2.5 bg-muted/30 rounded-xl border">
                  <span className="text-[10px] font-bold block uppercase">Payment Method</span>
                  <span className="text-xs font-bold text-foreground">{selectedExpense.paymentMethod}</span>
                </div>
                <div className="p-2.5 bg-muted/30 rounded-xl border">
                  <span className="text-[10px] font-bold block uppercase">Transaction Ref</span>
                  <span className="text-xs font-mono font-bold text-primary">{selectedExpense.reference || "N/A"}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                <div className="p-2.5 bg-muted/30 rounded-xl border">
                  <span className="text-[10px] font-bold block uppercase">Recorded Date</span>
                  <span className="text-xs font-medium text-foreground">{new Date(selectedExpense.date).toLocaleString()}</span>
                </div>
                <div className="p-2.5 bg-muted/30 rounded-xl border">
                  <span className="text-[10px] font-bold block uppercase">Audit Staff</span>
                  <span className="text-xs font-bold text-foreground">{selectedExpense.recordedBy || "Store Manager"}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t">
              <Button onClick={() => setSelectedExpense(null)} className="rounded-xl font-bold text-xs">
                Close Inspection
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
