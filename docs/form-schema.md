# Role pack authoring guide

A role pack is one JSON file at `content/roles/<slug>.json` containing the job advert
(`ad`) and the application funnel (`form`). TypeScript shapes: `lib/content/types.ts`
(JobAd, RolePack) and `lib/engine/types.ts` (FormDefinition). A working minimal example:
`lib/content/fixtures/valid/demo-role.json`. Validate your file with:

```
npx vitest run tests/content.test.ts
```

## Brand brief (applies to all copy)

Halevora is a remote-first agency that builds, manages, and grows the brands and revenue
of top online creators. Small senior team, European core hours (CET), performance culture,
dark premium aesthetic. Tone: confident, blunt, zero corporate padding. Active voice, no
em dashes, no AI-tell phrases. Structure may mirror educate.io's funnel mechanics; never
reuse their sentences. Never show compensation. Do not name specific platforms or clients.

## The `ad` object

Section order is fixed (spec §1.1): `summary` (one paragraph selling the mission of the
role), `role` (eyebrow + 1-2 paragraphs), `idealCandidate` (4-12 blunt bullets),
`requirements` (2-5 cards: title + one-line tagline + body paragraph), `whatYoullDo`
(4-6 items, rendered with 001-00N mono numbering; include one item with a fixed daily
call time in CET), `shouldntApply` (3-4 hard filters, e.g. the all-in mentality line,
no part-timers, no criticism-averse people). `seo.title` and `seo.description` must be
role-specific, 150 chars max for the description.

## The `form` object

- `slug` must equal `ad.slug` and the file name.
- `pages` is an ordered array. Kinds: `intro`, `question`, `interstitial`, `ending`.
- Navigation: logic rules run first (first match wins), then `next`, then array order.
  The last page in the array MUST be an ending.
- Field types: `text`, `textarea`, `email`, `phone`, `number`, `url`, `single_choice`,
  `multi_choice`, `linear_scale` (set `min`/`max`), `legal_gate` (choice rendered as a
  commitment gate; give it options).
- Choice fields need `options`. Field `id`s are unique across the whole form
  (snake_case). Page `id`s are unique (kebab-case, prefix questions with `q-`).
- Piping: `{field_id}` in any later page `title`/`description` interpolates the answer,
  e.g. "Nice to meet you, {first_name}."
- Logic ops: `eq`, `neq`, `lt`, `lte`, `gt`, `gte`, `includes`, `not_includes`.
  A missing answer never triggers a jump.

## Required funnel skeleton (spec §1.2)

1. `intro`: role title, the scarcity + effort frame (many applications, answer
   thoroughly), `cta: "Apply Now"`. For the South Africa pack add one POPIA/GDPR consent
   sentence to the description.
2. `q-identity`: first_name, last_name (text), phone (phone), email (email),
   instagram_handle (text, optional).
3. `q-country`: "what country are you based out of?" (text), piped greeting with
   {first_name}.
4. `q-referral`: single_choice Yes/No, "Yes" branches to `q-referrer` (who referred you),
   "No" jumps past it.
5. `q-age`: number. Logic: `lt 16` jumps to the DQ ending; `gt 25` skips the student
   question; otherwise fall through to `q-student` (single_choice Yes/No; "Yes" jumps to
   the DQ ending).
6. `phase-2`: interstitial announcing phase two, "Personal Information" done,
   "Professional Fitness" next.
7. Role-specific screening pages (one question per page; see your role brief).
8. `q-income`: current monthly gross income in USD (number). Required everywhere except
   the South Africa pack, where it is optional with an encouraging help text.
9. Optional `q-commit`: legal_gate confirming full-time commitment; a decline option may
   route to the DQ ending.
10. `end-ok` (endingTone "standard") and `end-dq` (endingTone "dq"). Both thank the
    applicant with {first_name} piping and read equally warm; the DQ copy is one
    sentence shorter and vaguer. Neither ever says no.

Aim for 14-22 total pages (the copywriter pack may go deeper). Every question page holds
exactly one field except `q-identity`.
