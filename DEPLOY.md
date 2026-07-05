# Deployment (Railway)

The app is stateless; all applicant data lives in Postgres. The repo is wired so
Railway needs zero build configuration: `npm ci` runs `prisma generate`
(postinstall), and `npm run start` runs `prisma migrate deploy` before booting,
so the schema creates/updates itself on every deploy.

## Railway setup (one time)

1. Project → **Deploy from GitHub repo** → `supporteraphina/Careers` (installs the
   Railway GitHub App on the account; every push to `main` auto-deploys).
2. **+ New → Database → PostgreSQL** in the same project.
3. Careers service → **Variables**:
   - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}` (reference variable)
   - `ADMIN_USER` / `ADMIN_PASS` = fresh strong values (gate for /admin and /api/admin)
   - `WEBHOOK_URL` = optional Make.com endpoint
4. **Settings → Networking → Generate Domain**; add a custom domain (CNAME) later.

## Local development

Local dev also uses Postgres now. Put the Railway Postgres **public** connection
string in `.env` as `DATABASE_URL` (or run a local Postgres). Never commit `.env`.

## After first deploy

- [ ] Submit one real application end to end; check Admin → Applications.
- [ ] Wipe test data: Admin → Data → delete by email, per address.
- [ ] Cron (Railway scheduled service or cron-job.org, monthly):
      `POST https://<domain>/api/admin/maintenance` with body
      `{"action":"purge"}` and the Basic auth header — enforces the 12-month
      retention promise. Add a daily `{"action":"retry-webhooks"}` if webhooks
      are on.
- [ ] Tag every placed link with `utm_source` so Admin → Sources measures real
      attribution.
- [ ] Confirm `/admin` returns 401 from a private browser window.

## Notes

- The per-IP rate limiter is in-memory: run a single instance, or move it to the
  database/Redis before scaling out.
- The old SQLite `dev.db` on this machine is dead weight after the switch; its
  18 test rows were never production data.
