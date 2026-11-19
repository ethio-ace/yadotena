/**
 * Base URL of the Django API including /api/v1, without a trailing slash.
 * NEXT_PUBLIC_API_URL may be given with or without the /api/v1 suffix.
 */
const rawBase = (
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "production" ? "https://semu.ethioace.com" : "http://127.0.0.1:8000")
).replace(/\/+$/, "");

export const API_BASE = rawBase.endsWith("/api/v1") ? rawBase : `${rawBase}/api/v1`;

/** Window event fired when the API rejects the staff token. */
export const SESSION_ENDED_EVENT = "yadotena:session-ended";

/** localStorage key holding the staff API token for client-side requests. */
export const TOKEN_STORAGE_KEY = "token";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
    else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      // Legacy keys from older builds.
      localStorage.removeItem("access_token");
      localStorage.removeItem("auth_token");
    }
  } catch {
    // Private mode / blocked storage: requests simply go unauthenticated.
  }
}

/** Authorization header for the current staff session, if any. */
export function authHeaders(): Record<string, string> {
  const token = getStoredToken();
  return token ? { Authorization: `Bearer ${token.replace(/^Bearer\s+/i, "")}` } : {};
}
