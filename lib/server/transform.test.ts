import { describe, expect, test } from 'vitest';
import type { FormDefinition } from '../engine/types';
import { flattenAnswers, retentionCutoff } from './transform';

const form: FormDefinition = {
  slug: 'demo',
  role: 'Demo',
  version: 1,
  pages: [
    { id: 'intro', kind: 'intro', title: 'Demo' },
    {
      id: 'q-a',
      kind: 'question',
      title: 'A',
      fields: [
        { id: 'first_name', type: 'text', label: 'First name', required: true },
        { id: 'age', type: 'number', label: 'Age', required: true },
      ],
    },
    {
      id: 'q-b',
      kind: 'question',
      title: 'B',
      fields: [
        {
          id: 'skills',
          type: 'multi_choice',
          label: 'Skills',
          required: true,
          options: ['Design', 'Video', 'Copy'],
        },
      ],
    },
    { id: 'end', kind: 'ending', title: 'Bye', endingTone: 'standard' },
  ],
};

describe('flattenAnswers', () => {
  test('produces one row per scalar answer, stringified', () => {
    const rows = flattenAnswers(form, { first_name: 'Thandi', age: 30 });
    expect(rows).toEqual([
      { fieldId: 'first_name', value: 'Thandi' },
      { fieldId: 'age', value: '30' },
    ]);
  });

  test('produces one row per selected option for array answers', () => {
    const rows = flattenAnswers(form, { skills: ['Design', 'Copy'] });
    expect(rows).toEqual([
      { fieldId: 'skills', value: 'Design' },
      { fieldId: 'skills', value: 'Copy' },
    ]);
  });

  test('ignores answers for fields the form does not define', () => {
    expect(flattenAnswers(form, { ghost: 'boo' })).toEqual([]);
  });

  test('skips empty and undefined values', () => {
    expect(flattenAnswers(form, { first_name: '  ', skills: [] })).toEqual([]);
  });
});

describe('retentionCutoff', () => {
  test('returns the moment N months before now', () => {
    const now = new Date('2026-07-05T12:00:00Z');
    expect(retentionCutoff(now, 12).toISOString()).toBe('2025-07-05T12:00:00.000Z');
  });

  test('clamps across shorter months instead of overflowing', () => {
    const now = new Date('2026-03-31T00:00:00Z');
    const cutoff = retentionCutoff(now, 1);
    expect(cutoff.getUTCMonth()).toBe(1); // February
    expect(cutoff.getUTCDate()).toBe(28);
  });
});
