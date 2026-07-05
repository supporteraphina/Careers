import { describe, expect, test } from 'vitest';
import type { Answers, FormDefinition, FormPage } from './types.js';
import {
  nextPageId,
  pipe,
  progress,
  validateFieldValue,
  validateForm,
} from './runner.js';

function page(overrides: Partial<FormPage> & { id: string }): FormPage {
  return { kind: 'question', title: overrides.id, ...overrides };
}

/** Minimal three-page form: intro -> question -> ending. */
function linearForm(): FormDefinition {
  return {
    slug: 'demo',
    role: 'Demo',
    version: 1,
    pages: [
      page({ id: 'intro', kind: 'intro' }),
      page({
        id: 'q-name',
        fields: [{ id: 'first_name', type: 'text', label: 'First name', required: true }],
      }),
      page({ id: 'end', kind: 'ending', endingTone: 'standard' }),
    ],
  };
}

/** Age-gated form modeling the educate.io pattern: under 16 silently DQs,
 * 16-25 gets the student question, over 25 skips it. */
function ageGateForm(): FormDefinition {
  return {
    slug: 'gate',
    role: 'Gate',
    version: 1,
    pages: [
      page({
        id: 'q-age',
        fields: [{ id: 'age', type: 'number', label: 'Age', required: true }],
        logic: [
          { if: { fieldId: 'age', op: 'lt', value: 16 }, goTo: 'end-dq' },
          { if: { fieldId: 'age', op: 'gt', value: 25 }, goTo: 'q-income' },
        ],
      }),
      page({
        id: 'q-student',
        fields: [
          {
            id: 'student',
            type: 'single_choice',
            label: 'Are you enrolled in school or university?',
            required: true,
            options: ['Yes', 'No'],
          },
        ],
        logic: [{ if: { fieldId: 'student', op: 'eq', value: 'Yes' }, goTo: 'end-dq' }],
      }),
      page({
        id: 'q-income',
        fields: [{ id: 'income', type: 'number', label: 'Income', required: true }],
      }),
      page({ id: 'end-ok', kind: 'ending', endingTone: 'standard' }),
      page({ id: 'end-dq', kind: 'ending', endingTone: 'dq' }),
    ],
  };
}

describe('nextPageId', () => {
  test('advances in array order when no logic matches', () => {
    const form = linearForm();
    expect(nextPageId(form, 'intro', {})).toBe('q-name');
    expect(nextPageId(form, 'q-name', { first_name: 'Thandi' })).toBe('end');
  });

  test('returns null on an ending page', () => {
    expect(nextPageId(linearForm(), 'end', {})).toBeNull();
  });

  test('throws on an unknown page id', () => {
    expect(() => nextPageId(linearForm(), 'nope', {})).toThrow(/unknown page/i);
  });

  test('under-16 answer jumps to the DQ ending', () => {
    expect(nextPageId(ageGateForm(), 'q-age', { age: 15 })).toBe('end-dq');
  });

  test('age 16-25 falls through to the student question', () => {
    expect(nextPageId(ageGateForm(), 'q-age', { age: 20 })).toBe('q-student');
  });

  test('over-25 answer skips the student question', () => {
    expect(nextPageId(ageGateForm(), 'q-age', { age: 30 })).toBe('q-income');
  });

  test('enrolled student is routed to the DQ ending', () => {
    expect(nextPageId(ageGateForm(), 'q-student', { student: 'Yes' })).toBe('end-dq');
  });

  test('non-student falls through to income', () => {
    expect(nextPageId(ageGateForm(), 'q-student', { student: 'No' })).toBe('q-income');
  });

  test('first matching rule wins when several match', () => {
    const form = ageGateForm();
    form.pages[0].logic = [
      { if: { fieldId: 'age', op: 'lt', value: 100 }, goTo: 'q-income' },
      { if: { fieldId: 'age', op: 'lt', value: 16 }, goTo: 'end-dq' },
    ];
    expect(nextPageId(form, 'q-age', { age: 10 })).toBe('q-income');
  });

  test('a missing answer never triggers a jump, for any operator', () => {
    const form = ageGateForm();
    form.pages[0].logic = [
      { if: { fieldId: 'age', op: 'lt', value: 16 }, goTo: 'end-dq' },
      { if: { fieldId: 'age', op: 'not_includes', value: 16 }, goTo: 'end-dq' },
      { if: { fieldId: 'age', op: 'neq', value: 16 }, goTo: 'end-dq' },
    ];
    expect(nextPageId(form, 'q-age', {})).toBe('q-student');
  });

  test('explicit next overrides array order but not logic', () => {
    const form = ageGateForm();
    form.pages[1].next = 'end-ok';
    expect(nextPageId(form, 'q-student', { student: 'No' })).toBe('end-ok');
    expect(nextPageId(form, 'q-student', { student: 'Yes' })).toBe('end-dq');
  });

  test('numeric comparisons treat numeric strings as numbers', () => {
    expect(nextPageId(ageGateForm(), 'q-age', { age: '15' })).toBe('end-dq');
    expect(nextPageId(ageGateForm(), 'q-age', { age: '30' })).toBe('q-income');
  });

  test('non-numeric answers make numeric comparisons false', () => {
    expect(nextPageId(ageGateForm(), 'q-age', { age: 'abc' })).toBe('q-student');
  });

  test('includes matches membership in multi-choice answers', () => {
    const form = linearForm();
    form.pages[1].fields = [
      {
        id: 'skills',
        type: 'multi_choice',
        label: 'Skills',
        required: true,
        options: ['Design', 'Video'],
      },
    ];
    form.pages[1].logic = [
      { if: { fieldId: 'skills', op: 'includes', value: 'Video' }, goTo: 'end' },
    ];
    expect(nextPageId(form, 'q-name', { skills: ['Design', 'Video'] })).toBe('end');
    expect(nextPageId(form, 'q-name', { skills: ['Design'] })).toBe('end');
  });

  test('not_includes matches when the value is absent from the answer', () => {
    const form = linearForm();
    form.pages[1].logic = [
      { if: { fieldId: 'skills', op: 'not_includes', value: 'Video' }, goTo: 'end' },
    ];
    expect(nextPageId(form, 'q-name', { skills: ['Design'] })).toBe('end');
  });
});

describe('pipe', () => {
  test('replaces tokens with answers', () => {
    expect(pipe('Nice to meet you, {first_name}.', { first_name: 'Thandi' })).toBe(
      'Nice to meet you, Thandi.',
    );
  });

  test('stringifies numeric answers', () => {
    expect(pipe('Being {age}, are you studying?', { age: 20 })).toBe(
      'Being 20, are you studying?',
    );
  });

  test('replaces missing answers with an empty string', () => {
    expect(pipe('Hello {first_name}!', {})).toBe('Hello !');
  });

  test('leaves text without tokens untouched', () => {
    expect(pipe('Two phases.', { x: 'y' })).toBe('Two phases.');
  });
});

describe('validateForm', () => {
  test('accepts a well-formed definition', () => {
    expect(validateForm(ageGateForm())).toEqual([]);
  });

  test('flags duplicate page ids', () => {
    const form = linearForm();
    form.pages[1].id = 'intro';
    expect(validateForm(form).join(' ')).toMatch(/duplicate page id/i);
  });

  test('flags duplicate field ids across pages', () => {
    const form = ageGateForm();
    form.pages[2].fields = [{ id: 'age', type: 'number', label: 'Age again', required: true }];
    expect(validateForm(form).join(' ')).toMatch(/duplicate field id/i);
  });

  test('flags logic jumps to unknown pages', () => {
    const form = ageGateForm();
    form.pages[0].logic = [{ if: { fieldId: 'age', op: 'lt', value: 16 }, goTo: 'ghost' }];
    expect(validateForm(form).join(' ')).toMatch(/unknown page "ghost"/i);
  });

  test('flags next pointing at an unknown page', () => {
    const form = linearForm();
    form.pages[0].next = 'ghost';
    expect(validateForm(form).join(' ')).toMatch(/unknown page "ghost"/i);
  });

  test('flags logic conditions on unknown field ids', () => {
    const form = ageGateForm();
    form.pages[0].logic = [{ if: { fieldId: 'ghost', op: 'eq', value: 1 }, goTo: 'end-dq' }];
    expect(validateForm(form).join(' ')).toMatch(/unknown field "ghost"/i);
  });

  test('flags ending pages with fields or logic', () => {
    const form = linearForm();
    form.pages[2].fields = [{ id: 'x', type: 'text', label: 'X', required: false }];
    expect(validateForm(form).join(' ')).toMatch(/ending/i);
  });

  test('requires the final page to be an ending', () => {
    const form = linearForm();
    form.pages.push(page({ id: 'trailing' }));
    expect(validateForm(form).join(' ')).toMatch(/last page/i);
  });

  test('flags choice fields without options', () => {
    const form = linearForm();
    form.pages[1].fields = [
      { id: 'pick', type: 'single_choice', label: 'Pick', required: true },
    ];
    expect(validateForm(form).join(' ')).toMatch(/options/i);
  });
});

describe('validateFieldValue', () => {
  const req = { id: 'f', label: 'F', required: true } as const;

  test('rejects empty required values', () => {
    expect(validateFieldValue({ ...req, type: 'text' }, '')).toMatch(/required/i);
    expect(validateFieldValue({ ...req, type: 'text' }, undefined)).toMatch(/required/i);
    expect(validateFieldValue({ ...req, type: 'multi_choice', options: ['A'] }, [])).toMatch(
      /required/i,
    );
  });

  test('accepts empty optional values', () => {
    expect(validateFieldValue({ ...req, required: false, type: 'text' }, '')).toBeNull();
  });

  test('validates email shape', () => {
    expect(validateFieldValue({ ...req, type: 'email' }, 'not-an-email')).toMatch(/email/i);
    expect(validateFieldValue({ ...req, type: 'email' }, 'a@b.co')).toBeNull();
  });

  test('validates url shape', () => {
    expect(validateFieldValue({ ...req, type: 'url' }, 'not a url')).toMatch(/link/i);
    expect(validateFieldValue({ ...req, type: 'url' }, 'https://example.com/x')).toBeNull();
  });

  test('validates phone digit count', () => {
    expect(validateFieldValue({ ...req, type: 'phone' }, '12')).toMatch(/phone/i);
    expect(validateFieldValue({ ...req, type: 'phone' }, '+27 82 555 0100')).toBeNull();
  });

  test('validates numbers and bounds', () => {
    expect(validateFieldValue({ ...req, type: 'number' }, 'abc')).toMatch(/number/i);
    expect(validateFieldValue({ ...req, type: 'number', min: 0 }, -5)).toMatch(/at least/i);
    expect(validateFieldValue({ ...req, type: 'number', max: 10 }, 11)).toMatch(/at most/i);
    expect(validateFieldValue({ ...req, type: 'number' }, 42)).toBeNull();
  });

  test('validates linear_scale within bounds', () => {
    const scale = { ...req, type: 'linear_scale' as const, min: 1, max: 10 };
    expect(validateFieldValue(scale, 0)).toMatch(/at least/i);
    expect(validateFieldValue(scale, 7)).toBeNull();
  });

  test('rejects choices outside the options list', () => {
    const single = { ...req, type: 'single_choice' as const, options: ['Yes', 'No'] };
    expect(validateFieldValue(single, 'Maybe')).toMatch(/choose/i);
    expect(validateFieldValue(single, 'Yes')).toBeNull();
    const multi = { ...req, type: 'multi_choice' as const, options: ['A', 'B'] };
    expect(validateFieldValue(multi, ['A', 'C'])).toMatch(/choose/i);
    expect(validateFieldValue(multi, ['A', 'B'])).toBeNull();
  });
});

describe('progress', () => {
  test('reports 1-based position and total', () => {
    const form = linearForm();
    expect(progress(form, 'intro')).toEqual({ index: 1, total: 3 });
    expect(progress(form, 'end')).toEqual({ index: 3, total: 3 });
  });

  test('throws on unknown page id', () => {
    expect(() => progress(linearForm(), 'nope')).toThrow(/unknown page/i);
  });
});
