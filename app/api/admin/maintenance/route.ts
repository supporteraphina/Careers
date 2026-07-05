import { NextResponse } from 'next/server';
import { purge } from '../../../../lib/server/privacy';
import { retryUndelivered } from '../../../../lib/server/webhooks';

export async function POST(request: Request) {
  let action: string | undefined;
  try {
    action = ((await request.json()) as { action?: string }).action;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (action === 'purge') {
    const result = await purge();
    return NextResponse.json({ ok: true, ...result });
  }
  if (action === 'retry-webhooks') {
    const result = await retryUndelivered();
    return NextResponse.json({ ok: true, ...result });
  }
  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
