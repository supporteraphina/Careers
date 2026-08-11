// The origin to build public links from. Voice note links are handed to
// Airtable and clicked days later from someone else's machine, so they must be
// absolute and must point at the public hostname rather than the container's.

/**
 * Prefer an explicit PUBLIC_BASE_URL; otherwise trust the proxy headers Railway
 * sets. Falls back to the request's own origin for local development.
 */
export function baseUrlFrom(request: Request): string {
  const configured = process.env.PUBLIC_BASE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, '');

  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  if (host) {
    const proto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
    // Anything not obviously local is behind Railway's TLS terminator.
    const scheme = proto ?? (/^(localhost|127\.0\.0\.1)(:|$)/.test(host) ? 'http' : 'https');
    return `${scheme}://${host}`;
  }

  return new URL(request.url).origin;
}
