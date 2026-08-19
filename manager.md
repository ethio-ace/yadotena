# Manager Workspace — Technical & UI Analysis

## 1. Overview & Architectural Purpose
The Manager Workspace (`/dashboard/manager` and associated sub-routes) serves as the operational nerve center for store managers at **Yadotena Milk & Foods**.
Key Responsibilities:
- **Real-Time Floor & Order Supervision**: Monitoring active orders, floor table status, service alerts, and dispatch readiness.
- **Catalog & Inventory Control**: Managing menu dishes, add-ons, pricing, availability toggles, and stock levels.
- **Operations & Financial Auditing**: Logging operational expenses, viewing activity audit logs, generating QR table codes, and printing physical menus.

---

## 2. Page & Sub-Route Breakdown

### 2.1 Main Manager Dashboard (`/dashboard/manager`)
- **Manager Chrome (`ManagerSidebar.tsx` & `ManagerHeader.tsx`)**: Collapsible left sidebar with role navigation (`managerNavGroups`), user profile badge, attention count indicator, and mobile drawer toggle.
- **Manager Overview Surface (`ManagerOverview.tsx`)**:
  - `AttentionCenter`: Prominently flags urgent items (overdue kitchen tickets >20 min, unpaid closed tickets, pending table service requests, out-of-stock items).
  - `TodaySummary`: Real-time KPI summary (today's revenue, active table count, order volume, open service requests).
  - `LiveTickets`: Feed of active kitchen tickets with progress stages.
  - `StockWatch`: Instant stock availability monitor with one-click toggles.
  - `QuickActions`: Fast shortcuts to place order, add expense, edit menu, or open table setup.

### 2.2 Live Orders Management (`/dashboard/orders`)
- **Code-Split Tabbed Interface**:
  - `Active Tickets` (`ActiveOrdersTab.tsx`): Real-time grid of pending/preparing orders.
  - `Ready & Dispatch` (`ReadyDeliveryPane.tsx`): Dedicated pane for dispatching ready dine-in, takeaway, or delivery tickets.
  - `+ Place Order POS` (`PlaceOrderTab.tsx`): Integrated cashier/manager point-of-sale order builder.
  - `Order History Log` (`OrderHistoryTab.tsx`): Historical order log with separate "Closed but Unpaid" warning section.
- **Global Filter Bar (`OrdersFilterBar.tsx`)**: Filters orders by order type (`DINE_IN`, `TAKEAWAY`, `DELIVERY`), specific table, or payment status across all tabs.

### 2.3 Tables Setup & QR Management (`/dashboard/tables`)
- **Table Roster Grid**: Grid of dining tables displaying capacity, status (`AVAILABLE`, `OCCUPIED`, `RESERVED`, `MAINTENANCE`), active ticket, and action buttons.
- **QR Code Modal (`TableQRModal.tsx`)**: Generates printable QR codes bound to table IDs for customer self-ordering (`/menu?table=tbl-04`). Includes download and print options.

### 2.4 Menu Catalog Management (`/dashboard/menu`)
- **Menu Editor Grid**: Displays cooked dishes and retail products with image thumbnails, price tags, category badges, prep times, and availability switches.
- **Item Modal (`MenuItemModal.tsx`)**: Drawer for adding/editing items (name, category, price, description, prep time, dietary tags, image upload, custom add-ons).
- **Category Modal (`CategoryManageModal.tsx`)**: Reorder, add, or edit menu category icons and names.

### 2.5 Expenses Management (`/dashboard/expenses`)
- Form to log daily operational costs (ingredients, utilities, staff stipends) with amount, category, description, and date.
- Expense history list with category filter pills and total cost aggregations.

### 2.6 Notifications & Table Service Center (`/dashboard/notifications`)
- Centralized view (`NotificationsView.tsx`) for table service requests (`WAITER` calls, `BILL` payment assistance).
- Allows managers to resolve requests with staff notes and filter by status (`PENDING`, `RESOLVED`).

### 2.7 Activity & Audit Logs (`/dashboard/activity`)
- Comprehensive audit viewer (`ActivityLogsViewer.tsx`) tracking all staff actions (order creation, status changes, payment settlements, menu edits).
- Filterable by actor, action type, date range, and text search.

### 2.8 Printable Physical Menu (`/dashboard/print-menu`)
- Clean, print-optimized CSS layout for generating physical restaurant paper menus directly from the live menu database.

---

## 3. Data Flow & State Management
- **Custom Hook (`useManagerOps.ts`)**: Aggregates state and queries across manager modules:
  - `['orders']`, `['tables']`, `['menu']`, `['categories']`, `['expenses']`, `['serviceRequests']`, `['activityLogs']`.
- **Navigation State (`useSidebarCollapse.ts`)**: Persists sidebar collapsed state in `localStorage`.
- **Code-Splitting (`next/dynamic`)**: Heavy tab surfaces on the orders page are dynamic imports to optimize initial page loading.

---

## 4. Strengths & Implemented UI Highlights
- **High Operational Visibility**: Centralized `AttentionCenter` prevents revenue loss by highlighting unpaid closed tickets and delayed orders immediately.
- **Unified Filter Bar**: Selecting a table in `OrdersFilterBar` filters all active, ready, and historical tickets simultaneously.
- **Responsive Layout Safety**: Adheres strictly to layout padding rules (no double padding on shell routes).

---

## 5. Audit: Issues, Edge Cases & Things That Need Fix

### 5.1 Uncapped Attention Center Height (UI Overflow Bug)
- **Issue**: In `ManagerOverview.tsx`, if multiple service requests or overdue orders accumulate, `AttentionCenter` grows indefinitely vertically, pushing `LiveTickets` and `StockWatch` far below the fold.
- **Fix**: Add `max-h-80 overflow-y-auto` to the Attention Center card list container.

### 5.2 Table QR Code Base URL Configuration (QR Resolution Issue)
- **Issue**: In `TableQRModal.tsx`, QR code URL generation defaults to `window.location.origin`. In local dev environments (`localhost:3001`), generated QR codes scanned on a physical mobile phone fail to connect because `localhost` points to the phone itself.
- **Fix**: Add `NEXT_PUBLIC_APP_URL` environment variable override to construct public-facing QR URLs.

### 5.3 Image Upload Fallback in Menu Item Drawer (Form Bug)
- **Issue**: When creating a new menu item in `MenuItemModal.tsx`, if an image file upload to `/api/v1/upload` fails or is skipped, saving the item leaves `image` null without applying default dish SVG graphics.
- **Fix**: Assign default category SVG graphic path when `image` is null on submit.

### 5.4 Print CSS Page Break Truncation in Print Menu (Print Styling Bug)
- **Issue**: On `/dashboard/print-menu`, printing multi-page menus can split category headers across page breaks (category title on bottom of page 1, items on top of page 2).
- **Fix**: Apply `break-inside-avoid` and `page-break-inside: avoid` CSS classes to category grouping wrappers.

---

## 6. Actionable Fix Summary Table

| Category | Component | Problem Description | Recommended Solution |
| :--- | :--- | :--- | :--- |
| **UI Layout** | `AttentionCenter.tsx` | Uncapped list height pushes dashboard widgets off-screen | Set `max-h-80 overflow-y-auto` scroll container |
| **QR Code** | `TableQRModal.tsx` | QR code uses `localhost` origin in local testing | Use `NEXT_PUBLIC_APP_URL` fallback for QR host |
| **Form Integrity**| `MenuItemModal.tsx` | Missing image leaves null reference in menu item object | Fallback to category default image path on submit |
| **Print CSS** | `/print-menu/page.tsx` | Category sections split awkwardly across print pages | Add `break-inside-avoid` to category blocks |
