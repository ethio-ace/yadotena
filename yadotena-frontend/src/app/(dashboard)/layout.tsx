"use client";

import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { SoundNotificationProvider } from "@/contexts/SoundNotificationContext";
import { cn } from "@/lib/utils";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    } else if (
      status === "authenticated" &&
      session?.user?.role === "WAITER" &&
      pathname !== "/dashboard/waiter" &&
      pathname !== "/dashboard/notifications" &&
      pathname !== "/dashboard"
    ) {
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

  if (status === "unauthenticated" || !session) {
    return null; 
  }

  // Admin/Manager users retain the sidebar everywhere (including KDS & Waiter POS).
  // Pure staff roles (WAITER, KITCHEN) get full-screen terminal view.
  const isPureStaffRole = session.user.role === "WAITER" || session.user.role === "KITCHEN";
  const showSidebar = !isPureStaffRole;

  // Staff surfaces own their chrome: the chef KDS and the manager control
  // center render their own full-screen shell (sidebar + header) instead of
  // stacking a second one inside the shared layout.
  const isChefKds = session.user.role === "KITCHEN";
  const isManagerAppRoute =
    session.user.role === "MANAGER" &&
    (pathname === "/dashboard/manager" || pathname === "/dashboard");
  const isOwnerAppRoute =
    session.user.role === "OWNER" &&
    (pathname === "/dashboard/owner" || pathname === "/dashboard");
  const hideSharedChrome = isChefKds || isManagerAppRoute || isOwnerAppRoute;

  return (
    <SoundNotificationProvider>
      <div className="flex h-screen bg-muted/20 overflow-hidden">
        {showSidebar && !hideSharedChrome && <Sidebar role={session.user.role} />}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {!hideSharedChrome && <Header user={session.user} />}
          {/* Shell routes (chef/manager/owner) own their full-screen chrome and
              padding; shared-chrome pages keep the standard inset padding. */}
          <main
            className={cn(
              "flex-1 overflow-y-auto",
              !hideSharedChrome && "p-3 sm:p-4 md:p-6"
            )}
          >
            {children}
          </main>
        </div>
      </div>
    </SoundNotificationProvider>
  );
}
