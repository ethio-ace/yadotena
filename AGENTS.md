# AGENTS.md — Yadotena

Non-obvious facts that reading the code won't reveal. Keep entries terse.

## Layout & routing

- `(dashboard)/layout.tsx` owns shared chrome (sidebar + header + `p-3 sm:p-4 md:p-6` padding). Shell routes (`/dashboard/manager`, `/dashboard/owner`, `/dashboard/kitchen`) render their own full-screen chrome and the layout skips padding for them — **never** add page-level `p-4 md:p-8` wrappers to shared-chrome pages or you double the padding (this was the "view is very large" bug on the orders page).
- The one source of truth for role nav is `src/lib/nav.ts` (`managerNavGroups`, `ownerNavGroups`, `waiterNavGroups`). Shell sidebars and the shared `Sidebar` both render from it; sidebar collapse is persisted via `hooks/useSidebarCollapse.ts` (localStorage).

## Customer (public) flow

- Customers are **anonymous & view-only by design** (per the owner): no login/register anywhere on the public site (the customer header has no staff-portal link), no cart, no ordering. `ItemDetailModal` is read-only — add-ons and spice levels render as informational chips with a lock note; it fetches `api.addons.getRespectiveForMenuItem` for the real scoped add-on list.
- Public order tracking: `GET /api/v1/orders/lookup?number=` resolves a full order id or the 6-char ticket suffix (see `lookupOrderByNumber`). The header "Track Order" popover and the order-not-found page push to `/order/{number}`; the page itself resolves via `api.orders.lookup` first (id or ticket) and falls back to `getById`. The `/order/[id]` page never settles bills directly — it mirrors the staff `OrderDetailsModal` (shared `OrderProgressStepper`, item cards with images/addons, financial breakdown, payment records) and only shows read-only payment methods/accounts (`PaymentMethodsModal`, powered by the public `GET /payment-methods`) plus `WAITER`/`BILL` service requests. Call-waiter actions are gated to `DINE_IN && status not COMPLETED/CANCELLED`; the modal's "Call Waiter to Settle Bill" only renders for those orders (takeaway/delivery get counter-pay copy).
- "Top Products": `GET /api/v1/menu/popular` (public, no auth) ranks items by total ordered quantity (`orderCount`); the menu/shop pages render it via `TopProductsRow` and fall back to `Popular`/`Favorite` dietary tags or first items when order history is empty. `SortSelect` + `sortCatalogItems` provide popularity/name/price sorting on both pages.
- Don't add cart UI or `useCartStore` usage back to customer pages — that store belongs to the staff POS (SessionManager/waiter flows).

## Staff operations

- Waiter workspace (`/dashboard/waiter`) bottom nav holds Sell / Tables / Orders / Alerts. `TablesView` now embeds `TableAddItemsPanel` (inline search + category chips + per-item addon sheet) that appends straight to the table's open order via `api.orders.addItems` — appends land back on the tables view. Categories/addons fetch is gated on `builderOpen` which now also includes the tables view.
- Notifications: `NotificationsView` (components/notifications) is the single source for pending + resolved service requests with status/type filters and a per-item detail panel; it powers both the waiter Alerts tab and the shared `/dashboard/notifications` route (waiters are allowed there via the layout redirect list). The shared `Header` bell dropdown resolves table names via `useTableLabels` (the backend service-request payload has no `tableName`), closes on outside click, and links to "View All".
- Service-request `notes` from the customer order page now carry the human table label; BILL notes for cash omit the amount by design ("is about to pay with Cash at Table X"), digital notes name method + table.
- Manager/owner Orders page (`/dashboard/orders`) applies page-level filters (order type / table / payment status) via `OrdersFilterBar` and passes `ordersOverride` into `ActiveOrdersTab` / `OrderHistoryTab` (they skip their own query when the prop is present). `OrderHistoryTab` is recent-first and splits closed-but-unpaid tickets into a red "Closed but Unpaid" section so they never masquerade as settled history.

## Owner analytics

- Owner metrics in `lib/owner.ts` bucket orders by client-local day on purpose — the backend `/staff/analytics` date-casts in DB UTC and would misplace early-morning Addis orders. Keep local-instant bucketing consistent across overview + reports.
- Payment records carry inconsistent method strings (`cbe_birr` vs `cbe`); merge through `formatPaymentMethod` in `lib/owner.ts` before counting the payment mix.
- `DrilldownTrend` buckets YEAR/MONTH/WEEK up to the last bucket's **end-of-day** (23:59:59), not midnight, or final-day orders silently drop out of the chart.
- Analytics Hub tabs live in `src/components/owner/reports/`; the reports page itself is a thin tabbed shell. Staff report derives activity from `api.activityLogs.getAll` (limit 500) merged with `/users`.
- Orders carry `tableId` codes (`tbl-04`, legacy `t1`) but **no `tableName`** — display names come only from the `/tables` roster via `hooks/useTableLabels.ts`. Resolve ids lazily; if a component memoizes a customer/key map, the table labels must be in the memo deps or raw fallbacks ("Table bl-04") persist forever (this bit us in the drill dropdown). `useTableLabels` memoizes its map so the identity is stable across renders.
- Order item `selectedAddons` are raw string ids (`addon-gl-01`, UUIDs) with **no names attached** — resolve them through the `['addons']` query map with the `addonNames(addons, map)` helper in `lib/kitchen.ts` (tolerant of string[] and object[] shapes). Every ticket surface that renders addons without the map leaks raw ids (chef BatchView and dashboard KitchenOrderCard both had this bug).

## Tooling quirks

- Start the frontend dev server detached or the shell times out and kills it: `setsid nohup npx next dev -p 3001 > /tmp/yadotena-dev.log 2>&1 < /dev/null &`. Port 3000 is often taken by another process; use 3001.
- The repo's git history contains repeated automated "payment account display" commits from other sessions; always `git status` before assuming what's committed, and never stage unrelated files with `git add -A`.
