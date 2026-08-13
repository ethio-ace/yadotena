import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getImageUrl(path?: string): string {
  if (!path) return "/placeholder-food.webp";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return path;
}
