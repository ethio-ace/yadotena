"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Plus, Utensils, QrCode, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { CreateOrderModal } from "@/components/dashboard/CreateOrderModal";
import { TableQRModal } from "@/components/dashboard/TableQRModal";
import { Table } from "@/types";

export default function TablesPage() {
  const [selectedTableForOrder, setSelectedTableForOrder] = useState<string | null>(null);
  const [selectedTableForQR, setSelectedTableForQR] = useState<Table | null>(null);

  const { data: tables, isLoading } = useQuery({
    queryKey: ["tables"],
    queryFn: api.tables.getAll,
    refetchInterval: 3000,
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Tables & Floor Map</h2>
          <p className="text-muted-foreground mt-1">Real-time floor occupancy, scannable QR stands, and direct waiter order punching.</p>
        </div>
        <div className="flex gap-2">
          <Button 
            className="rounded-xl font-bold shadow-md shadow-primary/20 flex items-center gap-2"
            onClick={() => setSelectedTableForOrder("t1")}
          >
            <Plus className="h-4 w-4" />
            <span>+ Punch Order (Staff POS)</span>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-pulse">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-40 bg-muted rounded-3xl"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {tables?.map((table) => (
            <TableCard 
              key={table.id} 
              table={table} 
              onPunchOrder={() => setSelectedTableForOrder(table.id)}
              onViewQR={() => setSelectedTableForQR(table)}
            />
          ))}
        </div>
      )}

      {/* Staff POS Modal with preselected table */}
      <CreateOrderModal
        isOpen={!!selectedTableForOrder}
        onClose={() => setSelectedTableForOrder(null)}
        initialTableId={selectedTableForOrder || "t1"}
      />

      {/* Printable QR Stand Modal */}
      <TableQRModal
        table={selectedTableForQR}
        isOpen={!!selectedTableForQR}
        onClose={() => setSelectedTableForQR(null)}
      />
    </div>
  );
}

function TableCard({ 
  table, 
  onPunchOrder, 
  onViewQR 
}: { 
  table: Table; 
  onPunchOrder: () => void; 
  onViewQR: () => void;
}) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "AVAILABLE": return "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400";
      case "OCCUPIED": return "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400";
      case "PREPARING": return "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400";
      case "WAITING_FOR_SERVICE": return "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400 animate-pulse";
      case "WAITING_FOR_PAYMENT": return "bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400 animate-pulse";
      case "CLEANING": return "bg-slate-500/10 border-slate-500/20 text-slate-600 dark:text-slate-400";
      default: return "bg-muted border-muted-foreground/20 text-muted-foreground";
    }
  };

  const statusColor = getStatusColor(table.status);

  return (
    <Card 
      className={cn("overflow-hidden hover:shadow-xl transition-all duration-300 border-2 rounded-3xl group flex flex-col justify-between", statusColor)}
    >
      <CardContent className="p-5 flex flex-col h-full justify-between space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-black text-lg group-hover:text-primary transition-colors">{table.name}</h3>
            <span className="text-[11px] font-bold uppercase tracking-wider block mt-0.5 opacity-90">
              {table.status.replace(/_/g, " ")}
            </span>
          </div>

          <div className="flex items-center text-xs font-semibold bg-background/80 backdrop-blur-sm rounded-full px-2.5 py-1 shadow-sm">
            <Users className="h-3 w-3 mr-1" />
            {table.capacity}
          </div>
        </div>
        
        {/* Table Action Buttons */}
        <div className="pt-3 border-t border-muted/30 grid grid-cols-2 gap-2">
          <Button 
            size="sm" 
            variant="outline" 
            className="rounded-xl text-xs font-bold bg-background/70 hover:bg-background h-8 px-2 flex items-center justify-center gap-1 shadow-sm"
            onClick={(e) => {
              e.stopPropagation();
              onViewQR();
            }}
          >
            <QrCode className="h-3.5 w-3.5" />
            <span>QR Stand</span>
          </Button>

          <Button 
            size="sm" 
            className="rounded-xl text-xs font-bold h-8 px-2 flex items-center justify-center gap-1 shadow-sm"
            onClick={(e) => {
              e.stopPropagation();
              onPunchOrder();
            }}
          >
            <Utensils className="h-3.5 w-3.5" />
            <span>Order</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
