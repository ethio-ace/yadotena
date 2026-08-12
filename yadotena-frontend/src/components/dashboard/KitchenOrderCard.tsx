import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function KitchenOrderCard({ 
  order, 
  actionText, 
  actionVariant = "secondary", 
  onAction,
  isLoading,
  hideAction,
  isUrgent,
  onAddItems
}: any) {
  return (
    <Card className={`shadow-sm rounded-2xl transition-all ${
      isUrgent 
        ? "border-2 border-rose-500/60 shadow-lg shadow-rose-500/10 ring-2 ring-rose-500/10 animate-in fade-in" 
        : "border"
    }`}>
      <CardHeader className={`p-4 pb-2 border-b rounded-t-2xl ${isUrgent ? "bg-rose-500/10" : "bg-muted/10"}`}>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-base font-black flex items-center gap-1.5">
              <span>#{order.id.slice(-6).toUpperCase()}</span>
              {isUrgent && (
                <span className="text-[10px] font-extrabold bg-rose-500 text-white px-2 py-0.5 rounded-full">
                  NEW
                </span>
              )}
            </CardTitle>
            <p className="text-xs font-bold text-primary mt-0.5">
              {order.type === "DINE_IN" ? `Table ${order.tableId?.replace('t', '')}` : "Takeaway / Delivery"}
            </p>
          </div>
          <div className="flex items-center text-[11px] text-muted-foreground font-semibold bg-background px-2 py-0.5 rounded-full border">
            <Clock className="h-3 w-3 mr-1 text-primary" />
            {formatDistanceToNow(new Date(order.createdAt))} ago
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-2">
        <ul className="space-y-2">
          {order.items.map((item: any, i: number) => (
            <li key={i} className="flex flex-col">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-black text-sm text-primary bg-primary/10 px-2 py-0.5 rounded-lg">
                    {item.quantity}×
                  </span>
                  <span className="font-bold text-sm text-foreground">{item.name}</span>
                  {item.roundNumber && item.roundNumber > 1 && (
                    <span className="text-[10px] font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-md">
                      R{item.roundNumber}
                    </span>
                  )}
                </div>
              </div>
              {item.specialInstructions && (
                <div className="ml-8 mt-1 text-xs bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 px-2 py-1 rounded-lg font-medium">
                  Note: "{item.specialInstructions}"
                </div>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter className="p-3 pt-0 flex flex-col sm:flex-row gap-2">
        {onAddItems && (
          <Button 
            variant="outline"
            className="w-full sm:w-auto text-xs font-black h-10 rounded-xl"
            onClick={onAddItems}
          >
            + Add Extra
          </Button>
        )}
        {!hideAction && (
          <Button 
            variant={actionVariant as any} 
            className="w-full text-xs font-black h-10 rounded-xl"
            onClick={onAction}
            disabled={isLoading}
          >
            {actionText}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
