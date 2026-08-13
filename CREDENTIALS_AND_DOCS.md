# Yadotena Milk & Foods - Comprehensive Documentation & Seed Data Guide

> **API Routing Base Path**: All API endpoints are strictly served under the `/api/v1` namespace without trailing slashes.
> **Default Password for All Accounts**: `1234`

---

## 1. System Users & Credentials (2 per Role)

Below are the 2 seeded users for **every role** in the system, plus legacy demo aliases. All accounts share the demo password `1234`.

| Role | Full Name | Email Address | Phone Number | Password / PIN | Access Privileges |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **OWNER** | Alemayehu Tadesse | `owner@yadotena.com` | `0911000001` | `1234` | Full System Access, Financials, User Mgmt |
| **OWNER** | Bethlehem Worku | `owner2@yadotena.com` | `0911000002` | `1234` | Full System Access, Financials, User Mgmt |
| **MANAGER** | Kassahun Bekele | `manager@yadotena.com` | `0911000003` | `1234` | Operations, Reports, Inventory & Staff |
| **MANAGER** | Meron Hailu | `manager2@yadotena.com` | `0911000004` | `1234` | Operations, Reports, Inventory & Staff |
| **WAITER** | Charlie Tesfaye | `waiter@yadotena.com` | `0911000005` | `1234` | Table Orders, POS, Service Requests |
| **WAITER** | Solomon Alemu | `waiter2@yadotena.com` | `0911000006` | `1234` | Table Orders, POS, Service Requests |
| **CHEF** | Dawit Chef | `chef@yadotena.com` | `0911000007` | `1234` | Kitchen Display System (KDS), Order Status |
| **CHEF** | Hanna Zewde | `chef2@yadotena.com` | `0911000008` | `1234` | Kitchen Display System (KDS), Order Status |
| **CUSTOMER** | Abebe Kebede | `customer1@yadotena.com` | `0911234567` | `1234` | Self-ordering, History, Reviews |
| **CUSTOMER** | Sara Tefera | `customer2@yadotena.com` | `0912345678` | `1234` | Self-ordering, History, Reviews |
| *Legacy Alias* | Alice Owner | `owner@demo.com` | `0900000001` | `1234` | Owner Alias |
| *Legacy Alias* | Bob Manager | `manager@demo.com` | `0900000002` | `1234` | Manager Alias |
| *Legacy Alias* | Charlie Waiter | `waiter@demo.com` | `0900000003` | `1234` | Waiter Alias |
| *Legacy Alias* | Dave Chef | `kitchen@demo.com` | `0900000004` | `1234` | Chef Alias |

---

## 2. API Endpoint Architecture (`/api/v1`)

All frontend interactions hit the backend Go server under the `/api/v1` prefix. Trailing slashes are automatically sanitized.

| Group | Method | Endpoint | Description |
| :--- | :--- | :--- | :--- |
| **Health** | `GET` | `/health` or `/api/v1/health` | System health status check |
| **Auth** | `POST` | `/api/v1/login` or `/api/v1/auth/login` | Authenticate user via Email/Phone + Password/PIN |
| **Auth** | `POST` | `/api/v1/logout` or `/api/v1/auth/logout` | Revoke session |
| **Auth** | `GET` | `/api/v1/me` or `/api/v1/auth/me` | Fetch active authenticated user profile |
| **Users** | `GET` | `/api/v1/users` | List all system staff & customer users |
| **Users** | `POST` | `/api/v1/users` | Create new staff or user account |
| **Users** | `PATCH` | `/api/v1/users/{id}` | Update user details or role |
| **Users** | `POST` | `/api/v1/users/{id}/toggle-status` | Toggle user status (ACTIVE / INACTIVE) |
| **Categories**| `GET` | `/api/v1/categories` | List all menu categories |
| **Categories**| `POST` | `/api/v1/categories` | Create menu category |
| **Categories**| `PATCH` | `/api/v1/categories/{id}` | Update category details |
| **Menu** | `GET` | `/api/v1/menu` | List all menu items |
| **Menu** | `POST` | `/api/v1/menu` | Add new menu item |
| **Menu** | `PATCH` | `/api/v1/menu/{id}` | Update menu item details or price |
| **Menu** | `POST` | `/api/v1/menu/{id}/toggle-availability` | Toggle item availability |
| **Tables** | `GET` | `/api/v1/tables` | List all restaurant tables & QR codes |
| **Tables** | `POST` | `/api/v1/tables/{id}/status` | Update table status (`AVAILABLE`, `OCCUPIED`, `RESERVED`, `DIRTY`) |
| **Tables** | `POST` | `/api/v1/tables/{id}/start-session` | Open new dining session on table |
| **Orders** | `GET` | `/api/v1/orders` | List all orders with filters |
| **Orders** | `POST` | `/api/v1/orders` | Place new order (`DINE_IN`, `TAKEAWAY`, `DELIVERY`) |
| **Orders** | `GET` | `/api/v1/orders/{id}` | Get specific order details |
| **Orders** | `POST` | `/api/v1/orders/{id}/status` | Update order state (`PENDING`, `PREPARING`, `READY`, `SERVED`, `COMPLETED`) |
| **Orders** | `POST` | `/api/v1/orders/{id}/add-items` | Add additional items to open order |
| **Requests** | `GET` | `/api/v1/service-requests` | List waiter / bill / assistance requests |
| **Requests** | `POST` | `/api/v1/service-requests/{id}/resolve` | Resolve table request |
| **Expenses** | `GET` | `/api/v1/expenses` | List financial operational expenses |
| **Expenses** | `POST` | `/api/v1/expenses` | Record new expense entry |
| **Customers** | `GET` | `/api/v1/customers` | Customer lifetime analytics & spend totals |
| **Reports** | `GET` | `/api/v1/reports/summary` | Financial summary & 3-month sales analytics |

---

## 3. Seeded 3-Month Operational Dataset Overview

The seed dataset simulates **90 days of active restaurant operations** for *Yadotena Milk & Foods*:

### 🥛 Menu Categories (8 Categories)
1. **Fresh Dairy & Yadotena Milk** 🥛 (Farm-fresh milk, artisanal spiced ergo, signature milkshakes)
2. **Ethiopian Traditional Specials** 🥘 (Doro Wat platter, sizzling beef tibs, fasting beyaynetu, shiro tegabino)
3. **Traditional Breakfast & Fitfit** 🥐 (Chechebsa with honey & ergo, house beef fitfit, kinche)
4. **Main Course & Gourmet Grills** 🥩 (Prime ribeye steak, classic chicken burger)
5. **Artisanal Wood-Fired Pizza** 🍕 (Margherita pizza, meat lovers special)
6. **Specialty Coffees & Juices** ☕ (Iced caramel latte, layered mango-avocado juice)
7. **Appetizers & Starters** 🍟 (Truffle parmesan fries, sambusas)
8. **Pastries & Desserts** 🍰 (Molten chocolate lava cake, gelato)

### 🪑 Tables & Layouts (10 Tables)
- **Indoor Window**: Tables 01 & 02
- **Central Dining**: Table 03
- **VIP Lounge**: Table 04
- **Garden Terrace**: Tables 05 & 06
- **Balcony View**: Table 07
- **Family Booth**: Table 08
- **Private Corner**: Table 09
- **Executive Suite**: Table 10

### 📊 3-Month Financial & Historical Data
- **120+ Historic Completed Orders**: Distributed evenly over the last 90 days with total breakdown, VAT (15%), and Service Charge (10%).
- **4 Live Active Orders**: Currently testing `PREPARING`, `READY`, `PENDING`, and `SERVED` workflows on kitchen and waiter screens.
- **3 Months of Expenses**: Detailed monthly records for Rent (85,000 ETB/mo), Dairy & Meat Ingredients, Staff Salaries, Machine Servicing, and Utilities.
- **Customer Profiles**: Top spending regular and VIP customers (e.g. Dawit Haile with 32 orders / 28,900 ETB lifetime spend).
- **Reviews & Ratings**: Authentic customer reviews with 4 & 5-star ratings over past orders.

---

## 4. How to Run & Verify

1. **Start Backend Server (Go)**:
   ```bash
   cd backend
   go run cmd/api/main.go
   ```

2. **Start Frontend App (Next.js)**:
   ```bash
   cd yadotena-frontend
   npm run dev
   ```

3. **Login & Test**:
   - Access `http://localhost:3000/login`
   - Log in with any email above (e.g., `owner@yadotena.com` or `waiter@yadotena.com`) using password `1234`.

---

## 5. Cloud Infrastructure & Environment Variables

### 📦 Tigris Object Storage (S3 Compatible)
- **Access Key ID**: `tid_ceTEvXARfEcL_wchrUqeiimBTxyXqTApG_IByTDjZMUKOXuZwd`
- **Secret Access Key**: `tsec_zDAQtifbJiYk7_TZt-4wRhukkrYwxkscb_8yGlt_HgKBN1VLwOlGitrb1UTuohFa0DHuoa`
- **Endpoint URL S3**: `https://t3.storage.dev`
- **Endpoint URL IAM**: `https://iam.storage.dev`
- **Storage Bucket Name**: `yadotena`
- **Region**: `auto`

### 🐘 Neon PostgreSQL Database
- **Database URL**: `postgresql://neondb_owner:npg_dSkyzT5DV1vn@ep-shiny-silence-aywzao76-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require`

### ⚡ Ably Realtime
- **API Key**: `-4Zlzg.IeXFIQ:WVUQULrxNq5--goH4SzbHOnTZ9OoXB-JcKMx5Wd2XQE`
- **App ID**: `-4Zlzg`

