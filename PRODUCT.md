# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Guests / diners** — at or near Yadotena; discover the cafe and open a QR/table menu to order.
- **Staff** — Owner, Manager, Waiter, Kitchen; run floor ops, kitchen, payments, and settings via phone + PIN login.

## Product Purpose

Yadotena is a cafe operations product: public QR ordering plus a staff portal for live orders, kitchen, tables, payments, and admin. Success means guests can find the cafe and start ordering, and staff can reach the right tools without confusion.

## Positioning

Phone + PIN staff auth with role-split ops (owner/manager/waiter/kitchen) tied to the same live menu and order pipeline guests use via table QR — not a generic restaurant brochure site.

## Operating Context

- Customer: scan/table link → menu → cart → checkout → order tracking.
- Staff: `/login` → role-routed dashboard (kitchen vs floor vs admin).
- Demo seed: Table 04 UUID (`d0000000-…-0004`) via landing “Try Table 04” → `/menu?table=…`. Staff phones/PINs are in README (not shown on the login screen).

## Capabilities and Constraints

- Frontend: Next.js (`yadotena-frontend`); API: Go on Render; DB: Neon Postgres.
- Public API includes menu, products/shop, tables, orders, settings (tax, delivery fee, service charge), service requests, reviews.
- Live updates: SSE staff stream + per-order public stream; Redis fan-out when configured.
- Kitchen display shows only kitchen-visible tickets (no shop; takeaway/delivery after paid).
- Guest online ordering respects `accepting_orders` and enabled payment methods; staff POS may still place walk-in/phone orders while guests are paused.
- Landing must not invent hours, ratings, or testimonials; cafe facts come from settings only.
- Guest addons/spice are not sold unless backed by the API (special instructions only).
- Naming on public surfaces: **Yadotena Milk & Foods** (not “Cafe & Resto” on the landing).

## Brand Commitments

- Name: Yadotena Milk & Foods
- Tagline in use: Fresh Dairy & Artisanal Kitchen
- Existing UI primary: amber (`#f59e0b`); landing may refine presentation while keeping product recognition.

## Evidence on Hand

- Seed settings: Bole Road, Addis Ababa; phone `+251911234567`; cafe name matches brand (`Yadotena Milk & Foods`).
- Architecture map: run `graphify` locally if you need `graphify-out/` (not committed).
- Stack: Go API under `backend/` (legacy `backend_django/` is out of scope).
- No licensed photography pack in repo — use stock URLs or CSS atmosphere carefully; do not fabricate social proof numbers.

## Product Principles

1. Dual audience clarity: guests and staff both find their door without fake marketing claims.
2. Facts over fluff: address/phone from settings; no invented hours until settings support them.
3. Role truth: staff map matches real product roles and login.
4. Ordering path stays real: landing offers browse menu plus an optional seeded Table 04 dine-in CTA; staff credentials live in README only.

## Accessibility & Inclusion

Standard web accessibility for new landing (semantic headings, contrast, keyboard-reachable CTAs). No product-specific AT standard beyond that yet.
