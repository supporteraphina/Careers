# Deployment checklist

The app is stateless except for the database. Everything below assumes a managed
Postgres (Supabase or Neon); SQLite is development-only.

## 1. Database

- [ ] Create a Postgres database (Supabase project or Neon branch).
- [ ] In `prisma/schema.prisma`, change `provider = "sqlite"` to `postgresql`.
- [ ] `npm i @prisma/adapter-pg pg` and swap `PrismaBetterSqlite3` for `PrismaPg` in
      `lib/db.ts`.
- [ ] Set `DATABASE_URL` to the Postgres connection string.
- [ ] Run `npx prisma migrate deploy`.

## 2. Environment variables (host settings, never committed)

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | Postgres connection string |
| `ADMIN_USER` / `ADMIN_PASS` | yes | Basic auth for /admin and /api/admin (pick strong values; the dev pair must not ship) |
| `WEBHOOK_URL` | no | Make.com endpoint that receives each submission |

## 3. Host

- Any Node host or Vercel. `npm run build` then `npm run start`, or the Vercel
  default pipeline. Verified locally in production mode (SSG pages, admin gate,
  API routes).
- The per-IP rate limiter is in-memory: run a single instance, or move the limiter
  to the database/Redis before scaling out.

## 4. After first deploy

- [ ] Submit one real test application end to end and delete it via Admin → Data.
- [ ] Point a monthly cron at `POST /api/admin/maintenance` with
      `{"action":"purge"}` (12-month POPIA retention) and a daily one with
      `{"action":"retry-webhooks"}` if webhooks are enabled (both need the Basic
      auth header).
- [ ] Tag every paid or placed link with `utm_source` so Admin → Sources measures
      real attribution.
- [ ] Confirm `/admin` is unreachable without credentials from a private window.

## 5. Domains

Point the apex (or `careers.` subdomain) at the app. The funnel lives under
`/apply/<slug>`; no extra subdomain needed.
