"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CustomerIndex() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to public restaurant menu catalog
    router.replace("/menu");
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="animate-pulse flex flex-col items-center">
        <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-muted-foreground font-semibold">Loading Yadotena Menu & Shop...</p>
      </div>
    </div>
  );
}
