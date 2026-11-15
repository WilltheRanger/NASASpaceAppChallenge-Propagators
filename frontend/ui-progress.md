# ui-progress.md: Phase 3 · UI (rule of three)

- **Canvas:** (private link) ("Anchor", Design type). Screenshots are uploaded as assets; publishing the artboards is waiting on the user's OK because the canvas is shared with anyone who has the link.
- **Live prototype:** `frontend/` (Vite + React + TypeScript + Tailwind v4). `npm run dev`, then `?d=a` … `?d=e`.
- **Renders:** `designs/round-1/renders/round1-[a-e].jpg` (desktop + phone, 2×), `round0-drafts.jpg`.
- **Design system:** none yet (locked in Round 4). User chose "design Anchor's own" over Orbitwatch / Hearth & Crumb.

## Current round
**Round 1 · Directions**, five directions, waiting for the user's pick.

| | Direction | Built from | Idea |
|---|---|---|---|
| A | Thermal | Flip-Disk Matrix, Circularium Ring, Leaderboard Bars, fire calendar, thermal shader | Infrared night: the real fire scene through an inferno false-colour shader; ember = drifting clock, cyan = fixed clock |
| B | Colour of the hour | Leaderboard Bars, Circularium Ring (2D), fire calendar, three-clocks wipe shader | Editorial paper article with a night figure band; every time carries its sky colour |
| C | Spec sheet | COBE Globe, Flip-Disk Matrix, Leaderboard Bars, fire calendar | Cobalt Swiss hero, Apex-style spec cards per satellite, product panel under the headline |
| D | Systems (Anduril-inspired) | three-clocks wipe as hero film, mosaic of tiles (Flip-Disk, satellite captures, Globe, thermal field, Ring), Leaderboard Bars, fire calendar | Cinematic black, quiet tile labels, grey product rows, cream notes band |
| E | Operations (Palantir-inspired) | audit board + COBE Globe hero, giant clock-effect figure, Knowledge Graph, Leaderboard Bars, Index List carousel, Flip-Disk | Product UI as hero, metadata strips, bracketed wayfinding, comparison card, indexed contents |

## Picks so far
| When | Decision | Pick | Why (user) |
|---|---|---|---|
| Stage 1 | References | A1 Ciechanowski, B3 Apex, C1 Linear, C2 Oxide; parts D1–D3, D5 | "Linear and Oxide but with actual good color… images, shaders" |
| Phase 2 | Concept | Hybrid A+C+B (verdict-first numbered report, dial hero, console calendar) | Recommended option accepted |
| Phase 3 | Canvas design system | None (Anchor's own) | Recommended option accepted |
| Phase 3 | Round 1 rebuild | Real 21st.dev components instead of hand-drawn parts | "the design looks like you mostly made it" |
| Phase 3 | Extra directions | D (Anduril-inspired), E (Palantir-inspired) | User request, "completely free" |

## History
- Hand-built HTML drafts of A–C (`designs/round-1/*.html`) were superseded by the component-based rebuild; kept for the record.
