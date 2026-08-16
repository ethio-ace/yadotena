"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import * as Ably from "ably";
import { useQueryClient } from "@tanstack/react-query";

export type AblyConnectionState =
  | "initializing"
  | "connecting"
  | "connected"
  | "disconnected"
  | "suspended"
  | "closed"
  | "failed";

interface AblySyncContextType {
  client: Ably.Realtime | null;
  connectionState: AblyConnectionState;
}

const AblySyncContext = createContext<AblySyncContextType>({ client: null, connectionState: "initializing" });

export function AblySyncProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const clientRef = useRef<Ably.Realtime | null>(null);
  const [client, setClient] = useState<Ably.Realtime | null>(null);
  const [connectionState, setConnectionState] = useState<AblyConnectionState>("initializing");

  useEffect(() => {
    let isSubscribed = true;

    const initAbly = async () => {
      let apiKey = process.env.NEXT_PUBLIC_ABLY_API_KEY;

      // No static key → ask the backend for a scoped token. On first app load
      // the user isn't signed in yet, so the token isn't in localStorage and
      // the fetch 401s. Retry with backoff until we get one, so realtime
      // connects right after login instead of giving up permanently.
      if (!apiKey) {
        for (let attempt = 0; attempt < 12 && isSubscribed; attempt++) {
          try {
            const apiBase = process.env.NEXT_PUBLIC_API_URL || "/api/v1";
            const headers: Record<string, string> = {};
            if (typeof window !== "undefined") {
              const token = localStorage.getItem("token") || localStorage.getItem("access_token");
              if (token) headers["Authorization"] = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
            }
            const res = await fetch(`${apiBase}/auth/ably-token`, { headers });
            if (res.ok) {
              const data = await res.json();
              apiKey = data.apiKey || data.token;
              if (apiKey) break;
            }
          } catch {
            // ignore and retry
          }
          await new Promise((resolve) => setTimeout(resolve, 3000));
        }
      }

      if (!apiKey || !isSubscribed) {
        if (isSubscribed) setConnectionState("disconnected");
        return;
      }

      if (!clientRef.current) {
        try {
          const ably = new Ably.Realtime({ key: apiKey });
          clientRef.current = ably;
          setClient(ably);

          // Surface live connection state so surfaces like the KDS can react
          // to drops and re-sync authoritative data after reconnects.
          const track = (state: AblyConnectionState) => {
            if (isSubscribed) setConnectionState(state);
          };
          ably.connection.on("connecting", () => track("connecting"));
          ably.connection.on("connected", () => track("connected"));
          ably.connection.on("disconnected", () => track("disconnected"));
          ably.connection.on("suspended", () => track("suspended"));
          ably.connection.on("closed", () => track("closed"));
          ably.connection.on("failed", () => track("failed"));

          const channel = ably.channels.get("yadotena-realtime");

          let pendingInvalidations = { orders: false, tables: false, serviceRequests: false };
          let invalidationTimer: NodeJS.Timeout | null = null;

          const scheduleInvalidation = (keys: Array<"orders" | "tables" | "serviceRequests">) => {
            keys.forEach((k) => (pendingInvalidations[k] = true));
            if (invalidationTimer) return;
            invalidationTimer = setTimeout(() => {
              invalidationTimer = null;
              const targets = { ...pendingInvalidations };
              pendingInvalidations = { orders: false, tables: false, serviceRequests: false };
              if (targets.orders) queryClient.invalidateQueries({ queryKey: ["orders"] });
              if (targets.tables) queryClient.invalidateQueries({ queryKey: ["tables"] });
              if (targets.serviceRequests) queryClient.invalidateQueries({ queryKey: ["serviceRequests"] });
            }, 300);
          };

          channel.subscribe("order.created", (message: Ably.Message) => {
            console.log("Real-time event: order.created", message.data);
            const keys: Array<"orders" | "tables"> = ["orders"];
            if (message.data && message.data.table_id) keys.push("tables");
            scheduleInvalidation(keys);
          });

          channel.subscribe("order.updated", (message: Ably.Message) => {
            console.log("Real-time event: order.updated", message.data);
            const keys: Array<"orders" | "tables"> = ["orders"];
            if (message.data && message.data.table_id) keys.push("tables");
            scheduleInvalidation(keys);
          });

          channel.subscribe("service_request.created", (message: Ably.Message) => {
            console.log("Real-time event: service_request.created", message.data);
            scheduleInvalidation(["serviceRequests"]);
          });

          channel.subscribe("service_request.resolved", (message: Ably.Message) => {
            console.log("Real-time event: service_request.resolved", message.data);
            scheduleInvalidation(["serviceRequests", "tables"]);
          });

          channel.subscribe("table.updated", (message: Ably.Message) => {
            console.log("Real-time event: table.updated", message.data);
            scheduleInvalidation(["tables"]);
          });
        } catch (err) {
          console.warn("Ably connection error:", err);
          if (isSubscribed) setConnectionState("failed");
        }
      }
    };

    initAbly();

    return () => {
      isSubscribed = false;
      if (clientRef.current) {
        clientRef.current.close();
        clientRef.current = null;
      }
    };
  }, [queryClient]);

  return (
    <AblySyncContext.Provider value={{ client, connectionState }}>
      {children}
    </AblySyncContext.Provider>
  );
}

export const useAblySync = () => useContext(AblySyncContext);
