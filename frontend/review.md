# review.md: ui-forge Stage 4 · Verify

Run: 16 Nov 2026. Skills: ui-forge-kit `ui-forge` (Stage 4), `unslop` (signs.md audit, nine passes, polish mode),
`ui-director` critique rubric. Brief from the team: cut the extra wording and subtext judges don't need; the Overview's
finding band ("Read year-to-year changes…" and the boxed caveat on the side) is the example.

## Direction (polish mode: kept from DESIGN.md, not reinvented)

- **Product.** Anchor shows how much of Brazil's official fire trend comes from Aqua looking later in the day, against a VIIRS benchmark that kept its 13:30 clock.
- **Character.** Exact, candid, unhurried.
- **World.** Field notes over satellite pictures at dusk: smoke, bone paper, instrument read-outs.
- **Moments.** The real NASA pictures of one Amazon afternoon; the six-place strip table.
- **Signature.** The ring-to-dot moved time (hollow ring = old time, dot = new), amber for Aqua only.

## Round 1 audit (before)

Unslop verdict: **light slop visually, heavy slop in the copy.** The palette, type, icons and motion already follow
DESIGN.md (no glows, gradients, emoji, tracked caps or weights above 500). The slop is words.

### Copy (the main problem)

| Where | Sign | Fix |
|---|---|---|
| Overview, finding band | Hedge line under the headline ("Read year-to-year changes in the official count alongside the benchmark.") | Cut |
| Overview, finding band | Caveat in a detached side box, about "the gap" the headline never names | Moved under the headline as its one supporting line; box removed |
| Overview, day steps | "Other satellites kept their time": **wrong**, Terra drifted 76 min earlier (stated two lines above) | "VIIRS kept its time" |
| Overview, day steps | Step text repeats the time already in the step title ("13:37 … About 13:37 …") | Cut the repeat |
| Overview, figure | Caption disclaimer duplicated on Method ("Times shown are usual looks…") | Kept on Method only |
| Overview, table | "Our test case" with no context | Removed (row already says "Too few fires") |
| Every page | Same caveat, 3 sentences, repeated 4× | Shorter, said once per finding (on `tidy-later`: the team's non-causal wording) |
| Regions | Calendar intro repeats the hero ("Fire season runs August to October" under "Fire season: August, September and October") and explains rows/columns the chart already labels | Cut |
| Regions | "Pick another place" and "Back to the fire calendar" links duplicate the sticky picker and section bar | Cut |
| Regions | Footer "Notes on this page" repeat each section's own disclosure, plus a data-folder path | Removed; the one new fact (what "Unusual" means) moved into "Show the numbers" |
| Regions | Chart how-to lines repeat the legends ("The line is the likely range; the grey band…") | Cut |
| Method, limits | "Addressed ·" prefixes and "Addressed: …" lines: internal review-tracker status shown to judges | Removed |
| Method, limits | "Next: check NOAA-20 and NOAA-21 against S-NPP": **stale**, analysis/handover already did it | Replaced with the result |
| Method, limits | Repo folder path as text ("analysis/attribution in the repository") | Linked instead |
| Method | Footer notes duplicate sections; one refers to the ten-test list, which the page no longer shows | Removed |
| Method, figures | Raw file paths ("Source: data/out/facts.json, amazon_decline_2024_2025") and the caveat a fifth time | Cut; dataset links kept |
| Regions, 2026 card | Five paragraphs of feed provenance; ISO dates | Two lines; "8–14 Nov 2026" |
| Footer | Contract boilerplate in the thank-you | Thanks kept, boilerplate cut |

### Visual signs

| Sign (signs.md) | Where | Fix |
|---|---|---|
| Numbers in mixed formats | Method step 4 "+29.6%" vs "+30%" on Overview and Regions | Whole percent everywhere |
| Trailing periods on single-sentence headlines and labels | Overview headings, limit titles, chart captions | Removed |
| Caveat brighter than the point it qualifies | Method, Two clocks (bone over bone2 lead) | Same role as the lead |
| A boxed card for one sentence | Overview finding | Plain text on the band |
| Console error on every Overview load | `fetchPriority` prop warning (React 18) | Lower-case attribute |

Kept on purpose (team decisions, still correct): hero line "A fire calendar for six regions", the what-if wording on
Explore, the MODIS version disclosure, close-call and points-past-range labels, every number's source.

### Fact checks run

- Calendar season lines (all six regions): recomputed from `data/out/calendar/*.json`. The 2024/2025 changes all
  match (Amazon +33%, −72%; California −15%, −17%; …). **Correction:** California's season share is about half
  (56.6% pooled, 51% in the median year), not two-thirds; the 2012–2020 window reads 65% only because 2020 dominates
  it. The team fixed this on `tidy-later` (e4e0f55) and the merge keeps their number.
- Amazon 2024→2025: INPE −69.3%, benchmark −73.9% (`data/out/facts.json`). On `tidy-later` the caveat follows the
  team's reviewed wording (a92c844): the gap and the later look moved together; the data don't isolate the cause.
- NOAA-20 handover: `analysis/handover/README.md`, Amazon 2025 1.29 (NOAA-20) vs 1.30 (S-NPP), no verdict changes.

## Round 1 result

```
Round 1 (judge B, independent, different model): Hierarchy 4 · Fit 4 · Slop 4 · Craft 3 · UX 3 · Technical 3 · Motion 3
Overall: before 5.5/10 → after 7/10. Judge A (impeccable finish reviewer) is not installed in this environment.
Fidelity to the approved direction (D · Field film): unchanged layout and tokens except the finding band.
```

Visible words per page (desktop `innerText`, includes nav, labels, table cells and credits): Overview 486 → 437,
Regions 562 → 471, Method 999 → 897, Explore 181 → 178.

**Judge findings taken:** limit titles that read as self-praise ("handled openly", "leaves the counts alone",
"and the method carries on") now state the limit itself; "Drag the handle." cut (the handle is visible); the
"VIIRS picture stands in…" note reworded.

**Judge findings not taken, and why:**
- Cut "a NASA satellite that spots fires from space" and the Terra line: judges need to know what Aqua is, and
  Terra's opposite drift is the strongest evidence on the page.
- "Aqua's count … 30% too high": accusatory toward INPE (PRODUCT.md) and mixes the matched-day audit into a
  full-year headline.
- Collapse the Sources list: citations are what a scientist checks first.
- Remove "Drag the chart…" and "Drag to turn the globe": those interactions aren't visible without the hint.

**Still open (team's call):** the bone finding band leaves its right half empty on wide screens; the Overview shows
69%/74% (change, full year) next to +30% (level, matched days), which the Method page reconciles but the Overview
doesn't.

Tests: `tsc --noEmit`, `npm run build`, `scripts/test_all.sh` (all suites), `test-story-limits.mjs`,
`tests/fire-context.test.mjs` pass. `analysis/calendar-shortcut` now checks that the calendar opens the Regions page
ahead of the result, instead of the removed "Back to the fire calendar" button.

## Merge into `tidy-later`

Ten conflict hunks in seven files, all small. Resolutions: the team's non-causal caveat wins everywhere (common,
Simulator, data, Ask Anchor, and the Overview finding band, which now shows that caveat instead of its own line);
their globe caption and chart hint win (the time strip under the globe is gone on this branch); their whole-years
block keeps its new structure with the trimmed line; their California share ("about half") replaces "two-thirds";
Method's first limit keeps their association wording with the linked nine tests. Their impact-copy additions to the
Overview (hero line, "who it's for", "What's new") are kept as written, except the "What's new" label, which was set
in uppercase with wide tracking (an unslop sign) and is now sentence case.
