import { NextResponse } from 'next/server';
import { deleteByEmail } from '../../../../lib/server/privacy';

export async function POST(request: Request) {
  let email: string | undefined;
  try {
    email = ((await request.json()) as { email?: string }).email;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Provide the applicant email' }, { status: 400 });
  }
  const result = await deleteByEmail(email);
  return NextResponse.json({ ok: true, ...result });
}
