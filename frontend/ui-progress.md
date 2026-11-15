# ui-progress.md: Phase 3 · UI (rule of three)

- **Canvas:** (private link) ("Anchor", Design type). Round 1 screenshots are uploaded
  as assets; artboards stay unpublished until the team says the canvas (shared by link) may be used.
- **Live prototype:** `frontend/` (Vite + React + TypeScript + Tailwind v4). `npm run dev`, then `?d=a` … `?d=c`
  (Round 2). Round 1 stays reachable at `?round=1&d=a` … `?round=1&d=e`.
- **Renders:** `designs/round-2/renders/` (Round 2), `designs/round-1/renders/` (Round 1, rejected).
- **Plan for the current round:** `designs/round-2/plan.md` (why Round 1 failed, seed, hierarchy map, manifest,
  direction lines, colour plans, contracts). Product record: `../PRODUCT.md`.
- **Design system:** none yet (locked in Round 4). User chose "design Anchor's own".

## Current round
**Round 2 · Directions** (after Round 1 was rejected), three directions, waiting for the user's pick.

| | Direction | Source | Idea |
|---|---|---|---|
| A | Sundial | grounded candidate 6, assigned by the seed | The fixed clock is a cut line on a limestone dial; Aqua's look is the shadow; cinnabar marks the minutes between |
| B | Poster series | challenger: Swiss concert-poster wall | Six regions as one poster series; one ring per year fans past the fixed clock in the region's own colour |
| C | Exposure record | challenger: darkroom exposure record | The audit as a record card on a light table beside three real prints; magenta only where the clock changed the count |

## Rejected rounds
**Round 1 · Directions (rejected)**: A Thermal, B Colour of the hour, C Spec sheet, D Systems (Anduril-inspired),
E Operations (Palantir-inspired). User: "they all look like shit. You didnt follow any of the design rules." Diagnosis
per direction in `designs/round-2/plan.md`.

## Picks so far
| When | Decision | Pick | Why (user) |
|---|---|---|---|
| Stage 1 | References | A1 Ciechanowski, B3 Apex, C1 Linear, C2 Oxide; parts D1–D3, D5 | "Linear and Oxide but with actual good color… images, shaders" |
| Phase 2 | Concept | Hybrid A+C+B (verdict-first numbered report, dial hero, console calendar) | Recommended option accepted |
| Phase 3 | Canvas design system | None (Anchor's own) | Recommended option accepted |
| Phase 3 | Round 1 rebuild | Real 21st.dev components instead of hand-drawn parts | "the design looks like you mostly made it" |
| Phase 3 | Extra directions | D (Anduril-inspired), E (Palantir-inspired) | User request, "completely free" |
| Phase 3 | Round 1 | Rejected all five | "You didnt follow any of the design rules" |

## History
- Hand-built HTML drafts of Round 1 A–C (`designs/round-1/*.html`) were superseded by the component-based rebuild.
- Round 2 parts parked after the fit test: COBE globe, flip-disk matrix, Circularium ring, knowledge graph, index
  carousel, thermal and wipe shaders. The ring's idea lives on as the dial; any part can return where it passes.
