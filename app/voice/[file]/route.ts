// Public playback for a stored voice note. This is the URL that ends up in the
// Airtable row, so it has to work unauthenticated in whatever browser a
// reviewer happens to open it in: the cuid is the only thing guarding it.
//
// Range support is not optional here. Safari will not start an <audio> element
// without a 206, so without it the recordings look broken to half the team.

import { prisma } from '../../../lib/db';
import { mimeForExtension, voiceNoteIdFrom } from '../../../lib/voice/format';

interface RouteContext {
  params: Promise<{ file: string }>;
}

function notFound(): Response {
  return new Response('Not found', { status: 404 });
}

/** Parse `bytes=start-end` against a known length. */
function parseRange(header: string, size: number): { start: number; end: number } | null {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return null;

  const [, rawStart, rawEnd] = match;
  if (rawStart === '' && rawEnd === '') return null;

  // A suffix range ('bytes=-500') asks for the final N bytes.
  if (rawStart === '') {
    const length = Number(rawEnd);
    if (!Number.isFinite(length) || length <= 0) return null;
    return { start: Math.max(0, size - length), end: size - 1 };
  }

  const start = Number(rawStart);
  if (!Number.isFinite(start) || start >= size) return null;
  const end = rawEnd === '' ? size - 1 : Math.min(Number(rawEnd), size - 1);
  if (!Number.isFinite(end) || end < start) return null;
  return { start, end };
}

async function serve(request: Request, context: RouteContext, withBody: boolean) {
  const { file } = await context.params;
  const id = voiceNoteIdFrom(`/voice/${file}`);
  if (!id) return notFound();

  const note = await prisma.voiceNote.findUnique({
    where: { id },
    select: { data: true, ext: true, mimeType: true, bytes: true },
  });
  if (!note) return notFound();

  // Serve under the extension the recording was stored as, so a guessed
  // extension cannot talk us into mislabelling the content type.
  const requestedExt = file.slice(file.lastIndexOf('.') + 1).toLowerCase();
  if (requestedExt !== note.ext) return notFound();

  const contentType = mimeForExtension(note.ext) ?? note.mimeType;
  const body = note.data;
  const size = body.byteLength;

  const headers = new Headers({
    'content-type': contentType,
    'accept-ranges': 'bytes',
    // Applicant audio: never let a shared cache or a crawler hold onto it.
    'cache-control': 'private, max-age=3600',
    'x-robots-tag': 'noindex, nofollow',
    'content-disposition': `inline; filename="voice-note-${id}.${note.ext}"`,
  });

  const rangeHeader = request.headers.get('range');
  if (rangeHeader) {
    const range = parseRange(rangeHeader, size);
    if (!range) {
      headers.set('content-range', `bytes */${size}`);
      return new Response(null, { status: 416, headers });
    }
    const chunk = body.subarray(range.start, range.end + 1);
    headers.set('content-range', `bytes ${range.start}-${range.end}/${size}`);
    headers.set('content-length', String(chunk.byteLength));
    return new Response(withBody ? chunk : null, { status: 206, headers });
  }

  headers.set('content-length', String(size));
  return new Response(withBody ? body : null, { status: 200, headers });
}

export async function GET(request: Request, context: RouteContext) {
  return serve(request, context, true);
}

export async function HEAD(request: Request, context: RouteContext) {
  return serve(request, context, false);
}
