/** Render (or local) API origin — no trailing slash, no `/api` suffix. */
export function normalizeApiOrigin(raw?: string | null): string {
  let origin = (raw?.trim() || "https://yadotena.onrender.com").replace(/\/$/, "");
  // Common misconfig: NEXT_PUBLIC_API_URL=https://host/api or .../api/v1
  origin = origin.replace(/\/api(?:\/v1)?$/i, "");
  return origin;
}
