"use client";

import { useCustomerDineIn } from "@/contexts/CustomerDineInContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { Utensils, QrCode, X, Sparkles, Receipt, Camera } from "lucide-react";

export function CustomerTableBanner() {
  const router = useRouter();
  const {
    tableId,
    tableName,
    activeTableOrder,
    clearTable,
    setIsTablePickerOpen,
    setIsQRScannerOpen
  } = useCustomerDineIn();

  if (!tableId) {
    return (
      <div className="bg-gradient-to-r from-amber-500/10 via-primary/5 to-amber-500/10 border-b px-4 py-2 text-xs flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-foreground font-medium truncate">
          <QrCode className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span className="truncate">
            Dining in the restaurant? Connect your table or scan QR code to order dishes to your table.
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            size="sm"
            variant="outline"
            className="rounded-full text-xs font-bold h-7 px-3 border-primary/40 text-primary hover:bg-primary/10 gap-1"
            onClick={() => setIsQRScannerOpen(true)}
          >
            <Camera className="h-3 w-3" />
            <span>Scan QR</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="rounded-full text-xs font-bold h-7 px-3 border-amber-500/40 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10"
            onClick={() => setIsTablePickerOpen(true)}
          >
            Select Table
          </Button>
        </div>
      </div>
    );
  }

  const activeTicket = activeTableOrder ? activeTableOrder.id.slice(-6).toUpperCase() : null;

  return (
    <div className={`border-b px-4 py-2.5 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-sm animate-in fade-in duration-300 ${
      activeTableOrder
        ? "bg-gradient-to-r from-amber-500/20 via-primary/15 to-amber-500/20 border-amber-500/40"
        : "bg-gradient-to-r from-emerald-600/15 via-primary/10 to-emerald-600/15 border-emerald-500/30"
    }`}>
      <div className="flex items-center gap-2.5 min-w-0">
        <Badge className={`font-extrabold px-2.5 py-0.5 text-xs shrink-0 flex items-center gap-1 ${
          activeTableOrder ? "bg-amber-500 text-amber-950" : "bg-emerald-500 text-white"
        }`}>
          <Utensils className="h-3 w-3" />
          {activeTableOrder ? "Active Table Order" : "Seated Dine-In"}
        </Badge>
        
        <div className="font-extrabold text-foreground text-xs md:text-sm truncate flex flex-wrap items-center gap-1.5">
          <span>Seated at {tableName}</span>
          {activeTableOrder ? (
            <span className="text-amber-700 dark:text-amber-400 font-bold">
              · Ticket #{activeTicket} in Progress ({activeTableOrder.items?.length || 0} items)
            </span>
          ) : (
            <span className="text-emerald-600 dark:text-emerald-400 font-bold hidden sm:inline">
              · Mobile Table Ordering Active
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
        {activeTableOrder && (
          <Button
            size="sm"
            className="h-7 text-xs font-bold rounded-full bg-amber-500 hover:bg-amber-600 text-amber-950 gap-1"
            onClick={() => router.push(`/order/${activeTableOrder.id}`)}
          >
            <Receipt className="h-3 w-3" />
            <span>Track Order #{activeTicket}</span>
          </Button>
        )}

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
