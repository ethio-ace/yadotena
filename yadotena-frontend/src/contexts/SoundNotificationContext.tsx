"use client";

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
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
  testOrderSound: () => void;
  testWaiterSound: () => void;
  unlockAudio: () => void;
  isAudioUnlocked: boolean;
}

const SoundNotificationContext = createContext<SoundNotificationContextType | undefined>(undefined);

export function SoundNotificationProvider({ children }: { children: React.ReactNode }) {
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

  // Query live orders every 3 seconds
  const { data: orders = [] } = useQuery({
    queryKey: ["orders"],
    queryFn: api.orders.getAll,
    refetchInterval: 3000,
  });

  // Query live service requests every 3 seconds
  const { data: serviceRequests = [] } = useQuery({
    queryKey: ["serviceRequests"],
    queryFn: api.serviceRequests.getAll,
    refetchInterval: 3000,
  });

  // Filter for unacknowledged orders (PENDING status) and pending waiter/bill requests
  const pendingOrders = orders.filter((o) => o.status === "PENDING");
  const pendingServiceRequests = serviceRequests.filter((r) => r.status === "PENDING");

  const lastOrderSoundRef = useRef<number>(0);
  const lastWaiterSoundRef = useRef<number>(0);

  // Periodic recurring sound alert loop
  useEffect(() => {
    if (isMuted) return;

    const interval = setInterval(() => {
      const now = Date.now();

      // 1. Pending Order Alert: Recurring every 6 seconds as long as there is an unhandled PENDING order
      if (pendingOrders.length > 0) {
        if (now - lastOrderSoundRef.current >= 6000) {
          soundAlerts.playNewOrderChime(volume);
          lastOrderSoundRef.current = now;
        }
      }

      // 2. Pending Waiter / Bill Alert: Recurring every 8 seconds as long as there is an unhandled service request
      if (pendingServiceRequests.length > 0) {
        if (now - lastWaiterSoundRef.current >= 8000) {
          // Stagger by 2 seconds if both exist
          if (pendingOrders.length === 0 || now - lastOrderSoundRef.current >= 2500) {
            soundAlerts.playWaiterCallChime(volume);
            lastWaiterSoundRef.current = now;
          }
        }
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [isMuted, volume, pendingOrders.length, pendingServiceRequests.length]);

  const testOrderSound = useCallback(() => {
    unlockAudio();
    soundAlerts.playNewOrderChime(volume);
  }, [unlockAudio, volume]);

  const testWaiterSound = useCallback(() => {
    unlockAudio();
    soundAlerts.playWaiterCallChime(volume);
  }, [unlockAudio, volume]);

  return (
    <SoundNotificationContext.Provider
      value={{
        isMuted,
        volume,
        toggleMute,
        setVolume,
        pendingOrders,
        pendingServiceRequests,
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
    throw new Error("useSoundNotifications must be used within a SoundNotificationProvider");
  }
  return context;
}
