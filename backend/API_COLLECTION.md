# 📖 Yadotena API Endpoint Documentation & Reference Collection

This document contains complete technical specifications for all REST API endpoints exposed by the Yadotena Backend Service under the `/api/v1` namespace (with public/legacy aliases included).

---

## 🌐 Base Base URLs & Headers

- **Development Base URL**: `http://localhost:8080/api/v1`
- **Production Base URL**: `https://yadotena.onrender.com/api/v1`

### Default Headers
```http
Content-Type: application/json
Accept: application/json
Authorization: Bearer <your_jwt_token>
```

---

## 🏥 1. System Health & Readiness

### GET `/health`
- **Description**: Returns 200 OK if API server process is alive.
- **Auth**: None (Public)
- **Response `200 OK`**:
```json
{
  "ok": true
}
```

### GET `/ready`
- **Description**: Checks database pool connectivity and system readiness.
- **Auth**: None (Public)
- **Response `200 OK`**:
```json
{
  "db": true,
  "ok": true
}
```

---

## 🔑 2. Authentication & Session

### POST `/auth/login` (Alias: `/login`, `/staff/auth/login`)
- **Description**: Authenticate staff user with email and password. Sets HTTP-only `jwt_token` cookie and returns user profile & token.
- **Auth**: None (Public)
- **Request Body**:
```json
{
  "email": "owner@yadotena.com",
  "password": "password123"
}
```
- **Response `200 OK`**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "c1f7b0a8-3d2e-4b1a-8f9c-0d1e2f3a4b5c",
    "name": "Alex Owner",
    "email": "owner@yadotena.com",
    "role": "OWNER",
    "status": "ACTIVE",
    "createdAt": "2026-08-14T06:00:00Z"
  }
}
```

### POST `/auth/register` (Alias: `/register`)
- **Description**: Register a new staff user (requires Owner/Manager role in production).
- **Auth**: None or Owner
- **Request Body**:
```json
{
  "name": "Sarah Chef",
  "email": "sarah.chef@yadotena.com",
  "password": "SecurePassword123!",
  "role": "CHEF",
  "phone": "+251911223344"
}
```

### GET `/auth/me` (Alias: `/me`, `/staff/me`)
- **Description**: Retrieve authenticated user profile from JWT session.
- **Auth**: Required (`Bearer <token>` or cookie)
- **Response `200 OK`**:
```json
{
  "id": "c1f7b0a8-3d2e-4b1a-8f9c-0d1e2f3a4b5c",
  "name": "Alex Owner",
  "email": "owner@yadotena.com",
  "role": "OWNER",
  "status": "ACTIVE"
}
```

### POST `/auth/logout` (Alias: `/logout`)
- **Description**: Logs out user by clearing the auth token cookie.
- **Auth**: None

### GET `/auth/ably-token`
- **Description**: Issues a short-lived Ably Realtime token request for websocket subscription.
- **Auth**: Required
- **Response `200 OK`**:
```json
{
  "token": "ab_token_string..."
}
```

---

## 👥 3. User Management

### GET `/users`
- **Description**: List all registered staff users.
- **Auth**: Required (Owner, Manager)
- **Response `200 OK`**: Array of `User` objects.

### POST `/users`
- **Description**: Create a staff user.
- **Auth**: Required (Owner)

### PATCH `/users/{id}`
- **Description**: Update user fields (name, email, role, password).
- **Auth**: Required (Owner)

### POST `/users/{id}/toggle-status`
- **Description**: Toggle user status between `ACTIVE` and `INACTIVE`.
- **Auth**: Required (Owner)

### DELETE `/users/{id}`
- **Description**: Delete user account.
- **Auth**: Required (Owner)

---

## 📂 4. Menu Categories

### GET `/categories` (Alias: `/public/categories`)
- **Description**: List all menu categories ordered by sort position.
- **Auth**: None (Public)

### POST `/categories`
- **Description**: Create a menu category.
- **Auth**: Required (Owner, Manager)
- **Request Body**:
```json
{
  "name": "Traditional Dishes",
  "description": "Authentic Ethiopian cuisine",
  "icon": "utensils",
  "displayOrder": 1
}
```

### PATCH `/categories/{id}`
- **Description**: Update menu category fields.
- **Auth**: Required (Owner, Manager)

### DELETE `/categories/{id}`
- **Description**: Delete category by ID.
- **Auth**: Required (Owner, Manager)

---

## 🍔 5. Menu Catalog & Items

### GET `/menu` (Alias: `/public/menu`)
- **Description**: List menu items with filtering options (`category`, `available`).
- **Auth**: None (Public)

### POST `/menu`
- **Description**: Create a menu item with optional direct image file upload or image URL.
- **Auth**: Required (Owner, Manager)
- **Request Body (JSON)**:
```json
{
  "name": "Doro Wot",
  "description": "Slow-cooked spicy chicken stew with boiled egg and Injera",
  "price": 450.00,
  "category": "Main Course",
  "categoryId": "cat_123",
  "image": "https://example.com/doro.webp",
  "isAvailable": true,
  "preparationTime": 25,
  "dietaryTags": ["SPICY", "TRADITIONAL"]
}
```

### PATCH `/menu/{id}`
- **Description**: Update menu item fields or image.
- **Auth**: Required (Owner, Manager)

### POST `/menu/{id}/toggle-availability`
- **Description**: Quick toggle for menu item availability.
- **Auth**: Required (Owner, Manager, Chef)

### DELETE `/menu/{id}`
- **Description**: Delete menu item.
- **Auth**: Required (Owner, Manager)

---

## 🪑 6. Tables & Dining Sessions

### GET `/tables` (Alias: `/public/tables`)
- **Description**: List all restaurant dining tables and current statuses.
- **Auth**: None (Public)

### POST `/tables`
- **Description**: Create table.
- **Auth**: Required (Owner, Manager)
- **Request Body**:
```json
{
  "name": "Table 05",
  "capacity": 4
}
```

### POST `/tables/{id}/status`
- **Description**: Update table status (`AVAILABLE`, `OCCUPIED`, `RESERVED`, `DIRTY`).
- **Auth**: Required (Owner, Manager, Waiter)

### POST `/tables/{id}/start-session`
- **Description**: Open an active dining session for a table.
- **Auth**: Required (Waiter, Manager)

### GET `/sessions/active?table={tableId}`
- **Description**: Retrieve current active session details for a table.
- **Auth**: None (Public)

---

## 🛒 7. Orders & Kitchen Workflow

### GET `/orders` (Alias: `/staff/orders`)
- **Description**: List orders with filter parameters (`status`, `tableId`, `type`, `date`).
- **Auth**: Required (Owner, Manager, Waiter, Chef)

### POST `/orders` (Alias: `/public/orders`, `/staff/orders`)
- **Description**: Create a new customer or staff order with idempotency key support.
- **Auth**: None (Public / Staff)
- **Request Body**:
```json
{
  "type": "DINE_IN",
  "tableId": "tbl_05",
  "customerName": "John Doe",
  "customerPhone": "+251911000000",
  "idempotencyKey": "order_uuid_12345",
  "items": [
    {
      "menuItemId": "item_doro_wot",
      "quantity": 2,
      "specialInstructions": "Extra spicy",
      "selectedAddons": ["addon_extra_injera"]
    }
  ]
}
```

### GET `/orders/{id}` (Alias: `/public/orders/track`, `/staff/orders/{id}`)
- **Description**: Retrieve detailed order status by ID.
- **Auth**: None (Public / Staff)

### POST `/orders/{id}/status` (Alias: `/staff/orders/{id}/status`)
- **Description**: Update order or kitchen processing status (`PENDING`, `IN_PREPARATION`, `READY`, `SERVED`, `COMPLETED`, `CANCELLED`).
- **Auth**: Required (Owner, Manager, Waiter, Chef)
- **Request Body**:
```json
{
  "status": "IN_PREPARATION"
}
```

### POST `/orders/{id}/add-items`
- **Description**: Add additional items to an active open order.
- **Auth**: Required (Waiter, Manager)

---

## 🛎️ 8. Service Requests

### GET `/service-requests`
- **Description**: List active waiter calls and service requests.
- **Auth**: Required (Waiter, Manager, Owner)

### POST `/service-requests`
- **Description**: Create customer assistance request (`WAITER`, `BILL`, `ASSISTANCE`).
- **Auth**: None (Public)
- **Request Body**:
```json
{
  "tableId": "tbl_05",
  "type": "WAITER",
  "notes": "Requesting extra napkins"
}
```

### POST `/service-requests/{id}/resolve`
- **Description**: Mark service request as resolved by staff.
- **Auth**: Required (Waiter, Manager)

---

## 💸 9. Expenses & Payments

### GET `/expenses`
- **Description**: List operational expenses ledger.
- **Auth**: Required (Owner, Manager)

### POST `/expenses`
- **Description**: Record a new expense item.
- **Auth**: Required (Owner, Manager)
- **Request Body**:
```json
{
  "category": "Supplies",
  "description": "Bulk purchase of organic coffee beans",
  "amount": 2500.00,
  "paymentMethod": "CASH",
  "reference": "INV-2026-088"
}
```

### GET `/payments` & POST `/payments`
- **Description**: List or submit order payment verification (`CASH`, `TELEBIRR`, `CBE_BIRR`, `CHAPA`).
- **Auth**: Required (Waiter, Manager, Owner)

---

## 🖼️ 10. Media & Uploads Engine

### POST `/media/presign` (Alias: `/uploads/presign`)
- **Description**: Generate temporary S3 Presigned PUT URL for direct client-to-cloud upload.
- **Auth**: None (Public / Staff)
- **Request Body**:
```json
{
  "filename": "menu_photo.jpg",
  "contentType": "image/jpeg"
}
```
- **Response `200 OK`**:
```json
{
  "uploadUrl": "https://t3.storage.dev/yadotena/uploads/2026/08/uuid.jpg?X-Amz-Algorithm=...",
  "key": "uploads/2026/08/uuid.jpg",
  "publicUrl": "http://localhost:3000/uploads/uploads/2026/08/uuid.jpg",
  "expiresIn": 900
}
```

### POST `/media/confirm-presigned` (Alias: `/uploads/confirm`)
- **Description**: Confirm and register a direct S3 upload in the SHA-256 asset registry.
- **Auth**: None
- **Request Body**:
```json
{
  "key": "uploads/2026/08/uuid.jpg",
  "filename": "menu_photo.jpg"
}
```

### POST `/media/upload` (Alias: `/uploads`)
- **Description**: Direct server multipart upload with automatic SHA-256 deduplication and WebP compression.
- **Auth**: None
- **Form Data**: `file` or `image` binary field.
- **Response `201 Created` / `200 OK (if deduplicated)`**:
```json
{
  "publicUrl": "/uploads/media/2026/08/f09074912d0edf0f.webp",
  "url": "/uploads/media/2026/08/f09074912d0edf0f.webp",
  "key": "media/2026/08/f09074912d0edf0f.webp",
  "hash": "f09074912d0edf0f50018ca5f987faf8e13342b3d8eff93ac3eade5d8ef65d16",
  "filename": "f09074912d0edf0f.webp",
  "contentType": "image/webp",
  "fileSize": 45210,
  "deduplicated": false
}
```

### GET `/media/asset?hash={sha256_hash}`
- **Description**: Query media asset registry details by SHA-256 hash.
- **Auth**: None

### GET `/uploads/*`
- **Description**: Serve uploaded media files with HTTP `ETag` and `Cache-Control: public, max-age=31536000, immutable`. Returns `304 Not Modified` on matching `If-None-Match`.
- **Auth**: None

---

## 📊 11. Reports, Analytics & Activity Logs

### GET `/reports/summary`
- **Description**: High-level store metrics summary.
- **Auth**: Required (Owner, Manager)

### GET `/staff/analytics?from=2026-08-01&to=2026-08-14`
- **Description**: Detailed analytics breakdown including daily revenue mix, order types, and top selling items.
- **Auth**: Required (Owner, Manager)

### GET `/activity-logs` (Alias: `/staff/activity`)
- **Description**: System audit trail of all staff and system actions.
- **Auth**: Required (Owner, Manager)
