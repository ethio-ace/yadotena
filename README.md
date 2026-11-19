# Yadotena Milk & Foods

Café management: public QR/takeaway ordering plus staff dashboards for owner,
manager, waiter and kitchen.

## Stack

| Layer | Where |
|-------|-------|
| Frontend | Next.js (`yadotena-frontend/`) on Vercel |
| API | Django + Django REST Framework (`backend_django/`) at `semu.ethioace.com` |
| Database | SQLite (`SQLITE_PATH`) |
| Images | Uploaded to `MEDIA_ROOT`, served under `/media/` |
| Realtime | Ably (server publishes; browsers get subscribe-only tokens) |

## API (local)

```bash
cd backend_django
python -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # set DJANGO_DEBUG=true for local work
python manage.py migrate
python manage.py createsuperuser   # first owner account
python manage.py runserver
python manage.py test apps         # test suite
```

- Health (cheap): `GET /health/` → `{"ok": true}`
- Ready (database): `GET /ready/`
- API: `/api/v1/…` (routes work with or without a trailing slash)

## Frontend (local)

```bash
cd yadotena-frontend
cp .env.example .env.local   # NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
npm ci
npm run dev
```

## Access model

- **Public** (no login): menu, categories, addons, settings, payment methods,
  placing an order, viewing/looking up an order by its id, adding items,
  calling a waiter, reviews, the Ably token.
- **Waiter / kitchen**: orders and kitchen actions, tables, service
  requests, marking dishes sold out, recording payments.
- **Manager / owner**: menu and addon editing, staff, expenses, payment
  history and methods, analytics, activity log, products, uploads.
- **Owner only**: restaurant settings and owner accounts.

Staff sign in with email + password and receive a 12-hour API token.

## Deploy the API

1. Set environment variables (see `backend_django/.env.example`):
   `DJANGO_SECRET_KEY`, `DJANGO_ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`
   (the frontend URL), `CSRF_TRUSTED_ORIGINS`, `ABLY_API_KEY`.
   The server refuses to start without a secret key unless `DJANGO_DEBUG=true`.
2. `python manage.py migrate` on every deploy.
3. Frontend: set `NEXT_PUBLIC_API_URL` to the API origin (with or without `/api/v1`),
   `NEXTAUTH_URL` and `NEXTAUTH_SECRET`.
