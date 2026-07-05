// Pure navigation, piping, and validation logic for funnel forms.
// No React, no IO. Every branch here decides whether an applicant
// continues or silently exits, so keep runner.test.ts exhaustive.

import type {
  Answers,
  AnswerValue,
  Condition,
  Field,
  FormDefinition,
  FormPage,
} from './types.js';

function getPage(form: FormDefinition, pageId: string): FormPage {
  const found = form.pages.find((p) => p.id === pageId);
  if (!found) throw new Error(`Unknown page "${pageId}" in form "${form.slug}"`);
  return found;
}

function asNumber(value: AnswerValue): number | null {
  if (Array.isArray(value)) return null;
  const n = typeof value === 'number' ? value : Number(String(value).trim());
  return Number.isFinite(n) && String(value).trim() !== '' ? n : null;
}

function conditionHolds(cond: Condition, answers: Answers): boolean {
  const answer = answers[cond.fieldId];
  // A missing answer never triggers a jump, whatever the operator.
  if (answer === undefined) return false;

  switch (cond.op) {
    case 'eq':
      return String(answer) === String(cond.value);
    case 'neq':
      return String(answer) !== String(cond.value);
    case 'lt':
    case 'lte':
    case 'gt':
    case 'gte': {
      const a = asNumber(answer);
      const b = asNumber(cond.value);
      if (a === null || b === null) return false;
      if (cond.op === 'lt') return a < b;
      if (cond.op === 'lte') return a <= b;
      if (cond.op === 'gt') return a > b;
      return a >= b;
    }
    case 'includes':
    case 'not_includes': {
      const values = Array.isArray(answer) ? answer.map(String) : [String(answer)];
      const has = values.includes(String(cond.value));
      return cond.op === 'includes' ? has : !has;
    }
  }
}

/**
 * Decide the page that follows `currentPageId` given the answers so far.
 * Logic rules run in order and the first match wins; otherwise the page's
 * `next` applies; otherwise array order. Ending pages return null.
 */
export function nextPageId(
  form: FormDefinition,
  currentPageId: string,
  answers: Answers,
): string | null {
  const current = getPage(form, currentPageId);
  if (current.kind === 'ending') return null;

  for (const rule of current.logic ?? []) {
    if (conditionHolds(rule.if, answers)) return rule.goTo;
  }
  if (current.next) return current.next;

  const index = form.pages.indexOf(current);
  const following = form.pages[index + 1];
  return following ? following.id : null;
}

/** Replace {field_id} tokens with answers; missing answers become ''. */
export function pipe(text: string, answers: Answers): string {
  return text.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, key: string) => {
    const value = answers[key];
    if (value === undefined) return '';
    return Array.isArray(value) ? value.join(', ') : String(value);
  });
}

/** 1-based position of a page and the total page count. */
export function progress(
  form: FormDefinition,
  pageId: string,
): { index: number; total: number } {
  const page = getPage(form, pageId);
  return { index: form.pages.indexOf(page) + 1, total: form.pages.length };
}

const CHOICE_TYPES = new Set(['single_choice', 'multi_choice', 'legal_gate']);

/** Structural validation of a form definition. Returns a list of problems. */
export function validateForm(form: FormDefinition): string[] {
  const errors: string[] = [];
  const pageIds = new Set<string>();
  const fieldIds = new Set<string>();

  for (const page of form.pages) {
    if (pageIds.has(page.id)) errors.push(`Duplicate page id "${page.id}"`);
    pageIds.add(page.id);
    for (const field of page.fields ?? []) {
      if (fieldIds.has(field.id)) errors.push(`Duplicate field id "${field.id}"`);
      fieldIds.add(field.id);
      if (CHOICE_TYPES.has(field.type) && !(field.options?.length)) {
        errors.push(`Field "${field.id}" of type ${field.type} needs options`);
      }
    }
  }

  for (const page of form.pages) {
    for (const rule of page.logic ?? []) {
      if (!pageIds.has(rule.goTo)) {
        errors.push(`Page "${page.id}" jumps to unknown page "${rule.goTo}"`);
      }
      if (!fieldIds.has(rule.if.fieldId)) {
        errors.push(`Page "${page.id}" tests unknown field "${rule.if.fieldId}"`);
      }
    }
    if (page.next && !pageIds.has(page.next)) {
      errors.push(`Page "${page.id}" points next at unknown page "${page.next}"`);
    }
    if (page.kind === 'ending' && ((page.fields?.length ?? 0) > 0 || (page.logic?.length ?? 0) > 0)) {
      errors.push(`Ending page "${page.id}" must have no fields and no logic`);
    }
  }

  const last = form.pages[form.pages.length - 1];
  if (!last || last.kind !== 'ending') {
    errors.push('The last page must be an ending so array-order fallthrough always terminates');
  }

  return errors;
}

function isEmpty(value: AnswerValue | undefined): boolean {
  if (value === undefined) return true;
  if (Array.isArray(value)) return value.length === 0;
  return String(value).trim() === '';
}

/** Validate one answer against its field. Returns an error message or null. */
export function validateFieldValue(
  field: Omit<Field, 'type'> & { type: Field['type'] },
  value: AnswerValue | undefined,
): string | null {
  if (isEmpty(value)) {
    return field.required ? 'This field is required.' : null;
  }

  switch (field.type) {
    case 'email': {
      const text = String(value);
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text) ? null : 'Enter a valid email address.';
    }
    case 'url': {
      try {
        const url = new URL(String(value));
        return url.protocol === 'http:' || url.protocol === 'https:'
          ? null
          : 'Enter a valid link.';
      } catch {
        return 'Enter a valid link.';
      }
    }
    case 'phone': {
      const digits = String(value).replace(/\D/g, '');
      return digits.length >= 7 ? null : 'Enter a valid phone number.';
    }
    case 'number':
    case 'linear_scale': {
      const n = asNumber(value as AnswerValue);
      if (n === null) return 'Enter a number.';
      if (field.min !== undefined && n < field.min) return `Enter at least ${field.min}.`;
      if (field.max !== undefined && n > field.max) return `Enter at most ${field.max}.`;
      return null;
    }
    case 'single_choice':
    case 'legal_gate': {
      return field.options?.includes(String(value)) ? null : 'Choose one of the options.';
    }
    case 'multi_choice': {
      const values = Array.isArray(value) ? value : [value];
      return values.every((v) => field.options?.includes(String(v)))
        ? null
        : 'Choose from the options.';
    }
    default:
      return null;
  }
}
