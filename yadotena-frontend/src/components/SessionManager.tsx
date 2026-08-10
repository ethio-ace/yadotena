"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useCartStore } from "@/stores/cartStore";

function SessionManagerInner() {
  const searchParams = useSearchParams();
  const setTableId = useCartStore((state) => state.setTableId);
  const setOrderType = useCartStore((state) => state.setOrderType);

  useEffect(() => {
    const table = searchParams.get("table");
    // Only apply QR/table deep-links. Do not wipe a free-table pick from checkout
    // when the guest returns to /menu without ?table=.
    if (table) {
      setTableId(table);
      setOrderType("DINE_IN");
      if (typeof window !== "undefined") {
        sessionStorage.setItem("yadotena_table_id", table);
      }
    }
  }, [searchParams, setTableId, setOrderType]);

  return null;
}

export function SessionManager() {
  return (
    <Suspense fallback={null}>
      <SessionManagerInner />
    </Suspense>
  );
}
