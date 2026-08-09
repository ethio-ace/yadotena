# Graph Report - yadotena-frontend  (2026-08-09)

## Corpus Check
- Corpus is ~29,831 words - fits in a single context window. You may not need a graph.

## Summary
- 225 nodes · 322 edges · 21 communities detected
- Extraction: 84% EXTRACTED · 16% INFERRED · 1% AMBIGUOUS · INFERRED: 50 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Menu Item Modals|Menu Item Modals]]
- [[_COMMUNITY_API Client Layer|API Client Layer]]
- [[_COMMUNITY_Staff Admin Pages|Staff Admin Pages]]
- [[_COMMUNITY_UI Primitives|UI Primitives]]
- [[_COMMUNITY_Live Ops Shell|Live Ops Shell]]
- [[_COMMUNITY_Tables QR Utils|Tables QR Utils]]
- [[_COMMUNITY_Order Creation UX|Order Creation UX]]
- [[_COMMUNITY_HTTP Fetch Core|HTTP Fetch Core]]
- [[_COMMUNITY_Staff Auth Login|Staff Auth Login]]
- [[_COMMUNITY_Kitchen Audio Alerts|Kitchen Audio Alerts]]
- [[_COMMUNITY_Customer Session|Customer Session]]
- [[_COMMUNITY_Root Theme Layout|Root Theme Layout]]
- [[_COMMUNITY_Table Labeling|Table Labeling]]
- [[_COMMUNITY_Default SVG Icons|Default SVG Icons]]
- [[_COMMUNITY_Next Brand Assets|Next Brand Assets]]
- [[_COMMUNITY_Agent Docs|Agent Docs]]
- [[_COMMUNITY_Card Header|Card Header]]
- [[_COMMUNITY_Card Title|Card Title]]
- [[_COMMUNITY_Card Description|Card Description]]
- [[_COMMUNITY_Card Content|Card Content]]
- [[_COMMUNITY_Card Footer|Card Footer]]

## God Nodes (most connected - your core abstractions)
1. `api client` - 42 edges
2. `Badge()` - 20 edges
3. `formatETB()` - 17 edges
4. `api client facade` - 13 edges
5. `Sidebar navItems role map` - 13 edges
6. `SoundNotificationProvider()` - 11 edges
7. `MenuItemModal` - 10 edges
8. `CreateOrderModal` - 8 edges
9. `cn()` - 7 edges
10. `Header` - 7 edges

## Surprising Connections (you probably didn't know these)
- `eslintConfig` --conceptually_related_to--> `Next.js wordmark SVG`  [AMBIGUOUS]
  yadotena-frontend/eslint.config.mjs → yadotena-frontend/public/next.svg
- `getStatusBadge()` --semantically_similar_to--> `getStatusConfig()`  [INFERRED] [semantically similar]
  src/app/(dashboard)/dashboard/orders/page.tsx → src/app/(dashboard)/dashboard/tables/page.tsx
- `useCartStore` --semantically_similar_to--> `CheckoutPage`  [AMBIGUOUS] [semantically similar]
  yadotena-frontend/src/stores/cartStore.ts → yadotena-frontend/src/app/(customer)/checkout/page.tsx
- `handleRequestBill()` --calls--> `formatETB()`  [INFERRED]
  src/app/(customer)/order/[id]/page.tsx → src/lib/currency.ts
- `DashboardLayout()` --conceptually_related_to--> `Sidebar`  [INFERRED]
  src/app/(dashboard)/layout.tsx → src/components/layout/Sidebar.tsx

## Hyperedges (group relationships)
- **Authenticated dashboard shell composition** — dashboard_layout_dashboardlayout, layout_sidebar_sidebar, layout_header_header, contexts_soundnotificationcontext_soundnotificationprovider [EXTRACTED 1.00]
- **Live ops polling and recurring sound alerts** — contexts_soundnotificationcontext_soundnotificationprovider, layout_header_header, kitchen_page_kitchendashboard, dashboard_waiterdashboard_waiterdashboard, lib_audioalerts_soundalertmanager_playneworderchime, lib_audioalerts_soundalertmanager_playwaitercallchime [INFERRED 0.85]
- **Staff POS order creation across floor and orders** — orders_page_orderspage, tables_page_tablespage, dashboard_createordermodal_createordermodal, dashboard_createordermodal_handlesubmit [EXTRACTED 1.00]
- **Dashboard menu management modals** — categorymanagemodal_categorymanagemodal, dishdetailmodal_dishdetailmodal, menuitemmodal_menuitemmodal [INFERRED 0.95]
- **shadcn-style UI primitives via cn** — badge_badge, button_button, card_card, input_input, utils_cn [INFERRED 0.95]
- **Default Next.js placeholder public SVGs** — file_file_svg, globe_globe_svg, next_next_svg, vercel_vercel_svg, window_window_svg [EXTRACTED 1.00]

## Communities

### Community 0 - "Menu Item Modals"
Cohesion: 0.08
Nodes (6): DishDetailModal(), handleRequestBill(), formatETB(), getStatusBadge(), statusBadge(), Badge()

### Community 1 - "API Client Layer"
Cohesion: 0.11
Nodes (28): api client facade, buildPlaceBody, API_V1 base URL, Browser same-origin API proxy, loadPublicMenu, Staff-then-public API fallback, AuthProvider, useCartStore (+20 more)

### Community 2 - "Staff Admin Pages"
Cohesion: 0.14
Nodes (16): CustomersPage, DashboardPage, KpiCard, AddUserModal, EditUserModal, EmployeesPage, ExpensesPage, Sidebar navItems role map (+8 more)

### Community 3 - "UI Primitives"
Cohesion: 0.15
Nodes (21): Badge, badgeVariants, Button, buttonVariants, Card, CategoryManageModal, EMOJI_PRESETS, getDishCount (+13 more)

### Community 4 - "Live Ops Shell"
Cohesion: 0.18
Nodes (11): SoundNotificationProvider(), useSoundNotifications(), DashboardLayout(), Live order/service polling alerts, Role-gated dashboard shell, WaiterDashboard, KitchenDashboard, KitchenOrderCard (+3 more)

### Community 5 - "Tables QR Utils"
Cohesion: 0.15
Nodes (5): TableQRModal(), cn(), getStatusConfig(), TableCard, TablesPage

### Community 6 - "Order Creation UX"
Cohesion: 0.2
Nodes (6): handleAdd(), ItemDetailModal, CreateOrderModal, handleAddItem(), handleSubmit(), Staff POS order creation flow

### Community 7 - "HTTP Fetch Core"
Cohesion: 0.23
Nodes (6): ApiError, apiFetch(), apiFetchServer(), resolveToken(), loadPublicMenu(), resolveCategoryId()

### Community 8 - "Staff Auth Login"
Cohesion: 0.27
Nodes (10): authOptions (NextAuth), Credentials authorize (phone+PIN), JWT session strategy, Demo staff accounts, LoginPage, Role-based dashboard redirect, NextAuth Session/JWT extensions, NextAuth route handler (+2 more)

### Community 9 - "Kitchen Audio Alerts"
Cohesion: 0.33
Nodes (7): playActionPing, playNewOrderChime, playWaiterCallChime, SoundAlertManager, soundAlerts singleton, unlockAudio, Zero-dependency Web Audio restaurant alerts

### Community 10 - "Customer Session"
Cohesion: 0.5
Nodes (1): SessionManager()

### Community 11 - "Root Theme Layout"
Cohesion: 0.5
Nodes (1): ThemeProvider()

### Community 12 - "Table Labeling"
Cohesion: 0.67
Nodes (3): SessionManager, SessionManagerInner, tableLabel

### Community 13 - "Default SVG Icons"
Cohesion: 0.67
Nodes (3): Default Next.js file icon SVG, Default Next.js globe icon SVG, Default Next.js window/browser icon SVG

### Community 14 - "Next Brand Assets"
Cohesion: 0.67
Nodes (3): eslintConfig, Next.js wordmark SVG, Vercel triangle logo SVG

### Community 20 - "Agent Docs"
Cohesion: 1.0
Nodes (2): Next.js agent rules (local docs first), CLAUDE.md AGENTS pointer

### Community 31 - "Card Header"
Cohesion: 1.0
Nodes (1): CardHeader

### Community 32 - "Card Title"
Cohesion: 1.0
Nodes (1): CardTitle

### Community 33 - "Card Description"
Cohesion: 1.0
Nodes (1): CardDescription

### Community 34 - "Card Content"
Cohesion: 1.0
Nodes (1): CardContent

### Community 35 - "Card Footer"
Cohesion: 1.0
Nodes (1): CardFooter

## Ambiguous Edges - Review These
- `useCartStore` → `CheckoutPage`  [AMBIGUOUS]
  yadotena-frontend/src/stores/cartStore.ts · relation: semantically_similar_to
- `eslintConfig` → `Next.js wordmark SVG`  [AMBIGUOUS]
  yadotena-frontend/eslint.config.mjs · relation: conceptually_related_to

## Knowledge Gaps
- **39 isolated node(s):** `Next.js agent rules (local docs first)`, `CLAUDE.md AGENTS pointer`, `buildPlaceBody`, `Staff-then-public API fallback`, `ApiError` (+34 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Customer Session`** (4 nodes): `SessionManager()`, `SessionManagerInner()`, `layout.tsx`, `SessionManager.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Root Theme Layout`** (4 nodes): `RootLayout()`, `ThemeProvider()`, `layout.tsx`, `theme-provider.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Agent Docs`** (2 nodes): `Next.js agent rules (local docs first)`, `CLAUDE.md AGENTS pointer`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Card Header`** (1 nodes): `CardHeader`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Card Title`** (1 nodes): `CardTitle`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Card Description`** (1 nodes): `CardDescription`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Card Content`** (1 nodes): `CardContent`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Card Footer`** (1 nodes): `CardFooter`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `useCartStore` and `CheckoutPage`?**
  _Edge tagged AMBIGUOUS (relation: semantically_similar_to) - confidence is low._
- **What is the exact relationship between `eslintConfig` and `Next.js wordmark SVG`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `api client` connect `Staff Admin Pages` to `Menu Item Modals`, `Live Ops Shell`, `Tables QR Utils`, `Order Creation UX`, `Customer Session`?**
  _High betweenness centrality (0.143) - this node is a cross-community bridge._
- **Why does `Badge()` connect `Menu Item Modals` to `Staff Admin Pages`, `Live Ops Shell`, `Tables QR Utils`, `Order Creation UX`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **Why does `SoundNotificationProvider()` connect `Live Ops Shell` to `Staff Admin Pages`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **What connects `Next.js agent rules (local docs first)`, `CLAUDE.md AGENTS pointer`, `buildPlaceBody` to the rest of the system?**
  _39 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Menu Item Modals` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._