"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Clock, Plus, Utensils } from "lucide-react";
import { cn } from "@/lib/utils";
import { CreateOrderModal } from "@/components/dashboard/CreateOrderModal";

export default function TablesPage() {
  const [selectedTableForOrder, setSelectedTableForOrder] = useState<string | null>(null);

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
          <p className="text-muted-foreground mt-1">Real-time table occupancy, status, and direct waiter order punching.</p>
        </div>
        <Button 
          className="rounded-xl font-bold shadow-md shadow-primary/20 flex items-center gap-2"
          onClick={() => setSelectedTableForOrder("t1")}
        >
          <Plus className="h-4 w-4" />
          <span>+ Punch Order (Staff POS)</span>
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-pulse">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-36 bg-muted rounded-2xl"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {tables?.map((table) => (
            <TableCard 
              key={table.id} 
              table={table} 
              onPunchOrder={() => setSelectedTableForOrder(table.id)}
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
    </div>
  );
}

function TableCard({ table, onPunchOrder }: { table: any; onPunchOrder: () => void }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "AVAILABLE": return "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400";
      case "OCCUPIED": return "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400";
      case "PREPARING": return "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400";
      case "WAITING_FOR_SERVICE": return "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400";
      case "CLEANING": return "bg-slate-500/10 border-slate-500/20 text-slate-600 dark:text-slate-400";
      default: return "bg-muted border-muted-foreground/20 text-muted-foreground";
    }
  };

  const statusColor = getStatusColor(table.status);

  return (
    <Card 
      onClick={onPunchOrder}
      className={cn("overflow-hidden cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all border-2 rounded-2xl group", statusColor)}
    >
      <CardContent className="p-5 flex flex-col h-full justify-between space-y-4">
        <div className="flex justify-between items-start">
          <h3 className="font-extrabold text-lg group-hover:text-primary transition-colors">{table.name}</h3>
          <div className="flex items-center text-xs font-semibold bg-background/70 backdrop-blur-sm rounded-full px-2.5 py-1">
            <Users className="h-3 w-3 mr-1" />
            {table.capacity} Seats
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider">
            {table.status.replace(/_/g, " ")}
          </div>
          
          <div className="pt-2 border-t border-muted/30 flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
              <Utensils className="h-3 w-3" /> Tap to punch order
            </span>
            <span className="text-xs font-bold text-primary group-hover:underline">Order →</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
