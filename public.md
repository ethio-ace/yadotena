# Public (Customer) Interface — Technical & UI Analysis

## 1. Overview & Architectural Purpose
The Public / Customer interface of **Yadotena Milk & Foods** is designed as an anonymous, view-only and table-bound QR dine-in ordering portal. 
Per business rules:
- **No public user authentication or account creation**: Customers browse digital menus, shop products, and track active tickets without logging in.
- **Strict cart partitioning**: Cart state belongs to staff POS and customer dine-in sessions; public catalog browsing is view-only until a table is scanned or selected.
- **Dual-mode catalog**: Decouples freshly prepared kitchen meals (`/menu`) from packaged over-the-counter retail products (`/shop`).

---

## 2. Page & Component Breakdown

### 2.1 Public Layout & Navigation Header (`src/app/(customer)/layout.tsx`)
- **Visual Design**: Sticky top bar with `backdrop-blur-md`, subtle border, brand logo badge, and pill-navigation buttons.
- **Header Actions**:
  - `Digital Menu` (`/menu`): Navigates to cooked food catalog.
  - `Shop Store` (`/shop`): Navigates to packaged retail products (e.g., Tomoca coffee beans, spices).
  - `Scan QR` button: Triggers `QRScannerModal` for device camera QR scanning.
  - `Track Order` dropdown: Quick lookup popover resolving 6-character ticket codes (e.g., `#84K2M1`) or full order UUIDs directly to `/order/[id]`.
  - `ThemeToggle`: Seamless dark/light theme switching.

### 2.2 Digital Menu Page (`src/app/(customer)/menu/page.tsx`)
- **Hero Banner**: Ambient gradient background featuring "Open Now" pulse badge, estimated prep time (15–25 min), and active seated table badge (if table is bound).
- **Top Dishes Row (`TopProductsRow.tsx`)**: Horizontally scrollable carousel highlighting top sellers ranked by real historical order volume (`GET /api/v1/menu/popular`).
- **Filter & Search Bar**: Real-time keyword search, sorting dropdown (`SortSelect.tsx` — Popularity, Name, Price Low/High), and scrollable category pills.
- **Menu Items Grid**: Interactive dish cards with cover images, category badges, popular tags, prep times, prices in ETB (`formatETB`), and "Order / View" CTAs.

### 2.3 Shop Store Page (`src/app/(customer)/shop/page.tsx`)
- **Retail Catalog**: Displays packaged, non-cooked goods.
- **Retail Distinction**: Items tagged as retail show "Sealed Retail Store Product" notices and disable dish-level add-ons or spice customization.

### 2.4 Dish Detail & Customization Modal (`ItemDetailModal.tsx`)
- **Dish Header**: Cover photo with price overlay and prep duration.
- **Spice Level Selector**: Visual chip selection (`Mild 🌱`, `Medium 🌶️`, `Spicy 🔥`, `Extra Hot ⚡`).
- **Add-on Customizer**: Fetches item-scoped add-ons via `api.addons.getRespectiveForMenuItem(itemId)` and allows toggling add-on options with real-time total price updating.
- **Special Request Input**: Free-text field for kitchen notes (e.g., "extra sauce", "no onions").
- **Quantity Stepper & CTA**: Controls item quantity and adds to the floating dine-in table cart.

### 2.5 Seated Table Banner & Dine-In Cart (`CustomerTableBanner.tsx`, `CustomerDineInCart.tsx`)
- **Table Banner**: Sticky top bar showing current seated table (e.g., "Seated at Table 04") with options to change table or view active ticket.
- **Floating Cart Bar**: Appears at the bottom when items are in cart, displaying total item count and running ETB total.
- **Cart Drawer**: Slides up on click. Allows quantity adjustment, removal of items, customer name entry, and ordering.
  - **New Order**: Submits `POST /api/v1/orders` bound to `tableId`.
  - **Auto-Merge / Append Round**: If an active order already exists on the table, appends items as a new round (`POST /api/v1/orders/{id}/add-items`) without overwriting previous rounds.

### 2.6 Live Order Tracking & Assistance Page (`src/app/(customer)/order/[id]/page.tsx`)
- **Ticket Header Banner**: Prominent display of 6-character ticket ID, copy code button, order type, timestamp, and status badges (`PENDING`, `PREPARING`, `READY`, `SERVED`, `COMPLETED`, `CANCELLED`).
- **Order Progress Stepper (`OrderProgressStepper.tsx`)**: Visual step indicator showing live order lifecycle progression.
- **Table Assistance Hub**:
  - `Call Waiter`: Dispatches `WAITER` service request alert to waiter dashboard.
  - `Payment & Bill`: Opens `PaymentMethodsModal` to view digital bank accounts (CBE, Telebirr, BOA) or send a `BILL` service request for cash settlement.
- **Itemized Receipt Breakdown**: Detailed list of items, quantities, add-ons, special instructions, subtotal, VAT (15%), Service Charge (10%), and total amount.
- **Digital Receipt Modal (`DigitalReceiptModal.tsx`)**: Printable/shareable digital receipt modal.

---

## 3. Data Flow & State Management
- **Context API (`CustomerDineInContext.tsx`)**: Manages `tableId`, `tableName`, `activeTableOrder`, `cart`, cart actions, and modal visibility across public routes.
- **TanStack Query**:
  - `['menu']`: Fetches full menu item catalog.
  - `['menu', 'popular']`: Fetches top seller dishes.
  - `['orders', id]`: Resolves order via `api.orders.lookup(id)` with a **5-second polling interval** for live updates.
  - `['addons', 'respective', itemId]`: Lazy-fetches applicable add-ons for the item.

---

## 4. Strengths & Implemented UI Highlights
- **Stunning Modern Aesthetics**: Dark mode integration, subtle backdrops (`backdrop-blur-md`), vibrant amber & emerald accents, smooth transitions, and custom currency formatting.
- **Seamless QR Table Binding**: URL parameters (`?table=tbl-04`) automatically bind customer sessions to the specified table.
- **Round-Based Order Appending**: Appending additional dishes to an active table creates a new kitchen round without duplicating orders or resetting kitchen prep state.

---

## 5. Audit: Issues, Edge Cases & Things That Need Fix

### 5.1 Image Fallback Dependency (UX / Offline Risk)
- **Issue**: `ItemDetailModal.tsx` contains a fallback image pointing to an external Unsplash URL (`https://images.unsplash.com/photo-1546069901-ba9599a7e63c...`). If the device loses internet access or external CDN is blocked, images render broken.
- **Fix**: Replace external URL fallback with a local SVG placeholder or bundled asset (`/images/dish-placeholder.png`).

### 5.2 Add-on Payload String Normalization (Data Consistency Bug)
- **Issue**: In `CustomerDineInCart.tsx`, `handleSubmitOrder` maps selected add-ons using `a.name || a.id`. Mixing names and IDs in add-on payloads can cause resolution mismatches on kitchen boards when matching against the add-on ID map.
- **Fix**: Consistently pass `a.id` in `selectedAddons` payloads.

### 5.3 Service Request State Reset on Refresh (UX Glitch)
- **Issue**: On `/order/[id]`, clicking "Call Waiter" sets a 12-second local state flag (`waiterCalled = true`). Refreshing the browser page clears this state immediately, allowing duplicate waiter calls to be sent.
- **Fix**: Persist recent service request timestamps in `sessionStorage` or check active service requests from `api.serviceRequests`.

### 5.4 Public Order Tracking Polling Overhead (Performance)
- **Issue**: `/order/[id]` uses a strict 5000ms HTTP polling interval. For completed or cancelled orders, polling continues indefinitely until the tab is closed.
- **Fix**: Disable `refetchInterval` when `order.status` reaches terminal states (`COMPLETED` or `CANCELLED`).

### 5.5 Mobile Header Overflow on Small Screen Widths (Layout Glitch)
- **Issue**: On mobile devices with screen widths below 360px (e.g. older iPhones), header button text ("Digital Menu", "Shop Store", "Track Order") causes horizontal scrolling or text clipping.
- **Fix**: Use icon-only buttons with tooltips or collapsible mobile hamburger drawer for screen widths `< 380px`.

---

## 6. Actionable Fix Summary Table

| Category | Component | Problem Description | Recommended Solution |
| :--- | :--- | :--- | :--- |
| **Asset Fallback** | `ItemDetailModal.tsx` | External Unsplash URL used as fallback image | Replace with local `/images/placeholder.svg` |
| **Data Integrity** | `CustomerDineInCart.tsx` | Add-on array mixes names and string IDs | Map strictly to `addon.id` |
| **UX / Spam Guard** | `order/[id]/page.tsx` | Service request button timeout resets on refresh | Save cooldown timestamp to `sessionStorage` |
| **Performance** | `order/[id]/page.tsx` | Terminal orders (`COMPLETED`) continue polling every 5s | Set `refetchInterval: isTerminal ? false : 5000` |
| **Responsiveness** | `layout.tsx` | Header actions crowd small screens (`<360px`) | Add mobile drawer or responsive text truncation |
