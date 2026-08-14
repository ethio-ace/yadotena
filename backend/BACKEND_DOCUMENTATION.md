# 🚀 Yadotena Backend Service Documentation

Welcome to the official technical documentation for the **Yadotena Backend Service**. This document provides an exhaustive, production-grade guide covering system architecture, core components, data models, real-time event infrastructure, environment configurations, image storage & deduplication engine, testing workflows, and deployment procedures.

---

## 📋 Table of Contents
1. [System Overview & Architecture](#-system-overview--architecture)
2. [Project Directory Layout](#-project-directory-layout)
3. [Environment Configuration & Settings](#-environment-configuration--settings)
4. [Database & Migration Engine](#-database--migration-engine)
5. [Authentication & Role-Based Access Control (RBAC)](#-authentication--role-based-access-control-rbac)
6. [Media Engine: Presigned S3 Uploads & SHA-256 Deduplication](#-media-engine-presigned-s3-uploads--sha-256-deduplication)
7. [Real-time Pipeline (Ably, NATS & SSE)](#-real-time-pipeline-ably-nats--sse)
8. [Activity Logging & Audit Trail](#-activity-logging--audit-trail)
9. [Running, Seeding, Testing & Operations](#-running-seeding-testing--operations)

---

## 🏗️ System Overview & Architecture

The Yadotena backend is built using modern **Go (Golang)** with an emphasis on high performance, type safety, low latency, and zero unnecessary dependencies.

```
                  ┌───────────────────────────────────────────────────────────┐
                  │                    HTTP REST API Client                   │
                  │            (Next.js Dashboard, Staff POS, Web)            │
                  └─────────────────────────────┬─────────────────────────────┘
                                                │
                                                ▼
                  ┌───────────────────────────────────────────────────────────┐
                  │                 Go Chi Router & Middleware                │
                  │        (CORS, RequestID, RealIP, Auth, Recoverer)         │
                  └──────┬──────────────────────┬──────────────────────┬──────┘
                         │                      │                      │
                         ▼                      ▼                      ▼
┌──────────────────────────────────┐ ┌────────────────────┐ ┌───────────────────────────┐
│     PostgreSQL Database Pool     │ │   Redis Cache      │ │  Tigris S3 Object Storage │
│ (pgxpool - Prepared Query Cache) │ │ (go-redis/v9)      │ │   (SHA-256 Deduplication, │
└──────────────────────────────────┘ └────────────────────┘ │ Presigned PUT URLs, WebP) │
                         │                      │           └───────────────────────────┘
                         ▼                      ▼                      │
┌──────────────────────────────────────────────────────────────────┐   │
│             Real-time Event Broadcast Infrastructure             │◄──┘
│          (Ably WebSockets, Cloud NATS NGS, SSE Fallback)         │
└──────────────────────────────────────────────────────────────────┘
```

### Core Tech Stack
- **Language**: Go 1.22+
- **HTTP Framework**: `go-chi/chi/v5`
- **Database Engine**: PostgreSQL with `jackc/pgx/v5/pgxpool` high-performance connection pool
- **Cache Engine**: Redis (`redis/go-redis/v9`)
- **Object Storage**: Tigris S3-compatible cloud storage with native AWS Go SDK v2
- **Image Optimization**: `chai2010/webp` WebP encoder + `golang.org/x/image/draw` bilinear scaling
- **Real-Time Pipelines**:
  - **Ably Realtime**: Multi-tenant websocket pub/sub with JWT token auth
  - **NATS Cloud (Synadia NGS)**: Lightweight pub/sub messaging
  - **SSE (Server-Sent Events)**: Native SSE hub for live order updates

---

## 📁 Project Directory Layout

```
backend/
├── cmd/
│   ├── api/          # Application entrypoint (main.go)
│   └── seed/         # Standalone database migration & seeding CLI tool
├── internal/
│   ├── activity/     # Audit logging service
│   ├── auth/         # JWT generation, validation, password hashing
│   ├── cache/        # Redis connection & cache management
│   ├── config/       # Environment loading & application configuration
│   ├── db/           # Database connector & auto-migration engine
│   ├── dto/          # Data transfer objects & normalization adapters
│   ├── models/       # Struct definitions & database entities
│   ├── orders/       # Order processing business rules & validators
│   ├── pubsub/       # Ably & NATS clients
│   ├── server/       # HTTP Server, Chi Router, Middlewares, Handlers
│   ├── sse/          # Server-Sent Events hub
│   └── storage/      # Tigris S3 engine, Presigned URLs, SHA-256 Deduplicator
├── migrations/       # SQL UP/DOWN migration scripts (000001 to 000011)
├── seeds/            # SQL seed data scripts
├── uploads/          # Local disk fallback directory for media assets
├── .env.example      # Sample environment configuration template
├── go.mod / go.sum   # Dependency declarations
└── BACKEND_DOCUMENTATION.md # This documentation
```

---

## ⚙️ Environment Configuration & Settings

Application settings are loaded from environment variables or a local `.env` file via `internal/config/config.go`.

| Variable Key | Type | Default Value | Description |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | string | *Required* | PostgreSQL connection string (`postgresql://user:pass@host:5432/db`) |
| `REDIS_URL` | string | `redis://localhost:6379` | Redis connection URL |
| `JWT_SECRET` | string | `dev-yadotena-secret...` | Secret key for signing auth tokens (Must be changed in prod) |
| `JWT_EXPIRY` | string | `24h` | JWT validity duration (e.g., `24h`, `72h`) |
| `APP_ENV` | string | `development` | Environment mode (`development` or `production`) |
| `APP_PORT` | string | `8080` | Port for the HTTP server to listen on |
| `CORS_ALLOWED_ORIGINS` | string | `*` | Comma-separated CORS allowed origins |
| `PUBLIC_BASE_URL` | string | `http://localhost:3000` | Base URL used for public asset and presigned URL generation |
| `MIGRATIONS_DIR` | string | `migrations` | Directory containing SQL migration scripts |
| `SEEDS_DIR` | string | `seeds` | Directory containing seed SQL scripts |
| `RUN_SEEDS` | bool | `false` | If `true`, runs seeds automatically on server startup |
| `UPLOADS_DIR` | string | `uploads` | Local directory for cached image storage |
| `UPLOAD_MAX_BYTES` | int64 | `10485760` (10MB) | Max payload size limit for direct multipart uploads |
| `ABLY_API_KEY` | string | `""` | Ably Realtime API key |
| `TIGRIS_STORAGE_ACCESS_KEY_ID` | string | `""` | Tigris S3 Access Key ID |
| `TIGRIS_STORAGE_SECRET_ACCESS_KEY`| string | `""` | Tigris S3 Secret Access Key |
| `TIGRIS_STORAGE_ENDPOINT` | string | `https://t3.storage.dev` | Tigris S3 Endpoint URL |
| `STORAGE_BUCKET_NAME` | string | `yadotena` | Target S3 bucket name |

---

## 🗄️ Database & Migration Engine

### Migration Runner (`internal/db/db.go`)
On server startup (`cmd/api/main.go`), the system connects to PostgreSQL and invokes `db.Migrate(ctx, pool, cfg.MigrationsDir)`.
1. Creates the `schema_migrations` tracking table if missing.
2. Sorts and reads all `.up.sql` migration files alphabetically.
3. Checks if each file has already been applied.
4. Executes pending migrations within an explicit PostgreSQL transaction block.

### Database Tables Overview
- `users`: Staff members & authentication (`OWNER`, `MANAGER`, `WAITER`, `CHEF`, `CASHIER`).
- `menu_categories`: Food and beverage categorization.
- `menu_items`: Menu catalog items with pricing, WebP image URLs, and availability.
- `tables`: Physical restaurant tables and operational statuses (`AVAILABLE`, `OCCUPIED`, `RESERVED`, `DIRTY`).
- `dining_sessions`: Active customer sessions bound to tables.
- `orders` & `order_items`: Customer orders, payment status, order state (`PENDING`, `IN_PREPARATION`, `READY`, `SERVED`, `COMPLETED`, `CANCELLED`).
- `service_requests`: Customer requests (water, bill, assistance).
- `expenses`: Operational expenses ledger.
- `payments` & `payment_methods`: Digital & cash transactions tracking.
- `activity_logs`: Audit trail for system actions.
- `restaurant_settings`: Global store settings & metadata.
- `media_assets`: **SHA-256 deduplicated media asset registry**.

---

## 🔐 Authentication & Role-Based Access Control (RBAC)

### Token Extraction & Middlewares (`internal/server/middleware.go`)
1. **Extraction**: Accepts authentication tokens from either:
   - `Authorization: Bearer <token>` header
   - `jwt_token` cookie
2. **Context Injection**: Validates token and injects claims (`userID`, `userRole`, `userName`) into `r.Context()`.
3. **RBAC Guard (`requireRoles`)**: Restricts routes to specific roles. For example:
   ```go
   r.With(s.requireRoles(models.RoleOwner, models.RoleManager)).Get("/staff/analytics", s.analytics)
   ```

### Roles Matrix
- `OWNER`: Full administrative access to menu, staff, settings, expenses, analytics.
- `MANAGER`: Full management access to operations, reports, staff management.
- `WAITER`: Table management, placing customer orders, managing active sessions, submitting payments.
- `CHEF`: Kitchen view access, updating order item status to `IN_PREPARATION` or `READY`.

---

## 🖼️ Media Engine: Presigned S3 Uploads & SHA-256 Deduplication

The media storage engine (`internal/storage/tigris.go`) provides an optimized object lifecycle.

```
                                  Direct S3 Upload Flow (Presigned)
                                 ═════════════════════════════════
┌──────────────┐   1. POST /media/presign { filename, contentType }    ┌────────────────┐
│              │ ────────────────────────────────────────────────────► │                │
│              │ ◄──────────────────────────────────────────────────── │                │
│              │   2. Returns { uploadUrl (Presigned PUT), key }        │                │
│              │                                                       │                │
│              │   3. Direct HTTP PUT (File Payload)                   │ Yadotena       │
│  Client      │ ──────────────────────────────────────────────────┐   │ Backend API    │
│  (Browser)   │                                                   │   │                │
│              │   4. POST /media/confirm-presigned { key, filename } │   │                │
│              │ ──────────────────────────────────────────────────┼─► │                │
│              │ ◄─────────────────────────────────────────────────┼── │                │
└──────────────┘   5. Returns { publicUrl, hash, deduplicated: true } │   └────────────────┘
                                                                   │
                                                                   ▼
                                                       ┌────────────────────────┐
                                                       │ Tigris S3 Cloud Bucket │
                                                       └────────────────────────┘
```

### Features & Workflow
1. **Presigned URL Generation (`GetPresignedPutURL`)**:
   - Generates temporary S3 presigned `PUT` URLs expiring in 15 minutes.
   - **0 MB payload overhead** on the backend server—heavy file bytes stream directly from client to S3!
2. **Smart SHA-256 Deduplication**:
   - Calculates raw payload and WebP output SHA-256 hashes.
   - Sub-microsecond memory cache (`memoryCache`) + DB lookup on `media_assets(sha256_hash)`.
   - If an image already exists, returns existing `publicUrl` immediately.
3. **Content-Addressed Storage (CAS)**:
   - Clean, deterministic storage paths: `media/YYYY/MM/<sha256_16_chars>.webp`.
4. **WebP Optimization**:
   - Automatically resizes high-res images exceeding `800x800px` maintaining aspect ratio and encodes to lossy WebP at 85 quality.
5. **HTTP Caching with ETag & 304 Support**:
   - `/uploads/*` serves files locally or fetches from Tigris with `ETag: "<modtime>-<size>"` and `Cache-Control: public, max-age=31536000, immutable`. Returns `HTTP 304 Not Modified` on matching `If-None-Match`.

---

## 📡 Real-time Pipeline (Ably, NATS & SSE)

To maintain instant state synchronization across staff devices and customer order trackers:

1. **Ably Realtime (`internal/pubsub/ably.go`)**:
   - Issues temporary Ably client tokens via `GET /api/v1/auth/ably-token`.
   - Broadcasts events (`order_created`, `order_updated`, `table_updated`) to channels (e.g. `orders`, `kitchen`).
2. **NATS Cloud (`internal/pubsub/nats.go`)**:
   - Asynchronous pub/sub event bus supporting cloud-native scale.
3. **SSE Hub (`internal/sse/hub.go`)**:
   - Native HTTP Server-Sent Events stream for zero-dependency real-time updates.

---

## 📝 Activity Logging & Audit Trail

All critical administrative and staff operational actions are automatically audited:
- Captured via `s.Log.Record(ctx, actorID, actorName, action, entityType, entityID, metadata)`
- Saved to the `activity_logs` table
- Available for review via `GET /api/v1/activity-logs` or `/api/v1/staff/activity`

---

## 🚀 Running, Seeding, Testing & Operations

### Prerequisites
- Go 1.22+
- PostgreSQL 14+
- Redis (Optional, falls back gracefully)

### Local Development Setup
```bash
# 1. Clone repository & change directory
cd backend

# 2. Copy environment file
cp .env.example .env

# 3. Download Go modules
go mod download

# 4. Run automated database migrations and start server
go run cmd/api/main.go
```

### Seeding Test Data
To populate the database with realistic sample restaurant data (categories, menu items, staff, tables, orders):
```bash
go run cmd/seed/main.go
```

### Running Test Suite
Execute unit and integration tests across storage, server, orders, and DTO packages:
```bash
go test -v ./...
```

### Production Build
```bash
go build -ldflags="-s -w" -o bin/server cmd/api/main.go
./bin/server
```
