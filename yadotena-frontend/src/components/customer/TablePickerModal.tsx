"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { useCustomerDineIn } from "@/contexts/CustomerDineInContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { findActiveOrderForTable } from "@/lib/tableUtils";
import { X, QrCode, Utensils, Check, Camera, Layers } from "lucide-react";

export function TablePickerModal() {
  const {
    isTablePickerOpen,
    setIsTablePickerOpen,
    tableId,
    setTableId,
    setIsQRScannerOpen
  } = useCustomerDineIn();

  const { data: tables = [], isLoading } = useQuery({
    queryKey: ["tables"],
    queryFn: api.tables.getAll,
    enabled: isTablePickerOpen,
  });

  const { data: orders = [] } = useQuery({
    queryKey: ["orders", "picker-active-check"],
    queryFn: async () => {
      try {
        return await api.orders.getAll();
      } catch {
        return [];
      }
    },
    enabled: isTablePickerOpen,
  });

  if (!isTablePickerOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={() => setIsTablePickerOpen(false)} />

      <div className="relative w-full max-w-md bg-card border rounded-3xl shadow-2xl overflow-hidden z-10 animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Utensils className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base">Select Your Table</h3>
              <p className="text-xs text-muted-foreground">Pick the table you are currently seated at</p>
            </div>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="rounded-full"
            onClick={() => setIsTablePickerOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* QR Camera Shortcut */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-primary/10 via-amber-500/10 to-primary/10 border border-primary/20 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-foreground font-semibold">
              <QrCode className="h-5 w-5 text-primary shrink-0" />
              <span>Or scan the QR code on your table stand using camera!</span>
            </div>
            <Button
              size="sm"
              className="rounded-full font-bold text-xs h-8 px-3.5 gap-1 shrink-0 ml-2 shadow-sm"
              onClick={() => {
                setIsTablePickerOpen(false);
                setIsQRScannerOpen(true);
              }}
            >
              <Camera className="h-3.5 w-3.5" />
              <span>Scan QR</span>
            </Button>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 gap-3 py-6 animate-pulse">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-24 bg-muted/60 rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {tables.map((table) => {
                const isSelected = tableId === table.id;
                const activeOrd = findActiveOrderForTable(table, orders);
                const ticketNum = activeOrd ? activeOrd.id.slice(-6).toUpperCase() : null;

                return (
                  <button
                    key={table.id}
                    type="button"
                    onClick={() => {
                      setTableId(table.id);
                      setIsTablePickerOpen(false);
                    }}
                    className={`p-4 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between space-y-2 group relative overflow-hidden ${
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/25 scale-[1.02]"
                        : activeOrd
                        ? "bg-amber-500/10 border-amber-500/30 hover:border-amber-500/60"
                        : "bg-card border-muted hover:border-primary/50 hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold opacity-80">
                        🪑 {table.capacity} Seats
                      </span>
                      {isSelected && (
                        <div className="h-5 w-5 rounded-full bg-white text-primary flex items-center justify-center">
                          <Check className="h-3.5 w-3.5 stroke-[3]" />
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="font-black text-base leading-tight">
                        {table.name}
                      </div>

                      {activeOrd ? (
                        <div className="mt-1 flex items-center gap-1">
                          <Badge
                            variant="secondary"
                            className={`text-[9px] font-bold px-1.5 py-0.2 ${
                              isSelected
                                ? "bg-white/20 text-white"
                                : "bg-amber-500 text-amber-950"
                            }`}
                          >
                            <Layers className="h-2.5 w-2.5 mr-1" />
                            Active Order #{ticketNum}
                          </Badge>
                        </div>
                      ) : (
                        <div className="text-[11px] opacity-75 mt-0.5 font-medium">
                          Available Table
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-muted/20 text-center text-xs text-muted-foreground">
          Selecting an occupied table lets you append dishes directly to the table&apos;s open order.
        </div>
      </div>
    </div>
  );
}
