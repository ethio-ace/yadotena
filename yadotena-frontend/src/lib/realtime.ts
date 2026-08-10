"use client";

import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { soundAlerts } from "@/lib/audioAlerts";
import { normalizeApiOrigin } from "@/lib/api-origin";

const REMOTE_API = normalizeApiOrigin(process.env.NEXT_PUBLIC_API_URL);

type StreamMsg = { event?: string; data?: unknown };

function parseSSEData(raw: string): StreamMsg | null {
  try {
    return JSON.parse(raw) as StreamMsg;
  } catch {
    return null;
  }
}

/** Coalesce React Query invalidations from bursty SSE events. */
function createInvalidationDebouncer(qc: ReturnType<typeof useQueryClient>, ms = 100) {
  const pending = new Set<string>();
  let timer: ReturnType<typeof setTimeout> | undefined;
  return (keys: string[][]) => {
    keys.forEach((k) => pending.add(JSON.stringify(k)));
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      pending.forEach((raw) => {
        const key = JSON.parse(raw) as string[];
        qc.invalidateQueries({ queryKey: key });
      });
      pending.clear();
    }, ms);
  };
}

function invalidateForEvent(
  schedule: (keys: string[][]) => void,
  event?: string,
) {
  if (!event) return;
  const keys: string[][] = [["orders"]];
  if (event.startsWith("order.")) {
    keys.push(["tables"], ["public-tables"]);
  }
  if (event.startsWith("service_request.")) {
    keys.push(["serviceRequests"]);
  }
  // Staff mutations that write activity_logs also usually emit order/service events.
  keys.push(["activity"]);
  schedule(keys);
}

function maybePlaySound(event?: string) {
  if (typeof window === "undefined") return;
  try {
    const muted = localStorage.getItem("yadotena_sound_muted") === "true";
    if (muted) return;
    const vol = parseFloat(localStorage.getItem("yadotena_sound_volume") || "0.8");
    if (event === "order.created") {
      soundAlerts.playNewOrderChime(Number.isFinite(vol) ? vol : 0.8);
    } else if (event === "service_request.created") {
      soundAlerts.playWaiterCallChime(Number.isFinite(vol) ? vol : 0.8);
    }
  } catch {
    /* ignore */
  }
}

/** Staff live updates via EventSource (direct to API; token query for auth). */
export function useStaffStream(enabled = true) {
  const qc = useQueryClient();
  const { data: session } = useSession();
  const token = (session as { accessToken?: string } | null)?.accessToken;
  const [connected, setConnected] = useState(false);
  const esRef = useRef<EventSource | null>(null);
  const scheduleRef = useRef<ReturnType<typeof createInvalidationDebouncer> | null>(null);

  useEffect(() => {
    scheduleRef.current = createInvalidationDebouncer(qc, 100);
  }, [qc]);

  useEffect(() => {
    if (!enabled || !token || typeof window === "undefined") return;

    let stopped = false;
    let retryMs = 1000;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const connect = () => {
      if (stopped) return;
      const url = `${REMOTE_API}/api/v1/staff/stream?token=${encodeURIComponent(token)}`;
      const es = new EventSource(url);
      esRef.current = es;

      es.onopen = () => {
        setConnected(true);
        retryMs = 1000;
      };
      es.onmessage = (ev) => {
        const msg = parseSSEData(ev.data);
        invalidateForEvent(scheduleRef.current || (() => {}), msg?.event);
        maybePlaySound(msg?.event);
      };
      es.onerror = () => {
        setConnected(false);
        es.close();
        esRef.current = null;
        timer = setTimeout(connect, retryMs);
        retryMs = Math.min(retryMs * 2, 15000);
      };
    };

    connect();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      esRef.current?.close();
      esRef.current = null;
      setConnected(false);
    };
  }, [enabled, token]);

  return { connected };
}

const StaffRealtimeContext = createContext({ connected: false });

/** Single staff SSE connection for the dashboard shell. */
export function StaffRealtimeProvider({ children }: { children: ReactNode }) {
  const { connected } = useStaffStream(true);
  return createElement(
    StaffRealtimeContext.Provider,
    { value: { connected } },
    children,
  );
}

export function useStaffRealtime() {
  return useContext(StaffRealtimeContext);
}

/** Guest order track stream. */
export function useOrderStream(orderId: string | undefined, enabled = true) {
  const qc = useQueryClient();
  const [connected, setConnected] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!enabled || !orderId || typeof window === "undefined") return;

    let stopped = false;
    let retryMs = 1000;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const connect = () => {
      if (stopped) return;
      const url = `${REMOTE_API}/api/v1/public/orders/${encodeURIComponent(orderId)}/stream`;
      const es = new EventSource(url);
      esRef.current = es;

      es.onopen = () => {
        setConnected(true);
        retryMs = 1000;
      };
      es.onmessage = () => {
        qc.invalidateQueries({ queryKey: ["orders", orderId] });
        qc.invalidateQueries({ queryKey: ["orders"] });
      };
      es.onerror = () => {
        setConnected(false);
        es.close();
        esRef.current = null;
        timer = setTimeout(connect, retryMs);
        retryMs = Math.min(retryMs * 2, 15000);
      };
    };

    connect();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      esRef.current?.close();
      esRef.current = null;
      setConnected(false);
    };
  }, [enabled, orderId, qc]);

  return { connected };
}

/** Safety poll while SSE may be down — prefer 15s over 3s. */
export const SSE_FALLBACK_POLL_MS = 15_000;

/** React Query refetchInterval: poll only when the live stream is down. */
export function ssePollInterval(connected: boolean): number | false {
  return connected ? false : SSE_FALLBACK_POLL_MS;
}
