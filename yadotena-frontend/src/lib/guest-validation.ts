/** Guest phone validation shared by checkout flows. */
export function isValidGuestPhone(phone: string): boolean {
  const digits = (phone || "").replace(/\D/g, "");
  if (digits.length < 9) return false;
  if (/^0+$/.test(digits)) return false;
  return true;
}

export function paymentExpectationCopy(input: {
  orderType: string;
  paymentChoice: string;
}): string {
  const t = input.orderType;
  if (t === "DINE_IN") {
    if (input.paymentChoice === "cash") {
      return "Kitchen starts now. Pay cash with staff when you finish — no reference needed yet.";
    }
    return "Transfer first and enter your reference. Staff verify payment; kitchen can start once verified.";
  }
  if (input.paymentChoice === "cash") {
    if (t === "DELIVERY" || t === "SHOP_DELIVERY") {
      return "Pay cash on delivery. Fulfillment starts after staff mark payment received.";
    }
    if (t === "SHOP_PICKUP" || t === "TAKEAWAY") {
      return "Pay cash at the counter. Fulfillment starts after staff mark payment received.";
    }
    return "Pay cash at the counter. Kitchen starts after staff mark your payment received.";
  }
  return "Transfer first, then enter your reference. Staff verify before kitchen or shop fulfillment starts.";
}
