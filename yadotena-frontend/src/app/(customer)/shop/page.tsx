"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ShopPageRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Retail shop catalog is integrated into the digital menu showcase at /menu
    router.replace("/menu");
  }, [router]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6 text-center">
      <div className="space-y-3">
        <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-sm font-bold text-muted-foreground">Redirecting to Digital Menu...</p>
      </div>
    </div>
  );
}
