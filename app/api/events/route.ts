import { NextResponse } from 'next/server';
import { recordEvents, type FunnelEventInput } from '../../../lib/server/events';

export async function POST(request: Request) {
  // sendBeacon posts text/plain; parse the body manually.
  let batch: FunnelEventInput[];
  try {
    const text = await request.text();
    const parsed = JSON.parse(text) as { events?: FunnelEventInput[] };
    batch = Array.isArray(parsed.events) ? parsed.events : [];
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const count = await recordEvents(batch);
  return NextResponse.json({ ok: true, count });
}
