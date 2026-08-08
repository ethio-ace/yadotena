export const API_BASE =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "")) ||
  "https://yadotena.onrender.com";

export const API_V1 = `${API_BASE}/api/v1`;
