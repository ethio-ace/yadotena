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
    } else if (status === "authenticated" && session?.user?.role === "WAITER" && pathname !== "/dashboard") {
      router.replace("/dashboard");
    }
  }, [status, session, router, pathname]);

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (status === "unauthenticated" || !session || session.user?.role === "CUSTOMER") {
    return null; 
  }

  return (
    <SoundNotificationProvider>
      <div className="flex h-screen bg-muted/20 overflow-hidden">
        {session.user.role !== "WAITER" && <Sidebar role={session.user.role} />}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Header user={session.user} />
          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </SoundNotificationProvider>
  );
}
