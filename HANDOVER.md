# HANDOVER — Halevora Careers

Read this first. It is the operating manual for the live hiring site; the deeper
documents are linked where they matter.

## What this is

A careers site plus application-funnel engine modeled on educate.io's hiring system:
cinematic dark brand pages, 7 job ads, one-question-per-view application funnels with
branching and silent disqualification, applicant analytics, and a keyboard-driven review
console. Built July 2026.

| Thing | Where |
|---|---|
| Live site | https://careers.halevora.com |
| Admin console | https://careers.halevora.com/admin |
| Repo | https://github.com/supporteraphina/Careers (private) |
| Host | Railway (project contains the app service + Postgres) |
| Deploys | Automatic on every push to `main` |
| Admin login | `ADMIN_USER` / `ADMIN_PASS` — values live in Railway variables and the local gitignored `.env` |
| Product spec | [docs/hiring-funnel-spec.md](docs/hiring-funnel-spec.md) (includes the full educate.io teardown) |
| Data architecture | [docs/backend-architecture.md](docs/backend-architecture.md) |
| Form authoring guide | [docs/form-schema.md](docs/form-schema.md) |
| Deploy details | [DEPLOY.md](DEPLOY.md) |

## Architecture in one minute

Next.js 16 (App Router, Turbopack), TypeScript, plain CSS with tokens. Three route
groups: `(site)` marketing pages, `/apply/[slug]` chromeless funnels, `/admin` console
(own stylesheet, Basic-auth gated by `proxy.ts`, which also guards `/api/admin/*`).

Content is data: each role is one JSON file in `content/roles/` holding the ad copy and
the complete form definition (pages, fields, branching logic). The pure engine in
`lib/engine/` (navigation, validation, piping, submission re-evaluation) is the
safety-critical part — a wrong jump silently disqualifies someone — and is covered by
the unit tests. The server re-walks every submission, so client tampering cannot skip
validation or forge outcomes.

Data lives in Railway Postgres via Prisma 7 (`@prisma/adapter-pg`). Six tables:
Application (with review workflow), Answer (one row per value, multi-selects exploded),
FormSnapshot (frozen form per version), Draft (resume tokens), FunnelEvent (per-page
analytics), WebhookDelivery (retryable outbound). `npm ci` runs `prisma generate`;
`npm run start` runs `prisma migrate deploy` — deploys self-configure.

## Local development

1. `npm install`
2. Put a Postgres connection string in `.env` as `DATABASE_URL` (easiest: the Railway
   Postgres public URL — note that this is the production database; be deliberate).
3. `npm run dev` → http://localhost:3000

Gates before pushing: `npm run typecheck`, `npm test` (63 unit tests + content
validation), `npm run build`. Every push to `main` deploys to production.

### Seeding test data

`SEED=1 npx vitest run tests/seed15.test.ts` walks realistic personas through the real
engine and submits via the live API. Env vars: `SEED_BASE` (target, defaults to
localhost:3000), `SEED_PICK="0,6,10"` (persona indexes; omit for all 15). Personas use
`@seed.test` emails — delete them afterwards via Admin → Data → delete by email.

## Changing content

- **Edit ad copy or questions**: edit the role's JSON in `content/roles/`. If you change
  the `form` in any way, **bump `form.version`** — snapshots are keyed on it and old
  applications render from the version they answered. Validate with
  `npx vitest run tests/content.test.ts`, then push.
- **Add a role**: new JSON following [docs/form-schema.md](docs/form-schema.md) (follow
  the required funnel skeleton: identity → country → referral branch → age gate with DQ →
  phase interstitial → role questions → traffic source → income → two endings), plus a
  card image entry in `lib/content/roleImages.ts` (verify the Unsplash id resolves).
  Listing, ad page, funnel, admin, and analytics all pick it up automatically.
- **Bulk form changes**: see `scripts/add-traffic-question.mjs` for the pattern (insert
  page + bump versions across all packs).
- Copy rules: blunt, active voice, no em dashes, never show compensation, never reuse
  educate.io sentences. Design rules live in `PRODUCT.md` (brand register) — key one:
  background atmosphere only on viewport-fixed layers, never content-anchored (seams).

## Admin console guide

- **Applications**: status tabs with counts, search, role filter, DQ toggle, pagination.
  Unread dot = not yet reviewed. Rows are clickable.
- **Review screen**: J/K or arrows move through the queue; S shortlist, X reject, H hire
  (auto-advances). DQ'd applications show the exact triggering question with override
  guidance. Notes are private.
- **Funnel**: per-question drop-off bars; amber = the step losing the most applicants;
  counts link to the filtered list.
- **Sources**: self-reported ("Where did you find this role?") vs measured
  (`utm_source` → referrer → direct). Tag every placed link with `utm_source=...` or
  everything shows as Direct.
- **Data**: entity counts, POPIA delete-by-email, retention purge, webhook retry, and
  the webhook delivery log.
- CSV export: top bar. The applicant email column links to mailto.

## Operations

- **Retention (must do)**: privacy policy promises 12-month retention. Point a monthly
  cron (cron-job.org is fine) at `POST /api/admin/maintenance` body `{"action":"purge"}`
  with the Basic auth header. Daily `{"action":"retry-webhooks"}` if webhooks are on.
- **Notifications**: set `WEBHOOK_URL` in Railway variables to a Make.com webhook and
  every submission POSTs a JSON summary (id, role, outcome, email, country, referral).
  Failures are recorded and retryable. There is **no email sending** anywhere —
  applicants get no confirmation email and the owner gets no notification without the
  webhook.
- **Logs**: Railway service → Deployments → View logs.
- **Rate limiting** is in-memory per instance (10 submissions/hour/IP). Fine for one
  instance; move to the DB/Redis before scaling out.

## Known gaps (deliberate, in priority order)

1. No applicant confirmation email / owner email notification (webhook is the path).
2. Default favicon and no Open Graph share image.
3. No rejection-reason taxonomy and no per-applicant activity trail (needs schema
   columns; the admin research doc in git history has the pattern).
4. Review prev/next walks the whole queue, not the current filter.
5. Card imagery is Unsplash stock (all ids verified to resolve at high res).
6. Ad copy was AI-written to spec and has not had a human proofread.

## Gotchas learned the hard way

- Prisma migrations are Postgres-dialect; never re-add SQLite ones. New migrations:
  `npx prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma --script`
  → new folder under `prisma/migrations/` (strip any non-SQL first line and the BOM).
- Windows PowerShell 5.1 mangles embedded double quotes in git commit messages and
  backticks in `node -e` one-liners; avoid both.
- Deleting `.next` while the dev server runs breaks it until restart.
- The embedded preview browser defers lazy images when its tab is hidden — verify
  imagery in a real browser tab before concluding anything is broken.
- `sizes` hints on `next/image` must match the real rendered widths; stale hints were
  the cause of the one "blurry images" incident.
