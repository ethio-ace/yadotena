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
- Demo seed: Table 04 UUID for guest dine-in testing; demo staff phones/PINs on login.

## Capabilities and Constraints

- Frontend: Next.js (`yadotena-frontend`); API: Go on Render; DB: Neon Postgres.
- Public API includes menu, tables, orders, settings, service requests, reviews (deploy may lag local).
- Landing must not invent hours, ratings, or testimonials; cafe facts come from settings/seed only.
- Naming on public surfaces: **Yadotena Milk & Foods** (not “Cafe & Resto” on the landing).

## Brand Commitments

- Name: Yadotena Milk & Foods
- Tagline in use: Fresh Dairy & Artisanal Kitchen
- Existing UI primary: amber (`#f59e0b`); landing may refine presentation while keeping product recognition.

## Evidence on Hand

- Seed settings: Bole Road, Addis Ababa; phone `+251911234567`.
- Graph maps: `graphify-out/frontend/`, `graphify-out/backend/`.
- No licensed photography pack in repo — use stock URLs or CSS atmosphere carefully; do not fabricate social proof numbers.

## Product Principles

1. Dual audience clarity: guests and staff both find their door without fake marketing claims.
2. Facts over fluff: address/phone from settings; no invented hours until settings support them.
3. Role truth: staff map matches real product roles and login.
4. Ordering path stays real: demo table CTA uses seeded Table 04; browse menu stays available without forcing a table story.

## Accessibility & Inclusion

Standard web accessibility for new landing (semantic headings, contrast, keyboard-reachable CTAs). No product-specific AT standard beyond that yet.
