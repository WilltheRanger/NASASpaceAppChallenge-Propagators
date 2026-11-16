# Nearby fire context: source-backed, no new accounts

Prepared in an isolated `brady/fire-context` worktree from UI commit `16bc400`.
No edits to teammates' Simulator, globe, or other existing UI files. **Not integrated or deployed yet.**

## What this adds

`frontend/src/r2/FireContext.tsx` is an optional, user-triggered panel for a selected satellite detection. It lists up to three nearby NASA EONET wildfire event records and the original reporting links (for example GDACS). It also shows any short description supplied by EONET, point distance, record date and retrieval time. It does not generate a narrative or invent a fire's cause, severity, casualties, incident name, weather, or evacuation guidance.

This is a credible first context source, **not a general news search or an AI answer**. Articles are linked, not scraped or fed into a model. Many EONET descriptions are empty; those records show title and source links rather than fabricated text.

## Integration (owner of active fire card)

```tsx
import { FireContext } from '../../r2/FireContext' // adjust relative import

// i is the selected index from r2/fires; use the original UTC, not local-solar time.
<FireContext lon={LON[i]} lat={LAT[i]} observedAt={utcOf(i).toISOString()} />
```

Mount only inside the selected detection card. The component resets and aborts when coordinates/time change or the card closes. Lookup waits for the user to click; it does not perform a request for every globe dot. Repeated clicks are guarded. Review style/spacing within the final card. No teammate files are changed by this handoff.

## Matching and limitations

- Search EONET wildfire records, open **and** closed, within +/-7 calendar days of the detection date. Then require the actual point geometry timestamp to be within +/-7*24 hours and the location within 100 km.
- Distance is great-circle distance to a reported point, not an incident boundary. Date-line and pole cases are covered.
- A nearby record **does not identify the detection as that fire**. Point geometry only; polygon records omitted. No-match never means no-fire.
- Approximate/curated coverage, search cap (500), future reports relative to detection and incomplete coverage are disclosed. This must not be described as what was known at acquisition time, current conditions, emergency advice, or comprehensive news.
- Source URLs permit HTTPS only without embedded credentials; text rendered as React text, never HTML. Source metadata is untrusted content, not model instructions.
- Eight-second request timeout, six-entry/ten-minute memory cache, no polling, no keys, no payment, no accounts, no dependencies, no credentials sent. Query sends only detection date range; geographic matching is local. API failures remain errors rather than empty results.

Official source documentation: https://eonet.gsfc.nasa.gov/docs/v3
NASA disclaimer: https://eonet.gsfc.nasa.gov/what-is-eonet

NASA explicitly describes EONET as visualization/general-information metadata with approximate spatial/temporal extent, not official extents. Do not replace the caveats with a stronger claim.

## Verification

At 2026-11-16 01:09 UTC the documented public API returned HTTP200, Access-Control-Allow-Origin: *,121wildfire records for November7–21. A returned GDACS-backed point passed the same parser and matcher. Endpoint availability is not guaranteed.

Full frontend TypeScript check passed. Nine offline tests plus one optional live-response-fixture test passed. Tests cover date-line proximity, stale/far/invalid/polygon exclusion, categories, malformed response, unsafe URLs, deduplication/sorting/card cap, date-based query, search cap/poles, HTTP errors and cache. Browser interaction/visual QA is pending integration. No claim of deployed behavior.

Run from repository root (existing frontend dependencies required):

```sh
frontend/node_modules/.bin/tsc --noEmit -p frontend/tsconfig.json
frontend/node_modules/.bin/tsc frontend/src/r2/fire-context.ts --outDir frontend/.context-test --target ES2022 --module ES2022 --moduleResolution bundler --skipLibCheck
node --test frontend/tests/fire-context.test.mjs
# Optional local API response fixture, not required for offline tests:
EONET_FIXTURE=/path/to/response.json node --test frontend/tests/fire-context.test.mjs
```

Do not commit `.context-test` or `node_modules`. Do not use this to claim P9 validation, prediction, or incident identification. Wider AI/news/weather work would need explicit source/grounding design; this scoped component can ship independently once the active UI owner integrates and verifies it.
