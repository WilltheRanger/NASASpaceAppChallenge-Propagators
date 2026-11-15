# ui-progress.md: Phase 3 · UI (rule of three)

- **Comment page (current):** https://claude.ai/artifact/JTaQg8yRyq77Teu8e5ytGH — direction D live, private, as two
  pages: the landing (main page) and the audit (`app.html`, "Open the audit"). The team comments on it and each round
  republishes to the same link (`ARTIFACT_OUT=<dir> npm run artifact`, then publish `<dir>/page.html` with `app.html`,
  `assets/` and `img/`).
- **Canvas:** https://claude.ai/artifact/55RnYtpPDq8JdZzLAtyVYv ("Anchor", Design type). Round 1 screenshots are uploaded
  as assets; artboards stay unpublished until the team says the canvas (shared by link) may be used.
- **Live prototype:** `frontend/` (Vite + React + TypeScript + Tailwind v4). `npm run dev`, then `?d=a` … `?d=e`
  (Round 2; D is `?d=d` for the landing and `?d=d&page=app` for the audit, `&region=<id>` for either). Round 1 stays
  reachable at `?round=1&d=a` … `?round=1&d=e`.
- **Anduril study:** `designs/round-2/anduril-study.md` (their code, motion and UX, and what D takes from it).
- **Renders:** `designs/round-2/renders/` (Round 2), `designs/round-1/renders/` (Round 1, rejected).
- **Plan for the current round:** `designs/round-2/plan.md` (why Round 1 failed, seed, hierarchy map, manifest,
  direction lines, colour plans, contracts). Product record: `../PRODUCT.md`.
- **Design system:** none yet (locked in Round 4). User chose "design Anchor's own".

## Current round
**Round 2 · Directions** (after Round 1 was rejected), five directions (D and E added at the team's request).
**Picked: D · Field film.** The team now edits it slowly through comments on the comment page. Overview: `designs/round-2/renders/round2-overview.jpg`.

| | Direction | Source | Idea | Independent review (1–5 per lens: hierarchy, fit, slop, craft, UX, technical, motion) |
|---|---|---|---|---|
| A | Sundial | grounded candidate 6, assigned by the seed | The fixed clock is a cut line on a limestone dial; Aqua's look is the shadow; cinnabar marks the minutes between; measured two-clocks ratios as an ochre band on the stone | Final after 2 rounds: 4·4·4·4·4·4·4, about 8.5/10. Open: ochre band outweighs the cinnabar; band vanishes silently in years without two-clocks data; ratio labels touch lines in some years; drag not discoverable |
| B | Poster series | challenger: Swiss concert-poster wall | Six regions as one poster series; one ring per year, the drift in the region's colour | After 1 round: 4·3·4·4·4·4·3, about 8/10. Final round not applied (usage limit hit). Open: the poster's mass is grey, colour under 1% of the first viewport; thumbnails read alike; calendar's left band empty |
| C | Exposure record | challenger: darkroom exposure record | The audit as a ruled record card over three real prints on a light table; hatched range bars; magenta only where the clock changed the count | Final after 2 rounds: 4·4·4·4·4·4·3, about 8/10. Open: header text over the see-through sheet needs an opaque band; rebate reads as a black bar; figure responds to row clicks only |
| D | Field film (Anduril-inspired) | team-pinned reference | The real NASA fire scene full bleed with the verdict on it; three passes as an operable photo figure; range bars on a sage band | First review 3·3·4·3·3·3·2 (about 8 after fixes). Fix batch applied; its verdict is still pending (usage limit) |
| E | Operating picture (Palantir-inspired) | team-pinned reference | Two-tone sentences, the working clock console in a dark window, the regions as a giant index of findings | After 1 round: 4·4·4·4·4·4·3, about 8/10. Open: phone has no page-level mock label; "Loaded" sits far from its row; no drawn or image moment |

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
| Phase 3 | Round 2 | **D · Field film** (Anduril-inspired) | "lets go with this one. I need to slowly edit this" |
| Phase 3 | Logo | The clock-sweep mark from B (quarter-arc + bar) with the Host Grotesk wordmark | "can you make this our logo please" |
| Phase 3 | D, comments | Range line removed; photo credit to the footer; year reel (21st.dev Filmstrip Scrub), then a ruler strip; clock-effect table → 21st.dev Anomaly Chart | Comment threads on the comment page |
| Phase 3 | D, structure | Landing and audit as separate pages; one Unsplash photograph per region | "put like this aspect as a seperate landing page"; "different images accross different regions" |
| Phase 3 | D, landing | Keep D's layout, add to it; the hero is a statement: the region's name only ("The Amazon"), the verdict below | "you dont have to completly repalce it"; "The top is supposed to be sort of a statement piece" |
| Phase 3 | D, motion | Anduril's patterns from their code: decode, tour of regions, title rise, rule + slide, tile reveal, page fade, motion switch | "look at andurils code … animations and ux" |
| Phase 3 | Repo | No AI tool names in commits, PRs, branches, comments, headers or data notes; AI use disclosed in the slides and on the project page | Team git rule, 15 Nov |

## History
- Hand-built HTML drafts of Round 1 A–C (`designs/round-1/*.html`) were superseded by the component-based rebuild.
- Round 2 parts parked after the fit test: COBE globe, flip-disk matrix, Circularium ring, knowledge graph, index
  carousel, thermal and wipe shaders. The ring's idea lives on as the dial; any part can return where it passes.
