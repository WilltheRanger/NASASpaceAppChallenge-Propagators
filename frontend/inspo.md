# inspo.md: Stage 1 · Inspire

The screens' jobs: a month × year fire calendar compared with a historical median, an audit with error
bars and a noise floor, a "two clocks" time-of-day story, a pass/pending/fail validation list, a region
picker and CSV export. After the first pass the user asked to go beyond climate dashboards toward more
advanced work and tech-company sites, so this list leads with those. The climate tools stay at the end
as conventions our named user already reads.

Screenshots (desktop + mobile, hero + full page) are in `references/`. Contact sheets:
`references/_board-1-directions.jpg`, `_board-2-parts.jpg`, `_board-3-conventions.jpg`.
Awwwards (MCP and site) and Chrome are unavailable here; Playwright captured the sites.
21st.dev shortlist saved as the bookmark list **"Propagators · fire clock audit (Space Apps 2026)"**.

**Status key:** ⭐ picked by the user · ✗ not picked · (baseline) used regardless.

## User decision (Sat Nov 14, ~3:45 PM PT)

- **Picked:** A1 Ciechanowski (operable figures), B3 Apex (spec cards, numbered sections), C1 Linear (real product under the headline), C2 Oxide (FIG. captions, engineering-document details).
- **Parts:** D1 Leaderboard Bars, D2 Circularium Ring, D3 Flip-Disk Matrix, D5 COBE Globe. D4 calendar grid and D6 expected-band chart are baselines.
- **Colour note, in the user's words:** "C1 Linear and C2 but with actual good color, not just normal color but maybe images, shaders, etc." So: rich colour, real imagery and shader work, not a plain near-black + white template. Shaders must carry meaning (heat, day/night, orbits), per unslop.
- **Next:** "fill out the product design form and build around it", i.e. complete `productID.md` (brand strategy → visual direction → logo → voice) and drive Stage 2 from it.

## Board 1 · Directions

### A · Interactive science and data storytelling

⭐ **A1 · Bartosz Ciechanowski, "Earth and Sun" (also "Mechanical Watch")** · `ciechanow.ski/earth-and-sun/` · `references/ciechanowski-*`
- **Borrow:** every figure is an instrument the reader operates. A live globe sits in a dark band inside a light article, with date and UTC-time sliders right under it and prose telling you what to try. For us: drag the time of day and watch Aqua's look time slide from 13:30 to 15:50 while the count it reports changes.
- **Avoid:** a long read before the answer; our named user needs the verdict first.

✗ **A2 · Distill, "Why Momentum Really Works"** · `distill.pub/2017/momentum/` · `references/distill-momentum.*`
- **Borrow:** research rigor on the web. A serif title, a hero figure with labelled parameter sliders, a byline row (authors · date · citation), footnotes and margin notes. A natural home for the method, "How do we know?" and P1–P10.
- **Avoid:** dense academic prose, tiny figure labels.

✗ **A3 · earth.nullschool.net** · `references/nullschool.*`
- **Borrow:** the data is the whole interface. One animated globe on black, with chrome cut to a single "earth ≡" menu. The visualization is the brand.
- **Avoid:** motion with no numbers on screen; WebGL cost on phones.

✗ **A4 · Fathom Information Design** · `fathom.info` · `references/fathom.*`
- **Borrow:** a dense ember-red hex-binned map shot as the hero; ember on near-black for heat data; serif and sans together.
- **Avoid:** dim low-contrast reveal text, the logo wall, the purple gradient footer.

### B · Fire and space industry

✗ **B1 · Muon Space (builds the FireSat constellation)** · `muonspace.com` · `references/muon-space.*`
- **Borrow:** one gigantic figure with its unit as the hero ("600 KM above Earth"). For us: **15:50**, Aqua's look time this week. Near-black with fire-orange; mono micro-labels.
- **Avoid:** partner logos (NASA's included; we can't use it), stock lab photos, wide-tracked caps everywhere (an unslop sign).

✗ **B2 · Earth Fire Alliance (the FireSat coalition)** · `earthfirealliance.org` · `references/earth-fire-alliance.*`
- **Borrow:** warm paper ground with **deep-teal stat cards** and huge numerals ("8B tons", "$215B"), ember-orange labels and buttons, and an inset "FIRE DETECTED" thermal card over aerial imagery. Paper + teal + ember suits fire measured by instruments.
- **Avoid:** stock aerial video, carousels, the quote slider.

⭐ **B3 · Apex Space** · `apexspace.com` · `references/apex-space.*`
- **Borrow:** **spec cards** per spacecraft (huge numerals with units, mono field labels, tag chips) and numbered navigation ("1.0 Platforms · 2.0 Factory"). For us: one card per satellite (Aqua, Terra, S-NPP, NOAA-20) with look time, a50, a90 and status; numbered sections like a lab report.
- **Avoid:** arbitrary purple/blue/orange button bars, condensed caps headlines everywhere.

✗ **B4 · Quanta Magazine** · `quantamagazine.org` · `references/quanta.*`
- **Borrow:** the register a journalist trusts: serif headlines, a small kicker ("Origins of life"), one rich explanatory illustration per story.
- **Avoid:** the generic magazine grid and newsletter promos.

### C · Tech product craft

⭐ **C1 · Linear** · `linear.app` · `references/linear.*`
- **Borrow:** the **real product directly under a short headline**, not a mockup. For us: the live calendar and audit sit right under the hook. A dark neutral ramp; calm density.
- **Avoid:** copying the near-black + Inter + white template (the unslop "template look").

⭐ **C2 · Oxide Computer** · `oxide.computer` · `references/oxide.*`
- **Borrow:** engineering-document details: **"FIG. 1" captions** on visuals, terminal-style readouts, one signal accent on near-black, the hardware itself as the hero.
- **Avoid:** green-on-black hacker cliché.

✗ **C3 · PlanetScale** · `planetscale.com` · `references/planetscale.*`
- **Borrow:** text-first honesty that reads like a datasheet: mono type, hairline-boxed tables, inline accent links, almost no imagery. Fits "every number comes from a JSON file".
- **Avoid:** all-mono long paragraphs (tiring to read); the logo grid.

✗ **C4 · Teenage Engineering OP-1** · `teenage.engineering/products/op-1` · `references/teenage-engineering.*`
- **Borrow:** the instrument tone ("satellites are lab instruments, and one drifted"): cool light grey, tiny technical labels, mono numerals, one hot accent used sparingly, honest spec lists.
- **Avoid:** endless caps lists, lowercase-only headings, low-contrast small text.

## Board 2 · Parts to build with (21st.dev)

| # | Part | Install | Job in our app |
|---|---|---|---|
| D1 ⭐ | **Leaderboard Bars** (eugeneshilow) | `21st:eugeneshilow/leaderboard-bars` | Audit rows: one per year, bar with ±CI whiskers, mono "12.4 ±3.1" readout, and an "off the board" row for *not enough fires to measure* |
| D2 ⭐ | **Circularium Ring** (daiwiikharihar) | `21st:daiwiikharihar/circularium-ring` | A 24-hour ring: rings are years 2012→2025, sectors are hours, marks at each satellite's look time. The "fire day" reconstruction as a dial |
| D3 ⭐ | **Flip-Disk Matrix** (daiwiikharihar) | `21st:daiwiikharihar/flip-disk-matrix` | An electromechanical readout for the hero figure (Aqua's look time) |
| D4 (baseline) | **Returns Calendar** (ssychui) | `21st:ssychui/returns-calendar` | The month × year grid with a yearly column (swap its red/green for a colour-blind-safe ramp) |
| D5 ⭐ | **COBE Globe** (shuding) | `21st:shuding/cobe-globe` | The six preset regions as labelled markers on a dotted Earth |
| D6 (baseline) | **Anomaly Chart** (astralyxdev) | `21st:astralyxdev/anomaly-chart` | Observed line over an expected band: the audit's ±noise floor, two-clocks series |
| — | Task Steps (ddoemonn), Table of Contents scroll-spy (appica-dev), Treasury landing template palette (kedhareswer) | `21st:ddoemonn/task-steps`, `21st:appica-dev/toc` | P1–P10 checklist; "on this page" rail; cream/teal/olive palette reference |

## Board 3 · Domain conventions to keep (not for picking)

Our named user already reads these, so their functional conventions carry over even where their looks don't.

| # | Source | Convention we keep |
|---|---|---|
| E1 | INPE Queimadas "Situação Atual" | **Dif. A.** (vs. last year) and **Dif. M.** (vs. the mean) columns; a CSV link under every table. Our headline check reads as *official Dif. A. vs. fixed-clock Dif. A.* |
| E2 | GWIS Seasonal Trend | History as a **grey min–max band**, the average as a line, the current year as one strong line |
| E3 | Global Forest Watch | **Sentence-led figures**: a generated sentence with bold numbers opens each chart |
| E4 | Copernicus Climate Pulse | An **Absolute / Anomalies** toggle; "vs 1991–2020" stated beside every number |
| E5 | Our World in Data | **Table / Chart** tabs on one figure; Download + source line under it; a subtitle that admits limits |
| E6 | #ShowYourStripes | A diverging ramp people read with no axes |

## Also captured, not shortlisted

These are well-made sites; the reason is fit with our product, not quality.
Stripe (the original of the gradient look; so widely copied that borrowing it would read as derivative,
and it doesn't suit fire or instruments), Raycast (its glowing stripes are brand art, same problem),
Mercury (confident serif and restraint, but its dreamy landscape and premium-finance tone don't fit an
evidence-first science tool with no real imagery), Vercel (a minimal hero with little to borrow for data),
Cursor and Resend (strong but off-domain), Apple Watch (store category page),
OroraTech (stock-photo hero), The Pudding (homepage only), MapBiomas Fogo and NOAA Climate at a Glance
(form/modal-first), GWIS-style grids beyond E2. Didn't render or were blocked here: ShadeMap,
satellitemap.space, Igloo, Nothing, timeanddate, FT, Reuters, Bloomberg, Awwwards.

## Patterns across the strongest references

1. **The data product is the hero** (Fathom, Linear, nullschool, Oxide), not a picture of it.
2. **One giant figure with its unit** carries the hook (Muon, Earth Fire Alliance, Apex).
3. **Figures you operate**: sliders under the figure, prose that says what to try (Ciechanowski, Distill).
4. **Engineering-document scaffolding**: numbered sections, FIG. captions, spec cards, mono field labels (Apex, Oxide, PlanetScale, TE).
5. **Two fire palettes on offer**: ember on near-black (Muon, Fathom) or ember + deep teal on warm paper (Earth Fire Alliance, Treasury).

## Asset shortlist

One visual family: **data graphics and drawn instruments**. No stock photos, AI imagery or 3D models of
NASA spacecraft (the no-mission-identifiers rule); satellites are drawn as plain glyphs.

| Asset | Source | Licence | Use |
|---|---|---|---|
| Country and state outlines (1:110m / 1:50m) | Natural Earth | Public domain | Region locator maps and globe markers |
| Basemap tiles | OpenStreetMap or CARTO Positron/Dark Matter | ODbL / CARTO free tier, attribution | Chino Hills "seen vs. missed" map (Leaflet) |
| Brazil biome outlines | IBGE Biomas 1:250k (team has it) | Open data, credit IBGE | Stretch: biome shapes, simplified to a few KB |
| Icons | Lucide | ISC | Controls and status marks |
| Fonts | Google Fonts / Fontshare | OFL / free | Chosen in Stage 2: a sans with tabular figures, a mono for readouts, possibly an editorial serif |
| Optional imagery | NASA Earth Observatory fire scenes | Public domain, credit NASA EO; no logos | At most one captioned evidence image; not the hero |
