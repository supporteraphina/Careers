// Voice note upload. The funnel posts the raw recording here as soon as the
// applicant is happy with a take, and gets back the public link that becomes
// the answer value. Deliberately separate from /api/apply: the recording is
// the slow part of the submission, so it travels while the applicant is still
// reading the page rather than at the end with everything else.

import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/db';
import { getRolePack } from '../../../lib/content/roles';
import { baseUrlFrom } from '../../../lib/server/baseUrl';
import {
  DEFAULT_MAX_SECONDS,
  MAX_VOICE_BYTES,
  extensionForMime,
  meetsMinimumDuration,
  voiceNotePath,
} from '../../../lib/voice/format';

// Re-recording is normal and expected, so this sits well above the number of
// takes a real applicant needs while still bounding what one IP can store.
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 40;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > MAX_PER_WINDOW;
}

/** Grace over the field's cap: MediaRecorder stops a beat after we ask it to. */
const DURATION_SLACK_MS = 5_000;

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
  if (rateLimited(ip)) {
    return NextResponse.json({ error: 'Too many recordings' }, { status: 429 });
  }

  const url = new URL(request.url);
  const slug = url.searchParams.get('slug') ?? '';
  const fieldId = url.searchParams.get('field') ?? '';
  const pack = getRolePack(slug);
  if (!pack) {
    return NextResponse.json({ error: 'Unknown role' }, { status: 400 });
  }

  const field = pack.form.pages
    .flatMap((page) => page.fields ?? [])
    .find((f) => f.id === fieldId && f.type === 'audio');
  if (!field) {
    return NextResponse.json({ error: 'Unknown field' }, { status: 400 });
  }

  const contentType = request.headers.get('content-type') ?? '';
  const ext = extensionForMime(contentType);
  if (!ext) {
    return NextResponse.json({ error: 'Unsupported audio format' }, { status: 415 });
  }

  // Reject on the declared length before reading a large body into memory.
  const declared = Number(request.headers.get('content-length') ?? '');
  if (Number.isFinite(declared) && declared > MAX_VOICE_BYTES) {
    return NextResponse.json({ error: 'Recording too large' }, { status: 413 });
  }

  // Explicit buffer type: Prisma's Bytes column will not take the wider
  // Uint8Array<ArrayBufferLike> that a bare annotation infers.
  let bytes: Uint8Array<ArrayBuffer>;
  try {
    bytes = new Uint8Array(await request.arrayBuffer());
  } catch {
    return NextResponse.json({ error: 'Could not read the recording' }, { status: 400 });
  }

  if (bytes.byteLength === 0) {
    return NextResponse.json({ error: 'Empty recording' }, { status: 400 });
  }
  if (bytes.byteLength > MAX_VOICE_BYTES) {
    return NextResponse.json({ error: 'Recording too large' }, { status: 413 });
  }

  const maxMs = (field.maxSeconds ?? DEFAULT_MAX_SECONDS) * 1000 + DURATION_SLACK_MS;
  const reported = Number(request.headers.get('x-voice-duration-ms') ?? '');
  const durationMs = Number.isFinite(reported) && reported > 0 ? Math.round(reported) : null;
  if (durationMs !== null && durationMs > maxMs) {
    return NextResponse.json({ error: 'Recording too long' }, { status: 413 });
  }
  // A field that asks for a minimum gets it enforced here rather than only in
  // the recorder, so a hand-rolled POST cannot store a one second take.
  if (!meetsMinimumDuration(durationMs, field.minSeconds)) {
    return NextResponse.json(
      { error: `Record at least ${field.minSeconds} seconds` },
      { status: 422 },
    );
  }

  const note = await prisma.voiceNote.create({
    data: {
      slug: pack.form.slug,
      fieldId: field.id,
      mimeType: contentType.split(';')[0].trim().toLowerCase(),
      ext,
      bytes: bytes.byteLength,
      durationMs,
      data: bytes,
      ip,
    },
    select: { id: true },
  });

  const path = voiceNotePath(note.id, ext);
  return NextResponse.json({
    id: note.id,
    // Absolute: this value is stored as the answer and opened from Airtable.
    url: `${baseUrlFrom(request)}${path}`,
    path,
  });
}
