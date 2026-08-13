import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getImageUrl(url?: string): string {
  if (!url || url.trim() === "") {
    return "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80";
  }

  const apiBase = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8085").replace(/\/+$/, "");
  const host = apiBase.replace(/\/api\/v1\/?$/, "");

  // Normalize local & storage URLs to use active API host uploads route
  if (
    url.includes("localhost:") ||
    url.includes("127.0.0.1:") ||
    url.includes("storage.dev") ||
    url.includes("storage.tigris.dev") ||
    url.includes("onrender.com")
  ) {
    const uploadsIdx = url.indexOf("/uploads/");
    if (uploadsIdx !== -1) {
      return `${host}${url.substring(uploadsIdx)}`;
    }
    const mediaIdx = url.indexOf("/media/");
    if (mediaIdx !== -1) {
      return `${host}/uploads${url.substring(mediaIdx)}`;
    }
  }

  if (url.startsWith("/uploads/")) {
    return `${host}${url}`;
  }

  if (url.startsWith("/media/")) {
    return `${host}/uploads${url}`;
  }

  // Handle standard HTTP/HTTPS or data URLs
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
    if (typeof window !== "undefined" && window.location.protocol === "https:" && url.startsWith("http://") && !url.includes("localhost")) {
      return url.replace("http://", "https://");
    }
    return url;
  }

  const cleanPath = url.startsWith("/") ? url : `/${url}`;
  return `${host}${cleanPath}`;
}
