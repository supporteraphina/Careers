<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AGENTS.md

Working agreement for AI coding agents (and humans) in this repo. The product spec is
[docs/hiring-funnel-spec.md](docs/hiring-funnel-spec.md); read it before touching code.

Halevora Hiring is a careers site plus application funnel engine. Two route groups:
`/hiring` (listing + job adverts) and `/apply/[slug]` (one-question-per-view funnels driven
by JSON form definitions in `content/roles/`). The branching logic runner is safety-critical:
a wrong jump can silently disqualify a good applicant. Keep it pure and unit-tested.

## How to work here

1. Think before coding; state the plan.
2. Read the spec section for the area you touch.
3. Simplicity first; match surrounding idiom.
4. Surgical changes only; no drive-by refactors.
5. The logic runner (`lib/engine/`) stays pure TypeScript, no React, fully unit-tested.
6. Prose and UI copy follow stop-slop rules: active voice, no em dashes, no AI tells.
7. Copy structure may mirror educate.io's funnel mechanics; never reuse their sentences.
8. Validate: `npm run typecheck`, `npm test`, `npm run build`. UI work: verify in browser.

## Conventions

- Next.js App Router, TypeScript, functional components, inline SVG icons.
- All colors via CSS variables in `app/globals.css`. Theme is dark.
- Form definitions are versioned JSON in `content/roles/`, validated against
  `lib/engine/types.ts` at build time.
- Applicant data is sensitive: POPIA/GDPR apply. No applicant data in logs or fixtures.
- Secrets live in gitignored `.env` only.
