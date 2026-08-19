"use client";

import { Printer, User, Utensils, ShoppingBag, Truck } from "lucide-react";
import { Order } from "@/types";
import { soundAlerts } from "@/lib/audioAlerts";

interface KitchenFooterProps {
  order: Order;
  round: number;
  extended: boolean;
  createdAt: string;
  tableLabel: string;
}

export function KitchenFooter({
  order,
  round,
  extended,
  createdAt,
  tableLabel,
}: KitchenFooterProps) {
  const customerName = order.customerName || order.notes?.match(/Customer:\s*([^\n,]+)/i)?.[1];
  const timeFormatted = new Date(createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const handlePrintKOT = (e: React.MouseEvent) => {
    e.stopPropagation();
    soundAlerts.playActionConfirm();

    const printWindow = window.open("", "_blank", "width=350,height=500");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>KOT #${order.id.slice(-6).toUpperCase()}</title>
          <style>
            body { font-family: monospace; padding: 10px; width: 280px; font-size: 12px; }
            h2 { margin: 0 0 5px 0; font-size: 16px; border-bottom: 2px solid #000; }
            .item { margin: 6px 0; font-weight: bold; }
            .addon { margin-left: 10px; font-weight: normal; font-size: 11px; }
            .note { color: red; font-weight: bold; margin-top: 2px; }
            .footer { border-top: 1px dashed #000; margin-top: 10px; pt-5px; font-size: 10px; }
          </style>
        </head>
        <body>
          <h2>KOT: ${tableLabel}</h2>
          <div>Ticket #${order.id.slice(-6).toUpperCase()} · ${round > 1 ? `Round ${round}` : "Initial"}</div>
          <div>Time: ${timeFormatted} | Type: ${order.type}</div>
          <hr/>
          ${(order.items || [])
            .map(
              (i) => `
            <div class="item">${i.quantity}x ${i.name}</div>
            ${i.specialInstructions ? `<div class="note">** ${i.specialInstructions.toUpperCase()} **</div>` : ""}
          `
            )
            .join("")}
          <div class="footer">Printed at ${new Date().toLocaleTimeString()}</div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <div className="pt-2 mt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400 select-none">
      <div className="flex items-center gap-2 font-medium truncate">
        {order.type === "DINE_IN" ? (
          <span className="flex items-center gap-1 text-zinc-400">
            <Utensils className="h-3.5 w-3.5" />
            Dine In
          </span>
        ) : order.type === "DELIVERY" ? (
          <span className="flex items-center gap-1 text-zinc-400">
            <Truck className="h-3.5 w-3.5" />
            Delivery
          </span>
        ) : (
          <span className="flex items-center gap-1 text-zinc-400">
            <ShoppingBag className="h-3.5 w-3.5" />
            Takeaway
          </span>
        )}

        <span>•</span>
        <span className="font-mono text-[11px] text-zinc-400">{timeFormatted}</span>

        {customerName && (
          <>
            <span>•</span>
            <span className="flex items-center gap-1 text-zinc-300 truncate">
              <User className="h-3 w-3" />
              {customerName}
            </span>
          </>
        )}
      </div>

      <button
        onClick={handlePrintKOT}
        title="Print Kitchen Order Ticket (KOT)"
        className="h-8 w-8 rounded-lg bg-zinc-900 border border-zinc-800/80 hover:bg-zinc-800 hover:text-white text-zinc-400 flex items-center justify-center transition-all active:scale-90 cursor-pointer shrink-0 ml-1"
        aria-label="Print KOT"
      >
        <Printer className="h-4 w-4" />
      </button>
    </div>
  );
}
