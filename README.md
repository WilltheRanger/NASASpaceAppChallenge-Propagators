# Anchor: fire counts on a fixed clock

**Team Propagators · NASA Space Apps Challenge 2026 · Challenge: Harmonization of MODIS and VIIRS Hot Spots**

Anchor is a web app that turns NASA's MODIS and VIIRS hotspot records into one burning-activity calendar per region, counted on a **fixed observation clock**. It also checks an official national fire statistic: Brazil's fire program (INPE) still counts fires with NASA's Aqua satellite as its "reference satellite", but Aqua's afternoon pass has drifted later every year since 2021. Over the Amazon its median look time moved from **13:37 (2012 to 2020) to 14:57 (2025)**.

Every number in the app comes from the JSON files in `data/out/`, which are produced by the code in `analysis/`. All of it is real data, except files marked `"mock": true`.

---

## The problem

- **Two sensor families:** MODIS (on Terra and Aqua, 1 km pixels) records fire from 2000; VIIRS (375 m pixels) from 2012. The challenge names three reasons their records don't line up: resolution, sensitivity and **observation schedule**.
- **Fire has a daily cycle:** in the tropics, burning peaks in the afternoon. A satellite that looks at a different hour counts a different number of fires, even if nothing changed on the ground.
- **The clocks are moving:** Aqua and Terra are low on fuel and can no longer hold their orbits. Since about 2021 Aqua has passed later each year, while Terra has passed earlier.
- **The consequence:** a record that joins MODIS and VIIRS without fixing the clock carries a time-of-day error into the "harmonized" series.

## What Anchor does

- **Burning calendar:**
  - month by year, 2002 to 2025, for six preset regions (Amazon, Cerrado, Pantanal, Argentina, Punjab + Haryana, California);
  - each month shown against its multi-year median (anomaly);
  - a from/to month range;
  - CSV download.
- **When each satellite looked:** the median local solar time of Aqua, Terra and VIIRS detections, year by year.
- **The clock audit:** how far Aqua's count departs from what a fixed clock predicts, with 95% intervals and a noise floor.
- **Two clocks:** Aqua drifted later and Terra drifted earlier. Comparing them separates the clock from changes both satellites share.
- **Detection limits:** what share of California's agency-recorded fires each satellite detected, by fire size.
- **Daylight left after the alert:** how much daylight remains when each satellite's alert arrives, before and after the drift.
- **Ten written predictions:** each checked against the data, with failures reported as written.
- **A world map (exploratory):** the same clock audit on every 2° cell of the map with enough fires, with a calendar per cell. It is not checked against a national reference series.
- **A limits section:** in the app and below.

## Method in brief

All times are **local solar time** (UTC + longitude / 15). Only daytime detections count. The baseline is **2012 to 2020**, the years when Aqua and VIIRS (S-NPP) both passed at about 13:30.

**1. Exchange rate.** For each region and calendar month, the 2012 to 2020 ratio of Aqua's count to S-NPP's count:

$$R = \frac{\text{Aqua count}}{\text{S-NPP count}}$$

**2. Fixed-clock count.** What Aqua would have counted had its clock not moved:

$$\text{fixed} = \text{S-NPP count} \times R$$

**3. Audit number.** L = 1 means no change; L = 1.30 means Aqua counted 30% more than the fixed clock predicts.

$$L = \frac{\text{Aqua count}}{\text{fixed-clock count}}$$

**4. Uncertainty and noise.**
- **Intervals:** 95%, from a bootstrap with calendar-aligned 16-day blocks (1,000 replicates, seed 20261114).
- **Noise floor:** each baseline year scored against the other eight.

## Key results

Every number below needs the team's final check before the submission freeze.

**When each satellite looked** (median local solar time, 2012 to 2020 median, then 2025):

| Region | Aqua | Terra | VIIRS (S-NPP) |
|---|---|---|---|
| Amazon (Brazil) | 13:37 to 14:57 | 10:28 to 09:12 | 13:31 to 13:33 |
| Cerrado (Brazil) | 13:41 to 14:58 | 10:23 to 09:10 | 13:33 to 13:36 |
| Pantanal (Brazil) | 13:47 to 15:07 | 10:20 to 09:08 | 13:38 to 13:41 |
| Argentina | 13:53 to 15:05 | 10:13 to 09:02 | 13:45 to 13:48 |
| Punjab + Haryana (India) | 13:16 to 14:33 | 10:49 to 09:39 | 13:11 to 13:10 |
| California (USA) | 13:10 to 14:18 | 10:57 to 09:48 | 12:58 to 12:57 |

**The clock audit, L with 95% interval** (\* = outside the range of the nine baseline years):

| Region | 2024 | 2025 | Noise floor (± around 1) |
|---|---|---|---|
| Amazon (Brazil) | 1.10 (1.04 to 1.17) \* | 1.30 (1.14 to 1.51) \* | 9.3% |
| Cerrado (Brazil) | 1.18 (1.10 to 1.27) \* | 1.11 (1.04 to 1.23) \* | 2.7% |
| Pantanal (Brazil) | 0.97 (0.89 to 1.07) | 1.08 (0.95 to 1.31) | 9.2% |
| Argentina | 1.17 (1.08 to 1.24) \* | 1.14 (1.02 to 1.23) \* | 6.7% |
| Punjab + Haryana (India) | too few fires | too few fires | 10.5% |
| California (USA) | 0.89 (0.79 to 1.00) | 0.96 (0.82 to 1.11) | 13.4% |

**Amazon 2025:**
- Aqua counted **43,002** daytime detections, where the fixed clock predicts **33,172**: 29.6% more.
- The data show the gap and the timing change together. They do not show how much of the gap the timing caused.

**Our data match INPE's:** our FIRMS Aqua counts are within 10% of INPE's reference-satellite counts in **96.6%** of Brazil biome-months, 2012 to 2020.

**Detection limits, California** (14,430 isolated agency-recorded fires of at least 1 acre, 2012 to 2020):

| Satellite | Fire size detected half the time (a50) |
|---|---|
| VIIRS (S-NPP) | **319 acres** (95%: 271 to 375) |
| Aqua (MODIS) | **947 acres** (95%: 777 to 1,168) |
| Terra (MODIS) | **1,262 acres** (95%: 1,021 to 1,539) |

Of 358 agency-recorded fires within 25 km of Chino Hills, CA (2012 to 2024), **338 were seen by no satellite**.

**Daylight left after the alert**, fire season, alert 1.5 h after Aqua's pass, 2025 vs 2012 to 2020:

| Region | 2012 to 2020 | 2025 | Change |
|---|---|---|---|
| Amazon (Brazil) | 2.84 h | 1.50 h | 80 min less |
| Cerrado (Brazil) | 2.74 h | 1.47 h | 77 min less |
| Pantanal (Brazil) | 2.63 h | 1.30 h | 80 min less |
| Argentina (median over every Aqua detection) | 2.44 h | 1.22 h | 73 min less |
| Punjab + Haryana (India) | 2.29 h | 1.01 h | 77 min less |
| California (median over every Aqua detection) | 3.78 h | 2.62 h | 70 min less |

The change is the drift itself: with sunset fixed, a later look leaves less daylight, minute for minute. Method, 16 benchmarks and limits: [`analysis/daylight/README.md`](analysis/daylight/README.md).

**The same audit on a 2° grid (exploratory).** The six presets are the checked part of this project. The world map repeats their audit on every 2° cell, with the same code and the same rule for "too few fires". It is not checked against a national reference series, and it shows where Aqua's count and the fixed clock part ways, not why.
- **Cells:** 4,472 cells have a detection; 721 have enough fires to read in 2025 (776 in 2024). The rest are shown as "too few fires", with no value.
- **2025:** 354 of the 721 cells sit outside their own 2012 to 2020 placebo range, 260 above the fixed clock and 94 below. A 2012 to 2020 year scored the same way falls outside 22% of the time.
- **Look time:** Aqua's median look moved +71 min per cell in 2025 (+58 to +79 for the middle 80% of cells); S-NPP's moved about 2 min.
- **The whole Earth as one area:** L is 1.012 (0.975 to 1.049) in 2025, within its placebo range, and 1.059 (1.020 to 1.100) in 2024. The cells move both ways, so this is a map of where, not a global percentage.
- **Checks:** grid cells over each preset land inside that preset's published interval for 2024 and 2025 (10 of 10), and an independent recompute of 5 seeded cells matches. Method, mask rule, nine benchmarks and limits: [`analysis/global/README.md`](analysis/global/README.md).

**Predictions.** Ten predictions are written in `research/predictions.md`, each with its pass rule, and the pipeline scores the data against those rules (`data/out/checks.json`).
- **Pass:** P2, P3, P4, P5, P6, P8.
- **Fail:** P7, P9, P10. We report them as written.
- **Pending:** P1.
- **Not pre-registered:** P1, P3, P8 and P9 were committed after their results existed.
- **Notable failure:** the straight-line version of the two-clocks test (P10) holds in 15 of 23 biome-years (65%; its rule needs 75%). Our own fire-day curve shows fire activity flattening in the afternoon, so a straight-line model is the wrong shape.

## NASA data and other sources

| Source | What we use | Terms |
|---|---|---|
| **NASA FIRMS**, MODIS Collection 6.1 (Terra, Aqua) and VIIRS 375 m (S-NPP, NOAA-20), yearly country files: https://firms.modaps.eosdis.nasa.gov/data/country/ (the world map reads the all-countries archives under `zips/`) | Every hotspot count and look time | NASA open data |
| **NASA Worldview / GIBS** true-colour imagery | Pass images and the one-day fire map | NASA open data |
| **INPE Programa Queimadas**, reference-satellite files (`Brasil_sat_ref`): https://dataserver-coids.inpe.br/queimadas/queimadas/focos/csv/anual/Brasil_sat_ref/ | Biome labels; check against INPE's counts | Public data from INPE |
| **USDA Forest Service FPA FOD**, 7th edition (Research Data Archive RDS-2013-0009.7) | California recorded fires for the detection limits | Public data from the USDA Forest Service |
| **NOAA Global Monitoring Laboratory**, Solar Calculation Details: https://gml.noaa.gov/grad/solcalc/calcdetails.html | Sunset equations (daylight analysis) | US Government work |
| **NASA Earthdata**, "NASA FIRMS Helps Fight Wildland Fires in Near Real-Time" | FIRMS alert latency (daylight analysis) | Cited |
| Giglio, L. (2007). Characterization of the tropical diurnal fire cycle using VIRS and MODIS observations. *Remote Sensing of Environment* 108(4), 407 to 421. doi:10.1016/j.rse.2006.11.018 | Why drifting overpass times bend fire records | Cited |
| Jethva (2026). "Timing the Flames." *Remote Sensing* 18(10), 1506: https://www.mdpi.com/2072-4292/18/10/1506 | Published Aqua pass times over Punjab (prediction P2) | Cited |

## Prior work, and what is ours

- **Published science:**
  - Overpass drift can create spurious fire trends (Giglio 2007).
  - Aqua's drift explains part of the MODIS/VIIRS gap in northwest India (Jethva 2026).
- **Another Space Apps 2026 team, FireClock** ([fireclock-team/fireclock](https://github.com/fireclock-team/fireclock), MIT), also built a fixed-clock calendar with an Aqua drift check. We credit them.
- **What we add:**
  - an audit of Brazil's official reference-satellite series;
  - the Terra-versus-Aqua opposite-drift comparison;
  - detection limits measured against agency-recorded fires;
  - the daylight-left analysis.
- We searched and **did not find** a tool that pairs the two drifts this way. We do not claim to be first.

## Limits

- **L is not attribution:** it cannot tell "fires here always peaked late" apart from "people shifted their burning later". Either way, the two sensors stopped measuring the same thing.
- **Night fires are invisible to this method,** so L is a lower bound on hidden fire.
- **A later pass also changes viewing conditions** (ground temperature, sun angle), not only fire activity.
- **The drift also changed how Aqua samples the ground** (pixel size, gaps between scans), so L for 2024 and 2025 mixes time of day with sampling. The two-clocks test is our attempt to separate them, and its simple version failed (P10).
- **A hotspot is a detection, not a count of fires.** One large fire makes many hotspots; a small one may make none.
- **Small regions are noisy:** Punjab + Haryana has too few fires after 2022 for an audit.
- **No 2026 calendar yet:** there are no 2026 yearly FIRMS files; the calendar ends in December 2025.
- **The daylight analysis describes one satellite's alert timing, not any country's response capacity.** INPE monitors with many satellites, including geostationary ones.
- **The world map is exploratory.** Outside Brazil and the USA there is no reference series to check it against; single cells are noisy (about half sit within their own placebo range, and about one in five would fall outside by chance); and its rule for dropping outage days is weaker than the presets'. See `analysis/global/README.md`.

## How to run

**The app** (Vite, React, TypeScript, Tailwind CSS):

```
cd frontend
npm ci
npm run dev        # local preview
npm run build      # static site in frontend/dist
```

`.github/workflows/pages.yml` builds and deploys the site to GitHub Pages; its header lists the one-time setup.

**The data.** Raw FIRMS and reference files are large and never committed. Each folder's README gives its download and run commands, in this order:

1. [`analysis/brazil-data/`](analysis/brazil-data/README.md): FIRMS and INPE downloads, biome lookup, daily counts, drift, INPE reproduction, and the JSON in `data/out/`.
2. [`analysis/statistics/`](analysis/statistics/README.md): the other regions' counts, the clock audit, noise floor, two clocks, fire-day curve and prediction checks.
3. [`analysis/drift-regions/`](analysis/drift-regions/README.md): Punjab + Haryana look times.
4. [`analysis/detection-limits/`](analysis/detection-limits/README.md) with [`analysis/data-acquisition/`](analysis/data-acquisition/README.md): the California detection limits.
5. [`analysis/daylight/`](analysis/daylight/README.md): daylight left after the alert, with its benchmarks.
6. [`analysis/global/`](analysis/global/README.md): the exploratory world map (about 9.7 GB of FIRMS archives, read in place), with its benchmarks. `npm run dev` and `npm run build` copy `data/out/global` into `frontend/public/global`, where the app fetches it when the map is opened.

## Repository layout

| Path | What it holds |
|---|---|
| `frontend/` | The web app |
| `data/out/` | Every number the app shows (JSON, real data) |
| `data/mock/` | Synthetic placeholders used only while the app was being built (`"mock": true`) |
| `analysis/` | The pipelines above, each with its own README |
| `analysis/simulation/` | An earlier one-day study. The app reads only its real detections and pass times |
| `research/` | Written predictions and planning notes |

## Use of AI (disclosure)

The 2026 Space Apps rules ask teams to disclose AI use. AI assistants (large language model chat and coding tools) were used throughout this project. Team members directed the work, made the decisions and reviewed the results. AI assistance was used for:

- **research:** finding and reading sources, checking facts, and reviewing and stress-testing the plan;
- **the data pipelines** in `analysis/` (downloads, region assignment, counts, look times, the INPE comparison), and therefore the data they write to `data/out/`;
- **the statistics:** clock audit, bootstrap intervals, noise floor, two clocks and prediction checks;
- **the California detection limits, the daylight analysis and the exploratory world map,** including their independent checks;
- **the web app** in `frontend/`: code, layout and on-page text;
- **documentation,** including this README.

The app's photographs, video and satellite images are not AI-generated; their sources are credited below.

## Acknowledgments

**Global.** We thank NASA and the 2026 NASA International Space Apps Challenge, funded by NASA's Science Mission Directorate through a contract with Booz Allen Hamilton, Mindgrub and SecondMuse, and its 17 Space Agency Partners. We thank in particular the Brazilian Space Agency (AEB), Argentina's National Commission on Space Activities (CONAE) and the Indian Space Research Organisation (ISRO), whose countries are among the regions this project audits.

**Local.** We thank Build Future Mind Foundation for hosting the Chino Hills, CA local event on 14–15 November 2026, and Local Lead Allen West and the organizing team for their support.

**Data.** Fire detections from NASA's Fire Information for Resource Management System (FIRMS), operated by NASA's Land, Atmosphere Near real-time Capability for EOS (LANCE). Reference fire series from Brazil's National Institute for Space Research (INPE).

## Credits and licenses

**Code (this repository):** MIT License, Team Propagators. See [`LICENSE`](LICENSE).

**App libraries:**

| Library | License |
|---|---|
| React, react-dom | MIT |
| Radix UI (dropdown menu, select, slider, toggle group) | MIT |
| framer-motion | MIT |
| cobe | MIT |
| clsx, tailwind-merge | MIT |
| Tailwind CSS | MIT |
| Vite, @vitejs/plugin-react | MIT |
| d3 | ISC |
| lucide-react | ISC |
| TypeScript | Apache-2.0 |

**Analysis libraries:**

| Library | License |
|---|---|
| NumPy | BSD-3-Clause |
| pandas | BSD-3-Clause |
| SciPy | BSD-3-Clause |
| Astropy (benchmarks only) | BSD-3-Clause |
| Matplotlib | Matplotlib License (BSD-style) |

**Components adapted from 21st.dev:**

| Component | Author | License |
|---|---|---|
| "Returns Calendar" | Savva Sicevs | MIT |
| "Anomaly Chart" | astralyxdev | MIT |
| "Filmstrip Scrub" | Mehi | MIT |
| "Orbital Hero Section" | Yura Dubinin | MIT |
| "Wireframe Dotted Globe" | moazamtrade | **license not stated on its page; to confirm** |
| "Globe Satellites" | shuding | **license to confirm** |

**Fonts:** Albert Sans and Host Grotesk (logo outlines), from Google Fonts, SIL Open Font License 1.1.

**Photographs:** one Unsplash photograph per region, under the Unsplash License. The photographers are credited in the app's footer.

**Video:**

| Clip | Source | License |
|---|---|---|
| Amazon, Argentina, Punjab + Haryana, California | Pexels | Pexels License |
| Cerrado | Pixabay | Pixabay Content License |
| Pantanal | The Nature Project, YouTube | **license to confirm** |

Videographers are credited in the app's footer.

**Satellite imagery:** NASA Worldview / GIBS. We acknowledge the use of imagery from the NASA Worldview application (https://worldview.earthdata.nasa.gov), part of NASA's Earth Observing System Data and Information System (EOSDIS).
