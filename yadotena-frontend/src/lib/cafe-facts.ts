export const DEMO_TABLE_ID = "d0000000-0000-0000-0000-000000000004";
export const BRAND_NAME = "Yadotena Milk & Foods";
export const BRAND_TAGLINE = "Fresh Dairy & Artisanal Kitchen";
export const SEED_FALLBACK = {
  phone: "+251911234567",
  address: "Bole Road, Addis Ababa",
} as const;

export function resolveCafeFacts(raw?: Record<string, unknown> | null) {
  const phone =
    (typeof raw?.cafe_phone === "string" && raw.cafe_phone.trim()) ||
    SEED_FALLBACK.phone;
  const address =
    (typeof raw?.cafe_address === "string" && raw.cafe_address.trim()) ||
    SEED_FALLBACK.address;
  return {
    displayName: BRAND_NAME,
    phone,
    address,
  };
}
