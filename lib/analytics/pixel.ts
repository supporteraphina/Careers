// Meta Pixel (fbq) browser helpers.
//
// Everything here is inert until NEXT_PUBLIC_META_PIXEL_ID is set, so the site
// ships and runs identically before the pixel exists in Events Manager. The id
// is public by design (it is sent to every browser), so it lives in the
// NEXT_PUBLIC_ env, not in secrets.
//
// This is the browser side only. Server-side, deduplicated events via the Meta
// Conversions API are a later addition and need an access token secret; see
// docs/meta-pixel.md.

export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? '';

type FbqArgs = [command: string, ...rest: unknown[]];

interface Fbq {
  (...args: FbqArgs): void;
  callMethod?: (...args: FbqArgs) => void;
  queue: FbqArgs[];
  loaded?: boolean;
  version?: string;
  push?: Fbq;
}

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
  }
}

let initialized = false;

/**
 * Load fbevents.js (once) and init the pixel. Returns true when the pixel is
 * ready to receive events, false when it is not configured or not in a browser.
 * Safe to call on every route change; the actual bootstrap runs only once.
 */
export function initPixel(): boolean {
  if (typeof window === 'undefined' || !META_PIXEL_ID) return false;
  if (initialized) return true;

  if (!window.fbq) {
    const stub = function (...args: FbqArgs) {
      if (stub.callMethod) stub.callMethod(...args);
      else stub.queue.push(args);
    } as Fbq;
    stub.queue = [];
    stub.loaded = true;
    stub.version = '2.0';
    stub.push = stub;
    window.fbq = stub;
    if (!window._fbq) window._fbq = stub;

    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://connect.facebook.net/en_US/fbevents.js';
    document.head.appendChild(script);
  }

  window.fbq?.('init', META_PIXEL_ID);
  initialized = true;
  return true;
}

/** Fire a PageView. Standard Meta event used for reach and route-change tracking. */
export function pageView(): void {
  track('PageView');
}

/** Fire a standard Meta Pixel event. No-op if the pixel is not configured or not loaded. */
export function track(event: string, params?: Record<string, unknown>): void {
  if (typeof window === 'undefined' || !window.fbq) return;
  window.fbq('track', event, params);
}

/** Fire a custom (non-standard) Meta Pixel event. No-op if the pixel is absent. */
export function trackCustom(event: string, params?: Record<string, unknown>): void {
  if (typeof window === 'undefined' || !window.fbq) return;
  window.fbq('trackCustom', event, params);
}
