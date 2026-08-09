import assert from "node:assert/strict";

// Inline mirror of resolveCafeFacts logic for Node without TS loader
const BRAND_NAME = "Yadotena Milk & Foods";
const SEED_FALLBACK = { phone: "+251911234567", address: "Bole Road, Addis Ababa" };
function resolveCafeFacts(raw) {
  const phone = (typeof raw?.cafe_phone === "string" && raw.cafe_phone.trim()) || SEED_FALLBACK.phone;
  const address = (typeof raw?.cafe_address === "string" && raw.cafe_address.trim()) || SEED_FALLBACK.address;
  return { displayName: BRAND_NAME, phone, address };
}

assert.equal(resolveCafeFacts(null).phone, "+251911234567");
assert.equal(resolveCafeFacts({ cafe_phone: "  ", cafe_address: "CMC" }).address, "CMC");
assert.equal(resolveCafeFacts({ cafe_name: "Yadotena Cafe & Resto" }).displayName, BRAND_NAME);
console.log("cafe-facts ok");
