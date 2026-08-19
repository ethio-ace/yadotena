"use client";

import { DateRange } from "@/lib/owner";
import { Order } from "@/types";
import { UserRound } from "lucide-react";

export function CustomersReport({ range, orders }: { range: DateRange; orders: Order[] }) {
  return (
    <div className="bg-card border rounded-2xl p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-black text-sm text-foreground flex items-center gap-1.5">
            <UserRound className="h-4 w-4 text-amber-500" /> Anonymous Guest Dining
          </h3>
          <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
            Customers are view-only and anonymous by design. Personal customer data is not tracked or stored.
          </p>
        </div>
      </div>
    </div>
  );
}
