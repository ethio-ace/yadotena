/**
 * Formats a monetary number into Ethiopian Birr (ETB) display format.
 * Example: 450 -> "450.00 ETB" or "ETB 450.00"
 */
export function formatETB(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) return "0.00 ETB";
  return `${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB`;
}

export const CURRENCY_SYMBOL = "ETB";
