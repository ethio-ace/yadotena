# AGENTS.md — Yadotena

Non-obvious facts that reading the code won't reveal. Keep entries terse.

## Layout & routing

- `(dashboard)/layout.tsx` owns shared chrome (sidebar + header + `p-3 sm:p-4 md:p-6` padding). Shell routes (`/dashboard/manager`, `/dashboard/owner`, `/dashboard/kitchen`) render their own full-screen chrome and the layout skips padding for them — **never** add page-level `p-4 md:p-8` wrappers to shared-chrome pages or you double the padding (this was the "view is very large" bug on the orders page).
- The one source of truth for role nav is `src/lib/nav.ts` (`managerNavGroups`, `ownerNavGroups`, `waiterNavGroups`). Shell sidebars and the shared `Sidebar` both render from it; sidebar collapse is persisted via `hooks/useSidebarCollapse.ts` (localStorage).

## Customer (public) flow

- Customers are **view-only by design** (per the owner): the public menu/shop pages must not offer login, ordering, or a cart. `ItemDetailModal` deliberately has no add-to-cart button. Don't add cart UI to customer pages.

## Owner analytics

- Owner metrics in `lib/owner.ts` bucket orders by client-local day on purpose — the backend `/staff/analytics` date-casts in DB UTC and would misplace early-morning Addis orders. Keep local-instant bucketing consistent across overview + reports.
- Payment records carry inconsistent method strings (`cbe_birr` vs `cbe`); merge through `formatPaymentMethod` in `lib/owner.ts` before counting the payment mix.
- `DrilldownTrend` buckets YEAR/MONTH/WEEK up to the last bucket's **end-of-day** (23:59:59), not midnight, or final-day orders silently drop out of the chart.
- Analytics Hub tabs live in `src/components/owner/reports/`; the reports page itself is a thin tabbed shell. Staff report derives activity from `api.activityLogs.getAll` (limit 500) merged with `/users`.

## Tooling quirks

- Start the frontend dev server detached or the shell times out and kills it: `setsid nohup npx next dev -p 3001 > /tmp/yadotena-dev.log 2>&1 < /dev/null &`. Port 3000 is often taken by another process; use 3001.
- The repo's git history contains repeated automated "payment account display" commits from other sessions; always `git status` before assuming what's committed, and never stage unrelated files with `git add -A`.
