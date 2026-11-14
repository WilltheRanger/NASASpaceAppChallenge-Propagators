# Frontend build prompt

Copy everything below the line into your AI coding assistant, run from the repo root.

---

You are building the web app for Team Propagators' NASA Space Apps 2026 project (Challenge #9, "Harmonization of MODIS and VIIRS Hot Spots"). The deadline is **Sunday Nov 15, 6 PM PT**, so prefer simple, working and polished over clever.

## What the app is
**A fixed-clock fire calendar for anywhere, with a clock audit.**

NASA's Aqua satellite (MODIS) used to photograph Earth at about 1:30 pm local time. Its orbit drifted, and it now passes at about 3:50 pm. The VIIRS satellites still pass at about 1:30 pm. Brazil's official fire count (INPE) is still built only from Aqua.

The app shows two things:
1. A month-by-year **burning-activity calendar** on a fixed 1:30 pm clock. This is the harmonized MODIS+VIIRS calendar the challenge asks for.
2. A **clock audit**: how much Aqua's late clock has changed the Aqua-based count since 2021, region by region.

The Amazon is the featured story. The app also covers the Cerrado, Pantanal, Argentina, Punjab+Haryana and California.

Hero text: "Brazil reported its fewest Amazon fires since 1998, counted by a satellite whose 1:30 pm photo now happens at 3:50 pm. How much of that is the fire, and how much is the clock?"

## Read first
- `data/mock/README.md`: every field of every data file.
- `research/execution-plan.md`: §1 deliverables, §3 data contract, §6 pitch, §9 extras.

## Stack and hard rules
**Stack.**
- New folder `frontend/`: Vite + React + TypeScript (strict) + Leaflet.
- Vitest, ESLint, Prettier.

**Fully static.**
- No backend, login, API keys, cookies or analytics.
- Deploy to Cloudflare Pages: root `frontend`, build `npm run build`, output `dist`.
- It must open from a public link without signing in.

**Data.**
- Read ONLY the JSON files in `frontend/public/data/` (same layout as `data/mock/`).
- Add npm scripts: `data:mock` copies `../data/mock/*` → `public/data/`; `data:real` copies `../data/out/*` → `public/data/`.
- Never hard-code or invent numbers.
- `null` means "no data", never zero.
- If a loaded file has `"mock": true`, show a persistent, obvious **MOCK DATA** badge on every view that uses it.

**Charts.**
- Hand-written SVG components preferred; at most one small charting library.
- Lazy-load each region's JSON; keep the bundle small.

**Branding.** No NASA logos, flags or mission insignia anywhere. A text credit like "Data: NASA FIRMS (MODIS, VIIRS)" is fine.

**Layout.** Mobile-first. Must work at 375 px and on a 1920 px projector.

## Screens
### 1. Explorer (`/`, opens on the region with `featured: true`)

**Header.**
- `[PROJECT NAME]` placeholder and the one-line hero text.
- The MOCK badge when mock data is loaded.
- A big verified number slot: "Aqua now passes over the Amazon at 3:50 pm, not 1:30 pm." Keep this text in one config constant so the team can edit it.

**Region picker.**
- A dropdown from `regions.json`, plus a Leaflet map showing each region's `bbox` as a clickable rectangle.
- OpenStreetMap tiles with attribution.
- Selecting a region updates everything.

**Year-range control** (2002–2026). It filters the calendar and the CSV.

**Calendar heat-map** (required by the challenge).
- Rows are years, columns are months.
- Toggle between two views:
  - "Fire activity": color by `fixed`, sequential colorblind-safe ramp (viridis or cividis).
  - "Compared with normal": color by `anomaly_pct`, diverging ramp centered on 0, never red/green.
- Tooltip and focus panel: month; `fixed` with its `lo`–`hi` range; anomaly vs. `median_ref`; raw `aqua`/`snpp`/`noaa20`; flags.
- Cell states:
  - hatch `provisional` cells;
  - mark `outage` cells with a pattern;
  - show grey "no data" for nulls.
- Legend with units: "fixed-clock hotspots (Aqua-equivalent)".

**Clock-audit panel.**
- For 2021–2025, plot `gap_pct` per year. Draw error bars from `L_lo`/`L_hi` (gap = (L−1)×100) and a shaded ±`noise_floor`×100 band. Add a second marker for the size-adjusted value (`L_strat`).
- Auto-sentence for the latest `ok` year: "In {year}, the Aqua-based count was {|gap|}% {higher|lower} than the fixed-clock count (range a–b%)." If it falls inside the noise band, say "no measurable difference."
- If `status` is `insufficient_data`, show "Not enough fires to measure."
- **Headline check:** "Change 2024→2025: Aqua-based −X% vs. fixed clock −Y%." Compute it from yearly sums of `aqua` and `fixed` in the calendar file.

**Annual comparison.** A small line chart of yearly totals, Aqua-based vs. fixed clock, so the gap is visible.

**Drift chart.**
- Aqua, Terra and VIIRS local overpass time by year (convert `HH:MM` to minutes for the y-axis).
- Annotation: "Aqua stopped orbit corrections (2021)".

**"How do we know?" checklist.** From `checks.json`: a pass/pending/fail icon plus the detail text.

**CSV download** for the selected region and years:
- one row per month with every calendar field;
- header comment lines with source, units, region, the mock flag and the generated date.

### 2. Proof (`/proof`)
- California real-fire proof from `proof_california.json`.
- Small multiples, one per size class: `aqua_pod` vs. `viirs_pod` by year, with a vertical marker at 2021 and the sample sizes `n`.
- Explain it in one line: "Of the fires firefighters actually recorded, what share did each satellite see?"

### 3. Method & limits (`/method`)
**Plain-language explanation, using the photographer analogy.**
- One photographer (VIIRS) still arrives at 1:30.
- The other (Aqua) now arrives at 3:50.
- If the two kept a steady ratio before 2021, any change after it shows how far Aqua's count drifted.

**Method steps.**

**The validation checks.**

**Assumptions and limits.**
- Hotspots are not fires.
- Quiet regions are noisy.
- 2026 is provisional.
- The error's size and direction differ by region.

**Data sources, with links:**
- NASA FIRMS
- INPE Programa Queimadas
- USFS FPA-FOD 7th ed.
- MapBiomas Fogo
- IBGE biomes

### 4. About (`/about`)
- Team roles (no personal data).
- Credits.
- Open-source license.

## Design and copy
- Clean, scientific, high contrast, one accent color, generous spacing, readable on a projector.
- Plain English, short sentences. Write "we did not find anyone else doing…", never "first".
- **Accessibility:**
  - arrow-key navigation of calendar cells, with a visible focus outline;
  - aria-labels;
  - a "show as table" toggle for the calendar and the audit;
  - respect `prefers-reduced-motion`;
  - color is never the only signal (use patterns for flags).

## Quality bar
- **Types:** TypeScript types for every JSON file, matching `data/mock/README.md`. Validate files on load and show a friendly error if one is missing.
- **Vitest tests** for:
  - color and anomaly mapping;
  - the audit sentence (including the noise band and `insufficient_data`);
  - the headline-check math;
  - the CSV export (nulls and header lines);
  - `HH:MM` parsing.
- **Build:** `npm run build` passes with zero type errors. Aim for a Lighthouse accessibility score of at least 90.
- **Commits:** work in small steps and commit after each working step with a clear message.

## Order of work (stop and show me after each step)
1. Scaffold, data scripts, types, region picker, MOCK badge.
2. Calendar heat-map and CSV download.
3. Audit panel, headline check, annual comparison.
4. Drift chart and checklist.
5. Proof, Method and About pages.
6. Polish and accessibility. Deploy to Cloudflare Pages, then test the public URL in a private window.
