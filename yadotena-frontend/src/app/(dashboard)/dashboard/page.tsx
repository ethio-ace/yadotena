"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import { Role } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  ShieldCheck, 
  Briefcase, 
  UserCheck, 
  ChefHat, 
  Wallet, 
  Sparkles,
  LayoutDashboard
} from "lucide-react";

import OwnerDashboardPage from "./owner/page";
import ManagerDashboardPage from "./manager/page";
import WaiterDashboardPage from "./waiter/page";
import CashierDashboardPage from "./cashier/page";
import KitchenPage from "./kitchen/page";

export default function DashboardPage() {
  const { data: session } = useSession();
  const initialRole: Role = (session?.user?.role as Role) || "OWNER";
  const [activeRoleView, setActiveRoleView] = useState<Role>(initialRole);

  const roleViews: { role: Role; label: string; icon: React.ElementType }[] = [
    { role: "OWNER", label: "Executive Owner", icon: ShieldCheck },
    { role: "MANAGER", label: "Store Manager", icon: Briefcase },
    { role: "WAITER", label: "Floor Waiter", icon: UserCheck },
    { role: "KITCHEN", label: "Chef / Kitchen KDS", icon: ChefHat },
    { role: "MANAGER", label: "Cashier POS", icon: Wallet },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      {/* Role Switcher Toolbar */}
      <div className="bg-card/80 border p-3 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-sm backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Badge className="bg-primary/10 text-primary font-black text-[10px] uppercase tracking-wider px-2.5 py-1">
            <Sparkles className="h-3 w-3 mr-1" /> Active Role View
          </Badge>
          <span className="text-xs font-bold text-muted-foreground hidden sm:inline">
            Switch views to test specialized workflows:
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            size="sm"
            variant={activeRoleView === "OWNER" ? "default" : "outline"}
            onClick={() => setActiveRoleView("OWNER")}
            className="rounded-xl text-xs font-bold h-9 gap-1.5"
          >
            <ShieldCheck className="h-3.5 w-3.5" /> Owner
          </Button>

          <Button
            size="sm"
            variant={activeRoleView === "MANAGER" ? "default" : "outline"}
            onClick={() => setActiveRoleView("MANAGER")}
            className="rounded-xl text-xs font-bold h-9 gap-1.5"
          >
            <Briefcase className="h-3.5 w-3.5" /> Manager
          </Button>

          <Button
            size="sm"
            variant={activeRoleView === "WAITER" ? "default" : "outline"}
            onClick={() => setActiveRoleView("WAITER")}
            className="rounded-xl text-xs font-bold h-9 gap-1.5"
          >
            <UserCheck className="h-3.5 w-3.5" /> Waiter
          </Button>

          <Button
            size="sm"
            variant={activeRoleView === "KITCHEN" ? "default" : "outline"}
            onClick={() => setActiveRoleView("KITCHEN")}
            className="rounded-xl text-xs font-bold h-9 gap-1.5"
          >
            <ChefHat className="h-3.5 w-3.5" /> Kitchen
          </Button>

          <Button
            size="sm"
            variant={activeRoleView === ("CASHIER" as Role) ? "default" : "outline"}
            onClick={() => setActiveRoleView("CASHIER" as Role)}
            className="rounded-xl text-xs font-bold h-9 gap-1.5"
          >
            <Wallet className="h-3.5 w-3.5" /> Cashier
          </Button>
        </div>
      </div>

      {/* Render Role-Specific Component */}
      {activeRoleView === "OWNER" && <OwnerDashboardPage />}
      {activeRoleView === "MANAGER" && <ManagerDashboardPage />}
      {activeRoleView === "WAITER" && <WaiterDashboardPage />}
      {activeRoleView === "KITCHEN" && <KitchenPage />}
      {(activeRoleView as string) === "CASHIER" && <CashierDashboardPage />}
      {activeRoleView === "CUSTOMER" && <OwnerDashboardPage />}
    </div>
  );
}
