import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { OrderType, MenuItem, OrderItem, Table } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatETB } from "@/lib/currency";
import { 
  ArrowLeft, Plus, Minus, Search, Utensils, 
  ShoppingBag, Truck, CheckCircle2, ChevronRight 
} from "lucide-react";
import { FullPageMenuPOS } from "@/components/dashboard/FullPageMenuPOS";

export function PlaceOrderTab() {
  const queryClient = useQueryClient();

  // Queries
  const { data: menu, isLoading: isLoadingMenu } = useQuery({
    queryKey: ["menu"],
    queryFn: api.menu.getAll,
  });

  const { data: tables, isLoading: isLoadingTables } = useQuery({
    queryKey: ["tables"],
    queryFn: api.tables.getAll,
  });

  // Wizard State
  const [step, setStep] = useState<1 | 2>(1);

  // Inline success feedback — no blocking alert() on a busy admin screen.
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  // Form State
  const [orderType, setOrderType] = useState<OrderType>("DINE_IN");
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const handleTableSelect = (tableId: string) => {
    setOrderType("DINE_IN");
    setSelectedTable(tableId);
    setStep(2);
  };

  const handleTypeSelect = (type: "TAKEAWAY" | "DELIVERY") => {
    setOrderType(type);
    setSelectedTable(null);
    setStep(2);
  };

  // -------------------------------------------------------------
  // STEP 1: Table & Type Selection
  // -------------------------------------------------------------
  if (step === 1) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        {toast && (
          <div
            role="status"
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] px-4 py-2.5 rounded-xl border bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold shadow-xl animate-in fade-in slide-in-from-top-2 flex items-center gap-2"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            {toast}
          </div>
        )}
        <div className="text-center max-w-lg mx-auto mt-4 mb-8">
          <h3 className="text-2xl font-black mb-2">Select a Table or Order Type</h3>
          <p className="text-muted-foreground text-sm">Choose where to place this order to begin selecting items.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto mb-8">
          <Button 
            variant="outline" 
            className="h-24 justify-start px-6 rounded-2xl hover:bg-amber-500/10 hover:border-amber-500/30 transition-all group"
            onClick={() => handleTypeSelect("TAKEAWAY")}
          >
            <div className="bg-amber-500/20 p-3 rounded-full mr-4 group-hover:scale-110 transition-transform">
              <ShoppingBag className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="text-left">
              <div className="font-bold text-lg text-foreground">Takeaway</div>
              <div className="text-xs text-muted-foreground font-medium">Customer picks up</div>
            </div>
            <ChevronRight className="ml-auto text-muted-foreground opacity-50" />
          </Button>

          <Button 
            variant="outline" 
            className="h-24 justify-start px-6 rounded-2xl hover:bg-blue-500/10 hover:border-blue-500/30 transition-all group"
            onClick={() => handleTypeSelect("DELIVERY")}
          >
            <div className="bg-blue-500/20 p-3 rounded-full mr-4 group-hover:scale-110 transition-transform">
              <Truck className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="text-left">
              <div className="font-bold text-lg text-foreground">Delivery</div>
              <div className="text-xs text-muted-foreground font-medium">Send to address</div>
            </div>
            <ChevronRight className="ml-auto text-muted-foreground opacity-50" />
          </Button>
        </div>

        <div className="max-w-4xl mx-auto">
          <h4 className="font-bold text-muted-foreground mb-4 flex items-center gap-2">
            <Utensils className="h-4 w-4" /> Dine-In Tables
          </h4>
          {isLoadingTables ? (
            <div className="p-8 text-center animate-pulse">Loading tables...</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {tables?.map(table => (
                <Button
                  key={table.id}
                  variant="outline"
                  className={`h-24 flex-col gap-2 rounded-2xl border-2 transition-all hover:bg-primary/5 hover:border-primary/30 ${table.status !== 'AVAILABLE' ? 'opacity-60 grayscale' : ''}`}
                  onClick={() => handleTableSelect(table.id)}
                >
                  <span className="text-2xl font-black text-foreground">{table.name}</span>
                  <Badge variant={table.status === 'AVAILABLE' ? 'success' : 'secondary'} className="text-[10px]">
                    {table.status}
                  </Badge>
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (step === 2) {
    return (
      <FullPageMenuPOS 
        orderType={orderType}
        tableId={selectedTable}
        onCancel={() => setStep(1)}
        onSuccess={() => {
          setStep(1);
          setSelectedTable(null);
          setToast("Order placed successfully!");
        }}
      />
    );
  }

  return null;
}
