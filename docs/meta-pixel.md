# Meta Pixel

Browser-side conversion tracking for paid campaigns that drive traffic to the
careers site and the application funnels.

## Turning it on

Set one public env var (it is sent to the browser, so it is not a secret):

```
NEXT_PUBLIC_META_PIXEL_ID=<your 15-16 digit pixel id from Events Manager>
```

Leave it unset and the pixel is fully inert: nothing loads, nothing fires, and
the site behaves exactly as before. Set it and the pixel loads on the next
deploy. No code change is needed to switch it on.

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
