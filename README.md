# Yadotena Cafe

Minimal cafe management: public ordering + staff (owner, manager, waiter, chef).

## Stack

| Layer | Hosting |
|-------|---------|
| Frontend | Next.js on **Vercel** (`yadotena-frontend/`) |
| API | Go (chi) on **Render / Leapcell** (`backend/`) |
| Database | **Neon** Postgres |
| Cache / rate limits | **Upstash** Redis (optional) |
| Images | **Cloudflare R2** (or paste any HTTPS image URL) |

## API (local)

```bash
cd backend
cp .env.example .env
export GOCACHE=$HOME/.cache/go-build GOMODCACHE=$HOME/go/pkg/mod
go run ./cmd/seed   # migrate + rich demo seed (Neon or local)
go run ./cmd/api
```

- Health (cheap): `GET /health` → `{"ok":true}`
- Ready (DB): `GET /ready`
- API: `/api/v1`

## Keep Render Free warm

Ping **`/health`** every ~14 minutes (not `/ready`).

1. **cron-job.org** (recommended): `GET https://YOUR-SERVICE.onrender.com/health`
2. **GitHub Actions**: `.github/workflows/keep-alive.yml` — defaults to `https://yadotena.onrender.com/health`; optional secret/variable `RENDER_HEALTH_URL` to override

## Demo staff (phone + PIN)

| Role | Phone | PIN |
|------|-------|-----|
| Owner | 0900000001 | 1234 |
| Manager | 0900000002 | 2345 |
| Waiter | 0900000003 | 3456 |
| Chef (KITCHEN) | 0900000004 | 4567 |
| Waiter (inactive) | 0900000005 | 5678 |
| Waiter | 0900000006 | 6789 |
| Manager | 0900000007 | 1234 |

Seed also loads retail **products** (shop catalog) and ~27 menu items. Re-run: `cd backend && go run ./cmd/seed`.

## Realtime

- Staff: `GET /api/v1/staff/stream?token=<JWT>` (SSE). Frontend connects **directly to the API origin** (not the Next rewrite) to avoid buffering.
- Guest order track: `GET /api/v1/public/orders/{id}/stream`
- Multi-instance: Redis pub/sub channel `yadotena:events` (falls back to in-process hub when `REDIS_URL` is empty)
- React Query polls every 15s only as a safety net while SSE reconnects

## Commerce settings

Owner Settings can edit **service charge %**, **tax %**, and **delivery fee (ETB)**. Public checkout reads the same values from `/public/settings`.

- Migration / empty DB default for service charge is **0%**; frontend falls back to **0** if settings are missing.
- Demo seed sets service charge to **10%**, tax **15%**, delivery fee **100 ETB** so local checkout matches a real cafe config.
- Kitchen queue hides shop orders and unpaid takeaway/delivery (`kitchenVisible`); owners/managers on `/dashboard/kitchen` use the same rule.
- Analytics / reports day boundaries use **Africa/Addis_Ababa** (not UTC midnight).
- **Guest** place-order is blocked when `accepting_orders` is false or when cash/digital methods are disabled.
- **Staff POS** can still create orders while guest ordering is paused (walk-ins / phone).

## Deploy backend (Render)

| Field | Value |
|-------|--------|
| Name | `yadotena` |
| Language | Go |
| Branch | `main` |
| Region | Oregon (US West) — or closest to Neon |
| **Root Directory** | `backend` |
| **Build Command** | `go build -tags netgo -ldflags '-s -w' -o app ./cmd/api` |
| **Start Command** | `./app` |
| Instance | Free (or paid) |

Frontend origin (CORS / public URL): `https://yadotena.vercel.app` (no trailing slash).

### Environment variables (Render → Environment)

Copy values from your local `backend/.env` (do not commit secrets):

```text
APP_ENV=production
JWT_SECRET=<strong-random-secret>
JWT_EXPIRY=24h
DATABASE_URL=<neon pooled url>
REDIS_URL=<upstash rediss url>
CORS_ALLOWED_ORIGINS=https://yadotena.vercel.app
PUBLIC_BASE_URL=https://yadotena.vercel.app
MIGRATIONS_DIR=migrations
SEEDS_DIR=seeds
RUN_SEEDS=false
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=menuvista-uploads
R2_ENDPOINT=...
R2_PUBLIC_URL=...
```

`PORT` is set by Render automatically — do not override.

After deploy: health `https://yadotena.onrender.com/health` (use your real hostname).  
Keep-alive: cron-job.org → that `/health` URL every 14 minutes.  
Frontend: set `NEXT_PUBLIC_API_URL=https://yadotena.onrender.com` on Vercel.  
Optional: `NEXT_PUBLIC_R2_PUBLIC_URL` (same public base as backend R2) so `next/image` allows uploaded assets.

Migrations run on API boot.
