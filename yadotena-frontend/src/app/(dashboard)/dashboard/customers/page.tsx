"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CustomersPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);

  return (
    <div className="p-12 text-center text-muted-foreground font-bold text-xs">
      Redirecting to dashboard...
    </div>
  );
}
