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
    if (table) {
      setTableId(table);
      setOrderType("DINE_IN");
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
