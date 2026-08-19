/**
 * Yadotena KDS Design Token System
 * Industrial-grade design tokens optimized for 10-14" kitchen touchscreens.
 */

export const radius = {
  sm: "0.5rem",   // 8px
  md: "0.75rem",  // 12px
  lg: "1rem",     // 16px
  xl: "1.25rem",  // 20px
  card: "1.25rem",
  pill: "9999px",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 20,
  xl: 28,
};

export const touchTarget = {
  min: "48px",
  preferred: "56px",
};

export const shadows = {
  card: "0 4px 20px rgb(0 0 0 / 0.35)",
  glowAmber: "0 0 24px rgb(245 158 11 / 0.25)",
  glowEmerald: "0 0 24px rgb(16 185 129 / 0.25)",
  glowRed: "0 0 24px rgb(239 68 68 / 0.3)",
};

/**
 * Strict KDS Palette Tokens (No blue allowed)
 */
export const kdsColors = {
  bg: "bg-zinc-950",
  surface: "bg-zinc-900",
  surfaceHover: "hover:bg-zinc-900/80",
  border: "border-zinc-800",
  borderSubtle: "border-zinc-800/60",

  primary: "amber-500",
  primaryText: "text-amber-950",
  primaryBg: "bg-amber-500",
  primaryGlow: "shadow-[0_0_20px_rgba(245,158,11,0.25)]",

  success: "emerald-500",
  successText: "text-emerald-400",
  successBg: "bg-emerald-500",

  warning: "orange-500",
  warningText: "text-orange-400",

  danger: "red-500",
  dangerText: "text-red-400",
  dangerBg: "bg-red-500",

  textPrimary: "text-zinc-50",
  textSecondary: "text-zinc-400",
  textMuted: "text-zinc-500",
};
