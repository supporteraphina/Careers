// Airtable mirror of the applicant table. Every submission is pushed to the
// hiring base so review happens where the team already works; Postgres stays
// the system of record and /admin keeps working if Airtable is unreachable.
//
// Delivery rides on the existing WebhookDelivery rows, so a failed push is
// retried by the same maintenance endpoint as everything else.

import type { Answers } from '../engine/types';

export const AIRTABLE_API_ROOT = 'https://api.airtable.com/v0';

/**
 * Where submissions are mirrored. Known without any configuration, so a
 * deployment that has not been given a key yet still queues its applications
 * instead of dropping them: the rows sit pending and go out on the first retry
 * after the key lands.
 */
export function airtableTarget(): { baseId: string; tableId: string } {
  return {
    baseId: process.env.AIRTABLE_BASE_ID?.trim() || 'appnZK5DOVp77Yt0T',
    tableId: process.env.AIRTABLE_TABLE_ID?.trim() || 'tblrs19DTtNnxrBFV',
  };
}

/** The API key, or null when this deployment has not been given one. */
export function airtableApiKey(): string | null {
  return process.env.AIRTABLE_API_KEY?.trim() || null;
}

export function airtableEndpoint(baseId: string, tableId: string): string {
  return `${AIRTABLE_API_ROOT}/${baseId}/${tableId}`;
}

/** Whether a delivery URL is an Airtable write and needs the API key attached. */
export function isAirtableUrl(url: string): boolean {
  return url.startsWith(`${AIRTABLE_API_ROOT}/`);
}

/**
 * Answer field id -> Airtable field name, matching the Recruitment table as it
 * actually is. The names are not guessable — it is 'Surname' not 'Last Name',
 * 'Whatsapp Number' with a lowercase s, 'Nationality' for country. An answer
 * with no entry here is skipped rather than guessed at, because Airtable
 * rejects the whole record when sent a field name the table does not have.
 */
const FIELD_NAMES: Record<string, string> = {
  first_name: 'First Name',
  last_name: 'Surname',
  email: 'Email',
  whatsapp_number: 'Whatsapp Number',
  discord_username: 'Discord Username',
  country: 'Nationality',
  english_level: 'Level of English',
  traffic_source: 'How did you hear about us?',
  voice_note_url: 'Voice Note',
  load_shedding_setup: 'Load Shedding Setup',
};

/**
 * Our plain-English options -> the CEFR options already in the 'Level of
 * English' single select. Without this the sync would quietly add a second,
 * parallel set of choices to a column the team filters on.
 */
const ENGLISH_LEVELS: Record<string, string> = {
  'Native or bilingual': 'Native (mother language)',
  Fluent: 'C2 (fluent)',
  Advanced: 'C1 (high-intermediate)',
  Intermediate: 'B2 (intermediate)',
  Basic: 'B1 (basic)',
};

/** Columns written from the application row rather than from an answer. */
const ROLE_FIELD = 'Applied For';
const SOURCE_FIELD = 'Campaign Source';
const APPLICATION_ID_FIELD = 'Application ID';
/** Pipeline checkboxes the team would otherwise tick by hand. */
const FORM_DONE_FIELD = 'Stage 1: Form';
const AUDIO_RECEIVED_FIELD = 'Audio received?';

export interface ApplicationForAirtable {
  id: string;
  role: string;
  createdAt: Date;
  utm: string | null;
  answers: string;
}

/** Best-effort campaign label from the captured UTM parameters. */
function sourceLabel(utm: string | null): string | null {
  if (!utm) return null;
  try {
    const parsed = JSON.parse(utm) as Record<string, string>;
    const parts = [parsed.utm_source, parsed.utm_medium, parsed.utm_campaign].filter(Boolean);
    return parts.length > 0 ? parts.join(' / ') : (parsed.ref ?? null);
  } catch {
    return null;
  }
}

/**
 * Build the Airtable record body. `typecast` lets Airtable coerce a value into
 * a single select option it has not seen before — without it, one new country
 * in the dropdown would start rejecting applications.
 */
export function buildAirtableRecord(application: ApplicationForAirtable): {
  fields: Record<string, string | boolean>;
  typecast: boolean;
} {
  const fields: Record<string, string | boolean> = {};

  let answers: Answers = {};
  try {
    answers = JSON.parse(application.answers) as Answers;
  } catch {
    // A row we cannot parse still deserves its identity columns.
  }

  for (const [fieldId, name] of Object.entries(FIELD_NAMES)) {
    const value = answers[fieldId];
    if (value === undefined) continue;
    const text = Array.isArray(value) ? value.join(', ') : String(value);
    if (text.trim() === '') continue;
    fields[name] = fieldId === 'english_level' ? (ENGLISH_LEVELS[text] ?? text) : text;
  }

  fields[ROLE_FIELD] = application.role;
  fields[APPLICATION_ID_FIELD] = application.id;
  // They reached an ending, so the form stage is genuinely complete.
  fields[FORM_DONE_FIELD] = true;
  if (fields['Voice Note']) fields[AUDIO_RECEIVED_FIELD] = true;

  const source = sourceLabel(application.utm);
  if (source) fields[SOURCE_FIELD] = source;

  // 'Created date' is a computed createdTime column, so the row stamps itself.
  return { fields, typecast: true };
}
