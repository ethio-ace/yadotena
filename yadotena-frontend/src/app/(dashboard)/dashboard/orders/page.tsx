"use client";

import { useState } from "react";
import { PlaceOrderTab } from "@/components/dashboard/orders/PlaceOrderTab";
import { ActiveOrdersTab } from "@/components/dashboard/orders/ActiveOrdersTab";
import { OrderHistoryTab } from "@/components/dashboard/orders/OrderHistoryTab";
import { CheckCircle2, ClipboardList, PlusCircle } from "lucide-react";

export default function OrdersPage() {
  const [activeTab, setActiveTab] = useState<"place_order" | "active_orders" | "history">("place_order");

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Orders</h2>
          <p className="text-muted-foreground mt-1">Manage, dispatch, and track live restaurant orders.</p>
        </div>
      </div>
      
      {/* Custom Tabs Navigation */}
      <div className="flex bg-muted/60 p-1.5 rounded-2xl w-full sm:w-fit overflow-x-auto shadow-inner">
        <button 
          className={`flex items-center justify-center gap-2 flex-1 sm:flex-none px-6 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${activeTab === "place_order" ? "bg-background text-foreground shadow-sm scale-100" : "text-muted-foreground hover:text-foreground scale-95"}`}
          onClick={() => setActiveTab("place_order")}
        >
          <PlusCircle className={`w-4 h-4 ${activeTab === "place_order" ? "text-primary" : ""}`} />
          Place Order
        </button>
        <button 
          className={`flex items-center justify-center gap-2 flex-1 sm:flex-none px-6 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${activeTab === "active_orders" ? "bg-background text-foreground shadow-sm scale-100" : "text-muted-foreground hover:text-foreground scale-95"}`}
          onClick={() => setActiveTab("active_orders")}
        >
          <ClipboardList className={`w-4 h-4 ${activeTab === "active_orders" ? "text-blue-500" : ""}`} />
          Active Orders
        </button>
        <button 
          className={`flex items-center justify-center gap-2 flex-1 sm:flex-none px-6 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${activeTab === "history" ? "bg-background text-foreground shadow-sm scale-100" : "text-muted-foreground hover:text-foreground scale-95"}`}
          onClick={() => setActiveTab("history")}
        >
          <CheckCircle2 className={`w-4 h-4 ${activeTab === "history" ? "text-emerald-500" : ""}`} />
          History & Summary
        </button>
      </div>

      <div className="mt-6">
        {activeTab === "place_order" && <PlaceOrderTab />}
        {activeTab === "active_orders" && <ActiveOrdersTab />}
        {activeTab === "history" && <OrderHistoryTab />}
      </div>
    </div>
  );
}
