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

## Deploy backend

1. Neon → `DATABASE_URL` (`sslmode=require`)
2. Optional Upstash → `REDIS_URL` (`rediss://…`)
3. Optional R2 → `R2_*` (see `backend/.env.example`)
4. Deploy `backend/`: build `go build -o bin/api ./cmd/api`, start `./bin/api`
5. Set `JWT_SECRET`, `CORS_ALLOWED_ORIGINS` (Vercel URL), `RUN_SEEDS=true` once then `false`
6. Frontend: `NEXT_PUBLIC_API_URL` → API URL

Migrations run on API boot.
