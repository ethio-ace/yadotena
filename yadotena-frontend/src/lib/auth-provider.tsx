"use client";

import { useEffect, useRef } from "react";
import { SessionProvider, signOut, useSession } from "next-auth/react";
import { setAuthToken, setUnauthorizedHandler } from "@/services/api";

/** Keeps the API client's token in sync with the NextAuth session. */
function AuthTokenSync() {
  const { data: session, status } = useSession();
  const signingOut = useRef(false);

  // Set synchronously during render so queries fired by children in the same
  // render already carry the token.
  setAuthToken(status === "authenticated" && !session?.error ? session?.accessToken ?? null : null);

  useEffect(() => {
    const endSession = () => {
      if (signingOut.current) return;
      signingOut.current = true;
      setAuthToken(null);
      signOut({ callbackUrl: "/login" });
    };
    setUnauthorizedHandler(endSession);
    if (status === "authenticated" && (session?.error === "TokenExpired" || !session?.accessToken)) {
      endSession();
    }
    return () => setUnauthorizedHandler(null);
  }, [status, session?.error, session?.accessToken]);

  return null;
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchInterval={5 * 60}>
      <AuthTokenSync />
      {children}
    </SessionProvider>
  );
}
