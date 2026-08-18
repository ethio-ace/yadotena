"use client";

import { useCustomerDineIn } from "@/contexts/CustomerDineInContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Utensils, QrCode, X, Sparkles } from "lucide-react";

export function CustomerTableBanner() {
  const { tableId, tableName, clearTable, setIsTablePickerOpen } = useCustomerDineIn();

  if (!tableId) {
    return (
      <div className="bg-gradient-to-r from-amber-500/10 via-primary/5 to-amber-500/10 border-b px-4 py-2 text-xs flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-foreground font-medium truncate">
          <QrCode className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span className="truncate">Dining in the restaurant? Connect your table to order dishes directly to your table.</span>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="rounded-full text-xs font-bold h-7 px-3 border-amber-500/40 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 shrink-0"
          onClick={() => setIsTablePickerOpen(true)}
        >
          Select Table
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-emerald-600/15 via-primary/10 to-emerald-600/15 border-b border-emerald-500/30 px-4 py-2.5 text-xs flex items-center justify-between gap-3 shadow-sm animate-in fade-in duration-300">
      <div className="flex items-center gap-2.5 min-w-0">
        <Badge className="bg-emerald-500 text-white font-extrabold px-2.5 py-0.5 text-xs shrink-0 flex items-center gap-1">
          <Utensils className="h-3 w-3" />
          Dine-In
        </Badge>
        <div className="font-extrabold text-foreground text-xs md:text-sm truncate flex items-center gap-1.5">
          <span>Seated at {tableName}</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-bold hidden sm:inline">
            · Mobile Table Ordering Active
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs font-bold rounded-full text-muted-foreground hover:text-foreground"
          onClick={() => setIsTablePickerOpen(true)}
        >
          Switch Table
        </Button>
        <button
          type="button"
          onClick={clearTable}
          className="h-7 w-7 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Clear Table"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
