"use client";

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { api } from "@/services/api";
import { soundAlerts } from "@/lib/audioAlerts";
import { Order, ServiceRequest } from "@/types";

interface SoundNotificationContextType {
  isMuted: boolean;
  volume: number;
  toggleMute: () => void;
  setVolume: (val: number) => void;
  pendingOrders: Order[];
  pendingServiceRequests: ServiceRequest[];
  // Play specific sounds (used by pages)
  playNewOrder: () => void;
  playOrderReady: () => void;
  playOrderCompleted: () => void;
  playWaiterCall: () => void;
  playBillRequest: () => void;
  playPaymentReceived: () => void;
  playActionConfirm: () => void;
  playError: () => void;
  // Test sounds
  testNewOrder: () => void;
  testWaiterCall: () => void;
  testBillRequest: () => void;
  testOrderReady: () => void;
  testPaymentReceived: () => void;
  // Legacy compatibility
  testOrderSound: () => void;
  testWaiterSound: () => void;
  unlockAudio: () => void;
  isAudioUnlocked: boolean;
}

const SoundNotificationContext = createContext<SoundNotificationContextType | undefined>(undefined);

export function SoundNotificationProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [volume, setVolumeState] = useState<number>(0.8);
  const [isAudioUnlocked, setIsAudioUnlocked] = useState<boolean>(false);

  // Load preferences from localStorage on mount
  useEffect(() => {
    try {
      const savedMute = localStorage.getItem("yadotena_sound_muted");
      if (savedMute !== null) {
        setIsMuted(savedMute === "true");
      }
      const savedVolume = localStorage.getItem("yadotena_sound_volume");
      if (savedVolume !== null) {
        setVolumeState(parseFloat(savedVolume));
      }
    } catch {
      // Ignore
    }
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("yadotena_sound_muted", String(next));
      } catch {}
      return next;
    });
  }, []);

  const setVolume = useCallback((val: number) => {
    setVolumeState(val);
    try {
      localStorage.setItem("yadotena_sound_volume", String(val));
    } catch {}
  }, []);

  const unlockAudio = useCallback(() => {
    soundAlerts.unlockAudio();
    setIsAudioUnlocked(true);
  }, []);

  // Unlock audio on first global user click or touch
  useEffect(() => {
    const handleUserInteraction = () => {
      unlockAudio();
      window.removeEventListener("click", handleUserInteraction);
      window.removeEventListener("keydown", handleUserInteraction);
      window.removeEventListener("touchstart", handleUserInteraction);
    };

    window.addEventListener("click", handleUserInteraction, { once: true });
    window.addEventListener("keydown", handleUserInteraction, { once: true });
    window.addEventListener("touchstart", handleUserInteraction, { once: true });

    return () => {
      window.removeEventListener("click", handleUserInteraction);
      window.removeEventListener("keydown", handleUserInteraction);
      window.removeEventListener("touchstart", handleUserInteraction);
    };
  }, [unlockAudio]);

  // Query live orders
  const { data: orders = [] } = useQuery({
    queryKey: ["orders"],
    queryFn: api.orders.getAll,
  });

  // Query live service requests
  const { data: serviceRequests = [] } = useQuery({
    queryKey: ["serviceRequests"],
    queryFn: api.serviceRequests.getAll,
    staleTime: 5000,
  });

  // Filter for unacknowledged orders (PENDING status) and pending waiter/bill requests
  const pendingOrders = orders.filter((o) => o.status === "PENDING");
  const pendingServiceRequests = serviceRequests.filter((r) => r.status === "PENDING");

  // Track previous counts to detect NEW pending items (not just existing)
  const prevOrderCountRef = useRef<number>(0);
  const prevRequestCountRef = useRef<number>(0);
  const initializedRef = useRef<boolean>(false);

  // Play sounds only when NEW pending items appear (not on every poll)
  useEffect(() => {
    if (isMuted) return;
    
    const isWaiter = session?.user?.role === "WAITER";
    
    // Skip first render - just record baseline
    if (!initializedRef.current) {
      prevOrderCountRef.current = pendingOrders.length;
      prevRequestCountRef.current = pendingServiceRequests.length;
      initializedRef.current = true;
      return;
    }
    
    // New order appeared (and user is not a waiter)
    if (!isWaiter && pendingOrders.length > prevOrderCountRef.current) {
      soundAlerts.playNewOrder(volume);
    }
    
    // New service request appeared
    if (pendingServiceRequests.length > prevRequestCountRef.current) {
      // Check if it's a BILL or WAITER request
      const newestRequest = pendingServiceRequests[pendingServiceRequests.length - 1];
      if (newestRequest?.type === "BILL") {
        soundAlerts.playBillRequest(volume);
      } else {
        soundAlerts.playWaiterCall(volume);
      }
    }
    
    // Update refs
    prevOrderCountRef.current = pendingOrders.length;
    prevRequestCountRef.current = pendingServiceRequests.length;
  }, [isMuted, volume, pendingOrders.length, pendingServiceRequests.length, session?.user?.role]);

  // Play-specific sound functions (for pages to call directly)
  const playNewOrder = useCallback(() => {
    if (isMuted) return;
    unlockAudio();
    soundAlerts.playNewOrder(volume);
  }, [isMuted, unlockAudio, volume]);

  const playOrderReady = useCallback(() => {
    if (isMuted) return;
    unlockAudio();
    soundAlerts.playOrderReady(volume);
  }, [isMuted, unlockAudio, volume]);

  const playOrderCompleted = useCallback(() => {
    if (isMuted) return;
    unlockAudio();
    soundAlerts.playOrderCompleted(volume);
  }, [isMuted, unlockAudio, volume]);

  const playWaiterCall = useCallback(() => {
    if (isMuted) return;
    unlockAudio();
    soundAlerts.playWaiterCall(volume);
  }, [isMuted, unlockAudio, volume]);

  const playBillRequest = useCallback(() => {
    if (isMuted) return;
    unlockAudio();
    soundAlerts.playBillRequest(volume);
  }, [isMuted, unlockAudio, volume]);

  const playPaymentReceived = useCallback(() => {
    if (isMuted) return;
    unlockAudio();
    soundAlerts.playPaymentReceived(volume);
  }, [isMuted, unlockAudio, volume]);

  const playActionConfirm = useCallback(() => {
    if (isMuted) return;
    unlockAudio();
    soundAlerts.playActionConfirm(volume);
  }, [isMuted, unlockAudio, volume]);

  const playError = useCallback(() => {
    if (isMuted) return;
    unlockAudio();
    soundAlerts.playError(volume);
  }, [isMuted, unlockAudio, volume]);

  // Test sound functions (bypass mute for testing)
  const testNewOrder = useCallback(() => {
    unlockAudio();
    soundAlerts.playNewOrder(volume);
  }, [unlockAudio, volume]);

  const testWaiterCall = useCallback(() => {
    unlockAudio();
    soundAlerts.playWaiterCall(volume);
  }, [unlockAudio, volume]);

  const testBillRequest = useCallback(() => {
    unlockAudio();
    soundAlerts.playBillRequest(volume);
  }, [unlockAudio, volume]);

  const testOrderReady = useCallback(() => {
    unlockAudio();
    soundAlerts.playOrderReady(volume);
  }, [unlockAudio, volume]);

  const testPaymentReceived = useCallback(() => {
    unlockAudio();
    soundAlerts.playPaymentReceived(volume);
  }, [unlockAudio, volume]);

  // Legacy compatibility
  const testOrderSound = testNewOrder;
  const testWaiterSound = testWaiterCall;

  return (
    <SoundNotificationContext.Provider
      value={{
        isMuted,
        volume,
        toggleMute,
        setVolume,
        pendingOrders,
        pendingServiceRequests,
        playNewOrder,
        playOrderReady,
        playOrderCompleted,
        playWaiterCall,
        playBillRequest,
        playPaymentReceived,
        playActionConfirm,
        playError,
        testNewOrder,
        testWaiterCall,
        testBillRequest,
        testOrderReady,
        testPaymentReceived,
        testOrderSound,
        testWaiterSound,
        unlockAudio,
        isAudioUnlocked,
      }}
    >
      {children}
    </SoundNotificationContext.Provider>
  );
}

export function useSoundNotifications() {
  const context = useContext(SoundNotificationContext);
  if (!context) {
    return {
      isMuted: true,
      volume: 0.8,
      toggleMute: () => {},
      setVolume: () => {},
      pendingOrders: [],
      pendingServiceRequests: [],
      playNewOrder: () => {},
      playOrderReady: () => {},
      playOrderCompleted: () => {},
      playWaiterCall: () => {},
      playBillRequest: () => {},
      playPaymentReceived: () => {},
      playActionConfirm: () => {},
      playError: () => {},
      testNewOrder: () => {},
      testWaiterCall: () => {},
      testBillRequest: () => {},
      testOrderReady: () => {},
      testPaymentReceived: () => {},
      testOrderSound: () => {},
      testWaiterSound: () => {},
      unlockAudio: () => {},
      isAudioUnlocked: false,
    };
  }
  return context;
}
