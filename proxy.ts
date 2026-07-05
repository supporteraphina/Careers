import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Basic-auth gate for the admin area. Set ADMIN_USER and ADMIN_PASS in .env;
// with them unset, /admin stays closed.

export function proxy(request: NextRequest) {
  const user = process.env.ADMIN_USER;
  const pass = process.env.ADMIN_PASS;

  if (!user || !pass) {
    return new NextResponse('Admin is disabled. Set ADMIN_USER and ADMIN_PASS.', {
      status: 503,
    });
  }

  const header = request.headers.get('authorization') ?? '';
  const [scheme, encoded] = header.split(' ');
  if (scheme === 'Basic' && encoded) {
    try {
      const [gotUser, gotPass] = atob(encoded).split(':');
      if (gotUser === user && gotPass === pass) {
        return NextResponse.next();
      }
    } catch {
      // fall through to the 401
    }
  }

  return new NextResponse('Authentication required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Halevora Admin"' },
  });
}

export const config = {
  matcher: '/admin/:path*',
};
