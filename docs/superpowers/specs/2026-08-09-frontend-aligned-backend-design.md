# Yadotena — Frontend-Aligned Backend (Design Spec)

**Date:** 2026-08-09  
**Status:** Ready for user review  
**Supersedes for API contract:** parts of `2026-08-08-yadotena-design.md` where they conflict with this document  
**Frontend source:** `yadotena-frontend/`  
**Backend base:** existing Go monolith in `backend/`

## 1. Product summary

Evolve the existing Yadotena Go API so it fully backs the `yadotena-frontend` UI: public ordering, staff dashboards (owner/manager/waiter/kitchen), expenses, derived customers, reports, and settings.

Staff authenticate with **phone + PIN**. HTTP JSON uses the **frontend’s type shapes and enum labels**. Payment verification stays rich **internally**; responses map payment to the simpler UI labels.

### In scope

- Auth (phone + PIN → JWT; roles exposed as `OWNER` | `MANAGER` | `WAITER` | `KITCHEN`)
- Public menu, tables, settings, place order, track, order SSE
- Staff orders with extended status flow (`PENDING`…`SERVED`…`COMPLETED`)
- Dual payment states internally; UI labels `PENDING` | `PAID` (`REFUNDED` unused in v1)
- Menu/categories/tables CRUD; derived table `status` (no status column)
- Employees (staff) CRUD with role rules
- Derived customers directory (aggregate by phone from orders)
- Expenses full CRUD (soft delete)
- Analytics/reports including daily series for charts
- Settings including optional service charge
- Uploads (presign + public URL), activity log, staff SSE

### Explicitly out of scope

- Reviews API (UI may stay empty/mock)
- Customer accounts / registration
- Stored table status / `CLEANING` state
- Live payment gateways; automated refunds
- Wiring Next.js `api.ts` off mocks (follow-up; this spec is backend-only)
- Inventory, reservations, riders, multi-branch

---

## 2. Architecture

**Approach:** Evolve the existing monolith (Approach 1). No separate BFF; a DTO/mapping layer at the HTTP edge.

```
yadotena-frontend (Next.js + NextAuth)
        │  Credentials: phone + PIN → login API
        │  REST JSON in frontend shapes
        ▼
backend/ (Go + chi + Postgres + Redis SSE)
  internal/auth, orders, activity, sse   (kept / extended)
  internal/api/dto or handler mappers    (frontend ↔ DB)
  migrations                             (+ expenses, order statuses, prep time, service charge)
```

| Layer | Choice |
|-------|--------|
| API | Go, chi, existing structure |
| DB | PostgreSQL 16, golang-migrate style SQL |
| Cache / pubsub | Redis (SSE fan-out, rate limits) |
| Auth | Staff JWT; phone + PIN (bcrypt) |
| Objects | Existing upload/presign path |
| Realtime | SSE |

---

## 3. Domain model

### 3.1 Staff / employees

| Field | Rules |
|-------|--------|
| phone | Unique login |
| pin_hash | Hashed PIN |
| name | Required |
| email | Optional |
| role | DB: `owner` \| `manager` \| `waiter` \| `chef` → API: `OWNER` \| `MANAGER` \| `WAITER` \| `KITCHEN` |
| is_active | → API `status`: `ACTIVE` \| `INACTIVE` |

Role rules: manager may create/edit waiter and kitchen; owner may also create/edit managers. Nobody creates/edits owners via API except seed/bootstrap.

### 3.2 Category → MenuItem

As existing schema, plus optional `preparation_time_minutes` (default 0) for frontend `preparationTime`.  
Image: uploaded object URL or public HTTPS URL.

API menu shape aligns with frontend: `id`, `name`, `description`, `price`, `category` (category **name** string), `image`, `available`, `preparationTime`. Staff write endpoints also accept `categoryId` when creating/updating items.

### 3.3 Table

- `label` → API `name`; `seats` → `capacity`
- **No status column**
- Derived `status` + optional `currentOrderId` from open dine-in orders

| Computed status | Rule (first match wins, evaluated in this order) |
|-----------------|------|
| `AVAILABLE` | No open dine-in order |
| `WAITING_FOR_PAYMENT` | Open order `served` and payment ≠ `paid` |
| `WAITING_FOR_SERVICE` | Open order `ready` |
| `PREPARING` | Open order `preparing` |
| `ORDERING` | Open order `placed` / `confirmed` |
| `OCCUPIED` | Any other open ticket |
| `CLEANING` | **Never emitted** (not derivable without storage) |

Open = dine-in order not `cancelled` and not `completed`. If multiple open orders exist for one table (should be rare), use the newest.

### 3.4 Order

Internal DB enums remain snake_case; API uses frontend enums.

**Order type**

| DB | API |
|----|-----|
| `dine_in` | `DINE_IN` |
| `pickup` | `TAKEAWAY` |
| `delivery` | `DELIVERY` |

**Order status** (DB extended)

| DB | API | Typical actor |
|----|-----|---------------|
| `placed` | `PENDING` | create |
| `confirmed` | `CONFIRMED` | waiter |
| `preparing` | `PREPARING` | kitchen |
| `ready` | `READY` | kitchen |
| `served` | `SERVED` | waiter |
| `completed` | `COMPLETED` | waiter/manager |
| `cancelled` | `CANCELLED` | waiter/manager |

**Payment status**

| DB (internal) | API label |
|---------------|-----------|
| `unpaid` | `PENDING` |
| `pending_verification` | `PENDING` |
| `rejected` | `PENDING` |
| `paid` | `PAID` |
| — | `REFUNDED` unused in v1 |

Guest fields: `customer_name`, `customer_phone` required; `delivery_address` required for delivery; `table_id` required for dine-in. Line items snapshot name, unit price, qty, optional note (`specialInstructions`).

### 3.5 Payment

One payment record per order. Methods `cash` \| `digital`; digital label + reference; verify/reject by staff. Internal status drives kitchen gates; API exposes mapped label.

### 3.6 Customers (derived, no table)

`GET` aggregates by `customer_phone`: display name from latest order, `totalOrders`, `totalSpent` (sum of `total_etb` where payment is `paid`), `lastOrder`, heuristic `type`:
- `VIP` if `totalOrders >= 20` OR `totalSpent >= 5000` ETB
- `OCCASIONAL` if `totalOrders <= 5`
- else `REGULAR`

### 3.7 Expenses (new table)

`id`, `amount`, `category`, `description`, `expense_date`, `payment_method`, `recorded_by` (staff FK), `created_at`, `updated_at`, `deleted_at` (soft delete). Owner/manager full CRUD.

### 3.8 Settings

Existing cafe fields + payment toggles/labels + `service_charge_percent` (numeric, 0–100) for the settings form. Owner write; manager read.

### 3.9 ActivityLog

Unchanged: append-only on staff mutations.

### 3.10 Reviews

No persistence or API.

---

## 4. Order & payment rules

### 4.1 Kitchen visibility

| Type | Kitchen visible when |
|------|----------------------|
| Pickup / delivery (`TAKEAWAY` / `DELIVERY`) | `payment_status = paid` |
| Dine-in | Always until cancelled/completed |

### 4.2 Transitions

- Waiter: `placed` → `confirmed`; `ready` → `served`; `served` → `completed` (dine-in complete still requires `paid`); cancel until completed
- Kitchen (`KITCHEN`): `confirmed` or `placed` → `preparing` → `ready` (only if kitchen-visible)
- Manager/owner: same as waiter + kitchen overrides as needed
- Illegal transitions → 409

### 4.3 Placement

- Dine-in: may start `unpaid`; cash settle or digital verify as today
- Pickup/delivery: pay-first; digital → `pending_verification` until verify → `paid`; kitchen only when paid

### 4.4 Table release

Table free when no open dine-in order remains (completed requires paid for dine-in, or cancelled).

---

## 5. API surface

### Auth

- `POST /api/v1/staff/auth/login` `{ phone, pin }` → `{ token, user }`
- `GET/PATCH /api/v1/staff/me`

### Public

- `GET /api/v1/public/menu`
- `GET /api/v1/public/tables`
- `GET /api/v1/public/settings`
- `POST /api/v1/public/orders`
- `GET /api/v1/public/orders/track`
- `GET /api/v1/public/orders/{id}/stream`

### Staff (JWT)

| Area | Routes | Roles |
|------|--------|-------|
| Orders | list, get, create, patch status, payment submit/verify/reject | role-gated as today; kitchen limited to status |
| Categories / items | CRUD | write: manager/owner; read: waiter+ |
| Tables | list/create/patch (no status write) | write: manager/owner; read: waiter+ |
| Staff/employees | list/create/patch | manager/owner |
| Customers | `GET /staff/customers` | owner/manager/waiter |
| Expenses | `GET/POST/PATCH/DELETE /staff/expenses` | owner/manager |
| Analytics | `GET /staff/analytics` (+ daily series) | owner/manager |
| Activity | `GET /staff/activity` | owner/manager |
| Settings | get; owner patch | manager read / owner write |
| Uploads | presign + put | manager/owner |
| SSE | `GET /staff/stream` | all staff |

No `/reviews` routes.

Responses always use frontend enum labels. Request bodies accept frontend labels; mapper converts to DB.

Errors: `{ "error": string, "code"?: string }` with 401/403/409/429 as appropriate.

---

## 6. Mapping layer

Introduce a small DTO package (or equivalent in handlers) responsible for:

- Role, order type, order status, payment status conversion
- Menu/table/order/expense JSON shapes matching `yadotena-frontend/src/types`
- Table status derivation helper (unit-tested)

DB and business rules keep internal snake_case enums; only the edge speaks SCREAMING_SNAKE frontend labels.

---

## 7. Security

- PIN hashed; JWT claims `staff_id`, `role` (internal role)
- Role guards on every staff route
- Owner-only: payment/cafe settings write, manager staff records
- Public place-order / track rate-limited
- ActivityLog actor set server-side only
- Expense soft-delete; no hard delete required

---

## 8. Testing & deploy

- Unit tests: transitions (`confirmed`/`served`), kitchen gate, dine-in complete-requires-paid, table derivation, customer aggregation thresholds, expense soft-delete
- API smoke via `scripts/smoke.sh`: health, login, menu, place dine-in, status path through ready/served/pay/complete, expense CRUD, analytics
- Docker Compose unchanged in spirit (Postgres, Redis, MinIO optional, API, frontend)

---

## 9. Implementation sequencing

1. Migration: extend `order_status`, add `preparation_time_minutes`, `service_charge_percent`, `expenses` table  
2. DTO/mapping layer + update existing handlers’ JSON  
3. Order rules for `confirmed` / `served` + tests  
4. Derived table status + customers endpoint  
5. Expenses CRUD  
6. Analytics daily series  
7. Auth response shape for NextAuth; seeds unchanged phones/PINs  
8. Smoke script update  

Frontend mock→API swap is explicitly a later task unless requested.

---

## 10. Decisions log

| Topic | Decision |
|-------|----------|
| Source of truth | Frontend UI features (expand backend) |
| Architecture | Evolve existing Go monolith |
| Auth | Phone + PIN; API roles match frontend |
| Customers | Derived by phone; no CRM table |
| Reviews | No API this pass |
| Expenses | Full CRUD + soft delete |
| Table status | Derived only; no `CLEANING` |
| Order statuses | DB extended for confirmed/served; API frontend labels |
| Payment | Rich internal states; UI PENDING/PAID mapping |
| Spec vs 2026-08-08 | This doc wins on API contract conflicts |

---

## 11. Success criteria

1. Staff can log in with phone + PIN and receive frontend role labels  
2. Public menu/checkout/track work against real API shapes the UI expects  
3. Waiter can confirm → kitchen prepare/ready → serve → pay → complete  
4. Tables show sensible derived statuses without a status column  
5. Customers page can be fed by aggregation endpoint  
6. Expenses CRUD works for manager/owner  
7. Reports get real analytics including a daily series  
8. Reviews remain without backend; no customer accounts  
