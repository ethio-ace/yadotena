const REMOTE_API =
  (typeof process !== "undefined" &&
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "")) ||
  "https://yadotena.onrender.com";

/**
 * Browser: hit Next.js rewrite `/api/backend/*` (same origin → no CORS).
 * Server (NextAuth authorize, RSC): call Render directly.
 */
export const API_BASE =
  typeof window === "undefined" ? REMOTE_API : "/api/backend";

export const API_V1 = `${API_BASE}/api/v1`;
