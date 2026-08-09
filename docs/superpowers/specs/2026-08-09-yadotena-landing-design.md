# Yadotena public landing + staff map

**Date:** 2026-08-09  
**Status:** Superseded for visual + guest content by `2026-08-09-guest-checkout-landing-design.md` (still valid for routing, CTAs, facts-only rule).

## Goals

1. Replace the `/` auto-redirect-to-Table-04 with a staff-aware marketing landing.
2. Present cafe identity and contact facts from settings/seed only.
3. Give guests two clear CTAs: demo table order + browse menu.
4. Give staff an obvious role map that leads to `/login`.
5. Keep customer chrome (cart/session header) off the landing.

## Non-goals

- Invented hours, review scores, testimonials, or map embeds.
- Full dashboard redesign.
- Broad backend feature expansion beyond wiring public settings into the landing if needed.
- Replacing product photography with fake “520+ reviews” style proof.

## Decisions (confirmed)

| Topic | Choice |
|-------|--------|
| Audience | Staff-aware marketing (brand + staff map) |
| Cafe facts | Seed/settings only (Bole Road, Addis Ababa; `+251911234567`) |
| Guest CTAs | Primary: Order at table (demo); Secondary: View menu |
| Structure | Approach A — one `/` page |
| Public name | Yadotena Milk & Foods |
| Tagline | Fresh Dairy & Artisanal Kitchen |

## Routing

| Path | Behavior |
|------|----------|
| `/` | New landing page (own layout; no customer cart shell) |
| `/menu?table=<Table04 UUID>` | Demo dine-in session (primary CTA) |
| `/menu` | Browse menu without forcing table (secondary CTA) |
| `/login` | Existing staff phone + PIN portal |

Demo table id (seed): `d0000000-0000-0000-0000-000000000004`.

## Page structure

### 1. First viewport

- Brand name as dominant signal (not nav-only).
- Tagline + one short support sentence (existing dairy/kitchen product language; no fake metrics).
- CTA group: **Order at table (demo)** · **View menu** · **Staff portal** (link).
- Full-bleed atmospheric visual (image or branded texture). No card grid, no floating promo chips, no stats strip in hero.

### 2. Cafe details

- Pull from `GET /api/v1/public/settings` when available; fallback to known seed values if the request fails.
- Show: cafe name, address, phone.
- Omit hours entirely in this pass.

### 3. Staff map

Four tiles → `/login`:

| Role | One-line job (product-true) |
|------|-----------------------------|
| Owner | Settings, staff, expenses, full ops oversight |
| Manager | Payments, menu/staff ops, day-to-day control |
| Waiter | Tables, floor orders, service requests |
| Kitchen | Prep queue and order status |

Copy must describe this app’s roles, not a generic restaurant org chart. Login page already exposes demo phones/PINs.

### 4. Footer

- Brand + address/phone repeat (compact).
- Links: View menu, Staff portal.
- No fake social proof.

## Frontend implementation notes

- Remove redirect from `src/app/(customer)/page.tsx` (or move landing out of customer group).
- Prefer a route group such as `(marketing)/page.tsx` + light marketing layout so landing is not wrapped by customer `SessionManager`/cart header.
- Login page: keep demo account buttons; optional “Back to home” link to `/`.
- Align any “Cafe & Resto” display on the landing to Milk & Foods; settings raw name may still say Cafe & Resto in DB — landing display name can prefer brand string **Yadotena Milk & Foods** while still showing seed address/phone.

## Backend

- `GET /api/v1/public/settings` already exists — use it for address/phone/name.
- No new hours field in this pass.
- No seed changes required for landing facts (already present).

## Visual direction (for implementation / impeccable new-work)

- Mode: **Persuade** for landing; Operate surfaces unchanged.
- Preserve amber brand recognition; elevate typography beyond default Geist-only feel where the design system allows.
- Follow frontend craft rules: one composition in first viewport; brand first; no purple/cream AI-default clichés; intentional motion (2–3) on landing only.

## Success criteria

- Visiting `/` shows landing, not an immediate menu redirect.
- Both guest CTAs work; staff path reaches `/login`.
- No fabricated hours or ratings on the page.
- Address and phone match settings/seed.
- Mobile and desktop first viewport remain one clear composition.

## Spec self-review

- [x] No TBD placeholders for core decisions
- [x] No contradiction with seed-only facts (hours omitted)
- [x] Scope limited to landing + routing/wiring
- [x] Public settings endpoint noted (exists)
