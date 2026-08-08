# Frontend-Aligned Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Evolve the existing Go monolith so HTTP JSON matches `yadotena-frontend` types, adding expenses, derived customers, extended order statuses, and analytics daily series per `docs/superpowers/specs/2026-08-09-frontend-aligned-backend-design.md`.

**Architecture:** Keep DB/business rules in snake_case internal enums; add `internal/dto` mappers at the HTTP edge. Extend migrations and order transition rules; add expenses CRUD and customers aggregation. Do not wire the Next.js mock client in this plan.

**Tech Stack:** Go 1.22+, chi, pgx, PostgreSQL, existing JWT/bcrypt/SSE stack; `go test` for units; `scripts/smoke.sh` for HTTP smoke.

## Global Constraints

- Spec source of truth: `docs/superpowers/specs/2026-08-09-frontend-aligned-backend-design.md` (wins over 2026-08-08 on API contract conflicts)
- Auth: phone + PIN only; API roles `OWNER` | `MANAGER` | `WAITER` | `KITCHEN`
- Payment DB stays `unpaid` | `pending_verification` | `paid` | `rejected`; API exposes `PENDING` | `PAID` (`REFUNDED` unused)
- No reviews API; no customer table; no stored table status / no `CLEANING`
- Customer VIP: `totalOrders >= 20` OR `totalSpent >= 5000`; OCCASIONAL if `totalOrders <= 5`; else REGULAR
- Frontend mock→API wiring is out of scope
- TDD: failing test → implement → pass → commit per task
- Commit messages: concise why-focused; do not amend unless hooks require and amend rules met

---

## File map

| Path | Responsibility |
|------|----------------|
| `backend/migrations/000002_frontend_align.up.sql` | Schema deltas |
| `backend/migrations/000002_frontend_align.down.sql` | Rollback |
| `backend/internal/models/models.go` | Internal enums + Expense model |
| `backend/internal/dto/dto.go` | Frontend ↔ DB mapping |
| `backend/internal/dto/dto_test.go` | Mapper + table derivation tests |
| `backend/internal/orders/rules.go` | Transition helpers |
| `backend/internal/orders/rules_test.go` | Transition tests |
| `backend/internal/orders/tables.go` | Derive table status |
| `backend/internal/server/handlers_*.go` | Response shaping + new endpoints |
| `backend/internal/server/router.go` | Register new routes |
| `scripts/smoke.sh` | Extended smoke path |

---

### Task 1: Migration — statuses, prep time, service charge, expenses

**Files:**
- Create: `backend/migrations/000002_frontend_align.up.sql`
- Create: `backend/migrations/000002_frontend_align.down.sql`

**Interfaces:**
- Consumes: existing `000001_init.up.sql` tables
- Produces: DB supports `confirmed`/`served` order statuses; `menu_items.preparation_time_minutes`; `settings.service_charge_percent`; `expenses` table

- [ ] **Step 1: Write the up migration**

```sql
-- backend/migrations/000002_frontend_align.up.sql
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_order_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_order_status_check
  CHECK (order_status IN ('placed','confirmed','preparing','ready','served','completed','cancelled'));

ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS preparation_time_minutes INT NOT NULL DEFAULT 0
  CHECK (preparation_time_minutes >= 0);

ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS service_charge_percent NUMERIC(5,2) NOT NULL DEFAULT 0
  CHECK (service_charge_percent >= 0 AND service_charge_percent <= 100);

CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  category TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT NOT NULL DEFAULT '',
  recorded_by UUID NOT NULL REFERENCES staff(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_recorded_by ON expenses(recorded_by);
```

- [ ] **Step 2: Write the down migration**

```sql
-- backend/migrations/000002_frontend_align.down.sql
DROP TABLE IF EXISTS expenses;
ALTER TABLE settings DROP COLUMN IF EXISTS service_charge_percent;
ALTER TABLE menu_items DROP COLUMN IF EXISTS preparation_time_minutes;
-- Note: narrowing order_status check is unsafe if confirmed/served rows exist; leave widened check or document manual cleanup.
```

- [ ] **Step 3: Commit**

```bash
git add backend/migrations/000002_frontend_align.up.sql backend/migrations/000002_frontend_align.down.sql
git commit -m "Add migration for frontend-aligned schema deltas."
```

---

### Task 2: Models — order statuses + Expense + Settings field

**Files:**
- Modify: `backend/internal/models/models.go`
- Test: covered via dto/rules tests in later tasks

**Interfaces:**
- Produces: `OrderConfirmed`, `OrderServed` constants; `Expense` struct; `Settings.ServiceChargePercent float64`

- [ ] **Step 1: Extend models**

In `models.go`, add to `OrderStatus` constants:

```go
OrderConfirmed OrderStatus = "confirmed"
OrderServed    OrderStatus = "served"
```

Add to `Settings`:

```go
ServiceChargePercent float64 `json:"service_charge_percent"`
```

Add `Expense` struct (internal):

```go
type Expense struct {
	ID            uuid.UUID  `json:"id"`
	Amount        float64    `json:"amount"`
	Category      string     `json:"category"`
	Description   string     `json:"description"`
	ExpenseDate   time.Time  `json:"expense_date"`
	PaymentMethod string     `json:"payment_method"`
	RecordedBy    uuid.UUID  `json:"recorded_by"`
	RecordedName  string     `json:"recorded_by_name,omitempty"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
	DeletedAt     *time.Time `json:"deleted_at,omitempty"`
}
```

Add `PreparationTimeMinutes int` to `MenuItem` with json `preparation_time_minutes`.

- [ ] **Step 2: Commit**

```bash
git add backend/internal/models/models.go
git commit -m "Extend models for confirmed/served, expenses, prep time."
```

---

### Task 3: DTO package — frontend enum mapping + table derivation

**Files:**
- Create: `backend/internal/dto/dto.go`
- Create: `backend/internal/dto/dto_test.go`
- Create: `backend/internal/orders/tables.go` (derivation used by handlers; pure function can live in `dto` or `orders` — put `DeriveTableStatus` in `backend/internal/orders/tables.go`)

**Interfaces:**
- Produces:
  - `dto.RoleAPI(models.Role) string` → `OWNER`/`MANAGER`/`WAITER`/`KITCHEN`
  - `dto.ParseRoleAPI(string) (models.Role, error)`
  - `dto.OrderStatusAPI(models.OrderStatus) string`
  - `dto.ParseOrderStatusAPI(string) (models.OrderStatus, error)`
  - `dto.OrderTypeAPI` / `ParseOrderTypeAPI` (`TAKEAWAY`↔`pickup`)
  - `dto.PaymentStatusAPI(models.PaymentStatus) string` → `PENDING`|`PAID`
  - `dto.StaffUser(models.Staff) map[string]any` matching frontend User fields
  - `dto.MenuItemAPI(item models.MenuItem, categoryName string) map[string]any`
  - `dto.OrderAPI(*models.Order) map[string]any`
  - `dto.TableAPI(id, name string, capacity int, status string, currentOrderID *uuid.UUID) map[string]any`
  - `dto.ExpenseAPI(models.Expense) map[string]any`
  - `orders.DeriveTableStatus(orderStatus models.OrderStatus, payment models.PaymentStatus, hasOpen bool) (status string)` — if `!hasOpen` return `AVAILABLE`; else first-match per spec

- [ ] **Step 1: Write failing tests**

```go
// backend/internal/dto/dto_test.go
package dto_test

import (
	"testing"

	"yadotena/internal/dto"
	"yadotena/internal/models"
)

func TestRoleRoundTrip(t *testing.T) {
	if dto.RoleAPI(models.RoleChef) != "KITCHEN" {
		t.Fatal()
	}
	r, err := dto.ParseRoleAPI("KITCHEN")
	if err != nil || r != models.RoleChef {
		t.Fatal(err, r)
	}
}

func TestOrderStatusMap(t *testing.T) {
	if dto.OrderStatusAPI(models.OrderPlaced) != "PENDING" {
		t.Fatal()
	}
	if dto.OrderStatusAPI(models.OrderConfirmed) != "CONFIRMED" {
		t.Fatal()
	}
	s, err := dto.ParseOrderStatusAPI("SERVED")
	if err != nil || s != models.OrderServed {
		t.Fatal()
	}
}

func TestPaymentStatusAPI(t *testing.T) {
	if dto.PaymentStatusAPI(models.PayUnpaid) != "PENDING" {
		t.Fatal()
	}
	if dto.PaymentStatusAPI(models.PayPendingVerification) != "PENDING" {
		t.Fatal()
	}
	if dto.PaymentStatusAPI(models.PayRejected) != "PENDING" {
		t.Fatal()
	}
	if dto.PaymentStatusAPI(models.PayPaid) != "PAID" {
		t.Fatal()
	}
}

func TestOrderTypeTakeaway(t *testing.T) {
	if dto.OrderTypeAPI(models.OrderPickup) != "TAKEAWAY" {
		t.Fatal()
	}
	ot, err := dto.ParseOrderTypeAPI("TAKEAWAY")
	if err != nil || ot != models.OrderPickup {
		t.Fatal()
	}
}
```

```go
// backend/internal/orders/tables_test.go
package orders

import (
	"testing"

	"yadotena/internal/models"
)

func TestDeriveTableStatus(t *testing.T) {
	if DeriveTableStatus(models.OrderPlaced, models.PayUnpaid, false) != "AVAILABLE" {
		t.Fatal("no open")
	}
	if DeriveTableStatus(models.OrderServed, models.PayUnpaid, true) != "WAITING_FOR_PAYMENT" {
		t.Fatal("served unpaid")
	}
	if DeriveTableStatus(models.OrderReady, models.PayPaid, true) != "WAITING_FOR_SERVICE" {
		t.Fatal("ready")
	}
	if DeriveTableStatus(models.OrderPreparing, models.PayUnpaid, true) != "PREPARING" {
		t.Fatal("preparing")
	}
	if DeriveTableStatus(models.OrderConfirmed, models.PayUnpaid, true) != "ORDERING" {
		t.Fatal("confirmed")
	}
}
```

- [ ] **Step 2: Run tests — expect fail**

```bash
cd backend && go test ./internal/dto/ ./internal/orders/ -count=1
```

Expected: FAIL (package or symbols missing)

- [ ] **Step 3: Implement `dto.go` and `orders/tables.go`**

Implement all mappers listed in Interfaces. `OrderAPI` must emit:

```json
{
  "id": "...",
  "type": "DINE_IN",
  "status": "PENDING",
  "paymentStatus": "PENDING",
  "items": [{"id":"...","menuItemId":"...","name":"...","price":9.5,"quantity":1,"specialInstructions":"..."}],
  "total": 9.5,
  "createdAt": "...",
  "updatedAt": "...",
  "tableId": "...",
  "customerName": "...",
  "customerPhone": "...",
  "deliveryAddress": "..."
}
```

`StaffUser` must emit `role` API label and `status` `ACTIVE`/`INACTIVE` from `is_active`.  
`MenuItemAPI`: `price`, `category` (name), `image` (empty string if nil), `available`, `preparationTime`.  
`ExpenseAPI`: `date` as `YYYY-MM-DD`, `recordedBy` as staff id string (and optionally include recorded name in a separate field if useful — frontend Expense type uses `recordedBy` as user id).

`DeriveTableStatus` order (first match):

1. `!hasOpen` → `AVAILABLE`
2. `served` && payment ≠ paid → `WAITING_FOR_PAYMENT`
3. `ready` → `WAITING_FOR_SERVICE`
4. `preparing` → `PREPARING`
5. `placed` or `confirmed` → `ORDERING`
6. else → `OCCUPIED`

Never return `CLEANING`.

- [ ] **Step 4: Run tests — expect pass**

```bash
cd backend && go test ./internal/dto/ ./internal/orders/ -count=1
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/internal/dto/ backend/internal/orders/tables.go backend/internal/orders/tables_test.go
git commit -m "Add frontend DTO mappers and derived table status."
```

---

### Task 4: Order transition rules for confirmed / served

**Files:**
- Modify: `backend/internal/orders/rules.go`
- Modify: `backend/internal/orders/rules_test.go`

**Interfaces:**
- Consumes: `models.OrderConfirmed`, `models.OrderServed`
- Produces updated:
  - `CanChefTransition(from, to)` — chef: `placed|confirmed` → `preparing` → `ready`; cancel allowed from those
  - `CanFloorTransition(from, to)` — waiter: `placed`→`confirmed`; `ready`→`served`; `served`→`completed`; cancel; manager overrides for kitchen path still allowed

- [ ] **Step 1: Write failing tests**

```go
func TestChefFromConfirmed(t *testing.T) {
	if !CanChefTransition(models.OrderConfirmed, models.OrderPreparing) {
		t.Fatal()
	}
	if !CanChefTransition(models.OrderPlaced, models.OrderPreparing) {
		t.Fatal()
	}
	if CanChefTransition(models.OrderReady, models.OrderServed) {
		t.Fatal("chef cannot serve")
	}
}

func TestFloorConfirmAndServe(t *testing.T) {
	if !CanFloorTransition(models.OrderPlaced, models.OrderConfirmed) {
		t.Fatal()
	}
	if !CanFloorTransition(models.OrderReady, models.OrderServed) {
		t.Fatal()
	}
	if !CanFloorTransition(models.OrderServed, models.OrderCompleted) {
		t.Fatal()
	}
	if CanFloorTransition(models.OrderPreparing, models.OrderServed) {
		t.Fatal("skip ready")
	}
}
```

- [ ] **Step 2: Run — expect fail**

```bash
cd backend && go test ./internal/orders/ -run 'TestChefFromConfirmed|TestFloorConfirmAndServe' -count=1
```

Expected: FAIL

- [ ] **Step 3: Update `rules.go`**

```go
func CanChefTransition(from, to models.OrderStatus) bool {
	switch from {
	case models.OrderPlaced, models.OrderConfirmed:
		return to == models.OrderPreparing || to == models.OrderCancelled
	case models.OrderPreparing:
		return to == models.OrderReady || to == models.OrderCancelled
	default:
		return false
	}
}

func CanFloorTransition(from, to models.OrderStatus) bool {
	switch {
	case from == models.OrderPlaced && to == models.OrderConfirmed:
		return true
	case from == models.OrderReady && to == models.OrderServed:
		return true
	case from == models.OrderServed && to == models.OrderCompleted:
		return true
	case from == models.OrderReady && to == models.OrderCompleted:
		return true // allow skip served for takeaway/delivery handoff
	case to == models.OrderCancelled && from != models.OrderCompleted && from != models.OrderCancelled:
		return true
	case from == models.OrderPlaced && (to == models.OrderPreparing || to == models.OrderReady):
		return true
	case from == models.OrderConfirmed && (to == models.OrderPreparing || to == models.OrderReady):
		return true
	case from == models.OrderPreparing && to == models.OrderReady:
		return true
	default:
		return false
	}
}
```

- [ ] **Step 4: Run all order tests — pass**

```bash
cd backend && go test ./internal/orders/ -count=1
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/internal/orders/rules.go backend/internal/orders/rules_test.go
git commit -m "Extend order transitions for confirm and serve."
```

---

### Task 5: Auth + staff list responses in frontend User shape

**Files:**
- Modify: `backend/internal/server/handlers_auth.go`
- Modify: `backend/internal/server/handlers_auth.go` create/patch staff to accept API role labels via `dto.ParseRoleAPI`

**Interfaces:**
- Login response: `{ "token": "...", "user": { "id","name","email","role","status" } }` (keep `token`; prefer `user` key for NextAuth; may also keep `staff` deprecated alias only if needed — prefer `user` only per spec)
- `GET /staff/me` and list staff return User-shaped objects
- createStaff body: `role` accepts `WAITER`/`KITCHEN`/… or internal; reject creating `OWNER`

- [ ] **Step 1: Update `staffLogin` writeJSON**

```go
writeJSON(w, 200, map[string]any{
	"token": token,
	"user": dto.StaffUser(models.Staff{
		ID: id, Phone: body.Phone, Name: name, Role: role, IsActive: active,
	}),
})
```

Load email in login query if present for the user object.

- [ ] **Step 2: Update `staffMe` / `listStaff` to `writeJSON(w, 200, dto.StaffUser(st))` and list of those**

- [ ] **Step 3: Update create/patch to parse API roles; manager cannot set role `manager`/`owner`**

- [ ] **Step 4: Compile**

```bash
cd backend && go build ./...
```

Expected: success

- [ ] **Step 5: Commit**

```bash
git add backend/internal/server/handlers_auth.go
git commit -m "Return staff auth payloads in frontend User shape."
```

---

### Task 6: Menu, tables, settings — frontend shapes + derived table status

**Files:**
- Modify: `backend/internal/server/handlers_menu.go`
- Modify: `backend/internal/models/models.go` Settings load/scan if needed

**Interfaces:**
- `publicMenu` returns `{ "categories": [...], "items": [ MenuItemAPI... ] }` OR a flat `items` array — smoke today expects `categories` key and `items[0].id`. Keep `{categories, items}` but each item must include frontend fields (`price`, `category` name, `preparationTime`, etc.). Prefer dual-friendly: keep category objects for staff; public items fully frontend-shaped.
- `fetchItems` SELECT includes `preparation_time_minutes`
- `fetchTables` joins newest open dine-in order; set `status` via `DeriveTableStatus`; expose via `dto.TableAPI` as `name`, `capacity`, `status`, `currentOrderId`
- Settings load/patch includes `service_charge_percent`; public settings may omit staff-only fields but include accepting_orders and payment flags

- [ ] **Step 1: Update item SQL and mappers in publicMenu/listItems/createItem/patchItem**

- [ ] **Step 2: Rewrite `fetchTables` to LEFT JOIN open order**

```sql
SELECT t.id, t.label, t.seats, t.assigned_waiter_id, t.is_active,
       o.id, o.order_status, o.payment_status
FROM cafe_tables t
LEFT JOIN LATERAL (
  SELECT id, order_status, payment_status FROM orders
  WHERE table_id = t.id AND order_type='dine_in'
    AND order_status NOT IN ('completed','cancelled')
  ORDER BY created_at DESC LIMIT 1
) o ON true
WHERE ...
ORDER BY t.label
```

- [ ] **Step 3: Update settings load/patch for service_charge_percent**

- [ ] **Step 4: Build**

```bash
cd backend && go build ./...
```

- [ ] **Step 5: Commit**

```bash
git add backend/internal/server/handlers_menu.go
git commit -m "Shape menu, tables, settings for frontend contract."
```

---

### Task 7: Orders handlers — accept/emit frontend enums

**Files:**
- Modify: `backend/internal/server/handlers_orders.go`

**Interfaces:**
- `placeBody` accepts `type` or `order_type`, `TAKEAWAY`/`DINE_IN`/`DELIVERY` via `dto.ParseOrderTypeAPI`; items may use `menuItemId`/`quantity`/`specialInstructions` camelCase **or** existing snake_case
- All order JSON responses use `dto.OrderAPI`
- `staffPatchOrderStatus` accepts `{ "status": "CONFIRMED" }` (and still `order_status` internal for compat); parse with `dto.ParseOrderStatusAPI`; illegal → 409
- Chef role in JWT remains `chef`; middleware unchanged

- [ ] **Step 1: Extend placeBody decoding**

Accept both:

```go
Type string `json:"type"`
OrderType models.OrderType `json:"order_type"`
```

Normalize: if `Type != ""`, parse via dto; else use OrderType (also allow string parse if needed).

Item struct:

```go
MenuItemID uuid.UUID `json:"menu_item_id"`
MenuItemIDCamel uuid.UUID `json:"menuItemId"`
Qty int `json:"qty"`
Quantity int `json:"quantity"`
Note string `json:"note"`
SpecialInstructions string `json:"specialInstructions"`
```

Resolve ID/qty/note with camelCase fallbacks.

- [ ] **Step 2: Replace every `writeJSON(..., order)` with `dto.OrderAPI(order)`**

- [ ] **Step 3: Patch status body**

```go
var body struct {
	Status       string `json:"status"`
	OrderStatus  string `json:"order_status"`
	CancelReason *string `json:"cancel_reason"`
}
// prefer Status; parse to models.OrderStatus; on bad transition writeErr 409
```

- [ ] **Step 4: Build + unit tests still pass**

```bash
cd backend && go test ./... -count=1 && go build ./...
```

- [ ] **Step 5: Commit**

```bash
git add backend/internal/server/handlers_orders.go
git commit -m "Accept and emit frontend order enums at HTTP edge."
```

---

### Task 8: Customers aggregation endpoint

**Files:**
- Create: `backend/internal/server/handlers_customers.go`
- Modify: `backend/internal/server/router.go`
- Create: `backend/internal/server/customers_logic_test.go` OR pure helper `backend/internal/customers/classify.go` + test

**Interfaces:**
- `customers.Classify(totalOrders int, totalSpent float64) string` → `VIP`|`REGULAR`|`OCCASIONAL`
- `GET /api/v1/staff/customers` → array of `{ id, name, phone, totalOrders, totalSpent, lastOrder, type }` where `id` is phone (stable key) or hash of phone

- [ ] **Step 1: Failing classify test**

```go
package customers_test

import (
	"testing"
	"yadotena/internal/customers"
)

func TestClassify(t *testing.T) {
	if customers.Classify(20, 0) != "VIP" {
		t.Fatal()
	}
	if customers.Classify(1, 5000) != "VIP" {
		t.Fatal()
	}
	if customers.Classify(3, 10) != "OCCASIONAL" {
		t.Fatal()
	}
	if customers.Classify(10, 100) != "REGULAR" {
		t.Fatal()
	}
}
```

- [ ] **Step 2: Implement classify + handler SQL**

```sql
SELECT customer_phone,
       (ARRAY_AGG(customer_name ORDER BY created_at DESC))[1] AS name,
       COUNT(*)::int AS total_orders,
       COALESCE(SUM(total_etb) FILTER (WHERE payment_status='paid'),0)::float8 AS total_spent,
       MAX(created_at) AS last_order
FROM orders
GROUP BY customer_phone
ORDER BY last_order DESC
```

Map through classify; `id` = phone string.

- [ ] **Step 3: Register route**

```go
r.With(s.requireRoles(models.RoleOwner, models.RoleManager, models.RoleWaiter)).Get("/staff/customers", s.listCustomers)
```

- [ ] **Step 4: Test + build**

```bash
cd backend && go test ./internal/customers/ -count=1 && go build ./...
```

- [ ] **Step 5: Commit**

```bash
git add backend/internal/customers/ backend/internal/server/handlers_customers.go backend/internal/server/router.go
git commit -m "Add derived customers directory endpoint."
```

---

### Task 9: Expenses CRUD

**Files:**
- Create: `backend/internal/server/handlers_expenses.go`
- Modify: `backend/internal/server/router.go`

**Interfaces:**
- `GET /api/v1/staff/expenses` — list where `deleted_at IS NULL`, newest first; frontend Expense shape via `dto.ExpenseAPI`
- `POST /api/v1/staff/expenses` — body `{ amount, category, description, date, paymentMethod }`; `recorded_by` = claims staff id
- `PATCH /api/v1/staff/expenses/{id}` — update fields
- `DELETE /api/v1/staff/expenses/{id}` — soft delete (`deleted_at=now()`)
- Roles: owner, manager only
- Activity log on create/update/delete

- [ ] **Step 1: Implement handlers with validation**

- amount > 0
- category, description, paymentMethod required on create
- date default today if omitted (`2006-01-02`)

- [ ] **Step 2: Router**

```go
r.With(s.requireRoles(models.RoleOwner, models.RoleManager)).Route("/staff/expenses", func(r chi.Router) {
	r.Get("/", s.listExpenses)
	r.Post("/", s.createExpense)
	r.Patch("/{id}", s.patchExpense)
	r.Delete("/{id}", s.deleteExpense)
})
```

- [ ] **Step 3: Build**

```bash
cd backend && go build ./...
```

- [ ] **Step 4: Commit**

```bash
git add backend/internal/server/handlers_expenses.go backend/internal/server/router.go
git commit -m "Add expenses CRUD for manager and owner."
```

---

### Task 10: Analytics daily series

**Files:**
- Modify: `backend/internal/server/handlers_misc.go` (`analytics`)

**Interfaces:**
- Existing keys retained
- Add `daily`: `[{ "date": "YYYY-MM-DD", "dineIn": number, "delivery": number, "takeaway": number, "revenue": number }]` for each day from `from`..`to` inclusive
- Revenue = paid totals that day; type buckets = paid or all orders? Spec: revenue from paid; for chart series use **paid revenue** split by type where possible, and counts or revenue per type — use **paid `total_etb` summed by order_type per day**, keys `dineIn`/`takeaway`/`delivery` matching frontend chart (`dineIn`, `delivery`; include `takeaway`)

- [ ] **Step 1: Add SQL**

```sql
SELECT created_at::date AS d,
       COALESCE(SUM(total_etb) FILTER (WHERE order_type='dine_in'),0)::float8,
       COALESCE(SUM(total_etb) FILTER (WHERE order_type='pickup'),0)::float8,
       COALESCE(SUM(total_etb) FILTER (WHERE order_type='delivery'),0)::float8,
       COALESCE(SUM(total_etb),0)::float8
FROM orders
WHERE payment_status='paid'
  AND created_at::date >= $1::date AND created_at::date <= $2::date
GROUP BY 1 ORDER BY 1
```

Fill missing days with zeros in Go between from and to.

- [ ] **Step 2: Include in JSON as `daily`**

Also map `by_order_type` keys to API labels if returning to UI (`DINE_IN` etc.) — keep internal keys in `by_order_type` **and** add `byOrderType` frontend map OR convert keys to `DINE_IN`/`TAKEAWAY`/`DELIVERY`. Prefer converting to frontend labels for consistency.

- [ ] **Step 3: Build + commit**

```bash
cd backend && go build ./...
git add backend/internal/server/handlers_misc.go
git commit -m "Add analytics daily series for reports charts."
```

---

### Task 11: Smoke script + README note

**Files:**
- Modify: `scripts/smoke.sh`
- Modify: `README.md` (short note on frontend-aligned API + demo phones)

**Interfaces:**
- Smoke must still work after response shape changes
- Extend: confirm → preparing → ready → served; cash pay; complete; create expense; hit customers + analytics

- [ ] **Step 1: Update smoke parsing**

Login token path unchanged. Menu: keep `items[0].id` (ensure public menu still has `items`). Tables: `id` field remains. Place order: after Task 7, prefer frontend body:

```bash
-d "{\"type\":\"DINE_IN\",\"customerName\":\"Smoke\",\"customerPhone\":\"0911111111\",\"tableId\":\"$TABLE\",\"items\":[{\"menuItemId\":\"$ITEM\",\"quantity\":1}],\"paymentMethod\":\"cash\",\"markCashPaid\":false}"
```

If handlers still require snake_case for payment fields, accept both in Task 7 — smoke may use snake_case payment_method for less churn: either is fine if both accepted.

Assert `paymentStatus` is `PENDING` (not `unpaid`).

- [ ] **Step 2: Add flow steps with chef login `0900000004` / waiter status patches using `{ "status": "CONFIRMED" }` etc.**

- [ ] **Step 3: Expense + customers + analytics curls with manager token `0900000002`**

- [ ] **Step 4: Run against local API when up**

```bash
API=http://localhost:8080 ./scripts/smoke.sh
```

Expected: ends with `OK`

- [ ] **Step 5: Commit**

```bash
git add scripts/smoke.sh README.md
git commit -m "Extend smoke coverage for frontend-aligned API."
```

---

## Spec coverage checklist

| Spec area | Task(s) |
|-----------|---------|
| Migration statuses/prep/service/expenses | 1 |
| Models | 2 |
| DTO + table derivation | 3 |
| confirmed/served transitions | 4 |
| Auth User shape / employees | 5 |
| Menu/tables/settings | 6 |
| Orders API enums | 7 |
| Derived customers | 8 |
| Expenses CRUD | 9 |
| Analytics daily | 10 |
| Smoke | 11 |
| No reviews / no frontend wire | Global constraints (skipped intentionally) |

---

## Plan self-review

1. **Spec coverage:** All in-scope backend items mapped to tasks; reviews and Next mock swap explicitly excluded.
2. **Placeholders:** None intentional; payment field dual-accept noted in Tasks 7/11.
3. **Types:** `OrderConfirmed`/`OrderServed` introduced in Task 2 before rules/dto use; `DeriveTableStatus` signature consistent; VIP thresholds match spec.
