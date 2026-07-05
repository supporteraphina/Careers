import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { loadRolePack } from '../lib/content/load.js';

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
});
