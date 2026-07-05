// Server-side re-evaluation of a submitted funnel run. The client walks the
// form interactively; this walks it again from scratch so a tampered payload
// cannot skip validation or forge an outcome.

import { nextPageId, validateFieldValue } from './runner.js';
import type { Answers, FormDefinition } from './types.js';

export interface SubmissionResult {
  ok: boolean;
  /** Field id -> error message. `_form` holds structural problems. */
  errors: Record<string, string>;
  /** Page ids visited, in order, ending page included. */
  path: string[];
  endingId: string | null;
  outcome: 'standard' | 'dq' | null;
}

export function evaluateSubmission(
  form: FormDefinition,
  answers: Answers,
): SubmissionResult {
  const errors: Record<string, string> = {};
  const path: string[] = [];

  let pageId: string | null = form.pages[0]?.id ?? null;
  let endingId: string | null = null;
  let outcome: SubmissionResult['outcome'] = null;

  // A valid walk visits each page at most once; anything longer is a loop.
  for (let steps = 0; pageId !== null; steps++) {
    if (steps > form.pages.length) {
      return {
        ok: false,
        errors: { _form: 'Form logic loops; submission cannot be evaluated.' },
        path,
        endingId: null,
        outcome: null,
      };
    }

    const page = form.pages.find((p) => p.id === pageId);
    if (!page) {
      return {
        ok: false,
        errors: { _form: `Form path reached unknown page "${pageId}".` },
        path,
        endingId: null,
        outcome: null,
      };
    }

    path.push(page.id);

    if (page.kind === 'ending') {
      endingId = page.id;
      outcome = page.endingTone === 'dq' ? 'dq' : 'standard';
      break;
    }

    for (const field of page.fields ?? []) {
      const error = validateFieldValue(field, answers[field.id]);
      if (error) errors[field.id] = error;
    }

    pageId = nextPageId(form, page.id, answers);
  }

  return {
    ok: Object.keys(errors).length === 0 && endingId !== null,
    errors,
    path,
    endingId,
    outcome,
  };
}
