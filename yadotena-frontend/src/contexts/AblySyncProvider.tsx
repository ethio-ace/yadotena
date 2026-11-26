"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import * as Ably from "ably";
import { useQueryClient } from "@tanstack/react-query";
import { API_BASE } from "@/lib/config";

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
      if (process.env.NEXT_PUBLIC_REALTIME_DISABLED === "true" || !isSubscribed) {
        setConnectionState("disconnected");
        return;
      }

      if (!clientRef.current) {
        // The backend answers 503 when ABLY_API_KEY isn't set. Don't start a
        // client that would retry forever — report "failed" so screens fall
        // back to polling (the KDS polls every 3s when not connected).
        try {
          const probe = await fetch(`${API_BASE}/auth/ably-token`, { headers: { Accept: "application/json" } });
          if (probe.status === 503) {
            console.warn("Realtime is not configured on the server (ABLY_API_KEY missing); using polling.");
            if (isSubscribed) setConnectionState("failed");
            return;
          }
        } catch {
          // Network hiccup — let Ably's own retry logic handle it below.
        }
        if (!isSubscribed) return;

        try {
          // Token auth: the backend signs a short-lived, subscribe-only token
          // request (public, so customers get live order updates too). Ably
          // re-fetches it on expiry; the API key never reaches the browser.
          const ably = new Ably.Realtime({ authUrl: `${API_BASE}/auth/ably-token` });
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
