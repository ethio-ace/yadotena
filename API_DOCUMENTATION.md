# Yadotena POS Backend API Documentation

Welcome to the official backend API documentation for the **Yadotena Point-Of-Sale (POS) & Restaurant Operational System**.

---

## 1. Architecture & Core Concepts

### Base URL Namespace
All REST API endpoints are strictly versioned under the `/api/v1` namespace.
* **Production Base URL**: `https://yadotena.onrender.com/api/v1`
* **Local Development Base URL**: `http://localhost:8080/api/v1`

---

### Authentication & Authorization
* **Authentication**: Bearer Token via HTTP Header (`Authorization: Bearer <jwt_token>`).
* **Roles**:
  * `OWNER`: Full administrative access (users, settings, financial logs, reporting).
  * `MANAGER`: Operational management (menu, inventory, expenses, staff oversight).
  * `WAITER`: Table sessions, order entry, food delivery, bill settlement.
  * `CHEF`: Kitchen Display System (KDS), order preparation queue.
  * `CUSTOMER` / `PUBLIC`: Public menu reading, self-service QR ordering, order tracking.

---

### Dual Independent State Machines
Yadotena strictly decouples **Kitchen Fulfillment** from **Financial Payment Settlement**:

1. **Kitchen Order State**:
   ```text
   DRAFT → PENDING → PREPARING → READY → SERVED → COMPLETED
                      └─────────────────────────→ CANCELLED
   ```
2. **Payment State**:
   ```text
   UNPAID / PENDING → PAID
                     └→ REFUNDED
   ```

---

### Standard Error Response Format
All error responses return standard JSON:
```json
{
  "error": "Detailed error message",
  "status": 400
}
```

---

## 2. Health & System Status

### `GET /health` & `GET /api/v1/health`
* **Access**: Public
* **Description**: Micro-check confirming API server process availability.
* **Response `200 OK`**:
  ```json
  {
    "ok": true
  }
  ```

### `GET /ready` & `GET /api/v1/ready`
* **Access**: Public
* **Description**: System readiness check verifying active PostgreSQL pool connectivity.
* **Response `200 OK`**:
  ```json
  {
    "ok": true,
    "db": true
  }
  ```
* **Response `503 Service Unavailable`**: `{"error": "db unavailable"}`

---

## 3. Authentication & User Session API

### `POST /api/v1/auth/login` (also `/api/v1/login`)
* **Access**: Public
* **Description**: Authenticates staff/customer via email and password, issuing a signed JWT token.
* **Request Body**:
  ```json
  {
    "email": "waiter@yadotena.com",
    "password": "securepassword"
  }
  ```
* **Response `200 OK`**:
  ```json
  {
    "token": "eyJhbGciOi...",
    "user": {
      "id": "usr-waiter",
      "name": "Abebe Waiter",
      "email": "waiter@yadotena.com",
      "role": "WAITER",
      "status": "ACTIVE"
    }
  }
  ```

### `POST /api/v1/auth/register` (also `/api/v1/register`)
* **Access**: Public
* **Description**: Registers a new customer or basic user account.
* **Request Body**:
  ```json
  {
    "name": "Customer Name",
    "email": "customer@example.com",
    "password": "Password123!",
    "phone": "+251911000000"
  }
  ```

### `POST /api/v1/staff/auth/login`
* **Access**: Public
* **Description**: Specialized authentication endpoint for POS hardware terminals and staff handhelds.

### `POST /api/v1/auth/logout` (also `/api/v1/logout`)
* **Access**: Authenticated (`JWT`)
* **Description**: Invalidates the current user session token.

### `GET /api/v1/auth/me` (also `/api/v1/me`)
* **Access**: Authenticated (`JWT`)
* **Description**: Retrieves profile details of the currently authenticated user.

### `GET /api/v1/auth/ably-token`
* **Access**: Authenticated (`JWT`)
* **Description**: Generates an Ably Realtime token for web client SSE/WebSocket real-time channel subscriptions.

### `GET /api/v1/sessions/active`
* **Access**: Authenticated (`JWT`)
* **Description**: Retrieves active dining session details for a specific table (`?table=t1`).

---

## 4. Menu, Addons, Categories & Tables API (Public / Read)

### `GET /api/v1/menu`
* **Access**: Public
* **Description**: Fetches all available menu items (dishes, drinks, retail store products). Supports filtering by category (`?category=Coffee`) and availability (`?available=true`).

### `GET /api/v1/menu/{id}`
* **Access**: Public
* **Description**: Retrieves detailed information for a single menu item by ID.

### `GET /api/v1/menu/{id}/addons`
* **Access**: Public
* **Description**: Fetches menu addons specifically configured for a given menu item (plus global addons).

### `GET /api/v1/addons`
* **Access**: Public
* **Description**: Lists all active menu addons and customization options across the system.

### `GET /api/v1/categories`
* **Access**: Public
* **Description**: Retrieves all menu categories ordered by `sort_order`.

### `GET /api/v1/categories/{id}`
* **Access**: Public
* **Description**: Fetches a single menu category by ID.

### `GET /api/v1/tables`
* **Access**: Public
* **Description**: Retrieves all floor dining tables, seating capacity, and real-time status (`AVAILABLE`, `OCCUPIED`, `RESERVED`).

### `GET /api/v1/tables/{id}`
* **Access**: Public
* **Description**: Fetches single table details including active QR token.

### `GET /api/v1/settings`
* **Access**: Public
* **Description**: Retrieves general restaurant business settings (tax rates, service charge %, restaurant name, operating hours).

### `GET /api/v1/payment-methods`
* **Access**: Public
* **Description**: Lists all enabled payment methods (Cash, Telebirr, CBE Birr, Bank Transfer, BOA, etc.) along with account details and instructions.

### `GET /api/v1/payment-methods/{id}`
* **Access**: Public
* **Description**: Fetches single payment method details by ID or code.

### `POST /api/v1/orders`
* **Access**: Public / Customer
* **Description**: Creates a new order (Dine-in, Takeaway, Counter). Supports idempotency headers (`Idempotency-Key`).
* **Request Body**:
  ```json
  {
    "type": "DINE_IN",
    "tableId": "t1",
    "status": "PENDING",
    "paymentStatus": "PENDING",
    "items": [
      {
        "menuItemId": "mi-cappuccino",
        "quantity": 2,
        "specialInstructions": "Extra hot",
        "selectedAddons": ["add-oatmilk"]
      }
    ]
  }
  ```

### `GET /api/v1/orders/{id}`
* **Access**: Public / Customer
* **Description**: Retrieves order summary, item list, totals, and state machine status.

### `POST /api/v1/service-requests`
* **Access**: Public / Customer
* **Description**: Creates a customer service request (e.g. Waiter Call, Bill Request, Assistance).

---

## 5. Public Dedicated Sub-Router (`/api/v1/public/*`)

### `GET /api/v1/public/menu`
* **Access**: Public
* **Description**: Optimized public catalog view for customer mobile web apps.

### `GET /api/v1/public/tables`
* **Access**: Public
* **Description**: Public table catalog for QR scanning validation.

### `GET /api/v1/public/settings`
* **Access**: Public
* **Description**: Public branding and configuration payload.

### `POST /api/v1/public/orders`
* **Access**: Public
* **Description**: Customer self-service QR table order placement.

### `GET /api/v1/public/orders/track`
* **Access**: Public
* **Description**: Tracks order progress using table ID or order code (`?tableId=t1`).

### `GET /api/v1/public/orders/{id}/stream`
* **Access**: Public (Server-Sent Events)
* **Description**: Real-time SSE stream providing instant order status updates to customer phones.

---

## 6. Staff Operational API (`OWNER`, `MANAGER`, `WAITER`, `CHEF`)

### `GET /api/v1/orders`
* **Access**: Staff
* **Description**: Retrieves active order queues. Supports filtering by status (`?status=PENDING`), payment status (`?paymentStatus=UNPAID`), and date range.

### `POST` / `PATCH /api/v1/orders/{id}/status`
* **Access**: Staff
* **Description**: Transitions order kitchen state along the state machine (`PENDING` → `PREPARING` → `READY` → `SERVED` → `COMPLETED`).
* **Request Body**: `{"status": "PREPARING"}`

### `POST /api/v1/orders/{id}/add-items`
* **Access**: Staff
* **Description**: Appends additional rounds of dishes/drinks to an existing active table order.

### `POST /api/v1/tables/{id}/start-session`
* **Access**: Staff
* **Description**: Starts a new active dining session on a table.

### `POST /api/v1/tables/{id}/status`
* **Access**: Staff
* **Description**: Updates table status (`AVAILABLE`, `OCCUPIED`, `RESERVED`, `CLEANING`).

### `GET /api/v1/service-requests`
* **Access**: Staff
* **Description**: Lists active waiter calls and customer bill requests.

### `POST /api/v1/service-requests/{id}/resolve`
* **Access**: Staff
* **Description**: Marks a customer service request as resolved.

### `GET /api/v1/payments`
* **Access**: Staff
* **Description**: Lists processed payment transactions with payment method breakdown.

### `POST /api/v1/payments`
* **Access**: Staff
* **Description**: Process and settles an order payment. Uses `SELECT ... FOR UPDATE` database locking to guarantee idempotency and serializability under high concurrency.
* **Request Body**:
  ```json
  {
    "orderId": "ord-12345",
    "amount": 450.00,
    "method": "CBE_BIRR",
    "transactionRef": "TXN-984210",
    "status": "PAID"
  }
  ```

### `GET /api/v1/payments/{id}`
* **Access**: Staff
* **Description**: Fetches single payment receipt record.

### `GET /api/v1/staff/me` & `PATCH /api/v1/staff/me`
* **Access**: Staff
* **Description**: Retrieves or updates logged-in staff shift details.

### `GET /api/v1/staff/stream`
* **Access**: Staff (Server-Sent Events)
* **Description**: Real-time SSE stream pushing live order events directly to Kitchen Display Systems (KDS) and Waiter POS terminals.

### `GET /api/v1/staff/orders` & `GET /api/v1/staff/orders/{id}`
* **Access**: Staff
* **Description**: Staff-optimized order queue endpoints.

### `POST /api/v1/staff/orders`
* **Access**: Staff
* **Description**: Waiter ticket creation from POS handhelds.

### `PATCH /api/v1/staff/orders/{id}/status`
* **Access**: Staff
* **Description**: Fast status update endpoint for KDS screens.

### `POST /api/v1/staff/orders/{id}/payment`
* **Access**: Staff
* **Description**: Submits bill settlement request for verification.

### `POST /api/v1/staff/orders/{id}/payment/verify`
* **Access**: Staff (Cashier/Manager)
* **Description**: Verifies digital bank transfer reference ID.

### `POST /api/v1/staff/orders/{id}/payment/reject`
* **Access**: Staff (Cashier/Manager)
* **Description**: Rejects invalid payment attempt and flags order.

---

## 7. Media & Storage Infrastructure API

### `GET /api/v1/media/proxy` & `GET /media-proxy`
* **Access**: Public
* **Description**: High-speed reverse proxy for serving stored MinIO / Tigris S3 media assets.

### `GET /api/v1/media/asset`
* **Access**: Public
* **Description**: Retrieves media asset metadata by SHA-256 hash.

### `GET /api/v1/uploads/*` & `GET /uploads/*`
* **Access**: Public
* **Description**: Serves static media uploads from disk/object store.

### `POST /api/v1/media/presign` (also `/uploads/presign`)
* **Access**: Staff
* **Description**: Generates direct S3 client upload presigned URLs.

### `POST /api/v1/media/confirm-presigned` (also `/uploads/confirm`)
* **Access**: Staff
* **Description**: Registers a successfully presigned uploaded asset into `media_assets`.

### `POST /api/v1/media/upload` (also `/uploads`)
* **Access**: Staff
* **Description**: Multipart form file upload with automatic SHA-256 content deduplication.

### `POST /api/v1/media/upload-link`
* **Access**: Staff
* **Description**: Downloads and stores image assets from external URL links.

---

## 8. Administrative API (`OWNER`, `MANAGER`)

### User & Staff Management (`/api/v1/users`)
* `GET /api/v1/users`: Lists all system users and staff members.
* `POST /api/v1/users`: Creates a new user/staff account (`role`: `OWNER`, `MANAGER`, `WAITER`, `CHEF`).
* `GET /api/v1/users/{id}`: Fetches user details.
* `PATCH /api/v1/users/{id}`: Updates user details or role.
* `POST /api/v1/users/{id}/toggle-status`: Activates or deactivates user access.
* `DELETE /api/v1/users/{id}`: Deletes user account.

### Category Management (`/api/v1/categories`)
* `POST /api/v1/categories`: Creates a new menu category.
* `PATCH` / `PUT /api/v1/categories/{id}`: Updates category name, icon, sort order.
* `DELETE /api/v1/categories/{id}`: Removes menu category.

### Menu Item Management (`/api/v1/menu`)
* `POST /api/v1/menu`: Creates a new menu item / shop product.
* `PATCH` / `PUT /api/v1/menu/{id}`: Updates price, description, image, preparation time.
* `POST /api/v1/menu/{id}/toggle-availability`: Quick toggle for item out-of-stock / available status.
* `DELETE /api/v1/menu/{id}`: Removes item from catalog.

### Addon Management (`/api/v1/addons`)
* `POST /api/v1/addons`: Creates a new item addon / modification option.
* `PATCH` / `PUT /api/v1/addons/{id}`: Updates addon details.
* `DELETE /api/v1/addons/{id}`: Deletes addon option.

### Table Floor Management (`/api/v1/tables`)
* `POST /api/v1/tables`: Adds a new table to the floor plan.
* `PATCH /api/v1/tables/{id}`: Updates capacity, floor area, or QR token.
* `DELETE /api/v1/tables/{id}`: Deletes table.

### Expense Ledger (`/api/v1/expenses`)
* `GET /api/v1/expenses`: Lists recorded business operational expenses.
* `POST /api/v1/expenses`: Records a new expense entry (supplies, wages, utilities).
* `GET /api/v1/expenses/{id}`: Fetches expense record.
* `PATCH /api/v1/expenses/{id}`: Modifies expense details.
* `DELETE /api/v1/expenses/{id}`: Deletes expense entry.

### Audit Logs & Activity Trail
* `GET /api/v1/activity-logs`: Searches immutable system activity audit trail.
* `GET /api/v1/activity-logs/{id}`: Fetches detailed activity record including snapshot before/after diffs.
* `GET /api/v1/staff/activity`: Staff activity overview log.

### Payment Method Management (`/api/v1/payment-methods`)
* `POST /api/v1/payment-methods`: Configures a new payment method (e.g. Telebirr Merchant, CBE Account).
* `PATCH /api/v1/payment-methods/{id}`: Updates bank account numbers, instructions, or active state.
* `DELETE /api/v1/payment-methods/{id}`: Removes payment method.

### Business Settings & Reports
* `PUT` / `PATCH /api/v1/settings`: Updates global restaurant configuration.
* `GET /api/v1/reports/summary`: Generates sales summary report, total revenue, tax breakdown, and top selling items.
* `GET /api/v1/staff/analytics`: Staff performance and order analytics.

---
*Documentation compiled automatically for Yadotena Backend Engine v1.0.*
