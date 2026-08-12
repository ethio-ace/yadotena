"use client";

import React, { createContext, useContext, useEffect, useRef } from "react";
import * as Ably from "ably";
import { useQueryClient } from "@tanstack/react-query";

interface AblySyncContextType {
  client: Ably.Realtime | null;
}

const AblySyncContext = createContext<AblySyncContextType>({ client: null });

export function AblySyncProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const clientRef = useRef<Ably.Realtime | null>(null);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_ABLY_API_KEY;
    if (!apiKey) {
      console.warn("NEXT_PUBLIC_ABLY_API_KEY is missing. Real-time sync disabled.");
      return;
    }

    if (!clientRef.current) {
      // In a production app, use authUrl for token auth. We use key auth here for the demo.
      const ably = new Ably.Realtime({ key: apiKey });
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
