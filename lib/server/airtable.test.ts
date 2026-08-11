import { describe, expect, test } from 'vitest';
import { buildAirtableRecord, isAirtableUrl } from './airtable';

const APPLIED = new Date('2026-08-11T09:30:00.000Z');

function application(overrides: Partial<Parameters<typeof buildAirtableRecord>[0]> = {}) {
  return {
    id: 'app_123',
    slug: 'chat-sales-operator',
    role: 'Chat Sales Operator',
    createdAt: APPLIED,
    utm: null as string | null,
    answers: JSON.stringify({
      first_name: 'Ada',
      last_name: 'Nkosi',
      email: 'ada@example.com',
      whatsapp_number: '+27 82 555 0134',
      country: 'South Africa',
      ethnicity: 'Black African',
      english_level: 'Fluent',
      traffic_source: 'Instagram',
      voice_note_url: 'https://careers.halevorasolutions.com/voice/clw1test0000abcd0123.webm',
    }),
    ...overrides,
  };
}

describe('buildAirtableRecord', () => {
  // The Recruitment table's names are not the obvious ones; these assertions
  // are the guard against drifting back to guessed-at column names.
  test('maps answers onto the Recruitment table column names', () => {
    const { fields } = buildAirtableRecord(application());
    expect(fields['First Name']).toBe('Ada');
    expect(fields['Surname']).toBe('Nkosi');
    expect(fields['Email']).toBe('ada@example.com');
    expect(fields['Whatsapp Number']).toBe('+27 82 555 0134');
    expect(fields['Nationality']).toBe('South Africa');
    expect(fields['Ethnicity']).toBe('Black African');
    expect(fields['How did you hear about us?']).toBe('Instagram');
  });

  // Writing 'Fluent' into a select whose options are CEFR grades would add a
  // duplicate choice to a column the team filters on.
  test('translates English level into the existing CEFR options', () => {
    const level = (value: string) =>
      buildAirtableRecord(application({ answers: JSON.stringify({ english_level: value }) }))
        .fields['Level of English'];
    expect(level('Native or bilingual')).toBe('Native (mother language)');
    expect(level('Fluent')).toBe('C2 (fluent)');
    expect(level('Advanced')).toBe('C1 (high-intermediate)');
    expect(level('Intermediate')).toBe('B2 (intermediate)');
    expect(level('Basic')).toBe('B1 (basic)');
  });

  test('passes an unrecognised level through for typecast to handle', () => {
    const { fields } = buildAirtableRecord(
      application({ answers: JSON.stringify({ english_level: 'Conversational' }) }),
    );
    expect(fields['Level of English']).toBe('Conversational');
  });

  test('sends the voice note as the hosted link', () => {
    const { fields } = buildAirtableRecord(application());
    expect(fields['Voice Note']).toBe(
      'https://careers.halevorasolutions.com/voice/clw1test0000abcd0123.webm',
    );
  });

  test('ticks the pipeline checkboxes the submission has earned', () => {
    const { fields } = buildAirtableRecord(application());
    expect(fields['Stage 1: Form']).toBe(true);
    expect(fields['Audio received?']).toBe(true);
  });

  test('leaves "Audio received?" alone when there is no recording', () => {
    const { fields } = buildAirtableRecord(
      application({ answers: JSON.stringify({ first_name: 'Ada' }) }),
    );
    expect(fields).not.toHaveProperty('Audio received?');
    expect(fields['Stage 1: Form']).toBe(true);
  });

  test('files a chat sales applicant as Chatter automatically', () => {
    const { fields } = buildAirtableRecord(application());
    expect(fields['Chatter/VA']).toBe('Chatter');
  });

  // Every careers role writes to this one table. Labelling them all Chatter
  // would file designers and developers as chat operators, and the team's main
  // view is grouped by this column.
  test('leaves Chatter/VA blank for the roles that are not chat work', () => {
    for (const slug of [
      'creative-designer',
      'customer-support',
      'full-stack-developer',
      'operations-assistant',
      'short-form-editor',
      'south-african-talent',
    ]) {
      const { fields } = buildAirtableRecord(application({ slug }));
      expect(fields, slug).not.toHaveProperty('Chatter/VA');
    }
  });

  test('stamps the role and the id that ties a row back to Postgres', () => {
    const { fields } = buildAirtableRecord(application());
    expect(fields['Applied For']).toBe('Chat Sales Operator');
    expect(fields['Application ID']).toBe('app_123');
  });

  // 'Created date' is a computed createdTime column; writing it is a 422.
  test('never writes the computed Created date column', () => {
    const { fields } = buildAirtableRecord(application());
    expect(fields).not.toHaveProperty('Created date');
    expect(fields).not.toHaveProperty('Applied At');
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

  test('flattens a multi-value answer', () => {
    const { fields } = buildAirtableRecord(
      application({ answers: JSON.stringify({ traffic_source: ['TikTok', 'A friend'] }) }),
    );
    expect(fields['How did you hear about us?']).toBe('TikTok, A friend');
  });

  test('summarises UTM capture into one Campaign Source cell', () => {
    const { fields } = buildAirtableRecord(
      application({
        utm: JSON.stringify({ utm_source: 'meta', utm_medium: 'paid', utm_campaign: 'aug' }),
      }),
    );
    expect(fields['Campaign Source']).toBe('meta / paid / aug');
  });

  test('falls back to the ref tag, and stays quiet with no attribution', () => {
    expect(
      buildAirtableRecord(application({ utm: JSON.stringify({ ref: 'kd' }) })).fields[
        'Campaign Source'
      ],
    ).toBe('kd');
    expect(buildAirtableRecord(application()).fields).not.toHaveProperty('Campaign Source');
    expect(buildAirtableRecord(application({ utm: 'not json' })).fields).not.toHaveProperty(
      'Campaign Source',
    );
  });

  test('still identifies a row whose answers JSON is corrupt', () => {
    const { fields } = buildAirtableRecord(application({ answers: '{oops' }));
    expect(fields['Application ID']).toBe('app_123');
    expect(fields['Applied For']).toBe('Chat Sales Operator');
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
