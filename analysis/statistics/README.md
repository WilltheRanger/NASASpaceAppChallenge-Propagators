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
Inputs: `analysis/brazil-data/out/firms_daily_by_biome.csv` and `firms_drift_by_biome.csv` (branch `brady/brazil-data`), plus `analysis/statistics/out/regions_daily.csv` and `regions_drift.csv` (committed, so the raw download is only needed to rebuild them). The download script is Brady's, rerun until it prints "all complete". Runtime about 45 s (the curve is refitted for each of the 1,000 bootstrap replicates). Deterministic (seed 20261114).

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
- **Counts:** the audit, the fire-size check, the reference check and the calendar use every daytime detection (`count_all`), as INPE counts them (P3: 96.6% of biome-months within 10% of INPE, vs. 81.6% with the type and confidence filters). Two clocks and the fire-day curve use near-nadir daytime detections only (MODIS scan ≤ 1.3 km, VIIRS track ≤ 0.40 km), whose look time is the satellite's own.
- **Valid day:** Aqua, Terra and the VIIRS reference each have at least one daytime detection somewhere in Brazil. Other days are outages and are dropped for every satellite.
- **R_m:** Aqua ÷ S-NPP count for calendar month *m*, summed over valid days 2012 to 2020.
- **L_y** = Aqua count in year *y* ÷ Σ_m R_m × S-NPP count in month *m* of year *y*. L = 1 means no change from the 2012 to 2020 relation. `fixed_count` is the denominator, `gap_pct` = (L − 1) × 100.
- **Placebo and noise floor:** each 2012 to 2020 year is scored against the other eight. `noise_floor` = max |L − 1| over the nine placebo years. A 2021 to 2025 L counts as a detection only if it lies outside the placebo range (P4).
- **Intervals:** Poisson bootstrap over 16-day blocks (the MODIS repeat cycle), 1,000 replicates, the same weights for every satellite and biome, so ratios and differences carry their correlation. 95% unless stated. Day-level and 7-day blocks gave intervals no wider; 16-day blocks are the conservative choice.
- **Insufficient data:** expected Aqua count < 300, or 95% half-width > 25% of L.
- **L_strat (fire-size check, P5):** days split into terciles of S-NPP mean FRP per filtered detection (cut points from 2012 to 2020 detections); L computed within each class and reweighted to the 2012 to 2020 Aqua share of each class. The daily file has no per-detection FRP, so classes are per day.
- **Reference check (P6):** L with NOAA-20 as the reference vs. S-NPP, both on a 2018 to 2020 baseline.
- **Two clocks:** A_y and T_y are L for Aqua and Terra, computed from near-nadir detections. `clock_diff` = ln A − ln T; `sampling_est` = (ln A + ln T)/2.
- **Fire-day curve:** Aqua and Terra carry the same MODIS sensor and are scored on the same days, so ln(Aqua/Terra) ≈ β × (Aqua time − Terra time) once fire weather cancels. `beta_baseline` uses 2012 to 2020 (gap ≈ 3.2 h); `beta_fit_2012_2025` adds the drift years (gap up to 5.8 h) with an intercept.
- **Curved fire-day model:** fire activity through the day is modelled as a background plus a Gaussian peak, activity(t) = b + exp(−(t − h)²/(2σ²)), the form used by Ellicott et al. (2009) and Vermote et al. (2009) for the diurnal fire cycle. It is fitted per region to the 14 yearly log(Aqua/Terra) points, weighted by their bootstrap spread, with h bounded to 11:00–19:00. Orbit drift moved the two look times from about 10:30/13:30 to 09:12/14:57, which is what makes the curve's shape measurable. K_y = activity at Aqua's look time in year y ÷ activity at its 2012–2020 look time: a drift correction that uses MODIS only, no VIIRS. Each bootstrap replicate is refitted (warm-started from the point fit).
- **P7 closure:** L_pred = exp(β_baseline × Aqua's shift from its 2012 to 2020 mean look time), on biome-years with shift ≤ 1 h.
- **P10 clock share:** clock_diff × ΔA/(ΔA − ΔT), with ΔA, ΔT the look-time shifts from 2012 to 2020. This assumes the clock effect is linear in look time over both shifts. FINAL PLAN v1.1 is not in the repo; Connor should confirm this matches its definition.

## Method change (Sat Nov 14, 6:30 PM)
The first run used the filtered counts (`count`: type 0, MODIS confidence ≥ 30, VIIRS n/h) for everything and all view angles for two clocks. At the data lane's request, L now uses `count_all` and two clocks use near-nadir detections (definitions above). The change was made after the first results, so both are recorded. Conclusions are unchanged: first-run L was Amazon 1.11 (2024) and 1.30 (2025), Cerrado 1.17 and 1.11, Argentina 1.15 and 1.14, each outside the placebo range, as now. Prediction outcomes are unchanged except P9 (3/6 → 4/6 biomes) and the P7 count (17/23 → 16/23). The first-run outputs are in commit `687cebf`.

## Results (run Sat Nov 14 2026)
Audit, 2021 to 2025, L with 95% interval. Bold = outside the placebo range.

| Year | Amazon | Cerrado | Pantanal |
|---|---|---|---|
| 2021 | 1.03 (0.98–1.10) | 1.02 (0.97–1.06) | 1.00 (0.92–1.09) |
| 2022 | 1.02 (0.94–1.10) | **1.02 (0.97–1.07)** | 1.00 (0.91–1.09) |
| 2023 | 1.01 (0.96–1.09) | 1.02 (0.98–1.06) | 1.08 (0.98–1.20) |
| 2024 | **1.09 (1.03–1.16)** | **1.18 (1.10–1.28)** | 0.97 (0.89–1.07) |
| 2025 | **1.29 (1.14–1.50)** | **1.11 (1.04–1.23)** | 1.08 (0.95–1.30) |

Noise floor: Amazon 0.09, Cerrado 0.03, Pantanal 0.09. Cerrado 2022 lies just outside its narrow placebo range while its interval contains 1; treat it as marginal.

In the Amazon in 2025, the Aqua-based count was 29% above the fixed-clock count. Read with the INPE match (P3), this means the official reference series overstates 2025 relative to 2012 to 2020; the decline at a fixed clock is larger than the official one. This is a reading of the numbers, not yet a team conclusion.

Other regions, same method:

| Year | Argentina | Punjab + Haryana | California |
|---|---|---|---|
| 2021 | 0.96 (0.92–0.99) | 1.07 (0.78–1.22) | 1.03 (0.91–1.14) |
| 2022 | **0.93 (0.86–0.98)** | **1.15 (0.93–1.25)** | 0.94 (0.86–1.02) |
| 2023 | 1.00 (0.92–1.06) | insufficient data | 1.01 (0.92–1.10) |
| 2024 | **1.17 (1.08–1.24)** | insufficient data | 0.89 (0.78–1.00) |
| 2025 | **1.14 (1.02–1.23)** | insufficient data | 0.96 (0.82–1.11) |

Noise floor: Argentina 0.07, Punjab + Haryana 0.10, California 0.14. Argentina repeats the Brazil pattern. California shows no change beyond its noise floor (its fire count is small and dominated by a few large-fire years). Punjab's point estimates rise to 1.58 in 2025, but its burning is concentrated in a few weeks, so 16-day blocks give very wide intervals and 2023 to 2025 are flagged insufficient. Within November alone, Aqua/S-NPP rose from about 0.17 (2016) to 0.68 (2025). This fits reports that crop-residue burns have moved into the late afternoon, after the 13:30 satellites pass. If so, the fixed-clock series also misses those burns: a fixed 13:30 clock removes the drift artefact, not a change in when people burn. This needs a source before it is said aloud.

Fire-day slope β (2012 to 2020, near-nadir, log count per hour): Amazon 0.36, Cerrado 0.14, Pantanal 0.16, all with intervals above zero. β from the morning gap (10:30 to 13:30) over-predicts the afternoon effect (P7 misses), consistent with fire activity flattening after about 14:00.

Predictions: see `data/out/checks.json`. P2 to P6 and P8 pass. P1 is pending: the two wordings disagree (Aqua's 2021 time is 0.6 to 0.9 min earlier than 2020 in three biomes), so the team must pick one. P7 fails (16/23 strict biome-years, 70% vs. 75%); P10 fails (14/23, 61%); P9 passes in 4 of 6 biomes (Pantanal and Pampa miss). P9's written gate (VIIRS same-day pairs) cannot be computed because S-NPP and NOAA-20 look at the same local time; the MODIS β is used instead.

## Curved fire-day model (post-hoc, not a pre-registered prediction)
`data/out/fireday/<id>.json` now carries `curve` (parameters, 06:00–19:00 points relative to Aqua's 2012–2020 look time with a 95% band, `observed_range`, `peak_constrained`) and `modis_only_check` (K per audit year next to near-nadir A and L). Per-region parameters are in `analysis/statistics/out/fireday_curve.csv`; K, K_lo, K_hi and `aqua_corrected` are in `audit_by_biome.csv`. The audit JSON is unchanged.

Results:
- **Two independent routes agree on the near-nadir clock effect.** K, built from MODIS alone, falls inside the 95% interval of the near-nadir VIIRS-based A in 34 of 41 region-years with enough data. Amazon 2025: K = 1.87 (1.48–2.34), A = 1.54 (1.34–1.78).
- **The full-swath count responds less.** In drift years (Aqua shift > 15 min), K exceeds the all-detection L in 19 of 22 region-years, by a median 12% (K/A median 1.08). L, not K, is the right correction for INPE's all-detection series; K checks that the effect is the clock.
- **The peak time is not measurable from these data.** Only Punjab + Haryana constrains h (fitted peak 13:30; its interval stays below the 19:00 bound). Elsewhere the curve rises through the observed window (about 09:00 to 15:00) and the peak runs to the bound, so the curve beyond `observed_range` is extrapolation and should be greyed out in the app.
- This explains the P7 miss: a straight-line slope from the 10:30–13:30 gap cannot describe a curve, and the curve itself over-predicts the full-swath L.

## Limits
- 2025 counts come from the FIRMS yearly files Brady downloaded; no 2026.
- Outages are detected from the data (no detection anywhere in Brazil that day), not from an official outage list.
- Blocks are calendar-aligned 16-day windows, not a moving-block scheme; the bootstrap does not resample years, so it does not capture year-to-year fire-weather variation (the placebo range does).
