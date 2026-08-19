# Chef & Kitchen (KDS) Interface — Technical & UI Analysis

## 1. Overview & Architectural Purpose
The Kitchen Display System (KDS) at `/dashboard/kitchen` serves as the high-throughput "Air Traffic Control" center for Yadotena's kitchen stations.
Core KDS Architecture Rules:
- **Rounds are the unit of work, not whole orders**: Every order item carries a `round_number` (1 = original order, 2+ = appended later) and its own kitchen status (`PENDING` → `PREPARING` → `READY` → `SERVED` / `CANCELLED`).
- **Derived order status**: The overall order status is strictly derived from its item statuses (`READY` wins over `PREPARING` over `PENDING`).
- **Calm, High-Contrast Palette**: Dark zinc base (`bg-zinc-950`), single amber accent (`amber-500` for NEW column, prep start CTAs, and timers), neutral zinc for PREPARING, muted emerald for READY, and red exclusively for overdue URGENT cards (>15 min).

---

## 2. Component & Layout Breakdown

### 2.1 KDS Header (`ChefHeader.tsx`)
- **Station Info**: Chef/Station name display (`chefName`), live WebSocket connection status dot.
- **Queue Counters**: Summary badges showing `NEW` (Pending), `PREP` (Preparing), `READY` (Ready for Pickup), and `OVERDUE` count.
- **View Switcher Tabs**:
  - `QUEUE`: Full 3-column Kanban board.
  - `NEW`: Focused view for incoming unstarted tickets.
  - `PREP`: Focused view for active cooking dishes.
  - `READY`: Pickup queue for waiters.
  - `BATCH`: Consolidated item aggregator (sums total quantities per dish across active rounds).
  - `HISTORY`: Log of today's completed and served kitchen tickets.
- **Sound Toggle Button**: Persistent audio alert toggle (`kds.sound` in `localStorage`).

### 2.2 Main KDS Kanban Board (`KitchenBoard.tsx` & `KitchenColumn.tsx`)
- **Three-Column Layout**:
  1. `NEW / PENDING` (Amber header accent, `START PREPARING` primary action button).
  2. `PREPARING` (Zinc header accent, `MARK READY` action button).
  3. `READY FOR PICKUP` (Emerald header accent, `SERVE` action button).
- **Empty States (`KitchenEmptyState.tsx`)**: Clean empty state graphics when columns have no active rounds.

### 2.3 Kitchen Round Card (`KitchenOrderCard.tsx`)
- **Card Header**: Ticket number (e.g. `#84K2M1`), table label (resolved via `useTableLabels`), order type badge (`DINE_IN`, `TAKEAWAY`), and round badge (`Round 1 · Initial` or `Round 2 · Added later`).
- **Live Elapsed Timer**: Dynamic counter showing elapsed prep time. Turns red (`border-red-500/80 bg-red-950/20`) when prep time exceeds 15 minutes (`isCardOverdue`).
- **Dish & Add-on List**:
  - Quantity multipliers (`2×`).
  - Dish names in bold high-contrast text.
  - Resolved add-on names using `addonMap` (resolves raw IDs like `addon-gl-01` to human names like "Extra Butter").
  - Highlighted special instructions box (e.g., `"No onions, extra spicy"`).
- **Round Action Button**: Full-width action CTA (`START PREPARING`, `MARK READY`, `SERVE`) with optimistic loading spinner (`updatingKey`).

### 2.4 Aggregated Batch View (`BatchView.tsx`)
- Groups identical menu items across all active kitchen rounds.
- Displays total count needing prep (e.g., "12x Special Doro Wot across 4 tables") so line cooks can batch prep efficiently.

### 2.5 Ticket Inspection Sheet (`OrderDetailSheet.tsx`)
- Slide-over drawer providing full order context, complete round history, payment status, customer notes, and per-round action buttons.

### 2.6 Realtime Connection Monitor (`KitchenConnectionStatus.tsx`)
- Displays Ably WebSocket state (`connected`, `connecting`, `disconnected`, `suspended`).
- Shows subtle top banner when polling fallback is active, with a manual "Refresh Feed" button.

---

## 3. Data Flow, State Management & Real-Time Sync
- **Ably Realtime Sync (`useAblySync`)**: Subscribes to backend order events for instant ticket arrival without page refresh.
- **Polling Fallback**: If Ably WebSocket drops (`connectionDown`), KDS gracefully falls back to 3-second HTTP polling.
- **Optimistic Kitchen Transitions (`kitchenMutation`)**:
  - Executes `POST /api/v1/orders/{id}/kitchen` with `{ roundNumber, action }`.
  - Instantly updates local TanStack Query cache (`['orders']`) for 0ms visual latency.
  - Automatically rolls back and displays a transient notice banner (`setNotice`) if concurrency conflicts occur (e.g., another chef station already completed the round).
- **Sound Alert Engine (`lib/audioAlerts.ts`)**:
  - Fresh incoming round: `playNewOrder()` chime + 12-second visual glow (`newCardKeys`).
  - Dish marked ready: `playOrderReady()` ("Ding-ding!" bell).
  - Round completed/served: `playOrderCompleted()`.

---

## 4. Strengths & Implemented UI Highlights
- **Air Traffic Control Speed**: Touch-optimized 48px+ buttons, high-contrast dark UI for kitchen lighting environments, clear round partitioning, and instant audio feedback.
- **Raw Add-on Resolution**: Eliminates cryptic database add-on IDs by mapping them through `addonMap` across all cards and batch views.
- **Concurrency-Safe Operations**: Round-scoped transitions prevent re-opening completed work when waiters append items to active tables.

---

## 5. Audit: Issues, Edge Cases & Things That Need Fix

### 5.1 Client Clock Drift in Overdue Timers (Timer Accuracy Bug)
- **Issue**: Elapsed time calculation in `KitchenOrderCard.tsx` compares `Date.now()` with `order.createdAt`. If the kitchen terminal's system clock is skewed by a few minutes, timers show negative minutes or premature "URGENT" overdue warnings.
- **Fix**: Calculate elapsed duration using server timestamp delta (`serverNow - createdAt`) or sync server time offset on initial fetch.

### 5.2 Special Instruction Loss in Batch View (Batch Grouping Bug)
- **Issue**: `BatchView.tsx` aggregates total quantities strictly by menu item name. If Table 1 wants "Doro Wot (Extra Spicy)" and Table 3 wants "Doro Wot (No Spice)", `BatchView` sums them as `2× Doro Wot` without highlighting contradictory special instructions.
- **Fix**: Sub-group items in `BatchView` by unique combination of `specialInstructions` and `selectedAddons`.

### 5.3 Optimistic Round Array Reference Equality (UI Flicker)
- **Issue**: In `kitchenMutation.onMutate`, updating item status creates new item objects inside the order, but doesn't force re-evaluation of `useMemo` in parent views if the order array identity isn't recreated cleanly, causing brief visual stutter on rapid taps.
- **Fix**: Ensure `queryClient.setQueryData` returns a freshly shallow-copied array of orders.

### 5.4 Thermal Kitchen Ticket (KOT) Printing Action (Missing Feature)
- **Issue**: KDS cards currently lack a dedicated "Print KOT" action button for kitchens using physical paper slip printers alongside touch screens.
- **Fix**: Add a small printer icon button on `KitchenOrderCard` to trigger silent web thermal slip printing.

---

## 6. Actionable Fix Summary Table

| Category | Component | Problem Description | Recommended Solution |
| :--- | :--- | :--- | :--- |
| **Timer Sync** | `KitchenOrderCard.tsx` | Local client clock drift causes negative timer values | Sync server-client clock offset on initial response |
| **Batch View** | `BatchView.tsx` | Batching ignores item-level special instructions | Group by `menuItemId` + `specialInstructions` hash |
| **State Sync** | `page.tsx` | Optimistic update shallow ref equality causes minor UI stutter | Ensure immutable deep array copy on `setQueryData` |
| **Hardware** | `KitchenOrderCard.tsx` | Missing physical Kitchen Order Ticket (KOT) print action | Add thermal receipt print action button |
