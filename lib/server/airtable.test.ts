import { describe, expect, test } from 'vitest';
import { buildAirtableRecord, isAirtableUrl } from './airtable';

const APPLIED = new Date('2026-08-11T09:30:00.000Z');

function application(overrides: Partial<Parameters<typeof buildAirtableRecord>[0]> = {}) {
  return {
    id: 'app_123',
    role: 'Chat Sales Operator',
    createdAt: APPLIED,
    utm: null as string | null,
    answers: JSON.stringify({
      first_name: 'Ada',
      last_name: 'Nkosi',
      email: 'ada@example.com',
      whatsapp_number: '+27 82 555 0134',
      country: 'South Africa',
      english_level: 'Fluent',
      traffic_source: 'Instagram',
      voice_note_url: 'https://careers.halevorasolutions.com/voice/clw1test0000abcd0123.webm',
    }),
    ...overrides,
  };
}

describe('buildAirtableRecord', () => {
  test('maps answers onto the table column names', () => {
    const { fields } = buildAirtableRecord(application());
    expect(fields['First Name']).toBe('Ada');
    expect(fields['Email']).toBe('ada@example.com');
    expect(fields['Level of English']).toBe('Fluent');
    expect(fields['Where did you hear about us?']).toBe('Instagram');
  });

  test('sends the voice note as the hosted link', () => {
    const { fields } = buildAirtableRecord(application());
    expect(fields['Voice Note']).toBe(
      'https://careers.halevorasolutions.com/voice/clw1test0000abcd0123.webm',
    );
  });

  test('stamps role, timestamp, and the id that ties a row back to Postgres', () => {
    const { fields } = buildAirtableRecord(application());
    expect(fields['Role']).toBe('Chat Sales Operator');
    expect(fields['Applied At']).toBe('2026-08-11T09:30:00.000Z');
    expect(fields['Application ID']).toBe('app_123');
  });

  // Airtable 422s the whole record over one unknown column, which would lose
  // the application entirely.
  test('never invents a column for an unmapped answer', () => {
    const { fields } = buildAirtableRecord(
      application({ answers: JSON.stringify({ first_name: 'Ada', mystery_field: 'x' }) }),
    );
    expect(Object.keys(fields)).not.toContain('mystery_field');
    expect(fields['First Name']).toBe('Ada');
  });

  test('omits blank and missing answers rather than writing empty cells', () => {
    const { fields } = buildAirtableRecord(
      application({ answers: JSON.stringify({ first_name: 'Ada', discord_username: '  ' }) }),
    );
    expect(fields).not.toHaveProperty('Discord Username');
    expect(fields).not.toHaveProperty('Email');
  });

  test('flattens a multi-select answer', () => {
    const { fields } = buildAirtableRecord(
      application({ answers: JSON.stringify({ english_level: ['Fluent', 'Advanced'] }) }),
    );
    expect(fields['Level of English']).toBe('Fluent, Advanced');
  });

  test('summarises UTM capture into one Source cell', () => {
    const { fields } = buildAirtableRecord(
      application({
        utm: JSON.stringify({ utm_source: 'meta', utm_medium: 'paid', utm_campaign: 'aug' }),
      }),
    );
    expect(fields['Source']).toBe('meta / paid / aug');
  });

  test('falls back to the ref tag, and stays quiet with no attribution', () => {
    expect(buildAirtableRecord(application({ utm: JSON.stringify({ ref: 'kd' }) })).fields.Source).toBe(
      'kd',
    );
    expect(buildAirtableRecord(application()).fields).not.toHaveProperty('Source');
    expect(buildAirtableRecord(application({ utm: 'not json' })).fields).not.toHaveProperty(
      'Source',
    );
  });

  test('still identifies a row whose answers JSON is corrupt', () => {
    const { fields } = buildAirtableRecord(application({ answers: '{oops' }));
    expect(fields['Application ID']).toBe('app_123');
    expect(fields['Role']).toBe('Chat Sales Operator');
  });

  test('typecasts so a new dropdown value cannot start rejecting applications', () => {
    expect(buildAirtableRecord(application()).typecast).toBe(true);
  });
});

describe('isAirtableUrl', () => {
  test('recognises Airtable delivery rows and nothing else', () => {
    expect(isAirtableUrl('https://api.airtable.com/v0/appX/tblY')).toBe(true);
    expect(isAirtableUrl('https://hook.make.com/abc')).toBe(false);
    expect(isAirtableUrl('https://api.airtable.com.evil.example/v0/x')).toBe(false);
  });
});
