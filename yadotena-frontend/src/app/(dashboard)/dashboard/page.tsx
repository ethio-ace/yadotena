"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import { Role } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  ShieldCheck, 
  Briefcase, 
  ChefHat, 
  Wallet, 
  Sparkles
} from "lucide-react";

import OwnerDashboardPage from "./owner/page";
import ManagerDashboardPage from "./manager/page";
import WaiterDashboardPage from "./waiter/page";
import CashierDashboardPage from "./cashier/page";
import KitchenPage from "./kitchen/page";

export default function DashboardPage() {
  const { data: session } = useSession();
  const role: Role = (session?.user?.role as Role) || "OWNER";

  if (role === "WAITER") return <WaiterDashboardPage />;
  if (role === "KITCHEN") return <KitchenPage />;
  if ((role as string) === "CASHIER") return <CashierDashboardPage />;
  if (role === "MANAGER") return <ManagerDashboardPage />;

  return <OwnerDashboardPage />;
}
