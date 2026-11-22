# Hilif Milk & Foods

Café management: public QR menu with guest table ordering (waiter-approved) plus staff dashboards for owner,
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
  table names, tracking an order by its id or receipt number, calling a
  waiter, reviews, the Ably token — and **placing a dine-in order for a table**.
  Guest orders arrive as `DRAFT` and a waiter must approve them before the
  kitchen sees them (see `AGENTS.md`).
- **Waiter / kitchen**: placing and extending orders, approving guest orders,
  kitchen actions, tables and dining sessions, service requests, marking
  dishes sold out, recording payments.
- **Manager / owner**: menu and addon editing, staff, expenses, payment
  history and methods, analytics, activity log, products, uploads.
- **Owner only**: restaurant settings and owner accounts.

Staff sign in with email + password and receive a 12-hour API token.

## Deploy the API

1. Set environment variables (see `backend_django/.env.example`):
   `DJANGO_SECRET_KEY`, `DJANGO_ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`
   (the frontend URL), `CSRF_TRUSTED_ORIGINS`, `ABLY_API_KEY`.
   The server refuses to start without a secret key unless `DJANGO_DEBUG=true`.
   Never set `DJANGO_DEBUG=true` in production.
2. On every deploy:
   `pip install -r requirements.txt`, `python manage.py migrate`,
   `python manage.py collectstatic --noinput` (admin CSS/JS),
   `python manage.py check --deploy`.
3. Run behind a real WSGI server (e.g. `gunicorn backend_django.wsgi`), not
   `runserver`, with HTTPS terminated at the proxy. Once HTTPS-only is
   confirmed, set `DJANGO_HSTS_SECONDS=31536000` and either
   `DJANGO_SECURE_SSL_REDIRECT=true` or redirect at the proxy.
4. SQLite runs in WAL mode: back up `db.sqlite3` **together with** its
   `-wal`/`-shm` files, or use `sqlite3 db.sqlite3 ".backup backup.sqlite3"`.
   Back up `MEDIA_ROOT` (menu images) too.
5. Throttles use the in-process cache, so limits are per worker. With several
   workers, point `CACHES` at a shared cache if you need exact limits.

## Deploy the frontend

- Set `NEXT_PUBLIC_API_URL` (API origin, with or without `/api/v1`),
  `NEXTAUTH_URL` (the site URL) and `NEXTAUTH_SECRET` (`openssl rand -base64 32`).
- `NEXT_PUBLIC_*` values are baked in at **build** time: change them, then rebuild.
  Never put secrets (e.g. an Ably key) in a `NEXT_PUBLIC_*` variable.
- Demo-account quick logins on `/login` only render in development builds.
