/**
 * Yadotena KDS — Calm Production Board Design Tokens
 * Restrained monochrome-first color palette with a single Yadotena Amber accent.
 */

export const kdsTokens = {
  // Background & Surfaces
  bg: "bg-zinc-950",
  surface: "bg-zinc-900",
  surfaceElevated: "bg-zinc-850",
  border: "border-zinc-800",
  borderSubtle: "border-zinc-800/60",

  // Typography
  textPrimary: "text-zinc-50",
  textSecondary: "text-zinc-400",
  textMuted: "text-zinc-500",

  // Single Brand Accent (Yadotena Amber)
  accent: "amber-500",
  accentText: "text-amber-400",
  accentBg: "bg-amber-500",
  accentButton: "bg-amber-500 hover:bg-amber-400 text-amber-950 font-black",

  // Sparingly used status indicators (Text/Border only)
  successText: "text-emerald-400",
  dangerText: "text-red-400",
  dangerBorder: "border-red-500/50",

  // Touch Ergonomics
  touchHeight: "h-14", // 56px
  touchMin: "min-h-[48px]",
};
