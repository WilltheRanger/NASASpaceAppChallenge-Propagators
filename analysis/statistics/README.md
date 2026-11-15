# Statistics lane: clock audit, noise floor, two clocks, fire-day curve

Run on Brady's committed daily counts (Sat Nov 14 2026). Every number needs a team member's check before it goes on a slide.

## Run
```
# once, about 2.7 GB, outside the repo: FIRMS yearly country files for the non-Brazil presets
for c in Argentina India United_States; do COUNTRY=$c bash analysis/brazil-data/scripts/get_firms_brazil.sh RAW/$c 600; done
python3 analysis/statistics/region_counts.py RAW analysis/statistics/out

python3 analysis/statistics/audit.py  analysis/brazil-data/out data/out analysis/statistics/out
python3 analysis/statistics/checks.py analysis/brazil-data/out analysis/statistics/out data/out
python3 analysis/statistics/facts.py  data/out analysis/brazil-data/out analysis/statistics/FACTS.md
```
Inputs: `analysis/brazil-data/out/firms_daily_by_biome.csv` and `firms_drift_by_biome.csv` (branch `brady/brazil-data`), plus `analysis/statistics/out/regions_daily.csv` and `regions_drift.csv` (committed, so the raw download is only needed to rebuild them). The download script is Brady's, rerun until it prints "all complete". Runtime about 55 s. Deterministic (seed 20261114).

## Outputs
| File | Contents |
|---|---|
| `data/out/audit/<id>.json` | Per year: `aqua_count`, `fixed_count` (benchmark), `L` with interval, `gap_pct`, `share_of_observed_pct`, `L_strat`, `outside_noise`; `baseline` lists all nine `placebo_years` |
| `data/out/twoclocks/<id>.json` | A and T (near-nadir) with intervals, `clock_diff`, `sampling_est` |
| `data/out/fireday/<id>.json` | log(Aqua/Terra) per year against the look-time gap, and the straight-line slope `beta` |
| `data/out/calendar/<id>.json` | Raw monthly counts plus `fixed`, `lo`, `hi`, `source`, `median_ref`, `anomaly_pct`, `flags` |
| `data/out/drift/<id>.json` | Written for Argentina and California. Punjab's file from P2 is left untouched (its Aqua times match this pipeline's exactly) |
| `data/out/regions.json` | The six regions with real files |
| `data/out/checks.json` | P1 to P10: status, detail, `rule_written` (from `research/predictions.md`), `rule_implemented`, `result_existed_before_commit` |
| `analysis/statistics/out/*.csv` | Every number behind the above, all nine regions; `retained_days.csv` gives the days kept per month for each comparison; `fireday_curve.csv` holds the descriptive curve fit |

Regions with JSON: `br-amazon`, `br-cerrado`, `br-pantanal`, `ar-argentina`, `in-punjab-haryana`, `us-california`. The checks score Brazil's six biomes only, because that is what the predictions were written for.

Non-Brazil regions use the same filters as Brady's Brazil counts (`region_counts.py` copies them). Argentina is the whole FIRMS Argentina file; Punjab + Haryana is the preset bbox `[73.8, 27.6, 77.6, 32.6]` within the India file; California is a 10-vertex simplified state outline within the US file (checked on ten cities either side of the border).

## Definitions
- **Unit:** daytime hotspot detections. The audit, fire-size check, reference check and calendar count every daytime detection (`count_all`), as INPE does. Two clocks and the fire-day fits use near-nadir detections only (MODIS scan ≤ 1.3 km, VIIRS track ≤ 0.40 km).
- **Retained days:** a satellite counts as down on a day with no daytime detection anywhere in Brazil. Each comparison drops only days when one of its own satellites was down: Aqua and S-NPP for the audit and calendar ratio; Aqua, Terra and S-NPP for two clocks; Aqua, S-NPP and NOAA-20 for the reference check. The same Brazil-wide flags are applied to every region, so a partial regional loss on an otherwise normal day is not detected.
- **R_m:** Aqua ÷ S-NPP count for calendar month *m*, summed over retained days 2012 to 2020.
- **L_y** = Aqua count in year *y* ÷ Σ_m R_m × S-NPP count in month *m* of year *y*. The denominator is `fixed_count`, the count Aqua's 2012–2020 relationship with S-NPP predicts. `gap_pct` = (L − 1) × 100 is Aqua's excess over that benchmark. `share_of_observed_pct` = (1 − 1/L) × 100 is the part of Aqua's own count above it. Neither measures how much of the gap orbit drift caused, and neither is the share of a multi-year trend.
- **Placebo and noise floor:** each 2012 to 2020 year is scored against the other eight. `noise_floor` = max |L − 1| over the nine placebo years; all nine values are in `placebo_years`. `outside_noise` marks an audit year outside the placebo min–max. Nine years give a coarse range: a tenth exchangeable year would fall outside the first nine's min–max about 20% of the time, so treat the flag as descriptive, not as a significance test.
- **Intervals:** Poisson bootstrap over calendar-aligned 16-day blocks, 1,000 replicates, the same weights for every satellite, so ratios and differences keep their same-day pairing. 95% unless stated. Day-level and 32-day versions are in `audit_by_biome.csv` (`L_lo_day`, `L_hi_day`, `L_lo_32d`, `L_hi_32d`). No bootstrap covers systematic coverage or calibration error.
- **Insufficient data:** expected Aqua count < 300, or 95% half-width > 25% of L.
- **L_strat (sensitivity to daily mean FRP, P5):** days split into terciles of S-NPP mean FRP per filtered detection; L recomputed within each class and reweighted to the 2012 to 2020 mix. Daily mean FRP is a weak proxy for fire size (many small fires and a few large ones can give the same mean), so this is a sensitivity check, not a size test.
- **Reference check (P6):** L with S-NPP and with NOAA-20 as the reference, on the same retained days and a 2018 to 2020 baseline, plus their paired difference. Both are VIIRS and share the Aqua numerator, so the check cannot detect a bias common to both.
- **Two clocks:** A_y and T_y are L for Aqua and Terra from near-nadir detections. `clock_diff` = ln A − ln T; `sampling_est` = (ln A + ln T)/2.
- **Fire-day slope:** ln(Aqua/Terra) on the same days ≈ β × (Aqua time − Terra time). `beta_baseline` uses 2012 to 2020; `beta_fit_2012_2025` adds the drift years with an intercept.
- **P7 closure:** L_pred = exp(β_baseline × Aqua's shift from its 2012 to 2020 mean look time), on biome-years with shift ≤ 1 h.
- **P10 clock share:** clock_diff × ΔA/(ΔA − ΔT), with ΔA, ΔT the look-time shifts from 2012 to 2020. The plan's own definition is not in the repo; Connor should confirm this one.

## Change log
- **Sat 6:30 PM, at the data lane's request:** L moved from the filtered counts to `count_all`, and two clocks to near-nadir detections. First-run L: Amazon 1.11 (2024) and 1.30 (2025), Cerrado 1.17 and 1.11, Argentina 1.15 and 1.14. Outputs of that run are in commit `adcad8e`.
- **After external review:**
  - The reference check (P6) now uses one availability mask for both references and is scored in the written direction. The earlier code admitted 44 days in 2021 to 2025 (20 in 2024) when S-NPP was down and treated its missing counts as zero, and tested NOAA-20 inside the S-NPP interval rather than the reverse. Amazon 2024 moved from 1.175 / 1.128 to 1.131 / 1.141 (S-NPP / NOAA-20). The result still passes, 30/30.
  - Each comparison now drops only days when its own satellites were down; the audit no longer discards days because Terra was absent. Amazon 2025 L: 1.295 → 1.296.
  - P4 is scored by its written rule (day bootstrap); the block-bootstrap result is shown alongside.
  - `checks.json` lists each rule as written and as implemented, and flags results that existed before the predictions were committed.
  - The curve-based correction K is no longer published as a correction or as independent validation (see below).

## Results (run Sat Nov 14 2026)
Slide wording and every quotable number live in `FACTS.md` (generated by `facts.py` from the JSON the app reads); if this section and `FACTS.md` ever differ, `FACTS.md` is right.

Audit L, 2021 to 2025, with 95% interval; † = outside the nine placebo years' range.

| Year | Amazon | Cerrado | Pantanal |
|---|---|---|---|
| 2021 | 1.03 (0.99–1.10) | 1.01 (0.96–1.06) | 1.00 (0.92–1.08) |
| 2022 | 1.02 (0.95–1.09) | 1.00 (0.94–1.06) | 1.00 (0.92–1.09) |
| 2023 | 1.01 (0.96–1.09) | 1.02 (0.98–1.06) | 1.08 (0.98–1.20) |
| 2024 | 1.10 (1.04–1.17) † | 1.18 (1.10–1.27) † | 0.97 (0.89–1.07) |
| 2025 | 1.30 (1.14–1.51) † | 1.11 (1.04–1.23) † | 1.08 (0.95–1.31) |

| Year | Argentina | Punjab + Haryana | California |
|---|---|---|---|
| 2021 | 0.96 (0.92–0.99) | 1.06 (0.78–1.22) | 1.03 (0.91–1.14) |
| 2022 | 0.93 (0.86–0.98) † | 1.11 (0.90–1.22) † | 0.95 (0.86–1.02) |
| 2023 | 1.00 (0.92–1.06) | insufficient data | 1.01 (0.92–1.10) |
| 2024 | 1.17 (1.08–1.24) † | insufficient data | 0.89 (0.79–1.00) |
| 2025 | 1.14 (1.02–1.23) † | insufficient data | 0.96 (0.82–1.11) |

Noise floors: Amazon 0.09, Cerrado 0.03, Pantanal 0.09, Argentina 0.07, Punjab + Haryana 0.11, California 0.13.

**Amazon 2025, stated plainly.** On the retained days, Aqua recorded 43,002 daytime hotspot detections; the 2012 to 2020 monthly relationship with S-NPP predicted 33,172. Aqua was 29.6% above that benchmark (L = 1.296, 95% interval 1.14–1.51). That excess is 22.9% of Aqua's own count. Over the same years Aqua's Amazon look time moved about 80 minutes later (13:37 to 14:57) while S-NPP stayed near 13:31. These data show the discrepancy and the timing change together; they do not isolate how much of the discrepancy the timing change caused.

**Sensitivity of Amazon 2025:**
- 32-day blocks: interval 1.11–1.57, still excluding 1.
- Daily mean FRP reweighting: L 1.296 → 1.212.
- Alternative baseline windows (from the external review, not rerun here): 1.280 to 1.335.

**Other regions.** Argentina 2024 and 2025 sit above their placebo range, but the 2025 interval includes 1 with 32-day blocks (0.98–1.23). California shows no excess. Cerrado 2022 (1.00) and Argentina 2022 (0.93) fall just outside narrow placebo ranges with intervals near 1; do not present them as findings. Punjab's 2023 to 2025 point estimates (1.16, 1.36, 1.58) are flagged insufficient data and should not be quoted.

**Punjab timing.** Within November, Aqua/S-NPP rose from about 0.17 (2016) to 0.68 (2025). This is consistent with the later crop-residue burning that Jethva and colleagues document from hourly geostationary observations; the timing evidence is theirs. Our curve fit for Punjab pools whole years and assumes a fixed daily pattern, so it cannot test a change in burn timing.

**Calendar vs. the official series.** From 2024 to 2025, INPE's Amazon count fell 69.3% (140,346 to 43,131) and the fixed-clock calendar fell 73.9% (128,491 to 33,566). Both show a large decline; the estimates differ by 4.6 percentage points. These are full calendar months, not the audit's retained days. The calendar band covers only uncertainty in the historical conversion ratio.

**Predictions:** see `data/out/checks.json`.
- **Pass:** P2, P3, P4, P5, P6, P8.
- **Pending:** P1. Its two readings disagree: Aqua's 2021 time is 0.6 to 0.9 min earlier than 2020 in three biomes.
- **Fail:** P7 (16/23), P9 (4/6 biomes), P10 (15/23).
- **Deviations from the written rules:** P3 is scored with all detections (81.6% with the planned filters). P9 uses a MODIS slope as its gate.
- **Results existed before the commit:** P1, P3, P8 and P9.

## Curved fire-day model (descriptive only)
A background-plus-Gaussian curve, activity(t) = b + exp(−(t − h)²/(2σ²)) (the form used by Ellicott et al. 2009 and Vermote et al. 2009), is fitted per region to the yearly near-nadir log(Aqua/Terra) points; parameters are in `fireday_curve.csv`. It is not used as a correction or as validation. Near-nadir A, full-swath L and the curve-based K answer different questions (Amazon 2025: 1.54, 1.30, 1.87): near-nadir selection changes the land, days, angles and fires sampled, and K and A share the Aqua counts, so their agreement is partly built in. Peak times are poorly constrained. The fitted peak sits at the 19:00 bound for Pampa and Argentina; Amazon about 17:38, Mata Atlântica 16:04, Pantanal 12:55, Punjab 13:30; most intervals reach the bound, and only Punjab and Mata Atlântica have upper limits below it. Keep the curve off the main slides.

## Slide language
- **Use:** "daytime hotspot detections", "VIIRS-based Aqua-equivalent estimate", the two counts with their year and benchmark, and the INPE and calendar declines over the same dates.
- **Avoid:**
  - "29% of fires were caused by drift" and "corrected official fire count"
  - "two independent methods agree" and "fire size ruled out"
  - an unqualified pass tally
  - Punjab's 1.58 without its insufficient-data flag
  - 319 vs. 946 acres as universal detection limits; they describe one matching procedure for isolated, agency-recorded California fires

## Limits
- 2025 counts come from the FIRMS yearly files; no 2026.
- Calendar months before 2018 with an S-NPP outage day cannot be filled from NOAA-20; five such months (2012-01, 2012-03, 2014-06, 2014-08, 2017-09 in the Amazon) use Aqua's observed count, labelled `aqua_observed`, from before its clock drifted.
- Retained days come from Brazil-wide detection presence, not from an official outage list or regional observed area. Known S-NPP events to check in the archived files: July 2022 anomaly, 2024 geolocation problems, July 2025 partial data receipt. A coverage-adjusted analysis would need regional clear-sky observed area.
- MODIS events: Aqua recorder losses in early 2022 and safe hold on 31 March 2022; Terra's science outage during its October 2022 constellation exit. Aqua and Terra have separate calibration histories.
- In May 2025 NASA reprocessed VIIRS Collection 2 monthly files to fix static heat sources labelled as vegetation fires. That affects the type-filtered timing and FRP inputs, not the all-types counts. Product versions are not yet recorded per file.
- The bootstrap does not resample years, so year-to-year fire-weather variation is represented only by the placebo range.
