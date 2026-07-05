// Seed harness: submits realistic applications through the live dev server.
// Run explicitly with:  SEED=1 vitest run tests/seed15.test.ts
// Skipped in normal test passes.

import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { loadRolePacks } from '../lib/content/load';
import { nextPageId } from '../lib/engine/runner';
import type { Answers, Field, FormDefinition } from '../lib/engine/types';

const BASE = process.env.SEED_BASE ?? 'http://localhost:3000';

interface Persona {
  slug: string;
  firstName: string;
  lastName: string;
  email: string;
  country: string;
  age: number;
  student?: boolean;
  referral?: boolean;
  refuseCommit?: boolean;
  income: number;
  trafficSource: string;
  utmSource?: string;
  referrerUrl?: string;
  expectDq: boolean;
}

const PERSONAS: Persona[] = [
  { slug: 'south-african-talent', firstName: 'Naledi', lastName: 'Khumalo', email: 'naledi.k@seed.test', country: 'South Africa', age: 28, income: 1100, trafficSource: 'Instagram', utmSource: 'instagram', expectDq: false },
  { slug: 'south-african-talent', firstName: 'Pieter', lastName: 'Botha', email: 'pieter.b@seed.test', country: 'South Africa', age: 34, income: 2400, trafficSource: 'LinkedIn', utmSource: 'linkedin', expectDq: false },
  { slug: 'south-african-talent', firstName: 'Ayanda', lastName: 'Nkosi', email: 'ayanda.n@seed.test', country: 'South Africa', age: 15, income: 0, trafficSource: 'TikTok', expectDq: true },
  { slug: 'south-african-talent', firstName: 'Lerato', lastName: 'Molefe', email: 'lerato.m@seed.test', country: 'South Africa', age: 20, student: true, income: 300, trafficSource: 'Friend or referral', referral: true, expectDq: true },
  { slug: 'copywriter', firstName: 'Marta', lastName: 'Kovac', email: 'marta.k@seed.test', country: 'Croatia', age: 29, income: 3200, trafficSource: 'X / Twitter', utmSource: 'twitter', expectDq: false },
  { slug: 'copywriter', firstName: 'James', lastName: 'Okafor', email: 'james.o@seed.test', country: 'Nigeria', age: 31, income: 2100, trafficSource: 'YouTube', referrerUrl: 'https://www.youtube.com/watch?v=abc', expectDq: false },
  { slug: 'short-form-editor', firstName: 'Duško', lastName: 'Ilić', email: 'dusko.i@seed.test', country: 'Serbia', age: 24, income: 1500, trafficSource: 'TikTok', utmSource: 'tiktok', expectDq: false },
  { slug: 'short-form-editor', firstName: 'Emma', lastName: 'Visser', email: 'emma.v@seed.test', country: 'Netherlands', age: 27, refuseCommit: true, income: 2800, trafficSource: 'Job board', expectDq: true },
  { slug: 'creative-designer', firstName: 'Sofia', lastName: 'Marino', email: 'sofia.m@seed.test', country: 'Italy', age: 26, income: 1900, trafficSource: 'Instagram', utmSource: 'instagram', expectDq: false },
  { slug: 'creative-designer', firstName: 'Karabo', lastName: 'Dlamini', email: 'karabo.d@seed.test', country: 'South Africa', age: 23, income: 900, trafficSource: 'Friend or referral', referral: true, expectDq: false },
  { slug: 'full-stack-developer', firstName: 'Ivan', lastName: 'Horvat', email: 'ivan.h@seed.test', country: 'Croatia', age: 33, income: 4200, trafficSource: 'LinkedIn', referrerUrl: 'https://www.linkedin.com/feed/', expectDq: false },
  { slug: 'full-stack-developer', firstName: 'Priya', lastName: 'Naidoo', email: 'priya.n@seed.test', country: 'South Africa', age: 25, income: 2600, trafficSource: 'Job board', utmSource: 'offerzen', expectDq: false },
  { slug: 'customer-support', firstName: 'Ana', lastName: 'Silva', email: 'ana.s@seed.test', country: 'Portugal', age: 22, income: 1200, trafficSource: 'Other', expectDq: false },
  { slug: 'operations-assistant', firstName: 'Thabo', lastName: 'Mokoena', email: 'thabo.m@seed.test', country: 'South Africa', age: 30, income: 1400, trafficSource: 'YouTube', utmSource: 'youtube', expectDq: false },
  { slug: 'operations-assistant', firstName: 'Julia', lastName: 'Nowak', email: 'julia.n@seed.test', country: 'Poland', age: 14, income: 0, trafficSource: 'Instagram', expectDq: true },
];

function pickOption(field: Field, matcher: RegExp): string {
  return field.options?.find((o) => matcher.test(o)) ?? field.options?.[0] ?? '';
}

function valueFor(field: Field, persona: Persona): Answers[string] {
  const id = field.id;
  if (id === 'first_name') return persona.firstName;
  if (id === 'last_name') return persona.lastName;
  if (id === 'email') return persona.email;
  if (id === 'phone') return '+27821234567';
  if (/country/.test(id)) return persona.country;
  if (id === 'traffic_source') return persona.trafficSource;
  if (/^age$/.test(id) || /(^|_)age(_|$)/.test(id)) return persona.age;

  switch (field.type) {
    case 'single_choice':
    case 'legal_gate': {
      if (/referr/.test(id)) {
        return pickOption(field, persona.referral ? /^yes/i : /^no/i);
      }
      if (/student|enrolled/.test(id)) {
        return pickOption(field, persona.student ? /yes/i : /^no/i);
      }
      if (field.type === 'legal_gate') {
        return persona.refuseCommit
          ? pickOption(field, /cannot|can't|not able/i)
          : pickOption(field, /^(yes|i understand|i agree|i am all in)/i);
      }
      return field.options?.[1] ?? field.options?.[0] ?? '';
    }
    case 'multi_choice':
      return (field.options ?? []).slice(0, 2);
    case 'linear_scale':
      return field.max ? Math.min(8, field.max) : 8;
    case 'number':
      return /income|revenue/.test(id) ? persona.income : 42;
    case 'url':
      return 'https://example.com/portfolio';
    case 'email':
      return persona.email;
    case 'phone':
      return '+27821234567';
    case 'textarea':
      return `Seed persona answer from ${persona.firstName}: fibre plus LTE failover, five years of relevant delivery, and numbers to show for it.`;
    default:
      return `${persona.firstName} seed answer`;
  }
}

/** Walk the form with the real engine, filling answers as a candidate would. */
function walk(form: FormDefinition, persona: Persona) {
  const answers: Answers = {};
  const visited: string[] = [];
  let pageId: string | null = form.pages[0].id;

  for (let steps = 0; pageId !== null && steps <= form.pages.length; steps++) {
    const page = form.pages.find((p) => p.id === pageId);
    if (!page) throw new Error(`walk hit unknown page ${pageId}`);
    visited.push(page.id);
    if (page.kind === 'ending') break;
    for (const field of page.fields ?? []) {
      if (!field.required && field.type === 'textarea') continue;
      answers[field.id] = valueFor(field, persona);
    }
    pageId = nextPageId(form, page.id, answers);
  }

  return { answers, visited, endingId: visited[visited.length - 1] };
}

describe.runIf(process.env.SEED === '1')('seed 15 applications', () => {
  const packs = loadRolePacks(path.join(__dirname, '..', 'content', 'roles'));
  // SEED_PICK="0,6,10" submits only those persona indexes.
  const picks = process.env.SEED_PICK?.split(',').map(Number);
  const selected = picks
    ? [...PERSONAS.entries()].filter(([i]) => picks.includes(i))
    : [...PERSONAS.entries()];

  test('all personas submit successfully with expected outcomes', async () => {
    for (const [i, persona] of selected) {
      const pack = packs.find((p) => p.ad.slug === persona.slug);
      expect(pack, persona.slug).toBeDefined();
      const { answers, visited, endingId } = walk(pack!.form, persona);
      const sessionId = `seed-${i}-${persona.firstName.toLowerCase()}`;
      const ip = `10.20.0.${i + 1}`;

      // Funnel enter events along the real path (chunked for the API cap).
      const enters = visited
        .filter((p) => !p.startsWith('end'))
        .map((p) => ({ sessionId, slug: persona.slug, pageId: p, kind: 'enter' }));
      for (let c = 0; c < enters.length; c += 20) {
        const res = await fetch(`${BASE}/api/events`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
          body: JSON.stringify({ events: enters.slice(c, c + 20) }),
        });
        expect(res.status, `events ${persona.email}`).toBe(200);
      }

      const utm = persona.utmSource ? { utm_source: persona.utmSource } : undefined;
      const res = await fetch(`${BASE}/api/apply`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
        body: JSON.stringify({
          slug: persona.slug,
          answers,
          sessionId,
          utm,
          referrerUrl: persona.referrerUrl,
        }),
      });
      const body = (await res.json()) as { ok?: boolean; endingId?: string; error?: string };
      expect(res.status, `${persona.email}: ${JSON.stringify(body)}`).toBe(200);
      expect(body.ok).toBe(true);
      expect(body.endingId).toBe(endingId);

      const isDq = pack!.form.pages.find((p) => p.id === endingId)?.endingTone === 'dq';
      expect(isDq, `${persona.email} outcome`).toBe(persona.expectDq);
    }
  }, 120_000);
});
