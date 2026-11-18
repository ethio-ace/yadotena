"use client";

import React, { createContext, useContext, useEffect, useRef } from "react";
import * as Ably from "ably";
import { useQueryClient } from "@tanstack/react-query";
import { API_BASE } from "@/lib/config";

interface AblySyncContextType {
  client: Ably.Realtime | null;
}

const AblySyncContext = createContext<AblySyncContextType>({ client: null });

export function AblySyncProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const clientRef = useRef<Ably.Realtime | null>(null);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_REALTIME_DISABLED === "true") return;

    if (!clientRef.current) {
      // Token auth: the backend signs a short-lived, subscribe-only token request.
      // The Ably API key never reaches the browser.
      const ably = new Ably.Realtime({ authUrl: `${API_BASE}/auth/ably-token/` });
      clientRef.current = ably;

      const channel = ably.channels.get("yadotena-realtime");

      channel.subscribe("order.created", (message) => {
        console.log("Real-time event: order.created", message.data);
        queryClient.invalidateQueries({ queryKey: ["orders"] });
        if (message.data.table_id) {
          queryClient.invalidateQueries({ queryKey: ["tables"] });
        }
      });

      channel.subscribe("order.updated", (message) => {
        console.log("Real-time event: order.updated", message.data);
        queryClient.invalidateQueries({ queryKey: ["orders"] });
        if (message.data.table_id) {
          queryClient.invalidateQueries({ queryKey: ["tables"] });
        }
      });

      channel.subscribe("service_request.created", (message) => {
        console.log("Real-time event: service_request.created", message.data);
        queryClient.invalidateQueries({ queryKey: ["serviceRequests"] });
      });

      channel.subscribe("service_request.resolved", (message) => {
        console.log("Real-time event: service_request.resolved", message.data);
        queryClient.invalidateQueries({ queryKey: ["serviceRequests"] });
        queryClient.invalidateQueries({ queryKey: ["tables"] });
      });

      channel.subscribe("table.updated", (message) => {
        console.log("Real-time event: table.updated", message.data);
        queryClient.invalidateQueries({ queryKey: ["tables"] });
      });

      channel.subscribe("product.changed", (message) => {
        console.log("Real-time event: product.changed", message.data);
        queryClient.invalidateQueries({ queryKey: ["products"] });
        queryClient.invalidateQueries({ queryKey: ["productSales"] });
        queryClient.invalidateQueries({ queryKey: ["productPurchases"] });
        queryClient.invalidateQueries({ queryKey: ["productAnalytics"] });
      });
    }

    return () => {
      if (clientRef.current) {
        clientRef.current.close();
        clientRef.current = null;
      }
    };
  }, [queryClient]);

  return (
    <AblySyncContext.Provider value={{ client: clientRef.current }}>
      {children}
    </AblySyncContext.Provider>
  );
}

export const useAblySync = () => useContext(AblySyncContext);
