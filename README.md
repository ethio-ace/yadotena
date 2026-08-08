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
2. **GitHub Actions**: `.github/workflows/keep-alive.yml` — set secret/variable `RENDER_HEALTH_URL` to that URL

## Demo data (PIN `1234`)

| Role | Phone |
|------|-------|
| Owner | 0900000001 |
| Manager | 0900000002 |
| Waiter | 0900000003 |
| Chef (KITCHEN) | 0900000004 |
| Waiter (inactive) | 0900000005 |

Seed includes 7 categories / 11 menu items (with images), 8 tables, open kitchen/waiter orders, sample customers (Abebe / Sara / Dawit VIP), and 3 expenses.

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

Migrations run on API boot.
