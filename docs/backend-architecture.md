# Backend and data architecture

The funnel content (form definitions) lives in git as JSON; everything an applicant
produces lives in the database. SQLite in development, Postgres in production (§6).
Prisma 7 with the better-sqlite3 driver adapter; client generated to `lib/generated/prisma`.

## Data model

```
FormSnapshot 1--n Application 1--n Answer
                       1--n WebhookDelivery
Draft        (pre-submission, keyed by resume token)
FunnelEvent  (per page, keyed by anonymous sessionId; joins to Application via sessionId)
```

| Model | Purpose | Notes |
|---|---|---|
| `Application` | One submitted run | Raw `answers`/`path` JSON kept for fidelity, plus derived flags (outcome, referral, incomeUsd, country) and a review workflow (`reviewStatus`: new → shortlisted / rejected / hired, `reviewNote`, `reviewedAt`). `formVersion` + `FormSnapshot` make old answers interpretable after content changes. |
| `Answer` | One row per field value | Arrays (multi_choice) become one row per selected option, so "every SA applicant who picked Design" is one indexed query. |
| `FormSnapshot` | Frozen form definition | Upserted at first submission per (slug, version). |
| `Draft` | Save-for-later state | Anonymous `token` (uuid) is the capability; the funnel autosaves and the resume link is `/apply/<slug>?resume=<token>`. |
| `FunnelEvent` | Per-page analytics | `kind`: `enter` on every page view, `submit`/`dq` written server-side at submission. Per-question drop-off = enters per page in page order. |
| `WebhookDelivery` | Outbound reliability | Row per submission when `WEBHOOK_URL` is set; `pending → delivered/failed` with attempts + lastError. Failed rows are retried via the maintenance endpoint. |

## Flows

- **Submit**: client POSTs `/api/apply` → server re-walks the form (`evaluateSubmission`),
  rejects invalid runs, then one transaction: upsert FormSnapshot, create Application,
  create Answer rows, record `submit`/`dq` FunnelEvent. Webhook delivery row is created
  and attempted once, non-blocking; failures stay `pending`/`failed` for retry.
- **Drafts**: the funnel debounces POST `/api/draft` (token issued on first save, kept in
  localStorage). `?resume=<token>` on the apply page restores server state and beats the
  localStorage copy. Drafts of submitted runs are deleted on submit.
- **Events**: the funnel fires `navigator.sendBeacon('/api/events')` with `{sessionId,
  slug, pageId, kind: 'enter'}` on every page change. Anonymous until submission, when
  the sessionId lands on the Application row.
- **Review**: admin PATCHes `/api/admin/applications/<id>` with `reviewStatus`/`reviewNote`.
- **Privacy (POPIA/GDPR)**: POST `/api/admin/privacy {email}` deletes the person's
  Applications (Answers + deliveries cascade), Drafts, and their sessions' FunnelEvents.
- **Retention**: POST `/api/admin/maintenance {action:'purge'}` deletes Applications
  older than 12 months (the privacy-policy promise), expired drafts (30 days idle), and
  orphaned events. `{action:'retry-webhooks'}` re-attempts failed deliveries. Both are
  curl-able for cron.

## Security and limits

- `/admin/*` and `/api/admin/*` sit behind Basic auth in `proxy.ts` (ADMIN_USER/ADMIN_PASS).
- Public writes are honeypotted (`/api/apply`) and rate limited in-memory per IP
  (single-instance deployment; move to a shared store if we ever scale out).
- Applicant data never appears in logs. `.env` and `dev.db*` are gitignored.

## Postgres migration path

Change `datasource db { provider = "postgresql" }`, set `DATABASE_URL`, swap the driver
adapter in `lib/db.ts` for `@prisma/adapter-pg`, run `prisma migrate deploy`. The schema
uses no SQLite-specific types (JSON stays in `String` columns; switch to `Json` columns
in the same migration if wanted).
