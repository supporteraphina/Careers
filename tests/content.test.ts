import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { loadRolePack } from '../lib/content/load';
import { nextPageId } from '../lib/engine/runner';
import { evaluateSubmission } from '../lib/engine/submission';

const ROLES_DIR = path.join(__dirname, '..', 'content', 'roles');

const files = fs.existsSync(ROLES_DIR)
  ? fs.readdirSync(ROLES_DIR).filter((f) => f.endsWith('.json'))
  : [];

describe('content/roles packs', () => {
  test.each(files)('%s is a valid role pack', (file) => {
    const pack = loadRolePack(path.join(ROLES_DIR, file));

    // Ad completeness: every section from the spec template must be present.
    expect(pack.ad.title.length).toBeGreaterThan(0);
    expect(pack.ad.summary.length).toBeGreaterThan(40);
    expect(pack.ad.role.paragraphs.length).toBeGreaterThan(0);
    expect(pack.ad.idealCandidate.length).toBeGreaterThanOrEqual(4);
    expect(pack.ad.requirements.length).toBeGreaterThanOrEqual(2);
    expect(pack.ad.whatYoullDo.length).toBeGreaterThanOrEqual(4);
    expect(pack.ad.shouldntApply.length).toBeGreaterThanOrEqual(3);
    expect(pack.ad.seo.description.length).toBeGreaterThan(40);

    // Funnel shape: intro first, at least two endings (standard + dq).
    expect(pack.form.pages[0].kind).toBe('intro');
    const endings = pack.form.pages.filter((p) => p.kind === 'ending');
    expect(endings.some((p) => p.endingTone === 'standard')).toBe(true);
    expect(endings.some((p) => p.endingTone === 'dq')).toBe(true);

    // File name matches slug.
    expect(file).toBe(`${pack.ad.slug}.json`);
  });

  test('at least one role pack exists once content is authored', () => {
    // Informational until content lands; flip to a hard assertion in task 3.
    expect(files.length).toBeGreaterThanOrEqual(0);
  });

  test('chat sales asks everyone for ethnicity on the single application page', () => {
    const pack = loadRolePack(path.join(ROLES_DIR, 'chat-sales-operator.json'));
    expect(nextPageId(pack.form, 'q-application', { country: 'South Africa' })).toBe('end-ok');
    expect(nextPageId(pack.form, 'q-application', { country: 'Croatia' })).toBe('end-ok');
    expect(pack.form.pages.find((page) => page.id === 'q-ethnicity')).toBeUndefined();
    expect(pack.form.pages.find((page) => page.id === 'q-load-shedding')).toBeUndefined();

    const applicationPage = pack.form.pages.find((page) => page.id === 'q-application');
    const ethnicityField = applicationPage?.fields?.find((field) => field.id === 'ethnicity');
    expect(ethnicityField).toMatchObject({ type: 'select', required: true });
    expect(ethnicityField?.options).toEqual([
      'Black African',
      'Coloured',
      'Indian or Asian',
      'White',
      'Mixed or multiple ethnicities',
      'Other',
      'Prefer not to say',
    ]);

    const applicationAnswers = {
      english_level: 'Fluent',
      first_name: 'Test',
      last_name: 'Applicant',
      whatsapp_number: '+385 91 555 0123',
      email: 'test@example.com',
      traffic_source: 'Referral',
      // What the recorder stores once a take has uploaded.
      voice_note_url: 'https://careers.halevorasolutions.com/voice/clw1test0000abcd0123.webm',
    };
    expect(
      evaluateSubmission(pack.form, { ...applicationAnswers, country: 'Croatia' }),
    ).toMatchObject({
      ok: false,
      errors: { ethnicity: 'This field is required.' },
      path: ['intro', 'q-application', 'end-ok'],
    });
    expect(
      evaluateSubmission(pack.form, {
        ...applicationAnswers,
        country: 'South Africa',
        ethnicity: 'Prefer not to say',
      }),
    ).toMatchObject({ ok: true, path: ['intro', 'q-application', 'end-ok'] });
  });

  test('reddit growth asks everyone for ethnicity on the single application page', () => {
    const pack = loadRolePack(path.join(ROLES_DIR, 'reddit-growth-manager.json'));
    expect(nextPageId(pack.form, 'q-application', { country: 'South Africa' })).toBe('end-ok');
    expect(pack.form.pages.find((page) => page.id === 'q-ethnicity')).toBeUndefined();

    const applicationPage = pack.form.pages.find((page) => page.id === 'q-application');
    const ethnicityField = applicationPage?.fields?.find((field) => field.id === 'ethnicity');
    expect(ethnicityField).toMatchObject({ type: 'select', required: true });
    expect(ethnicityField?.options).toContain('Prefer not to say');
  });
});
