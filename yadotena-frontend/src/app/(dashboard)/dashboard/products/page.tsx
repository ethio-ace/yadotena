"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, PlusCircle, History, TrendingUp, RefreshCw, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/services/api";
import { formatETB } from "@/lib/currency";
import { format } from "date-fns";
import { toast, Toaster } from "sonner";

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"inventory" | "sales" | "analytics">("analytics");
  
  // Create Form State
  const [newProductName, setNewProductName] = useState("");
  const [newProductPrice, setNewProductPrice] = useState("");
  const [newProductUnit, setNewProductUnit] = useState("Litre");
  const [newProductStock, setNewProductStock] = useState("");
  const [newProductCost, setNewProductCost] = useState("");

  // Restock Form State
  const [restockProductId, setRestockProductId] = useState("");
  const [restockQuantity, setRestockQuantity] = useState("");
  const [restockCost, setRestockCost] = useState("");

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: api.products.getAll,
  });

  const { data: productSales = [] } = useQuery({
    queryKey: ["productSales"],
    queryFn: api.productSales.getAll,
  });

  const { data: productPurchases = [] } = useQuery({
    queryKey: ["productPurchases"],
    queryFn: api.productPurchases.getAll,
  });

  const { data: analytics } = useQuery({
    queryKey: ["productAnalytics"],
    queryFn: api.products.getAnalytics,
  });

  const createProduct = useMutation({
    mutationFn: api.products.create,
  });

  const createPurchase = useMutation({
    mutationFn: api.productPurchases.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["productPurchases"] });
      queryClient.invalidateQueries({ queryKey: ["productAnalytics"] });
      
      // Reset restock
      setRestockProductId("");
      setRestockQuantity("");
      setRestockCost("");
      
      // Reset create
      setNewProductName("");
      setNewProductPrice("");
      setNewProductUnit("Litre");
      setNewProductStock("");
      setNewProductCost("");
      
      toast.success("Successfully logged product action");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to log purchase/restock");
    }
  });

  const handleCreateProduct = async () => {
    if (!newProductName || !newProductPrice) return;
    
    try {
      const product = await createProduct.mutateAsync({
        name: newProductName,
        description: "",
        price: parseFloat(newProductPrice),
        unit: newProductUnit || "pcs",
        stock_quantity: 0, // Initial stock is 0, we will add it via a purchase record
        is_active: true,
      });

      const initialStock = parseFloat(newProductStock);
      if (initialStock > 0) {
        await createPurchase.mutateAsync({
          product: product.id,
          quantity: initialStock,
          total_cost: parseFloat(newProductCost) || 0,
        });
      } else {
        // If no stock added, just invalidate
        queryClient.invalidateQueries({ queryKey: ["products"] });
        setNewProductName("");
        setNewProductPrice("");
        setNewProductUnit("Litre");
        setNewProductStock("");
        setNewProductCost("");
      }
    } catch (err: any) {
      console.error("Error creating product:", err);
      toast.error(err.message || "Failed to create product");
    }
  };

  const handleRestock = () => {
    if (!restockProductId || !restockQuantity) return;
    createPurchase.mutate({
      product: restockProductId,
      quantity: parseFloat(restockQuantity),
      total_cost: parseFloat(restockCost) || 0,
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <Toaster position="top-right" richColors />
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Products & Inventory</h2>
          <p className="text-muted-foreground mt-1">Manage stock, track sales, and log inventory expenses automatically.</p>
        </div>
      </div>

      <div className="flex bg-muted/60 p-1.5 rounded-2xl w-full sm:w-fit overflow-x-auto shadow-inner">
        <button 
          className={`flex items-center justify-center gap-2 flex-1 sm:flex-none px-6 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${activeTab === "analytics" ? "bg-background text-foreground shadow-sm scale-100" : "text-muted-foreground hover:text-foreground scale-95"}`}
          onClick={() => setActiveTab("analytics")}
        >
          <TrendingUp className={`w-4 h-4 ${activeTab === "analytics" ? "text-purple-500" : ""}`} />
          Analytics & Dashboard
        </button>
        <button 
          className={`flex items-center justify-center gap-2 flex-1 sm:flex-none px-6 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${activeTab === "inventory" ? "bg-background text-foreground shadow-sm scale-100" : "text-muted-foreground hover:text-foreground scale-95"}`}
          onClick={() => setActiveTab("inventory")}
        >
          <Package className={`w-4 h-4 ${activeTab === "inventory" ? "text-primary" : ""}`} />
          Inventory Management
        </button>
        <button 
          className={`flex items-center justify-center gap-2 flex-1 sm:flex-none px-6 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${activeTab === "sales" ? "bg-background text-foreground shadow-sm scale-100" : "text-muted-foreground hover:text-foreground scale-95"}`}
          onClick={() => setActiveTab("sales")}
        >
          <History className={`w-4 h-4 ${activeTab === "sales" ? "text-blue-500" : ""}`} />
          Sales & Purchases
        </button>
      </div>

      {activeTab === "analytics" && (
        <div className="space-y-6">
          {/* Sales Analytics */}
          <div>
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-emerald-500" />
              Sales Revenue
            </h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <KpiCard title="Today's Sales" value={formatETB(analytics?.sales?.today?.total || 0)} sub={`${analytics?.sales?.today?.quantity || 0} units sold`} />
              <KpiCard title="This Week's Sales" value={formatETB(analytics?.sales?.week?.total || 0)} sub={`${analytics?.sales?.week?.quantity || 0} units sold`} />
              <KpiCard title="This Month's Sales" value={formatETB(analytics?.sales?.month?.total || 0)} sub={`${analytics?.sales?.month?.quantity || 0} units sold`} />
              <KpiCard title="This Year's Sales" value={formatETB(analytics?.sales?.year?.total || 0)} sub={`${analytics?.sales?.year?.quantity || 0} units sold`} />
            </div>
          </div>

          {/* Purchase Analytics */}
          <div>
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-rose-500" />
              Inventory Expenses (Purchases)
            </h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <KpiCard title="Today's Purchases" value={formatETB(analytics?.purchases?.today?.total || 0)} sub={`${analytics?.purchases?.today?.quantity || 0} units added`} alert />
              <KpiCard title="This Week's Purchases" value={formatETB(analytics?.purchases?.week?.total || 0)} sub={`${analytics?.purchases?.week?.quantity || 0} units added`} alert />
              <KpiCard title="This Month's Purchases" value={formatETB(analytics?.purchases?.month?.total || 0)} sub={`${analytics?.purchases?.month?.quantity || 0} units added`} alert />
              <KpiCard title="This Year's Purchases" value={formatETB(analytics?.purchases?.year?.total || 0)} sub={`${analytics?.purchases?.year?.quantity || 0} units added`} alert />
            </div>
          </div>
        </div>
      )}

      {activeTab === "inventory" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Create New Product */}
            <Card className="rounded-3xl border-muted-foreground/15 shadow-sm overflow-hidden">
              <CardHeader className="py-4 px-6 border-b bg-muted/20">
                <CardTitle className="text-lg flex items-center gap-2">
                  <PlusCircle className="w-5 h-5 text-primary" />
                  Create New Product
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 sm:col-span-1 space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase">Product Name</label>
                    <Input 
                      placeholder="e.g. Raw Milk" 
                      value={newProductName}
                      onChange={(e) => setNewProductName(e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1 space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase">Unit (e.g. Litre, kg)</label>
                    <Input 
                      placeholder="Litre" 
                      value={newProductUnit}
                      onChange={(e) => setNewProductUnit(e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1 space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase">Selling Price / Unit</label>
                    <Input 
                      type="number"
                      placeholder="120 ETB" 
                      value={newProductPrice}
                      onChange={(e) => setNewProductPrice(e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1 space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase">Initial Stock Qty</label>
                    <Input 
                      type="number" step="0.1"
                      placeholder="50" 
                      value={newProductStock}
                      onChange={(e) => setNewProductStock(e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase">Total Cost of Initial Stock (ETB)</label>
                    <Input 
                      type="number"
                      placeholder="Total cost paid to supplier (Logs as Expense)" 
                      value={newProductCost}
                      onChange={(e) => setNewProductCost(e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                </div>
                <Button 
                  onClick={handleCreateProduct}
                  disabled={createProduct.isPending || createPurchase.isPending || !newProductName || !newProductPrice}
                  className="rounded-xl font-bold w-full mt-2"
                >
                  Create Product & Record Stock
                </Button>
              </CardContent>
            </Card>

            {/* Restock Existing Product */}
            <Card className="rounded-3xl border-muted-foreground/15 shadow-sm overflow-hidden">
              <CardHeader className="py-4 px-6 border-b bg-muted/20">
                <CardTitle className="text-lg flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-emerald-500" />
                  Restock Existing Product
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase">Select Product</label>
                    <select 
                      className="flex h-10 w-full items-center justify-between rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={restockProductId}
                      onChange={(e) => setRestockProductId(e.target.value)}
                    >
                      <option value="">-- Choose Product --</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.stock_quantity} {p.unit} in stock)</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Quantity Added</label>
                      <Input 
                        type="number" step="0.1"
                        placeholder="Qty" 
                        value={restockQuantity}
                        onChange={(e) => setRestockQuantity(e.target.value)}
                        className="rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Total Purchase Cost</label>
                      <Input 
                        type="number"
                        placeholder="Cost in ETB" 
                        value={restockCost}
                        onChange={(e) => setRestockCost(e.target.value)}
                        className="rounded-xl"
                      />
                    </div>
                  </div>
                </div>
                <Button 
                  onClick={handleRestock}
                  disabled={createPurchase.isPending || !restockProductId || !restockQuantity}
                  variant="secondary"
                  className="rounded-xl font-bold w-full mt-2 border-emerald-500/20 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                >
                  Restock Product & Log Expense
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-3xl border-muted-foreground/15 shadow-sm overflow-hidden mt-6">
            <CardHeader className="py-4 px-6 border-b">
              <CardTitle className="text-lg">Current Inventory</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                    <tr>
                      <th className="px-6 py-3 font-medium">Product Name</th>
                      <th className="px-6 py-3 font-medium">Price</th>
                      <th className="px-6 py-3 font-medium">Stock Level</th>
                      <th className="px-6 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {products.map((product) => (
                      <tr key={product.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4 font-bold text-foreground">{product.name}</td>
                        <td className="px-6 py-4 font-black text-primary">{formatETB(product.price)} / {product.unit}</td>
                        <td className="px-6 py-4">
                          <span className={`font-mono font-bold ${product.stock_quantity <= 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                            {product.stock_quantity} {product.unit}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {product.is_active ? (
                            <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/20 font-bold">Active</Badge>
                          ) : (
                            <Badge variant="secondary" className="font-bold">Inactive</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                    {products.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                          No products found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "sales" && (
        <div className="space-y-6">
          <Card className="rounded-3xl border-muted-foreground/15 shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/20 border-b">
              <CardTitle className="text-lg">Recent Sales Ledger</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                    <tr>
                      <th className="px-6 py-3 font-medium">Sale Date</th>
                      <th className="px-6 py-3 font-medium">Product</th>
                      <th className="px-6 py-3 font-medium">Quantity Sold</th>
                      <th className="px-6 py-3 font-medium">Total Revenue</th>
                      <th className="px-6 py-3 font-medium">Sold By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {productSales.slice(0, 50).map((sale) => (
                      <tr key={sale.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4 text-muted-foreground text-xs font-mono">
                          {format(new Date(sale.sale_date), "MMM d, HH:mm")}
                        </td>
                        <td className="px-6 py-4 font-bold text-foreground">{sale.product_name}</td>
                        <td className="px-6 py-4 font-bold text-foreground">{sale.quantity}</td>
                        <td className="px-6 py-4 font-black text-emerald-600">+{formatETB(sale.total_price)}</td>
                        <td className="px-6 py-4 text-muted-foreground">{sale.sold_by_name || "System"}</td>
                      </tr>
                    ))}
                    {productSales.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                          No product sales recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-muted-foreground/15 shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/20 border-b">
              <CardTitle className="text-lg text-rose-500">Recent Purchase Ledger (Expenses)</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                    <tr>
                      <th className="px-6 py-3 font-medium">Purchase Date</th>
                      <th className="px-6 py-3 font-medium">Product</th>
                      <th className="px-6 py-3 font-medium">Quantity Added</th>
                      <th className="px-6 py-3 font-medium">Total Cost</th>
                      <th className="px-6 py-3 font-medium">Purchased By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {productPurchases.slice(0, 50).map((purchase) => (
                      <tr key={purchase.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4 text-muted-foreground text-xs font-mono">
                          {format(new Date(purchase.purchase_date), "MMM d, yyyy")}
                        </td>
                        <td className="px-6 py-4 font-bold text-foreground">{purchase.product_name}</td>
                        <td className="px-6 py-4 font-bold text-foreground">{purchase.quantity}</td>
                        <td className="px-6 py-4 font-black text-rose-500">-{formatETB(purchase.total_cost)}</td>
                        <td className="px-6 py-4 text-muted-foreground">{purchase.purchased_by_name || "System"}</td>
                      </tr>
                    ))}
                    {productPurchases.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                          No inventory purchases recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function KpiCard({ title, value, sub, alert = false }: any) {
  return (
    <Card className={`rounded-3xl shadow-sm ${alert ? 'border-rose-200 bg-rose-50/30' : ''}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-black ${alert ? 'text-rose-600' : 'text-foreground'}`}>{value}</div>
        <p className="text-xs text-muted-foreground mt-1 font-medium">{sub}</p>
      </CardContent>
    </Card>
  );
}
