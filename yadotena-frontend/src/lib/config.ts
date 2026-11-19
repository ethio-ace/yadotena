/** Base URL of the Django API, e.g. https://semu.ethioace.com/api/v1 (no trailing slash). */
export const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "production" ? "https://semu.ethioace.com/api/v1" : "http://127.0.0.1:8000/api/v1")
).replace(/\/+$/, "");
