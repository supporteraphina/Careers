'use client';

// Meta Pixel mount point. Loads the pixel and fires PageView on every route
// change. Renders and injects nothing unless NEXT_PUBLIC_META_PIXEL_ID is set,
// so the site is safe to ship before the pixel is minted in Events Manager.
// Admin routes are skipped so internal traffic never pollutes campaign data.

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { META_PIXEL_ID, initPixel, pageView } from '@/lib/analytics/pixel';

export default function MetaPixel() {
  const pathname = usePathname();

  useEffect(() => {
    if (!META_PIXEL_ID) return;
    if (pathname?.startsWith('/admin')) return;
    if (initPixel()) pageView();
  }, [pathname]);

  if (!META_PIXEL_ID) return null;

  return (
    <noscript>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        height="1"
        width="1"
        style={{ display: 'none' }}
        alt=""
        src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
      />
    </noscript>
  );
}
