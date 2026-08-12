"use client";

import { useEffect, Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useCartStore } from "@/stores/cartStore";
import { api } from "@/services/api";

function SessionManagerInner() {
  const searchParams = useSearchParams();
  const setSession = useCartStore((state) => state.setSession);
  const setActiveOrderId = useCartStore((state) => state.setActiveOrderId);
  const tableId = useCartStore((state) => state.tableId);
  const sessionId = useCartStore((state) => state.sessionId);
  const initializingRef = useRef<string | null>(null);

  useEffect(() => {
    const tableFromUrl = searchParams.get("table");
    const targetTable = tableFromUrl || tableId;

    if (!targetTable) return;
    if (initializingRef.current === targetTable) return;

    const refreshSession = async () => {
      initializingRef.current = targetTable;
      try {
        const session = await api.tables.startSession(targetTable);
        setSession({
          sessionId: session.id,
          sessionCode: session.sessionCode,
          tableId: session.tableId || targetTable,
          openOrderId: session.openOrderId,
        });
        if (session.openOrderId) {
          setActiveOrderId(session.openOrderId);
        }
      } catch (error) {
        console.error("Failed to start dining session:", error);
        useCartStore.getState().setTableId(targetTable);
        useCartStore.getState().setOrderType("DINE_IN");
      } finally {
        initializingRef.current = null;
      }
    };

    if (sessionId && tableId === targetTable) {
      api.sessions.getActiveForTable(targetTable)
        .then((session) => {
          if (session.openOrderId) {
            setActiveOrderId(session.openOrderId);
          } else {
            useCartStore.getState().setActiveOrderId(null);
          }
        })
        .catch(() => refreshSession());
      return;
    }

    refreshSession();
  }, [searchParams, setSession, setActiveOrderId, tableId, sessionId]);

  return null;
}

export function SessionManager() {
  return (
    <Suspense fallback={null}>
      <SessionManagerInner />
    </Suspense>
  );
}
