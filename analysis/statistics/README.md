# Statistics lane: clock audit, noise floor, two clocks, fire-day curve

Run on Brady's committed daily counts (Sat Nov 14 2026). Every number needs a team member's check before it goes on a slide.

## Run
```
# once, about 2.7 GB, outside the repo: FIRMS yearly country files for the non-Brazil presets
for c in Argentina India United_States; do COUNTRY=$c bash analysis/brazil-data/scripts/get_firms_brazil.sh RAW/$c 600; done
python3 analysis/statistics/region_counts.py RAW analysis/statistics/out

python3 analysis/statistics/audit.py  analysis/brazil-data/out data/out analysis/statistics/out
python3 analysis/statistics/checks.py analysis/brazil-data/out analysis/statistics/out data/out
```
Inputs: `analysis/brazil-data/out/firms_daily_by_biome.csv` and `firms_drift_by_biome.csv` (branch `brady/brazil-data`), plus `analysis/statistics/out/regions_daily.csv` and `regions_drift.csv` (committed, so the raw download is only needed to rebuild them). The download script is Brady's, rerun until it prints "all complete". Runtime about 15 s. Deterministic (seed 20261114).

## Outputs
| File | Contents |
|---|---|
| `data/out/audit/<id>.json` | Contract fields plus `outside_noise` per year and `placebo_min`/`placebo_max` in `baseline` |
| `data/out/twoclocks/<id>.json` | Replaces Brady's preview: same fields, now with 95% intervals; `preview: false` |
| `data/out/fireday/<id>.json` | **New file for the app:** log(Aqua/Terra) per year against the look-time gap, and the slope `beta` |
| `data/out/calendar/<id>.json` | Rebuilt with Brady's raw counts (identical for Brazil) plus `fixed`, `lo`, `hi`, `median_ref`, `anomaly_pct`; `outage` flags now come from the data |
| `data/out/drift/<id>.json` | Written for Argentina and California. Punjab's file from P2 is left untouched (its Aqua times match this pipeline's exactly) |
| `data/out/regions.json` | The six regions that now have real files (names and boxes from the mock) |
| `data/out/checks.json` | P1 to P10 scored against `research/predictions.md` |
| `analysis/statistics/out/*.csv` | All six biomes, every number behind the checks |

Regions with JSON: `br-amazon`, `br-cerrado`, `br-pantanal`, `ar-argentina`, `in-punjab-haryana`, `us-california`. The checks score Brazil's six biomes only, because that is what the predictions were written for.

Non-Brazil regions use the same filters as Brady's Brazil counts (`region_counts.py` copies them). Argentina is the whole FIRMS Argentina file; Punjab + Haryana is the preset bbox `[73.8, 27.6, 77.6, 32.6]` within the India file; California is a 10-vertex simplified state outline within the US file (checked on ten cities either side of the border). Outage days come from Brazil, since an outage is satellite-wide.

## Definitions
- **Valid day:** Aqua, Terra and the VIIRS reference each have at least one daytime detection somewhere in Brazil. Other days are outages and are dropped for every satellite.
- **R_m:** Aqua ÷ S-NPP count for calendar month *m*, summed over valid days 2012 to 2020.
- **L_y** = Aqua count in year *y* ÷ Σ_m R_m × S-NPP count in month *m* of year *y*. L = 1 means no change from the 2012 to 2020 relation. `fixed_count` is the denominator, `gap_pct` = (L − 1) × 100.
- **Placebo and noise floor:** each 2012 to 2020 year is scored against the other eight. `noise_floor` = max |L − 1| over the nine placebo years. A 2021 to 2025 L counts as a detection only if it lies outside the placebo range (P4).
- **Intervals:** Poisson bootstrap over 16-day blocks (the MODIS repeat cycle), 1,000 replicates, the same weights for every satellite and biome, so ratios and differences carry their correlation. 95% unless stated. Day-level and 7-day blocks gave intervals no wider; 16-day blocks are the conservative choice.
- **Insufficient data:** expected Aqua count < 300, or 95% half-width > 25% of L.
- **L_strat (fire-size check, P5):** days split into terciles of S-NPP mean FRP per detection (cut points from 2012 to 2020 detections); L computed within each class and reweighted to the 2012 to 2020 Aqua share of each class. The daily file has no per-detection FRP, so classes are per day.
- **Reference check (P6):** L with NOAA-20 as the reference vs. S-NPP, both on a 2018 to 2020 baseline.
- **Two clocks:** A_y and T_y are L for Aqua and Terra. `clock_diff` = ln A − ln T; `sampling_est` = (ln A + ln T)/2.
- **Fire-day curve:** Aqua and Terra carry the same MODIS sensor and are scored on the same days, so ln(Aqua/Terra) ≈ β × (Aqua time − Terra time) once fire weather cancels. `beta_baseline` uses 2012 to 2020 (gap ≈ 3.2 h); `beta_fit_2012_2025` adds the drift years (gap up to 5.8 h) with an intercept.
- **P7 closure:** L_pred = exp(β_baseline × Aqua's shift from its 2012 to 2020 mean look time), on biome-years with shift ≤ 1 h.
- **P10 clock share:** clock_diff × ΔA/(ΔA − ΔT), with ΔA, ΔT the look-time shifts from 2012 to 2020. This assumes the clock effect is linear in look time over both shifts. FINAL PLAN v1.1 is not in the repo; Connor should confirm this matches its definition.

## Results (run Sat Nov 14 2026)
Audit, 2021 to 2025, L with 95% interval. Bold = outside the placebo range.

| Year | Amazon | Cerrado | Pantanal |
|---|---|---|---|
| 2021 | 1.02 (0.97–1.10) | 0.99 (0.93–1.04) | 0.96 (0.89–1.05) |
| 2022 | 1.03 (0.95–1.11) | 1.01 (0.97–1.06) | 1.00 (0.88–1.10) |
| 2023 | 1.02 (0.96–1.09) | 1.01 (0.98–1.05) | 1.06 (0.92–1.19) |
| 2024 | **1.11 (1.04–1.18)** | **1.17 (1.08–1.27)** | 0.93 (0.83–1.05) |
| 2025 | **1.30 (1.14–1.51)** | **1.11 (1.04–1.25)** | 1.06 (0.92–1.33) |

Noise floor: Amazon 0.09, Cerrado 0.04, Pantanal 0.09.

In the Amazon in 2025, the Aqua-based count was 30% above the fixed-clock count. Read with the INPE match (P3), this means the official reference series overstates 2025 relative to 2012 to 2020; the decline at a fixed clock is larger than the official one. This is a reading of the numbers, not yet a team conclusion.

Other regions, same method:

| Year | Argentina | Punjab + Haryana | California |
|---|---|---|---|
| 2021 | 0.96 (0.91–1.00) | 1.06 (0.77–1.24) | 1.02 (0.90–1.12) |
| 2022 | 0.93 (0.87–0.98) | **1.15 (0.94–1.26)** | 0.92 (0.83–1.01) |
| 2023 | 1.03 (0.96–1.09) | insufficient data | 0.97 (0.86–1.05) |
| 2024 | **1.15 (1.07–1.20)** | insufficient data | 0.88 (0.78–0.98) |
| 2025 | **1.14 (1.03–1.22)** | insufficient data | 0.96 (0.79–1.13) |

Noise floor: Argentina 0.08, Punjab + Haryana 0.11, California 0.15. Argentina repeats the Brazil pattern. California shows no change beyond its noise floor (its fire count is small and dominated by a few large-fire years). Punjab's point estimates rise to 1.48 in 2025, but its burning is concentrated in a few weeks, so 16-day blocks give very wide intervals and 2023 to 2025 are flagged insufficient. Within November alone, Aqua/S-NPP rose from about 0.17 (2016) to 0.69 (2025). This fits reports that crop-residue burns have moved into the late afternoon, after the 13:30 satellites pass. If so, the fixed-clock series also misses those burns: a fixed 13:30 clock removes the drift artefact, not a change in when people burn. This needs a source before it is said aloud.

Fire-day slope β (2012 to 2020, log count per hour): Amazon 0.35, Cerrado 0.14, Pantanal 0.16, all with intervals above zero. β from the morning gap (10:30 to 13:30) over-predicts the afternoon effect (P7 misses), consistent with fire activity flattening after about 14:00.

Predictions: see `data/out/checks.json`. P2 to P6 and P8 pass. P1 is pending: the two wordings disagree (Aqua's 2021 time is 0.6 to 0.9 min earlier than 2020 in three biomes), so the team must pick one. P7 fails narrowly (17/23 strict biome-years, 74% vs. 75%); P10 fails (14/23, 61%); P9 passes in 3 of 6 biomes. P9's written gate (VIIRS same-day pairs) cannot be computed because S-NPP and NOAA-20 look at the same local time; the MODIS β is used instead.

## Limits
- 2025 counts come from the FIRMS yearly files Brady downloaded; no 2026.
- Outages are detected from the data (no detection anywhere in Brazil that day), not from an official outage list.
- Blocks are calendar-aligned 16-day windows, not a moving-block scheme; the bootstrap does not resample years, so it does not capture year-to-year fire-weather variation (the placebo range does).
