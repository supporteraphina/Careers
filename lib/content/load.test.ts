import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { loadRolePack, loadRolePacks } from './load.js';

const FIXTURES = path.join(__dirname, 'fixtures');

describe('loadRolePack', () => {
  test('loads a valid pack with ad and form', () => {
    const pack = loadRolePack(path.join(FIXTURES, 'valid', 'demo-role.json'));
    expect(pack.ad.title).toBe('Demo Role');
    expect(pack.form.pages[0].id).toBe('intro');
  });

  test('throws when the form definition is structurally invalid', () => {
    expect(() =>
      loadRolePack(path.join(FIXTURES, 'invalid', 'broken-role.json')),
    ).toThrow(/last page/i);
  });

  test('throws when ad slug and form slug disagree', () => {
    expect(() =>
      loadRolePack(path.join(FIXTURES, 'invalid', 'mismatched-role.json')),
    ).toThrow(/slug/i);
  });
});

describe('loadRolePacks', () => {
  test('loads every pack in a directory, sorted by title', () => {
    const packs = loadRolePacks(path.join(FIXTURES, 'valid'));
    expect(packs.map((p) => p.ad.slug)).toEqual(['demo-role']);
  });

  test('throws when any pack in the directory is invalid', () => {
    expect(() => loadRolePacks(path.join(FIXTURES, 'invalid'))).toThrow();
  });
});
