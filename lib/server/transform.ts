// Pure transforms for the data layer. No IO; unit tested in transform.test.ts.

import type { Answers, FormDefinition } from '../engine/types';

export interface AnswerRow {
  fieldId: string;
  value: string;
}

/**
 * Flatten submitted answers into one row per value, in form field order.
 * Array answers (multi_choice) become one row per selected option so they
 * stay queryable. Unknown fields and empty values are dropped.
 */
export function flattenAnswers(form: FormDefinition, answers: Answers): AnswerRow[] {
  const rows: AnswerRow[] = [];
  for (const page of form.pages) {
    for (const field of page.fields ?? []) {
      const value = answers[field.id];
      if (value === undefined) continue;
      if (Array.isArray(value)) {
        for (const item of value) {
          if (String(item).trim() !== '') rows.push({ fieldId: field.id, value: String(item) });
        }
      } else if (String(value).trim() !== '') {
        rows.push({ fieldId: field.id, value: String(value) });
      }
    }
  }
  return rows;
}

/** The instant N months before `now`, clamping day-of-month underflow. */
export function retentionCutoff(now: Date, months: number): Date {
  const cutoff = new Date(now);
  const day = cutoff.getUTCDate();
  cutoff.setUTCDate(1);
  cutoff.setUTCMonth(cutoff.getUTCMonth() - months);
  const daysInTarget = new Date(
    Date.UTC(cutoff.getUTCFullYear(), cutoff.getUTCMonth() + 1, 0),
  ).getUTCDate();
  cutoff.setUTCDate(Math.min(day, daysInTarget));
  return cutoff;
}
