# Anchor — UX brief

Phase 2 of uxui-workflow. Status: **approved** (flows and screen inventory), Sat Nov 14, 2026.
Traces to `requirements.md`; job numbers J1–J5 match its ranked core jobs.

## Chosen concept: Hybrid A + C + B

**One numbered report, verdict first (A), with the clock dial as its hero instrument (C) and a console-style explorer inside the Calendar section (B).**

- **Mental model:** a living lab report about one instrument that drifted. You read the verdict, turn the dial to see why, then use the calendar as a tool. One region is "loaded" at a time, and every section re-renders for it.
- **Why the hybrid:** A gives the fastest time to value (verdict in ~10 s) and full coverage; C gives the memorable mechanism and differentiation; B makes the calendar fast for repeat use without hiding the story behind tabs.

### Rejected concepts and why they lost
| Concept | Why it lost |
|---|---|
| **A · The Audit Report** alone | Strong story, but the explorer sits deep in the page and repeat visits mean scrolling. Kept as the spine. |
| **B · The Instrument Console** alone | Fast for repeat use, but tabs hide the evidence from judges, first-timers miss the clock idea, and it looks like the ~320 other calendar dashboards. Kept inside 4.0. |
| **C · The Clock** alone | The most memorable, but the challenge's base ask (the calendar) became a drawer, the verdict needed interaction first, and it was the hardest to build and make accessible. Kept as the hero instrument and in 2.0. |

## User journey map

| Stage | User goal | Actions | Thoughts / feelings | Pain points | Opportunities |
|---|---|---|---|---|---|
| 1 · Discover | Understand what Anchor claims | Opens a link from a slide, story or colleague | "A satellite's clock moved?" Curious, sceptical | Jargon; distrust of new tools | Lead with one concrete time (15:50) and its source |
| 2 · First look (0.0) | Get the verdict for their region | Reads the verdict sentence; switches region; changes the year pair | "Can I trust this number?" | Ranges and ratios are unfamiliar | Plain sentence with the range in it; "the trend holds" stated as plainly as a gap |
| 3 · Explore (4.0) | See a month against its median | Sets region and dates, toggles anomaly, hovers months | Focused, task-driven | 300 cells is dense | Hover detail, a season curve vs. the median band, a table view |
| 4 · Verify (1.0, 2.0, 5.0) | Check the method before citing | Scrubs the dial, reads drift, opens checks | "Would a scientist accept this?" | Method is complex | Operable figures; P1–P10 with clear statuses; INPE and Punjab checks |
| 5 · Take away | Use it in their work | Downloads CSV/PNG/SVG, prints the summary, copies the link | Wants to be done | Formats and citations | Source line under every figure; citation text; URL state |
| 6 · Return (day 100) | Check a new bulletin | Opens a saved link | "Has anything changed?" | Stale data | "Data updated" stamp and real/mock status per file |

## User flows (core jobs)

**J1 · Verdict (does the official trend hold?)**
1. Open the link → 0.0 Verdict shows the Amazon, pair 2024 → 2025.
2. Read: official (Aqua-based) change, fixed-clock change, the clock effect for each year with its range, and a one-line verdict.
3. *Alt:* switch region in the global switcher → every section updates; the URL updates.
4. *Alt:* change the year pair (audit years 2021–2025) → numbers and sentence update.
5. *Failure:* the pair includes an `insufficient_data` year → "Can't check this pair: not enough fires in 2023 to measure" with the nearest valid pair offered.
6. *Failure:* the audit file fails to load → the 0.0 panel shows an error with Retry; the rest of the page still works.

Verdict rule (no new numbers, only logic on JSON): for each audit year, **clock effect detected** if the L range lies wholly outside 1 ± `noise_floor`; **within noise** if the range overlaps it; **not enough fires** if `status` is `insufficient_data`.

**J2 · Calendar vs. median**
1. 0.0 "Explore the calendar" → scroll to 4.0; the console bar sticks.
2. Set from/to months → rows filter; the URL updates.
3. Toggle **Fixed count / Anomaly vs. median**.
4. Hover or focus a cell → tooltip: month, fixed-clock count with range, median for that month, % vs. median, raw Aqua / S-NPP / NOAA-20, flags.
5. Click a cell → month detail: that month across all years vs. its median, and the year's season curve over the history band.
6. *Alt:* Table view (screen readers, copy-paste).
7. *Edge:* `null` → "no data" (distinct from zero); 2026 hatched as provisional; Jul–Aug 2022 marked as an S-NPP outage.
8. *Failure:* the calendar file fails → error with Retry.

**J3 · Download**
1. Every figure has a toolbar: Table/Chart · CSV · PNG · SVG.
2. "Summary" (0.0 and footer) opens a one-page, print-ready sheet for the region: verdict, audit table, checks, limits, sources → Print / Save as PDF.
3. *Failure:* PNG export of the map is blocked by tile CORS → offer SVG/CSV and say why.

**J4 · Evidence**
1. 1.0 Drift: hover years; Aqua, Terra and VIIRS look times per year.
2. 2.0 Two clocks: scrub the year → the dial moves Terra earlier and Aqua later; A, T and `clock_diff` with ranges; `sampling_est`.
3. 5.0 Checks: P1–P10 rows; expand for detail. INPE reproduction and Punjab validation show their charts when their files exist, otherwise the check's detail text.
4. *Edge:* `pending` reads as "not run yet", never as a failure; `fail` is shown plainly with its detail.

**J5 · What satellites miss (California)**
1. 6.0: spec card per satellite (Aqua, Terra, S-NPP): a50 and a90 in acres with 95% ranges, fires used, detection rate by size class.
2. Real-fire proof: Aqua vs. VIIRS detection by size class and year, before vs. after 2021.
3. Chino Hills map: recorded fires within 25 km sized by acres; toggle Aqua / Terra / VIIRS; seen = filled, missed = hollow; a list view beside it.
4. *Failure:* map tiles blocked → fires still plotted on a plain background.

## Information architecture

One page, numbered like a lab report. Global state: **region**, **date range**, **calendar mode**, **year pair**, all in the URL.

```
Top bar (global, sticky): Anchor · section index 0.0–7.0 (scroll-spy) · Region switcher · Data status (Real / MOCK)
0.0  Verdict            hero dial + readout · verdict sentence · headline check · Explore / Summary
1.0  The clock moved    drift chart
2.0  Two clocks         A, T, clock_diff · fire-day dial
3.0  Audit              six regions × 2021–2025 rows (selected region first, expanded)
4.0  Calendar           sticky console bar (region · from–to · mode · downloads) · grid · month detail · season curve
5.0  How do we know     P1–P10 · INPE reproduction · Punjab validation
6.0  What satellites miss   California spec cards · real-fire proof · Chino Hills map
7.0  Limits             plain-language caveats
Footer                  Sources & citation · All downloads · How this was made (AI) · Team Propagators · data status per file
Summary sheet           ?view=summary (print-ready, one page per region)
```

- **Global:** top bar, region switcher, section index, data status.
- **Contextual:** the 4.0 console bar; each figure's toolbar; the month detail panel; the year scrubbers in 0.0 and 2.0.

## Screen inventory (sections and major states, in journey order)

| # | Screen / state | Purpose · job | Primary action | Secondary | Content, priority order | Must be obvious at a glance | Key? |
|---|---|---|---|---|---|---|---|
| S0 | **0.0 Verdict** (hero) | Give the verdict for the loaded region · J1 | Explore the calendar | Switch region; change year pair; Summary | 1 Aqua's latest look time (readout) with VIIRS's for contrast · 2 verdict sentence · 3 official vs. fixed-clock change with range · 4 per-year clock effect chips · 5 dial with year scrubber · 6 source line | Whether the official trend holds, and by how much, with uncertainty | **Key** |
| S1 | 1.0 The clock moved | Show the drift was measured · J4 | Hover/scrub years | Table view; downloads | 1 one-sentence finding · 2 drift chart (Aqua, Terra, VIIRS) · 3 source | Aqua later, Terra earlier, VIIRS flat | Supporting |
| S2 | 2.0 Two clocks | Separate the clock from orbit sampling · J4 | Scrub the year | Table; downloads | 1 finding · 2 A and T with ranges · 3 `clock_diff` with range · 4 fire-day dial (look time vs. ratio) · 5 `sampling_est` · 6 one-paragraph "why this works" | Opposite drifts move the two probes in opposite directions | **Key** |
| S3 | 3.0 Audit | Region-by-region clock effect · J1 | Select a region (expands it) | Downloads | 1 finding across regions · 2 rows per year: gap with range, noise band, `L_strat`, counts · 3 "not enough fires" rows · 4 baseline years and noise floor | Which years and regions sit outside the noise | **Key** |
| S4 | 4.0 Calendar | Explore a region and dates vs. median · J2 | Set region and date range | Mode toggle; CSV/PNG/SVG; Table view | 1 console bar · 2 month × year grid with yearly column · 3 legend (ramp, hatched, outage, no data) · 4 season curve vs. median band | Unusual months stand out; provisional and no-data are distinct | **Key** |
| S4a | Month detail | Read one month in context · J2 | Close | Download that month's series | 1 month, count and range · 2 vs. median (%) · 3 that month across all years · 4 raw sensor counts, flags | How unusual this month is | Supporting |
| S5 | 5.0 How do we know | Make rigour visible · J4 | Expand a check | Downloads; links to method | 1 tally (pass / pending / fail) · 2 P1–P10 rows · 3 INPE reproduction · 4 Punjab validation | What has passed, what is pending | Supporting |
| S6 | 6.0 What satellites miss | Detection limits vs. real fires · J5 | Toggle satellite on the map | List view; downloads | 1 finding · 2 spec cards (a50, a90) · 3 rates by size class · 4 proof chart · 5 Chino Hills map | Each satellite's smallest reliably seen fire | Supporting (should-have) |
| S7 | 7.0 Limits | State what Anchor can't tell · all | — | Links to sources | 1 plain-language caveats · 2 what would change our mind | The edges of the claim | Supporting |
| S8 | Footer | Sources, downloads, AI note | All downloads | Citation copy | Sources · downloads · How this was made · Team Propagators · per-file data status | Where every number comes from | Supporting |
| S9 | Summary sheet | One-page take-away · J3 | Print / Save PDF | Back | Verdict, audit table, checks, limits, sources | Ready to attach to a story | Supporting |

**States for every figure:** loading (reserved space, no layout jump) · error (message + Retry) · empty/`null` ("no data", not zero) · MOCK (badge on the figure + page notice) · success. Page-level: strict build with mock data refuses to build; reduced motion / no WebGL / slow frame rate → still images replace shaders and the dial stops animating but stays operable.

**First-time vs. returning:** first visit loads the Amazon and full range; a shared link restores region, range, mode and year pair.

## Hero screen

**S0 · 0.0 Verdict.** It carries the hook (the clock moved), the answer (does the trend hold) and the brand's central visual (the dial with its readout). Judges and journalists decide here whether to keep reading, and every other section reuses its parts: numbered heading, finding sentence, operable figure, source line.

## UX principles

1. **Verdict before tool.** Every section opens with its finding in one sentence, then the figure that proves it.
2. **Every number carries its source, unit and range.** `null` is not zero; mock is always labelled.
3. **Figures you can operate.** One obvious control per figure (scrub, toggle, hover); no hidden mechanics.
4. **One region, everywhere.** The region switch changes every section at once, and the URL remembers it.
5. **Honest states are first-class.** "Not enough fires to measure", "provisional", "outage", "pending" and "the trend holds" are designed results, not fallbacks.

**Voice and tone:** from `productID.md` §6: lead with the finding, show the clock, measure then speak. "Count the fires, not the clock."

## Requirement trace

All must-haves are served: calendar (S4), audit (S3), headline check (S0), drift (S1), two clocks (S2), checklist, INPE and Punjab (S5), limits (S7), downloads (S0, S8, S9, figure toolbars), URL state (global), MOCK handling (states), shaders with stills (S0, S2 visuals), compliance (S8). Should-haves: S6. Nothing in the inventory falls outside `requirements.md`.
