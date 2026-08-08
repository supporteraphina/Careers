# Meta Pixel

Browser-side conversion tracking for paid campaigns that drive traffic to the
careers site and the application funnels.

## Status: wired

The Halevora pixel (Events Manager dataset "Careers", id `1206672578298870`, under
the Halevora business) ships as the production default, so it goes live
automatically on the next production deploy. It stays inert in local development,
so dev traffic never reaches the live dataset.

To override the id, or to disable the pixel, set the public env var (a pixel id is
sent to the browser, so it is not a secret):

```
NEXT_PUBLIC_META_PIXEL_ID=<pixel id>   # override the default
NEXT_PUBLIC_META_PIXEL_ID=             # empty string disables the pixel
```

## What fires

| Event | When | Where |
|---|---|---|
| `PageView` | Every route change on public pages | `components/MetaPixel.tsx` |
| `ViewContent` | An applicant opens a role's apply funnel | `components/Funnel.tsx` |
| `Lead` | An application is submitted successfully | `components/Funnel.tsx` |

`ViewContent` and `Lead` carry `content_name` (the role slug) so the campaign
can optimise per role. `Lead` is the conversion event to optimise the ad set on.

Admin routes (`/admin/*`) are excluded so internal traffic never enters the
campaign data.

## Notes

- `lib/analytics/pixel.ts` holds the fbq bootstrap and the `track` helper. Every
  helper is a no-op when the pixel is not configured or not yet loaded, so it is
  always safe to call.
- A `<noscript>` fallback pixel renders for browsers without JavaScript.

## Later: Conversions API (server-side)

The browser pixel loses events to ad blockers and iOS tracking limits. The fix
is the Meta Conversions API: send the same `Lead` event server-side from
`app/api/apply/route.ts`, deduplicated against the browser event with a shared
`event_id`. That needs a Conversions API access token, which is a real secret
and belongs in the gitignored `.env`, not here. Not built yet; this is the seam.
