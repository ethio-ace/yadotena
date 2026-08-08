# FE/BE Full Compatibility Design

Approved 2026-08-09. Extend the existing Go monolith; no new services.

## Scope

1. **Service requests** — public create, staff list/resolve, FE Header + order tracking
2. **Reviews (full)** — public create from order tracking, staff list on dashboard
3. **Payments** — digital place/submit; API statuses `PENDING` | `PENDING_VERIFICATION` | `PAID` | `REJECTED`; FE verify/reject
4. **Order totals** — tax 15%, service charge from settings (dine-in), delivery fee 100 ETB
5. **Partial settings PATCH**
6. **Staff** — return `phone`; PATCH `phone` + `status`
7. **Soft-delete** — staff list categories/items active/available by default
8. **Analytics** — FE passes `from`/`to` (30d)
9. **Tables** — status remains derived-only

## Out of scope

Hard menu DELETE, customer SSE, category icon persistence, refunds.
