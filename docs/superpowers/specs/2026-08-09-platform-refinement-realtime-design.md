# Yadotena platform refinement & realtime — design decisions

**Date:** 2026-08-09  
**Status:** Decisions locked (agent-recommended; user authorized)

## Product snapshot

Yadotena is a dual-audience cafe ops product:

- **Guests:** QR/menu + retail shop → multi-step checkout → order track
- **Staff:** phone+PIN portal (owner / manager / waiter / kitchen)

**Stack:** Go/chi API (Render) → Neon Postgres → optional Upstash Redis → R2 uploads; Next.js 16 frontend (Vercel) via `/api/backend` proxy; NextAuth JWT.

## Locked decisions

### Realtime transport

| Option | Verdict |
|--------|---------|
| Keep 3s polling only | Reject — noisy, laggy, battery/network waste |
| New WebSocket stack | Reject for v1 — more proxy/complexity; we already have SSE |
| **SSE + Redis pub/sub fan-out** | **Chosen** |

**Why SSE:** Backend already exposes `GET /public/orders/{id}/stream` and `GET /staff/stream` (`internal/sse`). Frontend never connects. Redis already exists for rate limits. Pub/sub makes multi-instance Render safe.

**Event model (v1):**

- `order.created` | `order.updated` | `order.status` | `order.payment`
- `service_request.created` | `service_request.resolved`
- `table.updated` (derived occupancy change)

**Clients:**

- Guest track page: EventSource on public order stream; invalidate React Query on event; HTTP fallback poll every 15s if SSE dies
- Staff dashboards (orders, kitchen, tables, shop, waiter, payments, sound): one authenticated staff EventSource; fan-in by event type; stop 3s polling except 30s safety poll
- Menu availability / settings: soft refresh on `settings.updated` / `menu.updated` (phase 2)

**Not in v1:** bidirectional WS chat, presence, typing indicators.

### Settings-driven money

- Tax % and delivery fee move into `settings` (migration + API + FE `order-totals.ts`)
- Remove hardcoded `15` and `100` from place-order and FE mirrors
- Service charge already settings-backed — keep

### Catalog truth

- Remove FE-only addons / spice / dietary tags from guest UX until BE supports them **or** add BE addons in a later phase
- **Decision v1:** strip/hide fake addons in `ItemDetailModal` so guests cannot order non-persisted options
- **Phase later:** real addons table if product needs them

### Auth & roles

- Add Next.js `middleware.ts` route guards by role (not sidebar-only)
- Kitchen deep-link stays `/dashboard/kitchen`; block menu/products/settings for waiter/chef
- Keep phone+PIN; no guest accounts in this program

### Shop vs kitchen

- Keep separate domains (already correct)
- Ensure analytics/reports include shop order types
- Shop queue stays on SSE with kitchen excluded

### UX direction

- Preserve existing amber brand / Geist; refine consistency, empty/error/loading, not a full rebrand
- Customer: clearer status timeline, table context, payment expectations
- Staff: reduce visual noise, unify list/filter patterns, reliable sound on SSE events

### Quality bar

- Expand Go handler/integration tests for payments + order transitions + SSE publish
- FE: critical flow smoke (checkout place, staff status patch) — Playwright optional in later phase
- Seed UUIDs must remain valid hex; seed summary includes products

## Out of scope (this program)

- Amharic i18n
- Native mobile apps
- Online payment gateway (Telebirr API) — keep reference + staff verify
- Django legacy port (wifi settings, CLEANING table state) unless explicitly reopened
- Multi-cafe / multi-tenant

## Success criteria

1. Kitchen and waiter screens update within ~1s of status change without 3s polling
2. Guest order page updates status live; works after Render sleep wake
3. Tax/delivery editable in settings; checkout matches API totals
4. Role deep-links cannot open forbidden pages
5. No guest-facing fake addons
6. Multi-instance API: events still reach all clients (Redis fan-out)
