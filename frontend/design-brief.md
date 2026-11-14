# Anchor — Design brief

Self-contained handoff for the UI phase (uxui-workflow Phase 3, ui-forge Stage 2). Sources: `requirements.md`, `ux-brief.md`, `productID.md`, `inspo.md`.

## The product
Anchor is a public web app by Team Propagators (NASA Space Apps 2026, Challenge #9). It keeps a 2002→now, month-by-month burning-activity calendar on one fixed 1:30 pm clock (VIIRS-based, in Aqua-equivalent units) for six preset regions: Amazon, Cerrado and Pantanal (Brazil), Argentina, Punjab + Haryana (India), California (USA). It audits how much of the official, Aqua-based fire trend since 2021 comes from Aqua's drifting overpass clock rather than from fire. Aqua was picked as Brazil's reference satellite because it looked at ~1:30 pm every day; this week it crossed the Amazon at ~3:50 pm, while VIIRS still looks at ~1:30 pm. Terra drifted the other way, so comparing the two identical MODIS instruments isolates the clock.

**Problem statement:** a journalist, state analyst or researcher who reports official fire counts needs a way to tell how much of a year-on-year change since 2021 is fire and how much is the reference satellite's drifting clock, because Aqua now looks at about 3:50 pm instead of 1:30 pm and the official series doesn't adjust for it.

## Primary user and context of use
A journalist covering INPE's fire bulletin: deadline-driven, reads INPE's "Situação Atual" tables (year columns, **Dif. A.** vs. last year, **Dif. M.** vs. the mean), not a remote-sensing expert, needs a defensible sentence, a chart and a citable source. Secondary: state analysts, researchers, fire managers, Space Apps judges (two minutes, often on a projector). Laptop first; must work on phones from 390 px.

## Concept and mental model
**A living lab report about one instrument that drifted.** One numbered page, verdict first; a 24-hour clock dial is the hero instrument; the Calendar section works like a console for repeat use. One region is "loaded" at a time and every section re-renders for it.

## Core flows (condensed)
- **J1 Verdict:** open → Amazon 2024→2025 verdict → switch region or year pair → read official vs. fixed-clock change and the per-year clock effect with ranges. Unmeasurable pair → "not enough fires" + nearest valid pair.
- **J2 Calendar:** Explore → set region and month range → toggle Fixed count / Anomaly vs. median → hover a month (count, range, median, % vs. median, raw sensors, flags) → click for month detail → Table view if needed.
- **J3 Download:** every figure: CSV · PNG · SVG · Table; per-region print-ready Summary sheet.
- **J4 Evidence:** scrub years on the drift chart and two-clocks dial; P1–P10 checklist with pass/pending/fail; INPE reproduction; Punjab validation.
- **J5 What satellites miss:** California spec cards (a50/a90 acres per satellite), real-fire proof chart, Chino Hills seen-vs-missed map.

Verdict rule (logic on JSON only): **clock effect detected** if a year's L range lies wholly outside 1 ± `noise_floor`; **within noise** if it overlaps; **not enough fires** if `insufficient_data`.

## Navigation and screen inventory (journey order)
Global sticky top bar: Anchor · section index 0.0–7.0 (scroll-spy) · Region switcher · Data status (Real / MOCK). URL holds region, date range, mode, year pair.

| # | Section | Primary action | Content priority | Key? |
|---|---|---|---|---|
| S0 | **0.0 Verdict (hero)** | Explore the calendar | Aqua's latest look time readout (with VIIRS for contrast) → verdict sentence → official vs. fixed-clock change with range → per-year clock-effect chips → dial + year scrubber → source line | **Key** |
| S1 | 1.0 The clock moved | Hover/scrub years | Finding → drift chart (Aqua, Terra, VIIRS look times by year) → source | Supporting |
| S2 | 2.0 Two clocks | Scrub the year | Finding → A and T with ranges → `clock_diff` with range → fire-day dial → `sampling_est` → why it works | **Key** |
| S3 | 3.0 Audit | Select a region | Finding → per-year rows: gap ± range, noise band, `L_strat`, counts → "not enough fires" rows → baseline note | **Key** |
| S4 | 4.0 Calendar | Set region and dates | Sticky console bar → month × year grid + yearly column → legend (ramp, provisional hatch, outage, no data) → season curve vs. median band | **Key** |
| S4a | Month detail | Close | Count and range → % vs. median → that month across all years → raw sensors, flags | Supporting |
| S5 | 5.0 How do we know | Expand a check | Tally → P1–P10 → INPE reproduction → Punjab validation | Supporting |
| S6 | 6.0 What satellites miss | Toggle satellite on map | Finding → spec cards → rates by size class → proof chart → Chino Hills map | Supporting |
| S7 | 7.0 Limits | — | Plain caveats → what would change our mind | Supporting |
| S8 | Footer | All downloads | Sources and citation → downloads → Team Propagators → per-file data status | Supporting |
| S9 | Summary sheet | Print / Save PDF | Verdict, audit table, checks, limits, sources | Supporting |

**States for every figure:** loading (reserved space) · error + Retry · `null` = "no data" (never zero) · MOCK badge · success. Reduced motion / no WebGL / slow frame rate → shaders become stills; the dial stays operable.

## Hero screen to design first
**S0 · 0.0 Verdict.** It holds the hook, the answer and the central visual (the dial and its readout), and sets the system every section reuses: numbered heading, one-sentence finding, operable figure, source line.

## UX principles
1. Verdict before tool. 2. Every number carries its source, unit and range. 3. Figures you can operate. 4. One region, everywhere. 5. Honest states are first-class.

## Brand and tone
- **Name:** Anchor. **Tagline:** "Count the fires, not the clock."
- **Personality:** precise, candid, calm, curious, generous (Sage, with an Explorer streak).
- **Must never feel:** alarmist, salesy, hype-y, or accusatory toward INPE.
- **Voice:** lead with the finding; show the clock (13:30, 15:50); measure, then speak. Changes always carry a reference ("−22% vs. 2024"). "We did not find anyone doing X", never "first" or "only". Sentence case, no exclamation marks.
- **Visual wishes (user's words):** like Linear and Oxide "but with actual good color, not just normal color but maybe images, shaders, etc." Rich colour, real imagery and shader work, never a plain grey template. Shaders must carry meaning (heat, day/night, orbits, the clock).
- **Competitors:** ~320 calendar repos for this challenge; FireClock (fixed-clock calendar + Aqua drift probe); BRASA (Aqua/VIIRS ratio).
- **Constraints:** no NASA logos, flags or mission identifiers (satellites drawn as plain glyphs, no spacecraft models); team members are minors, so no names, photos, faces or voices, only "Team Propagators"; visible AI acknowledgement plus metadata; opens without sign-in.

## Platform, breakpoints, accessibility
- Static web app: Vite + React + TypeScript, Tailwind + shadcn primitives, custom SVG charts, Leaflet (Chino Hills map), WebGL shaders with still fallbacks. Host-agnostic build with relative paths; GitHub Pages workflow.
- Breakpoints: 390 (phone), 768 (tablet), 1024 (laptop), 1440 (desktop), projector at 1280×720 must stay legible.
- Accessibility: WCAG AA contrast (also when projected), keyboard access to every control and calendar cell, table equivalents for every chart, colour-blind-safe sequential and diverging ramps, no meaning by colour alone (hatch, icons, labels), `prefers-reduced-motion` honoured, focus visible.

## Must-haves vs. won't-haves
- **Must:** S0–S5, S7–S9 as above; calendar (fixed count + anomaly vs. median, accessible ramps, CSV); region + month range; audit with noise floor and `L_strat`; headline check; drift; two clocks + fire day; P1–P10; INPE reproduction; Punjab validation; limits; CSV + PNG/SVG per figure + Summary; MOCK badge with per-file fallback and a strict build flag; URL state; shaders with stills; compliance items.
- **Should:** S6 (California detection limits, real-fire proof, Chino Hills map).
- **Won't (this version):** draw-an-area or lat/lon entry; user-chosen baseline; Portuguese/Spanish; AI chat; accounts, notifications, analytics.

## Data contract (what the UI reads)
`data/out/` (real) else `data/mock/` (synthetic, badged): `regions.json`, `calendar/<id>.json` (months: `ym`, `fixed`, `lo`, `hi`, `aqua`, `snpp`, `noaa20`, `median_ref`, `anomaly_pct`, `flags`), `audit/<id>.json` (`baseline{years, ratio, noise_floor}`, years: `status`, `L`, `L_lo`, `L_hi`, `L_strat`, `aqua_count`, `fixed_count`, `gap_pct`), `drift/<id>.json` (`aqua_lst`, `terra_lst`, `viirs_lst` "HH:MM"), `twoclocks/<id>.json` (`A`, `T` ± ranges, `clock_diff` ± range, `sampling_est`, look times), `checks.json` (P1–P10), `proof_california.json`, `detection_limits_california.json`, `socal_seen_missed.json`. Open questions O1–O4 in `requirements.md` (INPE reproduction file, Punjab reference times, fire-day points, headline-check numbers).

## References (ui-forge)
Stage 1 picks (screenshots in `references/`, notes in `inspo.md`):
- **A1 · Ciechanowski, "Earth and Sun" / "Mechanical Watch":** figures the reader operates; sliders directly under the figure; a dark figure band inside a light article.
- **B3 · Apex Space:** spec cards with huge numerals and units, mono field labels, tag chips; numbered sections (1.0, 2.0…).
- **C1 · Linear:** the real product directly under a short headline; calm, dense UI.
- **C2 · Oxide Computer:** "FIG. 1" captions, terminal-style readouts, one signal accent, the hardware as hero.
- **Parts (21st.dev):** D1 Leaderboard Bars (audit rows with ±CI and an off-the-board row), D2 Circularium Ring (24-hour ring), D3 Flip-Disk Matrix (hero readout), D5 COBE Globe (regions as labelled markers). Baselines: D4 Returns Calendar (month × year + yearly column), D6 Anomaly Chart (expected band).
- **Conventions kept for the named user:** INPE's Dif. A./Dif. M. and CSV under every table; GWIS grey history band; GFW sentence-led figures; Climate Pulse's Absolute/Anomalies toggle; OWID Table/Chart tabs with Download and source line.
- Awwwards `create_design_brief` and `export_design_tokens` were unavailable here; tokens are seeded from the references and 21st.dev themes in Phase 3.
