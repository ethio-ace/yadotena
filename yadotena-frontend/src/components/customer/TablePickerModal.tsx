"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { useCustomerDineIn } from "@/contexts/CustomerDineInContext";
import { Button } from "@/components/ui/button";
import { X, QrCode, Utensils, Check } from "lucide-react";

export function TablePickerModal() {
  const { isTablePickerOpen, setIsTablePickerOpen, tableId, setTableId } = useCustomerDineIn();

  const { data: tables = [], isLoading } = useQuery({
    queryKey: ["tables"],
    queryFn: api.tables.getAll,
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
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-3 text-xs text-amber-700 dark:text-amber-400">
            <QrCode className="h-5 w-5 shrink-0 text-amber-500" />
            <span>
              <strong>Tip:</strong> You can also scan the QR code on your table stand to connect automatically!
            </span>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 gap-3 py-6 animate-pulse">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-20 bg-muted/60 rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {tables.map((table) => {
                const isSelected = tableId === table.id;
                return (
                  <button
                    key={table.id}
                    type="button"
                    onClick={() => {
                      setTableId(table.id);
                      setIsTablePickerOpen(false);
                    }}
                    className={`p-4 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between space-y-2 group ${
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/25 scale-[1.02]"
                        : "bg-card border-muted hover:border-primary/50 hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold opacity-80">
                        🪑 Seats {table.capacity}
                      </span>
                      {isSelected && (
                        <div className="h-5 w-5 rounded-full bg-white text-primary flex items-center justify-center">
                          <Check className="h-3.5 w-3.5 stroke-[3]" />
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="font-extrabold text-base leading-tight">
                        {table.name}
                      </div>
                      <div className="text-[11px] opacity-75 mt-0.5">
                        {table.status === "OCCUPIED" ? "Occupied Table" : "Available Table"}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-muted/20 text-center text-xs text-muted-foreground">
          Need help? Ask any floor waiter to assist you.
        </div>
      </div>
    </div>
  );
}
