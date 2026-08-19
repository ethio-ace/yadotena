# Waiter Workspace — Technical & UI Analysis

## 1. Overview & Architectural Purpose
The Waiter Workspace (`/dashboard/waiter`) is high-speed POS software built for floor staff in busy restaurant environments.
Key Architectural Principles:
- **Unified Table Experience**: Selecting a table from the floor strip or tables grid opens ONE shared `TableDetailView` with an always-open right rail (`TableAddItemsPanel`).
- **Live Active-Order Table Resolution**: Table occupancy is derived directly from live active orders via `findActiveOrderForTable`, eliminating stale table statuses.
- **Audio-Visual Service Request Center**: Real-time alerts for customer table calls and bill requests with sound notifications.

---

## 2. Views & Component Structure

### 2.1 Waiter Navigation Chrome (`WaiterSidebar.tsx`)
- **Desktop Sidebar**: Vertical left sidebar providing quick navigation:
  - `Home` (`WaiterView: "home"`)
  - `Tables` (`WaiterView: "tables"`)
  - `Orders` (`WaiterView: "orders"`)
  - `Alerts` (`WaiterView: "alerts"`) with live pending request count badge.
- **Mobile Navigation**: Horizontal bottom navigation strip (`flex flex-col md:flex-row` page shell pattern) preserving full responsive usability on smartphones.

### 2.2 Waiter Home Surface (`WaiterHome.tsx`)
- **Greeting & Key Metrics Strip**: Displays active orders, busy table count, unpaid bills count, and flashing alert pill for pending table calls.
- **Quick-Action Hero CTAs**:
  - `+ Café Order`: Launches food & beverage order builder (`CafeOrderBuilder`).
  - `+ Shop Sale`: Launches retail packaged goods order builder (direct counter checkout mode).
- **Live Floor Grid**: Interactive table cards grouped by busy vs available. Occupied tables display live order total and 6-character ticket ID (`#936827`).
- **Needs Attention Bar**: Quick-access cards for "Ready to Serve" items, "Unpaid Bills", and "Customer Table Calls".

### 2.3 Tables Grid View (`TablesView.tsx`)
- Comprehensive layout of all restaurant dining tables showing capacity, status (Available, Occupied, Reserved, Maintenance), current bill total, and active ticket IDs.

### 2.4 Unified Table Detail & Item Append View (`TableDetailView.tsx` & `TableAddItemsPanel.tsx`)
- **Left Column**: Live active order progress stepper, item list with round markers ("Added later · Round N"), special instructions, and financial breakdown.
- **Action Buttons**:
  - `Settle Bill`: Opens `PaymentSettlementModal`.
  - `View Ticket`: Opens full `OrderDetailsModal`.
  - `New Order`: Clears active selection to start a fresh ticket.
- **Right Rail (`TableAddItemsPanel.tsx`)**:
  - Search bar + horizontal category filter chips.
  - Dish cards with **Quick Add** (+/- quantity stepper) vs **Customize** (opens add-on modal).
  - Pinned bottom summary bar showing selected items, running price, and big submit button ("Add N to Order #936827").

### 2.5 Order Builder (`CafeOrderBuilder.tsx`)
- Handles new dine-in/takeaway orders and retail shop sales.
- Features category pills, live dish search, customizable add-ons, and a collapsible current-order rail showing active table items.
- Floating bottom cart bar with drawer review before final submission.

### 2.6 Orders Board & Dispatch (`OrdersBoard.tsx`)
- Tabbed interface (`ACTIVE`, `READY`, `UNPAID`, `COMPLETED`).
- Allows waiters to mark ready items as `SERVED`, complete settled orders, or initiate payment settlement.

### 2.7 Table Service Request Center (`AlertsView.tsx`)
- Filterable queue (`ALL`, `WAITER`, `BILL`) for table calls.
- One-click resolution triggering context-aware audio alerts (`playWaiterCall` / `playBillRequest`).

---

## 3. Data Flow & State Management
- **TanStack Query Keys**:
  - `['tables']`: Live dining table roster.
  - `['orders']`: All restaurant orders (polled or updated via workspace events).
  - `['menu']`: Full menu items catalog.
  - `['categories']` & `['addons']`: Enabled when order builder is open (`builderOpen`).
  - `['serviceRequests']`: Customer assistance queue.
- **Audio Feedback (`lib/audioAlerts.ts`)**: Triggers audio feedback for order submission (`playActionConfirm`), bill resolution (`playBillRequest`), and errors (`playError`).
- **Inline Toasts**: Top-centered floating feedback toast (`setToast`) prevents intrusive `alert()` modals during fast POS entry.

---

## 4. Strengths & Implemented UI Highlights
- **High-Density Touch Targets**: Big rounded buttons (`rounded-2xl`, `h-12`), bold typography, and visual color coding (Amber for active/new, Emerald for ready/paid, Rose for unpaid/urgent).
- **Concurrency-Safe Append**: Adding items appends to existing orders via `api.orders.addItems` instead of replacing tickets.
- **Responsive Fluidity**: Smooth transitions between table detail, order builder, and dispatch tabs without page reloads.

---

## 5. Audit: Issues, Edge Cases & Things That Need Fix

### 5.1 Web Audio Context Lockout on Mobile iOS (Audio Alert Bug)
- **Issue**: `soundAlerts` attempts to play audio alerts during mutations. On mobile browsers (Safari/Chrome on iOS), if the user hasn't explicitly tapped an audio-unlock element, audio context throws `NotAllowedError: AudioContext was not allowed to start`.
- **Fix**: Bind `soundAlerts.unlockAudio()` to initial tap events anywhere on the waiter sidebar and top bar.

### 5.2 Add-on Payload String ID Resolution (API Payload Bug)
- **Issue**: `handleSubmitOrder` in `WaiterWorkspacePage.tsx` maps `selectedAddons: i.addons.map((a) => a.id || a.name)`. If an add-on object has name instead of ID, it passes raw names.
- **Fix**: Guarantee `a.id` is populated in add-on selector data structures.

### 5.3 Stale Table Status Handling (Edge Case)
- **Issue**: If an order was settled by cashier outside the waiter flow and marked `COMPLETED`, but the table's stored DB status remains `OCCUPIED` due to backend trigger delay, `findActiveOrderForTable` correctly returns `undefined`, but table card shows empty active order.
- **Fix**: Ensure table card click explicitly defaults to "Start New Order" when `findActiveOrderForTable` returns null.

### 5.4 Mobile Bottom Gesture Bar Clipping (UI Glitch)
- **Issue**: On mobile devices with bottom gesture bars (e.g., iPhone Home Bar), `WaiterSidebar` bottom strip can overlap with device navigation controls.
- **Fix**: Add `pb-safe` or `pb-4` bottom padding to mobile bottom navigation container.

### 5.5 High-Volume Order Performance in OrdersBoard (Performance)
- **Issue**: `OrdersBoard.tsx` renders all active and history orders without pagination or virtual scrolling. If active order count exceeds 100, board rendering experiences slight lag.
- **Fix**: Implement virtual scrolling or limit initial active orders display to 30 items with a "Load More" button.

---

## 6. Actionable Fix Summary Table

| Category | Component | Problem Description | Recommended Solution |
| :--- | :--- | :--- | :--- |
| **Audio Alert** | `WaiterWorkspacePage.tsx` | Mobile web browser blocks audio playback | Call `soundAlerts.unlockAudio()` on first screen tap |
| **Payload Integrity**| `WaiterWorkspacePage.tsx` | Add-on mapping falls back to raw string names | Pass strict `addon.id` string |
| **State Resolution** | `TablesView.tsx` | Stale `OCCUPIED` DB flag on table with no active order | Force "Start New Order" CTA when order is undefined |
| **Mobile Layout** | `WaiterSidebar.tsx` | Mobile bottom bar clips on iOS gesture bar | Add `pb-[env(safe-area-inset-bottom)]` wrapper class |
| **Performance** | `OrdersBoard.tsx` | Rendering >100 orders causes DOM layout delay | Add 30-item pagination window |
