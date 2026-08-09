# Guest checkout wizard + landing redesign

**Date:** 2026-08-09  
**Status:** Approved for implementation  
**Related:** `2026-08-09-yadotena-landing-design.md` (supersedes landing visual scope; extends content)

## Goals

1. Multi-step guest checkout with Back/Next and preserved draft state.
2. Correct payment placement vs backend gates:
   - Digital requires guest-entered transaction reference (staff verify).
   - Cash requires no reference.
   - Dine-in: pay later (cash unpaid → kitchen visible).
   - Pickup/delivery cash: pending until staff marks cash received (kitchen hidden until paid).
   - Pickup/delivery digital: pending_verification until staff verify.
3. Guests without QR may choose dine-in and pick a free table at checkout.
4. `/menu` and landing work without forcing a table; remove fake social proof on menu.
5. Landing visual redesign plus facts-only guest enrichment (how-to, menu highlights, ops signals).

## Non-goals

- Live payment gateways / PSP.
- Public reviews list API.
- Invented hours, ratings, testimonials.
- Staff CreateOrderModal digital/ref (cash-only POS remains; clarify unpaid pickup copy only).

## Checkout steps (single route)

Route: `/checkout` — local step index, no URL segments.

1. Cart & order type (+ table picker when dine-in without session table)
2. Contact (name/phone; address if delivery)
3. Payment (branch by type/method)
4. Review & place → `/order/{id}`

## Place payload

| Path | paymentMethod | reference | markCashPaid / PAID |
|------|---------------|-----------|---------------------|
| Dine-in pay later | cash | omit | no |
| Pickup/Delivery cash | cash | omit | no |
| Pickup/Delivery digital | digital | required user string | no |

## Landing content + visual

- Redesign visual world (brand-first hero, expressive type, atmosphere).
- Add: how-to-order, menu highlights from public menu, accepting_orders + payment methods from settings.
- Keep: cafe facts, staff map, dual CTAs (demo table + `/menu`), staff portal.
- Facts-only rule unchanged.

## Session

On `/menu` without `?table=`: clear `tableId` and reset `orderType` if it was `DINE_IN`.
