# Platform refinement & realtime — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden Yadotena end-to-end (money settings, auth, CX/UX, catalog honesty) and replace staff/guest polling with SSE + Redis pub/sub realtime.

**Architecture:** Keep Go SSE hub; add Redis publish on domain events and Redis subscribe → local hub broadcast so multi-instance Render works. Frontend EventSource hooks invalidate React Query. Settings gain tax/delivery; FE totals read settings only. Middleware enforces roles.

**Tech Stack:** Go/chi, pgx, Upstash Redis pub/sub, existing `internal/sse`, Next.js EventSource, TanStack Query, NextAuth, Neon migrations.

**Design spec:** [`docs/superpowers/specs/2026-08-09-platform-refinement-realtime-design.md`](../specs/2026-08-09-platform-refinement-realtime-design.md)

## Global Constraints

- Do not introduce WebSockets in this program
- Do not rebrand; refine within existing amber/Geist system
- Do not invent guest-facing catalog features without DB persistence
- Seed IDs must be valid UUID hex (`0-9a-f`)
- Prefer editing existing files over new abstractions unless fan-out needs a small package
- Every phase ends shippable (API + FE deployable independently when needed)

---

## File map (primary touch points)

| Area | Files |
|------|-------|
| Settings / money | `backend/migrations/000005_*.sql`, `models`, `handlers_settings`, `handlers_orders`, `yadotena-frontend/src/lib/order-totals.ts`, settings page |
| Realtime BE | `internal/sse/hub.go`, new `internal/realtime/` or extend `cache`, `handlers_orders`, service-request handlers, `router.go` |
| Realtime FE | new `src/lib/realtime.ts` / `hooks/useStaffStream.ts` / `useOrderStream.ts`, kitchen/orders/tables/shop/order track/sound context |
| Auth | `yadotena-frontend/src/middleware.ts`, dashboard layout |
| Catalog honesty | `ItemDetailModal.tsx`, types if needed |
| UX polish | menu/checkout/order track, kitchen, waiter dashboard, empty states |
| Analytics | staff analytics SQL filters for shop types |
| Tests | `orders/*_test.go`, new handler tests where practical |

---

## Phase 0 — Baseline & instrumentation (½ day)

### Task 0.1: Document current poll sites

- [ ] Grep FE for `refetchInterval` and list every consumer in a short comment block in `src/lib/realtime.ts` (file created as stub exporting the list as comments)
- [ ] Confirm SSE endpoints still registered in `backend/internal/server/router.go`
- [ ] Commit: `docs: inventory poll sites before SSE cutover`

### Task 0.2: Smoke checklist

- [ ] Manual: public menu 27+, products 15+, place dine-in + shop order against Render/Neon
- [ ] Note failures in PR description when implementing later phases

---

## Phase 1 — Money & settings truth (1 day)

### Task 1.1: Migration

- [ ] Add `backend/migrations/000005_commerce_settings.up.sql`:
  - `tax_percent NUMERIC(5,2) NOT NULL DEFAULT 15`
  - `delivery_fee_etb NUMERIC(12,2) NOT NULL DEFAULT 100`
- [ ] Down migration drops columns
- [ ] Seed/settings upsert sets explicit values in `00001_demo.sql` ON CONFLICT update

### Task 1.2: Backend wire-up

- [ ] Extend settings model + GET/PATCH DTOs (camelCase + snake aliases like existing)
- [ ] `createOrder` reads tax % and delivery fee from settings row (not constants)
- [ ] Unit/integration: place delivery order → delivery fee matches settings; change settings → new fee

### Task 1.3: Frontend wire-up

- [ ] Extend public/staff settings types
- [ ] `order-totals.ts` takes taxPercent + deliveryFee from settings query (no silent 15/100 defaults except offline fallback labeled in code comment)
- [ ] Settings UI: owner can edit tax % and delivery fee
- [ ] Checkout + shop checkout + CreateOrderModal use shared totals helper
- [ ] Commit: `feat: settings-driven tax and delivery fee`

---

## Phase 2 — Realtime backbone (2–3 days)

### Task 2.1: Event envelope

- [ ] Define Go struct `realtime.Event{ Type, At, OrderID?, TableID?, ServiceRequestID?, Payload map }`
- [ ] JSON stable field names for FE
- [ ] Test marshal/unmarshal

### Task 2.2: Redis fan-out

- [ ] Channel name e.g. `yadotena:events`
- [ ] On publish: `PUBLISH` JSON; local hub also `Broadcast` for single-instance without Redis
- [ ] On API boot: if Redis present, `SUBSCRIBE` and forward to local hub
- [ ] If Redis nil: local-only (dev OK); log once
- [ ] Do not break existing rate-limit Redis client — share connection

### Task 2.3: Emit points

- [ ] After successful order create / status patch / payment verify|reject|submit
- [ ] After service request create / resolve
- [ ] After table assignment changes that affect derived status (if cheap; else emit `table.updated` when orders on table change)
- [ ] Ensure chef-invisible shop orders still emit for staff shop/payments views

### Task 2.4: Harden SSE endpoints

- [ ] Staff stream: auth required; heartbeat comment every 15s; `Last-Event-ID` optional skip
- [ ] Public order stream: only that order’s events; 404 if unknown
- [ ] CORS / proxy: document that Vercel rewrite must not buffer SSE — prefer **browser EventSource directly to Render** for streams (`NEXT_PUBLIC_API_URL`) to avoid Next rewrite buffering; REST stays on `/api/backend`
- [ ] Commit: `feat: redis-backed SSE event fan-out`

### Task 2.5: FE EventSource clients

- [ ] `useOrderStream(orderId)` — public URL `${REMOTE_API}/api/v1/public/orders/${id}/stream`
- [ ] `useStaffStream()` — Bearer cannot be set on EventSource; use cookie `yadotena_token` if already set by login **or** pass `?access_token=` short-lived query accepted by staff stream middleware (prefer cookie; verify login sets cookie for API domain — if cross-origin cookie fails, use token query with auth middleware support)
- [ ] **Decision locked:** add staff stream auth via `Authorization` unsupported by EventSource → implement `GET /staff/stream?token=` validating same JWT (in addition to header/cookie)
- [ ] On message: `queryClient.invalidateQueries` for relevant keys; sound hook listens for `order.created` / `service_request.created`
- [ ] Fallback: if EventSource error, exponential backoff reconnect; while disconnected use 15s poll
- [ ] Remove or raise `refetchInterval: 3000` to `15000` only as fallback when `streamConnected === false`
- [ ] Commit: `feat: wire staff and guest SSE into react-query`

### Task 2.6: Verify realtime

- [ ] Two browser profiles: place order → kitchen updates without refresh
- [ ] Payment verify → guest track page updates
- [ ] Kill Redis in staging → local hub still works single-instance
- [ ] Commit tests for publish helper

---

## Phase 3 — Auth, roles, security polish (1 day)

### Task 3.1: Middleware

- [ ] Add `yadotena-frontend/src/middleware.ts`
- [ ] Protect `/dashboard/*`; redirect `/login`
- [ ] Role map: chef → only kitchen (+ maybe orders read-only if already allowed by API); waiter → no menu/products/employees/settings/reports as per Sidebar; owner/manager full
- [ ] Match existing Sidebar rules in one shared `lib/nav-access.ts` imported by Sidebar + middleware

### Task 3.2: API consistency

- [ ] Audit waiter/chef forbidden writes already enforced; fix any gap found
- [ ] Rate limit login attempts (Redis) if missing
- [ ] Commit: `feat: dashboard route guards by role`

---

## Phase 4 — Customer experience refinements (1–2 days)

### Task 4.1: Catalog honesty

- [ ] Remove or clearly disable non-persisted addons/spice in `ItemDetailModal`
- [ ] Cart line notes remain as `specialInstructions` only
- [ ] Commit: `fix: stop offering non-persisted menu addons`

### Task 4.2: Checkout clarity

- [ ] Each step shows payment expectation copy (dine-in pay later vs takeaway pay at counter vs digital ref required)
- [ ] Show live tax % / service % / delivery fee from settings
- [ ] Disable place while `accepting_orders === false` with cafe message
- [ ] Table picker empty state: “no free tables” with refresh

### Task 4.3: Order track

- [ ] Status timeline UI (placed → confirmed → preparing → ready → served/completed)
- [ ] SSE-driven; review CTA only when completed/served per existing rules
- [ ] Clear unpaid vs pending_verification messaging

### Task 4.4: Menu / shop polish

- [ ] Unified loading skeletons; error retry already present — align copy
- [ ] Shop: empty catalog CTA if zero products
- [ ] Landing menu highlights tolerate empty menu
- [ ] Commit: `feat: guest checkout and track UX refinements`

---

## Phase 5 — Staff portal UX refinements (1–2 days)

### Task 5.1: Shared patterns

- [ ] Standardize list page header (title, count, primary action)
- [ ] Standard empty/error components reused
- [ ] Filters: search null-safe (already partially done)

### Task 5.2: Kitchen & waiter

- [ ] Kitchen cards animate/highlight on SSE insert
- [ ] Sound notifications triggered from stream events (debounce)
- [ ] WaiterDashboard: service requests + open tables update live
- [ ] Tables floor: status pill updates on `table.updated` / order events

### Task 5.3: Payments & shop queue

- [ ] Payments queue auto-refresh via SSE payment events
- [ ] Shop dashboard: only shop types; live
- [ ] Commit: `feat: staff live UX polish`

### Task 5.4: Analytics fix

- [ ] Include `shop_pickup` / `shop_delivery` in revenue filters where omitted
- [ ] Commit: `fix: include shop orders in analytics`

---

## Phase 6 — Backend logic hardening (1–2 days)

### Task 6.1: Order/payment rules tests

- [ ] Expand `orders/rules_test.go` for shop + dine-in complete requires paid
- [ ] Handler-level test for InitialPaymentStatus matrix if extractable

### Task 6.2: Edge cases

- [ ] Reject mixed menu+product lines in one order (or document allow — **decision: reject mixed**)
- [ ] Reject shop types with `menuItemId` and kitchen types with only `productId`
- [ ] Completing cancelled blocked (verify)
- [ ] `accepting_orders=false` blocks public place

### Task 6.3: Observability

- [ ] Structured log fields on place/status/payment
- [ ] `/ready` already pings DB; optionally report redis ok in ready body
- [ ] Commit: `test: harden order payment and line-type rules`

---

## Phase 7 — Design system consistency & residual UX (1 day)

### Task 7.1: UI debt

- [ ] Replace inconsistent emoji-heavy category chrome where it fights brand (keep minimal or map to lucide)
- [ ] Ensure dark/light theme contrast on badges/status pills
- [ ] Login: remove any leftover demo account UI if present
- [ ] Header search: either wire simple client filter on menu or remove placeholder

### Task 7.2: Performance

- [ ] Image `next/image` remotePatterns already unsplash — ensure product images OK
- [ ] Avoid refetch storms: coalesce invalidations with `queryClient.invalidateQueries` debounce 100ms
- [ ] Commit: `chore: ui consistency pass`

---

## Phase 8 — QA, docs, deploy (½–1 day)

### Task 8.1: Docs

- [ ] Update `README.md` / `PRODUCT.md`: SSE, settings tax/delivery, seed credentials pointer
- [ ] Note EventSource hits API origin directly

### Task 8.2: Deploy order

- [ ] Migrate 000005 on Neon (API boot migrate)
- [ ] Deploy API (SSE+Redis) before FE that depends on token query stream
- [ ] Deploy FE
- [ ] Re-seed if needed (`go run ./cmd/seed`)

### Task 8.3: Acceptance

- [ ] Checklist from design success criteria all green
- [ ] Commit: `docs: realtime and commerce settings runbook`

---

## Refinement backlog (detailed — tracked across phases)

### Backend

1. Hardcoded tax 15% / delivery 100 → settings (P1)
2. SSE unused + single-process hub → Redis fan-out + FE (P2)
3. Thin tests → rules + line-type + payment matrix (P6)
4. Analytics omitting shop types (P5)
5. Mixed cart line types undefined → reject (P6)
6. Login rate limit if missing (P3)
7. Ready/redis health (P6)
8. Seed product UUID validity (done; keep vigilance)
9. Activity log coverage on product CRUD (audit while touching handlers)
10. Image URL validation already exists — ensure products use same

### Frontend / CX

1. 3s polling everywhere → SSE (P2)
2. Fake addons in ItemDetailModal (P4)
3. No middleware role guards (P3)
4. Tax/delivery FE hardcodes (P1)
5. Weak payment expectation copy in checkout (P4)
6. Order track not timeline (P4)
7. Inconsistent empty/error/skeleton (P5/P7)
8. Sound tied to poll → stream events (P5)
9. Cross-origin EventSource auth (token query) (P2)
10. Header search dead (P7)
11. Types leftovers REFUNDED/CLEANING/CUSTOMER — clean or document (P7)
12. Guest phone `0000000000` fallback — require real phone on checkout (P4)
13. Shop vs menu cart confusion — keep separate; add cross-links “Also see shop” (P4)
14. Landing highlights if API slow — skeleton (P4)

### Flows to preserve (do not regress)

- QR `?table=` → SessionManager dine-in
- `/menu` without table clears table session
- Dine-in cash unpaid; digital pending_verification; takeaway/shop cash pending until paid for kitchen visibility
- Shop never kitchen-visible
- Service requests WAITER/BILL/ASSISTANCE

---

## Phase status (2026-08-09 implementation session)

- [x] Phase 1 money settings (migration 000005, BE, FE totals + settings UI)
- [x] Phase 2 SSE Redis fan-out + token query auth + FE EventSource + 15s fallback poll
- [x] Phase 3 middleware + nav-access
- [x] Phase 4 strip fake addons; order track steps expanded + SSE
- [x] Phase 5: analytics shop types; kitchen flash on new tickets; checkout payment copy; accepting_orders gate; tax label live %
- [x] Phase 6: login rate limit; expanded order rules tests; require real guest phone
- [x] Phase 7: header order search; menu↔shop cross-links; bell pulse (not bounce)
- [x] Phase 8: README + PRODUCT docs for SSE/settings/credentials

**Deploy note:** Neon already migrated via `go run ./cmd/seed`. Redeploy Render API + Vercel FE for live SSE + settings fields on public API.

---

## Open follow-ups (explicitly deferred)

- Real menu addons / dietary tags BE
- Telebirr/CBE payment API integration
- Amharic i18n
- Playwright e2e suite
- Table status `CLEANING` workflow (UI removed until BE derives it)
- Multi-cafe tenancy

## Latest polish (same session)

- Removed fake order-track countdown and `"t1"` service-request fallbacks
- Settings: accepting_orders + cash/digital toggles; shop checkout respects pause
- Waiter floor table count + `tableLabel`; orders payment/type labels
- Landing “Try Table 04”; PRODUCT aligned with README credentials
- Reports: shop revenue separated (no double-count into takeaway/delivery)
- Category emoji chrome removed (not persisted); login lock icon; EmptyState/ErrorState
- `ValidateLineRefs` + tests; header search uses `router.push`
- Payment-verify chimes + header CTA; SessionManager no longer wipes free-table picks
- Mixed menu/shop cart confirm-clear; Activity log page; seed cafe_name = brand
- Dashboard KPIs without fake “up” arrows; HowToOrder pause note + Table 04 link
- Employees: real `joinedDate`, no fake phone, deactivate copy; settings service charge fallback 0
- Customers/expenses/reviews ErrorState; SSE invalidates activity; emoji strip in waiter/header
