import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getImageUrl(url?: string): string {
  if (!url) return "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=70";

  const apiBase = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8085").replace(/\/+$/, "");
  const host = apiBase.replace(/\/api\/v1\/?$/, "");

  // Transform Tigris S3 direct URLs (which return 403 Forbidden without S3 headers) to backend proxy / uploads endpoint
  if (url.includes("storage.dev") || url.includes("storage.tigris.dev")) {
    const mediaIdx = url.indexOf("/media/");
    if (mediaIdx !== -1) {
      const relPath = url.substring(mediaIdx);
      return `${host}/uploads${relPath}`;
    }
    const uploadsIdx = url.indexOf("/uploads/");
    if (uploadsIdx !== -1) {
      const relPath = url.substring(uploadsIdx);
      return `${host}${relPath}`;
    }
  }

  // Transform legacy onrender domain links to backend server uploads endpoint
  if (url.includes("yadotena.onrender.com/uploads/")) {
    const relPath = url.split("yadotena.onrender.com/uploads")[1];
    return `${host}/uploads${relPath}`;
  }

  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
    return url;
  }

  const cleanPath = url.startsWith("/") ? url : `/${url}`;
  return `${host}${cleanPath}`;
}
