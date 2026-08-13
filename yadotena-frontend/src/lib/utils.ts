import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getImageUrl(url?: string): string {
  if (!url) return "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=70";
  
  // Transform legacy onrender links or local upload paths to Tigris public S3 URL
  if (url.includes("yadotena.onrender.com/uploads/")) {
    return url.replace("https://yadotena.onrender.com/uploads/", "https://t3.storage.dev/yadotena/");
  }

  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
    return url;
  }
  const apiBase = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8085").replace(/\/+$/, "");
  const host = apiBase.replace(/\/api\/v1\/?$/, "");
  const cleanPath = url.startsWith("/") ? url : `/${url}`;
  return `${host}${cleanPath}`;
}
