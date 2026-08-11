// Airtable mirror of the applicant table. Every submission is pushed to the
// hiring base so review happens where the team already works; Postgres stays
// the system of record and /admin keeps working if Airtable is unreachable.
//
// Delivery rides on the existing WebhookDelivery rows, so a failed push is
// retried by the same maintenance endpoint as everything else.

import type { Answers } from '../engine/types';

export const AIRTABLE_API_ROOT = 'https://api.airtable.com/v0';

/** The hiring base and applicant table this deployment writes to. */
export function airtableConfig(): { apiKey: string; baseId: string; tableId: string } | null {
  const apiKey = process.env.AIRTABLE_API_KEY?.trim();
  if (!apiKey) return null;
  return {
    apiKey,
    baseId: process.env.AIRTABLE_BASE_ID?.trim() || 'appnZK5DOVp77Yt0T',
    tableId: process.env.AIRTABLE_TABLE_ID?.trim() || 'tblrs19DTtNnxrBFV',
  };
}

export function airtableEndpoint(baseId: string, tableId: string): string {
  return `${AIRTABLE_API_ROOT}/${baseId}/${tableId}`;
}

/** Whether a delivery URL is an Airtable write and needs the API key attached. */
export function isAirtableUrl(url: string): boolean {
  return url.startsWith(`${AIRTABLE_API_ROOT}/`);
}

/**
 * Answer field id -> Airtable field name.
 *
 * Keyed by the ids in content/roles/*.json. An answer with no entry here is
 * skipped rather than guessed at, because Airtable rejects the whole record
 * when it is sent a field name the table does not have.
 */
const FIELD_NAMES: Record<string, string> = {
  first_name: 'First Name',
  last_name: 'Last Name',
  email: 'Email',
  whatsapp_number: 'WhatsApp Number',
  discord_username: 'Discord Username',
  country: 'Country',
  english_level: 'Level of English',
  traffic_source: 'Where did you hear about us?',
  voice_note_url: 'Voice Note',
  load_shedding_setup: 'Load Shedding Setup',
};

/** Columns written from the application row rather than from an answer. */
const ROLE_FIELD = 'Role';
const APPLIED_AT_FIELD = 'Applied At';
const SOURCE_FIELD = 'Source';
const APPLICATION_ID_FIELD = 'Application ID';

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
  fields: Record<string, string>;
  typecast: boolean;
} {
  const fields: Record<string, string> = {};

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
    fields[name] = text;
  }

  fields[ROLE_FIELD] = application.role;
  fields[APPLIED_AT_FIELD] = application.createdAt.toISOString();
  fields[APPLICATION_ID_FIELD] = application.id;

  const source = sourceLabel(application.utm);
  if (source) fields[SOURCE_FIELD] = source;

  return { fields, typecast: true };
}
