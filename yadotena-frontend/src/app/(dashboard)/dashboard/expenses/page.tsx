"use client";

import { useFormik } from "formik";
import * as Yup from "yup";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Receipt } from "lucide-react";
import { api } from "@/services/api";
import { formatETB } from "@/lib/currency";
import { format } from "date-fns";
import { useState } from "react";

const ExpenseSchema = Yup.object().shape({
  category: Yup.string().required("Required"),
  description: Yup.string().required("Required"),
  amount: Yup.number().positive("Must be positive").required("Required"),
  paymentMethod: Yup.string().required("Required"),
});

export default function ExpensesPage() {
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ["expenses"],
    queryFn: api.expenses.getAll,
  });

  const createExpense = useMutation({
    mutationFn: api.expenses.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      setShowForm(false);
    },
  });

  const formik = useFormik({
    initialValues: {
      category: "",
      description: "",
      amount: "",
      paymentMethod: "Cash",
    },
    validationSchema: ExpenseSchema,
    onSubmit: async (values, { resetForm }) => {
      await createExpense.mutateAsync({
        category: values.category,
        description: values.description,
        amount: Number(values.amount),
        paymentMethod: values.paymentMethod,
      });
      resetForm();
    },
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Expenses & Overhead</h2>
          <p className="text-muted-foreground mt-1">Track and manage operational restaurant expenses in ETB.</p>
        </div>
        <Button className="rounded-xl font-bold shadow-md shadow-primary/20" onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-2 h-4 w-4" /> Record Expense
        </Button>
      </div>

      {showForm && (
        <Card className="border-primary/20 bg-primary/5 rounded-3xl">
          <form onSubmit={formik.handleSubmit}>
            <CardHeader>
              <CardTitle className="text-lg font-bold">Add New Expense</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <Input name="category" placeholder="e.g. Ingredients" onChange={formik.handleChange} value={formik.values.category} />
                {formik.errors.category && formik.touched.category && <p className="text-xs text-destructive">{formik.errors.category}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Input name="description" placeholder="Details" onChange={formik.handleChange} value={formik.values.description} />
                {formik.errors.description && formik.touched.description && <p className="text-xs text-destructive">{formik.errors.description}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Amount (ETB)</label>
                <Input name="amount" type="number" step="1" placeholder="0" onChange={formik.handleChange} value={formik.values.amount} />
                {formik.errors.amount && formik.touched.amount && <p className="text-xs text-destructive">{formik.errors.amount}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Payment Method</label>
                <Input name="paymentMethod" placeholder="Cash, CBE, Telebirr" onChange={formik.handleChange} value={formik.values.paymentMethod} />
                {formik.errors.paymentMethod && formik.touched.paymentMethod && <p className="text-xs text-destructive">{formik.errors.paymentMethod}</p>}
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit" disabled={!formik.isValid || formik.isSubmitting || createExpense.isPending}>
                {createExpense.isPending ? "Saving..." : "Save Expense"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}

      <Card className="rounded-3xl border-muted-foreground/15 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading expenses…</div>
          ) : expenses.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground flex flex-col items-center gap-2">
              <Receipt className="h-8 w-8 opacity-40" />
              No expenses recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                  <tr>
                    <th className="px-6 py-3 font-medium">Date</th>
                    <th className="px-6 py-3 font-medium">Category</th>
                    <th className="px-6 py-3 font-medium">Description</th>
                    <th className="px-6 py-3 font-medium">Method</th>
                    <th className="px-6 py-3 font-medium">Recorded By</th>
                    <th className="px-6 py-3 font-medium text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {expenses.map((expense) => (
                    <tr key={expense.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 text-muted-foreground">{format(new Date(expense.date), "MMM d, yyyy")}</td>
                      <td className="px-6 py-4 font-medium"><Badge variant="outline">{expense.category}</Badge></td>
                      <td className="px-6 py-4">{expense.description}</td>
                      <td className="px-6 py-4 text-muted-foreground">{expense.paymentMethod || "—"}</td>
                      <td className="px-6 py-4 text-muted-foreground">{expense.recordedByName || expense.recordedBy}</td>
                      <td className="px-6 py-4 text-right font-bold text-destructive">{formatETB(expense.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
