"use client";

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Flame, Check, UtensilsCrossed, AlertTriangle, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { formatETB } from "@/lib/currency";

export function KitchenOrderCard({ 
  order, 
  actionText, 
  actionVariant = "primary", 
  onAction,
  isLoading,
  hideAction,
  isUrgent,
  onAddItems
}: any) {
  const tableDisplay = order.tableId 
    ? `Table ${order.tableId.replace('t', '')}` 
    : (order.customerName ? `Takeout: ${order.customerName}` : "Takeout / Express");

  return (
    <Card 
      className={`rounded-2xl transition-all shadow-sm flex flex-col justify-between overflow-hidden ${
        isUrgent 
          ? "border-2 border-primary ring-2 ring-primary/20 shadow-md animate-in fade-in" 
          : "border bg-card hover:border-primary/40"
      }`}
    >
      {/* Card Header */}
      <CardHeader className={`p-3.5 border-b flex flex-row items-center justify-between space-y-0 ${
        isUrgent ? "bg-primary/10" : "bg-muted/30"
      }`}>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-foreground">
              {order.id.slice(-6).toUpperCase()}
            </span>
            {isUrgent && (
              <Badge className="bg-primary text-primary-foreground text-[9px] font-black uppercase px-2 py-0.5 animate-pulse">
                New Order
              </Badge>
            )}
          </div>
          <span className="text-xs font-black text-primary block mt-0.5">
            {tableDisplay}
          </span>
        </div>

        <div className="flex items-center gap-1 text-[11px] font-bold text-muted-foreground bg-background/80 px-2.5 py-1 rounded-xl border">
          <Clock className="h-3 w-3 text-primary shrink-0" />
          <span>{formatDistanceToNow(new Date(order.createdAt))} ago</span>
        </div>
      </CardHeader>

      {/* Itemized Dish List */}
      <CardContent className="p-3.5 space-y-3 flex-1">
        <ul className="space-y-2.5">
          {order.items?.map((item: any, i: number) => (
            <li key={i} className="space-y-1">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 min-w-0">
                  <span className="font-black text-xs text-primary-foreground bg-primary px-2 py-0.5 rounded-lg shrink-0">
                    {item.quantity}×
                  </span>
                  <div className="min-w-0">
                    <span className="font-extrabold text-sm text-foreground leading-snug block">
                      {item.name}
                    </span>
                    
                    {/* Addons List */}
                    {item.selectedAddons && item.selectedAddons.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {item.selectedAddons.map((addon: any, aIdx: number) => (
                          <span key={aIdx} className="bg-muted text-muted-foreground text-[10px] font-bold px-1.5 py-0.5 rounded border">
                            +{typeof addon === "string" ? addon : addon.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {item.roundNumber && item.roundNumber > 1 && (
                  <Badge variant="outline" className="text-[9px] font-black text-primary border-primary/40 shrink-0">
                    Round {item.roundNumber}
                  </Badge>
                )}
              </div>

              {/* Special Instructions Note */}
              {item.specialInstructions && (
                <div className="ml-7 text-xs bg-primary/10 text-primary border border-primary/20 px-2.5 py-1 rounded-xl font-bold">
                  Note: "{item.specialInstructions}"
                </div>
              )}
            </li>
          ))}
        </ul>
      </CardContent>

      {/* Card Actions */}
      <CardFooter className="p-3 border-t bg-muted/20 flex flex-col sm:flex-row gap-2">
        {onAddItems && (
          <Button 
            variant="outline"
            className="w-full sm:w-auto text-xs font-black h-10 rounded-xl border"
            onClick={onAddItems}
          >
            + Add Extra
          </Button>
        )}
        {!hideAction && (
          <Button 
            onClick={onAction}
            disabled={isLoading}
            className={`w-full text-xs font-black h-11 rounded-xl shadow-sm ${
              isUrgent 
                ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            }`}
          >
            {actionText}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
