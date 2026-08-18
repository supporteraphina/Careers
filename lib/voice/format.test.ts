import { describe, expect, test } from 'vitest';
import {
  baseMimeType,
  extensionForMime,
  isVoiceNotePath,
  meetsMinimumDuration,
  mimeForExtension,
  voiceNoteIdFrom,
  voiceNotePath,
} from './format';

const ID = 'clw1test0000abcd0123';

describe('mime handling', () => {
  test('strips codec parameters', () => {
    expect(baseMimeType('audio/webm;codecs=opus')).toBe('audio/webm');
    expect(baseMimeType('AUDIO/MP4 ')).toBe('audio/mp4');
  });

  test('maps the containers browsers actually record', () => {
    expect(extensionForMime('audio/webm;codecs=opus')).toBe('webm');
    expect(extensionForMime('audio/mp4')).toBe('m4a');
    expect(extensionForMime('audio/ogg;codecs=opus')).toBe('ogg');
  });

  test('refuses anything that is not audio we serve', () => {
    expect(extensionForMime('video/mp4')).toBeNull();
    expect(extensionForMime('application/json')).toBeNull();
    expect(extensionForMime('')).toBeNull();
    expect(mimeForExtension('exe')).toBeNull();
  });

  test('round-trips extension and type', () => {
    expect(mimeForExtension(extensionForMime('audio/webm') as string)).toBe('audio/webm');
  });
});

describe('voice note links', () => {
  test('accepts the absolute link handed to the client', () => {
    const url = `https://careers.halevorasolutions.com${voiceNotePath(ID, 'webm')}`;
    expect(voiceNoteIdFrom(url)).toBe(ID);
    expect(isVoiceNotePath(url)).toBe(true);
  });

  test('accepts the bare path, so resumed drafts still resolve', () => {
    expect(voiceNoteIdFrom(`/voice/${ID}.m4a`)).toBe(ID);
  });

  test('ignores query strings and any host', () => {
    expect(voiceNoteIdFrom(`http://localhost:3000/voice/${ID}.webm?t=1`)).toBe(ID);
  });

  // The old field accepted any URL. Nothing off-site may pass as a recording.
  test('rejects third-party links, including the Vocaroo ones this replaced', () => {
    expect(voiceNoteIdFrom('https://vocaroo.com/abc123')).toBeNull();
    expect(voiceNoteIdFrom('https://example.com/voice/abc.webm/../evil')).toBeNull();
    expect(isVoiceNotePath('https://vocaroo.com/abc123')).toBe(false);
  });

  test('rejects malformed, traversing, or unknown-type paths', () => {
    expect(voiceNoteIdFrom('')).toBeNull();
    expect(voiceNoteIdFrom('   ')).toBeNull();
    expect(voiceNoteIdFrom('not a url')).toBeNull();
    expect(voiceNoteIdFrom(`/voice/${ID}`)).toBeNull();
    expect(voiceNoteIdFrom(`/voice/${ID}.exe`)).toBeNull();
    expect(voiceNoteIdFrom('/voice/../../etc/passwd')).toBeNull();
    expect(voiceNoteIdFrom('/voice/a.webm')).toBeNull();
    expect(voiceNoteIdFrom('/other/abc123.webm')).toBeNull();
  });

  test('rejects a javascript: link dressed up as a path', () => {
    expect(voiceNoteIdFrom(`javascript:/voice/${ID}.webm`)).toBeNull();
  });
});

describe('minimum duration', () => {
  test('a field with no floor takes anything, including an unmeasured take', () => {
    expect(meetsMinimumDuration(800)).toBe(true);
    expect(meetsMinimumDuration(null)).toBe(true);
    expect(meetsMinimumDuration(800, 0)).toBe(true);
  });

  test('rejects the click-record-click-stop takes that reached production', () => {
    expect(meetsMinimumDuration(800, 20)).toBe(false);
    expect(meetsMinimumDuration(4100, 20)).toBe(false);
  });

  test('accepts a take at or over the floor', () => {
    expect(meetsMinimumDuration(20_000, 20)).toBe(true);
    expect(meetsMinimumDuration(180_000, 20)).toBe(true);
  });

  test('an unmeasured take fails once a floor exists, so it cannot be skipped', () => {
    expect(meetsMinimumDuration(null, 20)).toBe(false);
  });
});
