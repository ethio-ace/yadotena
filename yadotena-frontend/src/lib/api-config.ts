import { normalizeApiOrigin } from "./api-origin";

const REMOTE_API = normalizeApiOrigin(
  typeof process !== "undefined" ? process.env.NEXT_PUBLIC_API_URL : undefined,
);

/**
 * Browser: same-origin `/api/backend/*` (Route Handler → Render; avoids CORS).
 * Server (NextAuth authorize, RSC): call Render directly.
 */
export const API_BASE =
  typeof window === "undefined" ? REMOTE_API : "/api/backend";

export const API_V1 = `${API_BASE}/api/v1`;
