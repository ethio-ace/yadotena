"use client";

import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { SoundNotificationProvider } from "@/contexts/SoundNotificationContext";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    } else if (status === "authenticated" && session?.user?.role === "CUSTOMER") {
      router.replace("/");
    } else if (status === "authenticated" && session?.user?.role === "WAITER" && pathname !== "/dashboard/waiter" && pathname !== "/dashboard") {
      router.replace("/dashboard/waiter");
    } else if (status === "authenticated" && session?.user?.role === "KITCHEN" && pathname !== "/dashboard/kitchen" && pathname !== "/dashboard") {
      router.replace("/dashboard/kitchen");
    }
  }, [status, session, router, pathname]);

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (status === "unauthenticated" || !session || session.user?.role === "CUSTOMER") {
    return null; 
  }

  // Hide empty/unnecessary sidebar for operational staff roles & full-width terminals
  const isStaffRole = session.user.role === "WAITER" || session.user.role === "KITCHEN" || session.user.role === "CASHIER";
  const isTerminalPage = pathname.startsWith("/dashboard/waiter") || pathname.startsWith("/dashboard/kitchen") || pathname.startsWith("/dashboard/cashier");
  const showSidebar = !isStaffRole && !isTerminalPage;

  return (
    <SoundNotificationProvider>
      <div className="flex h-screen bg-muted/20 overflow-hidden">
        {showSidebar && <Sidebar role={session.user.role} />}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Header user={session.user} />
          <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">
            {children}
          </main>
        </div>
      </div>
    </SoundNotificationProvider>
  );
}
