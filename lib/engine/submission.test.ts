import { describe, expect, test } from 'vitest';
import type { FormDefinition } from './types.js';
import { evaluateSubmission } from './submission.js';

function gateForm(): FormDefinition {
  return {
    slug: 'gate',
    role: 'Gate',
    version: 1,
    pages: [
      { id: 'intro', kind: 'intro', title: 'Gate' },
      {
        id: 'q-name',
        kind: 'question',
        title: 'Name?',
        fields: [{ id: 'first_name', type: 'text', label: 'First name', required: true }],
      },
      {
        id: 'q-age',
        kind: 'question',
        title: 'Age?',
        fields: [{ id: 'age', type: 'number', label: 'Age', required: true }],
        logic: [{ if: { fieldId: 'age', op: 'lt', value: 16 }, goTo: 'end-dq' }],
      },
      {
        id: 'q-why',
        kind: 'question',
        title: 'Why?',
        fields: [{ id: 'why', type: 'textarea', label: 'Why', required: true }],
      },
      { id: 'end-ok', kind: 'ending', title: 'Thanks {first_name}', endingTone: 'standard' },
      { id: 'end-dq', kind: 'ending', title: 'Thanks {first_name}', endingTone: 'dq' },
    ],
  };
}

describe('evaluateSubmission', () => {
  test('accepts a complete standard-path submission', () => {
    const result = evaluateSubmission(gateForm(), {
      first_name: 'Thandi',
      age: 30,
      why: 'Because I ship.',
    });
    expect(result.ok).toBe(true);
    expect(result.outcome).toBe('standard');
    expect(result.endingId).toBe('end-ok');
    expect(result.path).toEqual(['intro', 'q-name', 'q-age', 'q-why', 'end-ok']);
  });

  test('routes an under-16 submission to the dq outcome', () => {
    const result = evaluateSubmission(gateForm(), { first_name: 'Sam', age: 15 });
    expect(result.ok).toBe(true);
    expect(result.outcome).toBe('dq');
    expect(result.endingId).toBe('end-dq');
    expect(result.path).toEqual(['intro', 'q-name', 'q-age', 'end-dq']);
  });

  test('does not require answers for pages the path never visits', () => {
    // why is required but unreachable on the dq path
    const result = evaluateSubmission(gateForm(), { first_name: 'Sam', age: 15 });
    expect(result.errors).toEqual({});
  });

  test('reports missing required answers on visited pages', () => {
    const result = evaluateSubmission(gateForm(), { age: 30 });
    expect(result.ok).toBe(false);
    expect(result.errors.first_name).toMatch(/required/i);
    expect(result.errors.why).toMatch(/required/i);
  });

  test('reports invalid values on visited pages', () => {
    const result = evaluateSubmission(gateForm(), {
      first_name: 'Sam',
      age: 'old',
      why: 'x',
    });
    expect(result.ok).toBe(false);
    expect(result.errors.age).toMatch(/number/i);
  });

  test('fails safely on forms whose logic loops', () => {
    const form = gateForm();
    form.pages[2].logic = [{ if: { fieldId: 'age', op: 'gte', value: 0 }, goTo: 'q-name' }];
    const result = evaluateSubmission(form, { first_name: 'Sam', age: 30, why: 'y' });
    expect(result.ok).toBe(false);
    expect(result.errors._form).toMatch(/loop/i);
  });
});
