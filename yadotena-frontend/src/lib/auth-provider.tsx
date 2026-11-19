"use client";

import { useEffect, useRef } from "react";
import { SessionProvider, signOut, useSession } from "next-auth/react";
import { SESSION_ENDED_EVENT, setStoredToken } from "./config";

/**
 * Keeps the API token in localStorage in step with the NextAuth session:
 * written on sign-in, removed on sign-out/expiry (so a shared tablet never
 * keeps the previous user's token), and ends the session when the API
 * rejects the token (expired, revoked or the account was deactivated).
 */
function AuthTokenSync() {
  const { data: session, status } = useSession();
  const endingRef = useRef(false);

  useEffect(() => {
    const endSession = () => {
      if (endingRef.current) return;
      endingRef.current = true;
      setStoredToken(null);
      signOut({ callbackUrl: "/login" });
    };

    if (status === "authenticated") {
      if (session?.error === "TokenExpired" || !session?.accessToken) {
        endSession();
      } else {
        endingRef.current = false;
        setStoredToken(session.accessToken);
      }
    } else if (status === "unauthenticated") {
      setStoredToken(null);
    }

    window.addEventListener(SESSION_ENDED_EVENT, endSession);
    return () => window.removeEventListener(SESSION_ENDED_EVENT, endSession);
  }, [status, session?.error, session?.accessToken]);

  return null;
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchInterval={5 * 60} refetchOnWindowFocus={false}>
      <AuthTokenSync />
      {children}
    </SessionProvider>
  );
}
