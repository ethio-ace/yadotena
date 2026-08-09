export const BRAND_NAME = "Yadotena Milk & Foods";
export const BRAND_TAGLINE = "Fresh Dairy & Artisanal Kitchen";

/** Cafe contact facts from public settings only — no seed/demo fallbacks. */
export function resolveCafeFacts(raw?: Record<string, unknown> | null) {
  const apiName =
    typeof raw?.cafe_name === "string" ? raw.cafe_name.trim() : "";
  const phone =
    typeof raw?.cafe_phone === "string" ? raw.cafe_phone.trim() : "";
  const address =
    typeof raw?.cafe_address === "string" ? raw.cafe_address.trim() : "";
  return {
    displayName: apiName || BRAND_NAME,
    phone,
    address,
  };
}
