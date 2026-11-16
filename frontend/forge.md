# forge.md: ui-forge run settings

Team Propagators · NASA Space Apps 2026 · Challenge #9 frontend.
Process: ui-forge-kit (github.com/WilltheRanger/ui-forge-kit), `inspire → direct → create → verify`.

## Kickoff answers (Sat Nov 14, 2:40 PM PT)

| Setting | Value |
|---|---|
| Target fidelity | 95% |
| Judge pass score | 9/10 (both judges) |
| Time budget (Stages 3–4 loop) | Finish by **Sun Nov 15, 8:00 AM PT**; about 5–6 h of work, moderate usage |
| 21st.dev intensity | **Light**: shell parts only (nav, tabs, cards, tables, region picker); charts are custom |

## Environment notes (cloud session)

- Reachable: npm registry, 21st.dev MCP, Magic UI and React Bits registries, OpenStreetMap tiles, Google Fonts.
- Not reachable here: Awwwards (MCP and site blocked), a browser extension. Reference screenshots come from Playwright.
- Figma: no project file given, so skipped.

## Project rules that bind every stage

- Data comes only from JSON: `data/out/` (real pipeline) or `data/mock/` (synthetic, `"mock": true`). Show a visible **MOCK** badge whenever mock data is on screen.
- Judges open the link without signing in.
- Disclose AI use once, in the slides and on the project page; nothing in the repo names an AI tool as author or label (team rule, 15 Nov 2026).
- No NASA logos, flags or mission identifiers in generated content.
- Team members are minors: no names, photos, faces or voices. Team name only: **Propagators**.
- Wording: "we did not find anyone doing X", never "first". "The official trend holds" is a valid result.

## Where files live

`frontend/` is the UI project root: `inspo.md`, `references/`, `requirements.md`, `design-brief.md`, `components.md`, `review.md`, and the app source.
