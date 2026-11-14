# Anchor — Requirements

Team Propagators · NASA Space Apps Challenge 2026 (Chino Hills) · Challenge #9 "Harmonization of MODIS and VIIRS Hot Spots".
Phase 1 of uxui-workflow, signed off Sat Nov 14, 2026. Inputs: the team brief, `research/execution-plan.md`, `data/mock/README.md`, `frontend/inspo.md` (Stage 1 picks are fixed input).

## Summary
Anchor is a public web app that keeps a 2002→now, month-by-month burning-activity calendar on one fixed 1:30 pm clock (VIIRS-based, in Aqua-equivalent units) for six preset regions. It audits how much of the official, Aqua-based fire trend since 2021 comes from Aqua's drifting overpass clock rather than from fire. It is for journalists, state environmental analysts and researchers who use official counts (INPE's first), and for fire managers and scientists who need a consistent record. It matters now: Aqua crossed the Amazon at about 3:50 pm this week instead of 1:30 pm, its designated successor (S-NPP) shut down on Nov 2, 2026, and the official series does not adjust for the clock.

## Problem framing
### Problem statement
A journalist, state analyst or researcher who reports official fire counts needs a way to tell how much of a year-on-year change since 2021 is fire and how much is the reference satellite's drifting clock, because Aqua now looks at about 3:50 pm instead of 1:30 pm and the official series doesn't adjust for it.

### Primary user snapshot
A journalist covering INPE's fire bulletin. Works to deadline from INPE's "Situação Atual" tables (year columns, Dif. A., Dif. M.). Not a remote-sensing expert. Needs a defensible sentence, a chart and a source to cite. Worried about publishing a misleading "record high" or "record low".

### Key scenarios
1. **Bulletin day.** Trigger: INPE reports the fewest Amazon fires since 1998. Outcome: the journalist opens Anchor, sees the official vs. fixed-clock change with its error range, and words the story accordingly.
2. **Annual report.** Trigger: a state analyst writes the Cerrado fire-season summary. Outcome: compares each month with the historical median and downloads CSV and PNG for the report.
3. **Method check.** Trigger: a researcher is asked whether the post-2021 series is comparable. Outcome: reads the drift chart, two clocks, P1–P10 and the INPE reproduction, then downloads the summary to cite.
4. **Local fire manager.** Trigger: wants to know which fires satellites can actually see near Chino Hills. Outcome: reads California detection limits and the seen-vs-missed map of recorded fires.
5. **Judge, two minutes.** Trigger: the team's link at judging. Outcome: hook (Aqua now looks at 15:50) → verdict → proof → limits, without signing in.

### How might we
- How might we make a satellite's clock visible to people who only see counts?
- How might we let a non-specialist tell in seconds whether a change is within the noise?
- How might we make uncertainty and "not enough data" read as honesty, not failure?
- How might we make every number traceable to its file and method?
- How might we keep the record continuous as satellites drift and retire?

## Problem
- The fire record is split across sensors (MODIS on Terra/Aqua since 2000, 1 km; VIIRS since 2012, 375 m) that differ in resolution, sensitivity and observation schedule.
- INPE's official Brazil series compares every year using one reference satellite, Aqua, chosen for its stable ~1:30 pm look time. Since 2021 Aqua's orbit has drifted later (≈15:50 over the Amazon this week); VIIRS still looks at ≈13:30. Terra drifted earlier.
- Fires burn more in the afternoon, so a later look changes the count with no change in fire. Official tables show no uncertainty and don't flag the clock.
- Today users cope by quoting the official number as is, or by distrusting it entirely.

## Goals and success metrics
- A judge or journalist reads the verdict for the featured region within ~10 seconds of opening the link.
- Every number on screen traces to a JSON file under `data/out/` (or `data/mock/`, badged).
- All must-haves below ship by the build freeze (Sun Nov 15, 8:00 AM PT).
- Judging criteria served: Impact, Creativity, Validity, Relevance, Presentation.
- No business model (open-source hackathon project).

## Users
### Primary user
Journalists, state environmental analysts and researchers who use INPE's (or another agency's) official fire counts.
### Secondary users
Early-warning and emergency responders, fire managers and firefighters, land managers, scientists; Space Apps judges.
### Roles and permissions
One role: anonymous public viewer. No sign-in, accounts or admin.
### Context of use
Laptop at a desk or projected at judging; phones for quick checks (390 px and up). Time-pressed, often mid-story. Mixed expertise: the verdict must read without remote-sensing knowledge; the evidence must satisfy a scientist.

## Core jobs (ranked)
1. See whether the official trend since 2021 holds on a fixed clock (verdict per region and year, with uncertainty).
2. Explore the harmonized calendar for a region and date range and compare it with the historical median.
3. Download what they need: CSV, PNG/SVG of each figure, and a per-region summary.
4. Check the evidence: measured look times, two clocks, validation checks, limits.
5. See what satellites can and can't detect (California detection limits; Chino Hills seen vs. missed).

## Scope
### Must have
- **Verdict-first opening** for the featured region (Amazon), then the explorer, then the evidence.
- **Calendar:** month × year, 2002→now, fixed-clock count; anomaly vs. median (`anomaly_pct`, `median_ref`); colour-blind-safe ramps (sequential for counts, diverging for anomaly); provisional cells hatched, outage cells marked, `null` shown as "no data", never zero; CSV.
- **Region picker** (six presets) and **month-level date range** that filter the calendar, comparisons and CSV.
- **Audit panel:** per region and year 2021–2025: `gap_pct` with `L_lo`/`L_hi` range, ±`noise_floor` band, `L_strat` (fire-size-adjusted); "not enough fires to measure" for `insufficient_data`.
- **Headline check card:** official (Aqua-based) change between two years vs. the change on a fixed clock (default 2024 → 2025).
- **Drift chart:** measured Aqua, Terra and VIIRS look times by year, per region.
- **Two clocks panel:** A (Aqua/VIIRS) and T (Terra/VIIRS) with ranges, `clock_diff` and `sampling_est`; the "fire day" reconstruction (≈8:30 am to 3:50 pm) per region.
- **"How do we know?"** checklist: P1–P10 with pass / pending / fail and details.
- **INPE reproduction result** and **Punjab validation**.
- **Limits** section, in plain words.
- **Downloads:** CSV + PNG/SVG for every figure; a one-page summary per region (audit numbers, checks, sources).
- **Data loading:** per file, `data/out/` if present, else `data/mock/` with a visible **MOCK** badge; a "strict" build flag that refuses mock data.
- **URL state:** region, date range and view in the query string.
- **Shader/imagery layer** with rich colour, degrading to a matching still for reduced motion, no WebGL, or a slow frame rate. Numbers never depend on WebGL.
- **Compliance:** visible AI acknowledgement plus page metadata; "Team Propagators" only; no NASA logos, flags or mission identifiers; opens without sign-in.
- **Static, host-agnostic build** with relative paths and a GitHub Pages workflow.

### Should have
- **California detection limits** as spec cards per satellite (a50/a90 acres with CIs, rates by size class).
- **California real-fire proof** (`proof_california.json`): Aqua vs. VIIRS detection of recorded fires by size class and year.
- **Chino Hills "seen vs. missed" map** of recorded fires within 25 km.

### Won't have (this version)
- Draw-an-area or lat/lon area entry (no per-hotspot data in the browser).
- A user-chosen baseline period (keeps every number in the JSON).
- Portuguese/Spanish (strings centralised so they can be added).
- An AI chat assistant, accounts, notifications, analytics or tracking.

## Content and data
- Source of truth: JSON per the data contract (`research/execution-plan.md` §3 and `data/mock/README.md`): `regions.json`, `calendar/<id>.json`, `audit/<id>.json`, `drift/<id>.json`, `twoclocks/<id>.json`, `checks.json`, `proof_california.json`, `detection_limits_california.json`, `socal_seen_missed.json`.
- Written by the team's pipeline into `data/out/`; `data/mock/` is synthetic, `"mock": true`, and must never appear in a slide or screenshot.
- Sensitive: none personal. Recorded-fire names in the seen/missed map come from public agency records.
- Attribution under every figure: NASA FIRMS (MODIS C6.1, VIIRS 375 m), INPE where compared, USFS FPA-FOD 7th ed. for California fires.

## Platform and integrations
- Web, responsive (390 px → wide desktop), static hosting, no backend.
- Map tiles from OpenStreetMap/CARTO with attribution (Chino Hills map only); Google Fonts or self-hosted fonts.
- No other third-party scripts.

## Constraints
- **Time:** build freeze Sun Nov 15, 8:00 AM PT (ui-forge budget); internal submit 9:00 PM PT; official deadline 11:59 PM PT.
- **Budget:** $0.
- **Stack:** Vite + React + TypeScript (team plan), Tailwind + shadcn primitives (ui-forge kit), custom SVG charts, Leaflet, WebGL for shaders.
- **Rules:** judges open links without signing in; AI-generated code acknowledged in text and metadata; no NASA logos, flags or mission identifiers; team members are minors, so no names, photos, faces or voices; wording says "we did not find anyone doing X", never "first".

## Brand and tone
- **Personality:** precise, candid, calm, curious (details in `productID.md`).
- **Must never feel:** alarmist, salesy, hype-y, or accusatory toward INPE.
- **References (liked):** Ciechanowski's operable figures, Apex Space spec cards and numbered sections, Linear's real product under the headline, Oxide's engineering-document details; parts: Leaderboard Bars, Circularium Ring, Flip-Disk Matrix, COBE Globe. Rich colour, imagery and meaningful shaders, not a plain grey template.
- **References (not picked):** Distill, nullschool, Fathom, Muon, Earth Fire Alliance, Quanta, PlanetScale, Teenage Engineering.
- **Competitors:** about 320 public repos build calendars for this challenge; FireClock ships a fixed-clock calendar and an Aqua drift probe; BRASA shows an Aqua/VIIRS ratio.

## Lifecycle
- No onboarding or accounts. First visit opens on the verdict for the Amazon; returning users arrive through shared links (URL state).
- Data refresh = the pipeline rewrites `data/out/` and the site is redeployed; the UI shows each file's mock/real status.
- No notifications; nothing to delete.

## Edge cases and states
- `insufficient_data` audit years → "Not enough fires to measure" row, never a zero.
- `null` counts before a satellite flew → "no data" styling, distinct from zero.
- 2026 months `provisional` (hatched); S-NPP `outage` (Jul–Aug 2022) marked.
- A region with no audit file, or a failed fetch → per-panel error state with a retry, rest of the page still works.
- Mock data in use → MOCK badge on every affected panel plus a page-level notice.
- WebGL missing, reduced motion, low frame rate → static image; nothing essential lost.
- Narrow screens → calendar scrolls by year within its own frame; no horizontal page scroll.
- Headline-check pair that includes an `insufficient_data` year → "can't check this pair" with the reason.
- Slow connection → figures load independently; skeletons only where layout would jump.

## Assumptions (signed off)
| # | Assumption |
|---|---|
| A1 | Judged on a laptop, often projected; also opened on phones. AA contrast, no hairline-only data marks, works at 390 px. |
| A2 | Six presets only; no draw-an-area or lat/lon entry; a short note explains how a region gets added. |
| A3 | Baseline is the pipeline's `median_ref` (same calendar month, 2002–2025); no user-chosen base period. |
| A4 | Month-level from/to date range filters the calendar, comparisons and CSV. |
| A5 | No analytics, cookies or tracking; only map tiles and fonts load from outside. |
| A6 | Vite + React + TypeScript, Tailwind + shadcn, custom SVG charts, Leaflet, WebGL shaders with static fallbacks. |
| A7 | AI disclosure: visible "How this was made" note, page metadata, README section. |
| A8 | "Team Propagators" only: no names, photos, faces or voices. |
| A9 | Personality: precise, candid, calm, curious; never alarmist, salesy, hype-y or accusatory toward INPE. |
| A10 | Amazon is the featured default region; other presets one click away. |
| A11 | "The official trend holds" gets the same visual weight as a large gap. |
| A12 | Every chart has a table/text equivalent, keyboard navigation and colour-blind-safe ramps. |

## Open questions
| # | Question | Owner | Default until answered |
|---|---|---|---|
| O1 | The INPE reproduction has no file in the data contract. Proposed `data/out/inpe_reproduction.json`: `{region, rows:[{ym or year, ours, inpe}], summary:{r, mean_abs_pct_diff}}`. | Data lead | Panel reads `checks.json` P3 `detail`; shows the comparison chart only if the file exists. |
| O2 | Punjab validation needs the published reference times (Jethva 2026: 13:44 in 2021 → 15:12 in 2025) in a JSON, so no number is typed into the UI. Proposed `data/out/validation.json`. | Data lead | Panel plots `drift/in-punjab-haryana.json` and reads P2's `detail`. |
| O3 | The "fire day" curve: plot A against `aqua_lst` and T against `terra_lst` from `twoclocks/<id>.json`, or will the pipeline write explicit curve points? | Science lead | Plot the twoclocks values as points on a 24-hour dial; no fitted curve until the pipeline provides one. |
| O4 | Headline check numbers: `audit.aqua_count` vs. `audit.fixed_count` between two audit years (2021–2025)? | Science lead | Yes; pairs are limited to audit years, default 2024 → 2025. |

## Decision log
| Decision | Options considered | Chosen | Why |
|---|---|---|---|
| Name | Driftless, Gnomon, Anchor, Half Past One | **Anchor** | User's choice; the earlier working title: a fixed reference that doesn't drift |
| First screen | Verdict first; explorer first; two pages | **Verdict first, then explore** | Judges and journalists need the answer before the tool |
| Missing real data | Mock + badge fallback; "pending" only; mock anywhere | **Per-file fallback to mock with MOCK badge, strict flag for final deploy** | Keeps every panel buildable now; badge prevents misuse |
| Languages | EN; EN+PT; EN+PT+ES | **English only** | Judging in English; strings centralised for later |
| Downloads | CSV+PNG/SVG+summary; CSV+PNG; CSV only | **CSV + PNG/SVG per figure + per-region summary** | Covers analytics, visualizations and CSV named by the challenge |
| Share links | URL state; none | **URL state** | Citable views for journalists and slides |
| Shader fallback | Degrade to still; always on; off by default | **Degrade to a still** | Rich visuals without risking a blank screen at judging |
| Hosting | Host-agnostic + GitHub Pages; Cloudflare; Vercel/Netlify | **Host-agnostic + GitHub Pages workflow** | Works anywhere; a team member enables Pages |
| Visual references | 12 directions + 6 parts (Stage 1) | **A1, B3, C1, C2; parts D1, D2, D3, D5** | User's picks, with rich colour, imagery and shaders |
