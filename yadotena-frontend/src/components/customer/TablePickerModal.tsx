"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { useCustomerDineIn } from "@/contexts/CustomerDineInContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, QrCode, Utensils, Check, Camera, Lock, CheckCircle2 } from "lucide-react";

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
              <h3 className="font-extrabold text-base">Select Available Table</h3>
              <p className="text-xs text-muted-foreground">Pick an available table to begin dining</p>
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
                const isOccupied = table.status !== "AVAILABLE";

                return (
                  <button
                    key={table.id}
                    type="button"
                    disabled={isOccupied}
                    onClick={() => {
                      if (isOccupied) return;
                      setTableId(table.id);
                      setIsTablePickerOpen(false);
                    }}
                    className={`p-4 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between space-y-2 group relative overflow-hidden ${
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/25 scale-[1.02]"
                        : isOccupied
                        ? "bg-muted/40 border-muted opacity-60 cursor-not-allowed"
                        : "bg-card border-muted hover:border-primary/50 hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold opacity-80">
                        🪑 {table.capacity} Seats
                      </span>
                      {isSelected ? (
                        <div className="h-5 w-5 rounded-full bg-white text-primary flex items-center justify-center">
                          <Check className="h-3.5 w-3.5 stroke-[3]" />
                        </div>
                      ) : isOccupied ? (
                        <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                      ) : null}
                    </div>

                    <div>
                      <div className="font-black text-base leading-tight">
                        {table.name}
                      </div>

                      {isOccupied ? (
                        <div className="mt-1 flex items-center gap-1">
                          <Badge
                            variant="secondary"
                            className="text-[9px] font-bold px-1.5 py-0.2 bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30"
                          >
                            Occupied
                          </Badge>
                        </div>
                      ) : (
                        <div className="mt-1 flex items-center gap-1">
                          <Badge
                            variant="secondary"
                            className="text-[9px] font-bold px-1.5 py-0.2 bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30"
                          >
                            <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
                            Available
                          </Badge>
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
          Only available tables can be selected for new orders. If you are joining a seated group, scan its QR code directly.
        </div>
      </div>
    </div>
  );
}
