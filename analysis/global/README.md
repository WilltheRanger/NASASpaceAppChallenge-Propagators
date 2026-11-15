# Global clock layer (exploratory)

**Exploratory: same method as the presets, not checked against a national reference series.**

The six preset regions are the validated part of this project. This folder repeats their clock audit on every 2-degree cell of the map, to show **where** Aqua's fire count has parted from the count a fixed clock predicts. It is an analysis of recorded detections. Nothing is modelled or filled in.

Every number needs a team member's check before it goes on a slide.

## What it computes

For each 2-degree cell, with the definitions of `analysis/statistics/audit.py`:

- **Counts:** every daytime detection (`count_all`), with no type or confidence filter. This is the audit's count, not the near-nadir count used by the daylight analysis.
- **Retained days:** days when both Aqua and S-NPP returned a daytime detection. The preset audit asks "anywhere in Brazil". This layer asks "**anywhere on Earth**". The difference is measured below.
- **Month ratio**, from retained days in 2012 to 2020 (a month with no S-NPP detections in the baseline falls back to the pooled ratio):

$$
R_m = \frac{\text{Aqua}_m}{\text{S-NPP}_m}
$$

- **L** for a target year:

$$
L = \frac{\text{Aqua}}{\sum_m \text{S-NPP}_m \times R_m}
$$

- **Interval:** Poisson bootstrap over calendar-aligned 16-day blocks, 1,000 replicates, seed 20261114, 95%.
- **Placebo range and noise floor:** each 2012 to 2020 year scored against the other eight. `outside_noise` marks a reading outside the nine placebo years' lowest to highest value. It is descriptive, not a significance test.
- **Look-time shift:** Aqua's median local solar time (UTC + longitude / 15) of near-nadir detections that pass the repo's counting filters, minus the median of its 2012 to 2020 yearly medians, in minutes. A year needs 20 such detections and the base needs 5 such years.
- **Calendar per cell:** the fixed-clock monthly calendar, by the rule in `audit.py`, in the same schema as `data/out/calendar/*.json`.

**Reading L:** above 1, Aqua counts more than the fixed clock predicts; below 1, fewer. **Neither direction is attributed to orbit drift alone.**

**What is reused, not rewritten:** `L()`, `ci()`, the bootstrap weights `W` and the month matrix `YM` are imported from `audit.py` as written. The month sums are batched for speed. They are sums of whole numbers, so they are identical to `audit.ymsum`, and benchmark G1a checks that they are.

## Mask rule (PENDING TEAM LEAD APPROVAL)

A cell-year is `too_few_fires` when **the expected Aqua count is under 300**, or **the 95% half-width is over 25% of L**, or L or its interval is not a finite number.

- The first two conditions are the preset audit's own `insufficient_data` rule, so the label "same method as the presets" stays true.
- A masked reading carries **no L, no interval, no verdict and no look-time shift.** `too_few_fires` means the count is too small to read. It does not mean the count agreed with the fixed clock.
- The rule is written into `grid.json` as `mask_rule`, with `"status": "pending team lead approval"`.

**The distribution behind it** (2025; relative half-width = half of the 95% interval divided by L; full table in `out/interval_widths.csv`):

| Expected Aqua count | Cells | Median half-width | Share with half-width at most 25% |
|---|---|---|---|
| under 30 | 2,092 | 134% (1,114 cells with an interval) | 1% |
| 30 to 99 | 581 | 53% | 1% |
| 100 to 299 | 608 | 34% | 18% |
| 300 to 999 | 546 | 23% | 59% |
| 1,000 to 2,999 | 270 | 18% | 79% |
| 3,000 to 9,999 | 161 | 14% | 90% |
| 10,000 and over | 45 | 11% | 98% |

**What other thresholds would keep** (2025, with expected count at least 300):

| Half-width at most | Cells kept |
|---|---|
| 10% | 51 |
| 15% | 283 |
| 20% | 530 |
| **25% (the audit's rule, used here)** | **721** |
| 30% | 825 |
| 40% | 921 |

To try another rule without editing code: `--min-expected N --max-rel-half-width X` on `compute` or `bench`.

## Results

4,472 cells have at least one Aqua or S-NPP daytime detection in 2012 to 2025 (248,561,982 detections). All are listed in `grid.json`.

| | 2024 | 2025 |
|---|---|---|
| Cells with a readable L | 776 | 721 |
| Share of Aqua's detections that sit in those cells | 85% | 82% |
| Median L | 1.079 | 1.076 |
| Middle 80% of L | 0.914 to 1.263 | 0.852 to 1.335 |
| Cells outside their own placebo range | 42% | 49% |
| ... above the fixed clock | 36% | 36% |
| ... below the fixed clock | 6% | 13% |
| Aqua look-time shift, median (10th to 90th percentile) | +37 min (+29 to +43) | +71 min (+58 to +79) |
| S-NPP look-time shift, median (10th to 90th percentile) | -0.5 min (-2.8 to +1.5) | +1.8 min (-0.7 to +3.8) |

**Three controls that help read those numbers:**

- **Placebo control.** In the same 721 cells, a 2012 to 2020 year scored against the other eight falls outside the other eight's range 22% of the time. Exchangeable years would give 2 in 9, which is 22%. The 2025 figure is 49%.
- **The fixed clock held still.** S-NPP's look time moved by about 2 minutes per cell, against Aqua's 71.
- **The whole Earth, scored as one area, does not show a 2025 excess.** L is 1.012 (0.975 to 1.049) in 2025, inside its placebo range (0.955 to 1.033). In 2024 it is 1.059 (1.020 to 1.100), outside it. The cells move in both directions, and in 2025 they largely cancel in the total. The layer is a map of where, not a global percentage.

**By rough area, 2025** (plain latitude and longitude boxes defined in the script; they are not countries or biomes):

| Area | Cells read | Median L | Outside, above | Outside, below | Within |
|---|---|---|---|---|---|
| South America | 155 | 1.148 | 88 | 9 | 58 |
| Central America and Mexico | 49 | 0.976 | 16 | 16 | 17 |
| North America north of 33°N | 25 | 0.927 | 0 | 8 | 17 |
| Africa north of the equator | 139 | 1.004 | 27 | 33 | 79 |
| Africa south of the equator | 156 | 1.078 | 63 | 20 | 73 |
| Europe and western Russia | 25 | 1.247 | 16 | 0 | 9 |
| Siberia and central Asia | 14 | 1.124 | 5 | 1 | 8 |
| South Asia | 38 | 1.216 | 17 | 1 | 20 |
| Southeast Asia and south China | 52 | 1.130 | 13 | 3 | 36 |
| Australia | 58 | 1.021 | 11 | 1 | 46 |

## Benchmarks

`out/benchmarks.json` holds the full evidence for each row.

| ID | Check | Result | Status |
|---|---|---|---|
| G1a | The six presets, rebuilt by their own rules from the all-countries archives and scored on the audit's Brazil-wide days, against `data/out/audit/*.json` | 30 of 30 preset-years identical (L, interval, counts, noise floor, placebo range, verdict); batched sums identical to `audit.ymsum` | **PASS** |
| G1 | Cells mostly inside each preset, summed, on the whole-Earth days: L 2024 and 2025 inside the preset's published interval | 10 of 10 | **PASS** |
| G2a | Preset look times rebuilt from the all-countries archives, against the repo's look-time tables and `data/out/drift/*.json` | 168 of 168 table values, 154 of 154 hh:mm values | **PASS** |
| G2 | Median Aqua look time from each preset's cells, 2012 to 2025, against `data/out/drift`, within 5 min | 84 of 84; largest 2.4 min; largest difference in a 2024 or 2025 shift 2.0 min | **PASS** |
| G3 | Determinism: two full passes from the raw archives in separate work folders, same `--generated` stamp | 46 of 46 aggregates identical; all 898 output files byte-identical | **PASS** |
| G4 | No mock values, no placeholders | 0 problems | **PASS** |
| G5 | Mask honesty | 0 problems; 3,751 of 4,472 cells masked for 2025 | **PASS** |
| G6 | Independent audit: a separate program, written without this script or `audit.py`, recomputes 5 seeded cells from the raw rows | 60 of 60 values match (L and interval to 3 decimals, counts exactly) | **PASS** |
| G7 | Totals: daily global counts before gridding against the sum over cells; archive rows against gridded rows | Largest daily difference 0 for every satellite; 46 of 46 archives add up | **PASS** |

**G1 in detail** (L with 95% interval; "published" is `data/out/audit`):

| Preset | Year | Published | Preset rule, whole-Earth days | Cells, whole-Earth days | Cells |
|---|---|---|---|---|---|
| Amazon | 2024 | 1.099 (1.040 to 1.173) | 1.082 (0.982 to 1.179) | 1.077 (0.978 to 1.170) | 91 |
| Amazon | 2025 | 1.296 (1.139 to 1.508) | 1.304 (1.142 to 1.522) | 1.299 (1.145 to 1.511) | 91 |
| Cerrado | 2024 | 1.179 (1.101 to 1.273) | 1.172 (1.077 to 1.278) | 1.190 (1.098 to 1.296) | 41 |
| Cerrado | 2025 | 1.110 (1.040 to 1.227) | 1.114 (1.036 to 1.238) | 1.117 (1.037 to 1.259) | 41 |
| Pantanal | 2024 | 0.973 (0.888 to 1.069) | 0.950 (0.832 to 1.080) | 0.938 (0.844 to 1.038) | 4 |
| Pantanal | 2025 | 1.080 (0.950 to 1.306) | 1.089 (0.959 to 1.321) | 1.187 (0.999 to 1.579) | 4 |
| Argentina | 2024 | 1.171 (1.083 to 1.241) | 1.167 (1.060 to 1.253) | 1.163 (1.059 to 1.249) | 81 |
| Argentina | 2025 | 1.137 (1.022 to 1.225) | 1.149 (1.033 to 1.241) | 1.146 (1.032 to 1.239) | 81 |
| California | 2024 | 0.893 (0.785 to 1.005) | 0.898 (0.788 to 1.004) | 0.919 (0.815 to 1.011) | 14 |
| California | 2025 | 0.965 (0.817 to 1.107) | 0.981 (0.826 to 1.136) | 0.975 (0.806 to 1.146) | 14 |

- **Punjab + Haryana** has no published value (too few fires after 2022). Its 6 cells are also `insufficient_data`, so nothing is scored there.
- **"Mostly inside"** means over half of the cell's 2012 to 2025 Aqua and S-NPP daytime detections fall inside the preset's own rule. The rule was fixed before the comparison was run and the cell sets were not tuned.
- **The two middle columns isolate two effects.** Preset rule to cells is geometry (largest for the Pantanal: 4 cells hold 81% of its detections, and 12% of what they hold is not Pantanal). Brazil days to whole-Earth days is the retained-days rule (largest for the Amazon in 2024).

## Limits (say these out loud)

- **No reference series outside Brazil and the USA.** L can be computed everywhere and validated almost nowhere. That is why every panel carries the exploratory label.
- **L is not attribution.** Aqua's later look, its changed sampling geometry and real changes in when fires burn all move L. The map shows where the count and the fixed clock part ways, not why.
- **The whole-Earth retained-days rule is weaker than the audit's.** A partial outage that loses some orbits still counts as "up" for the whole Earth. On 35 of 5,114 days the two rules disagree. Rebuilding the Amazon by its own rule moves its 2024 L from 1.099 (1.040 to 1.173) on Brazil days to 1.082 (0.982 to 1.179) on whole-Earth days. A sensitivity run with the rule applied per 30-degree longitude band moves 13 of 718 cells by more than 0.05 in 2025 (none by more than 0.10) and flips 29 verdicts; in 2024, 46 of 769 cells and 42 verdicts. The share of cells outside their placebo range barely moves (49.1% to 48.9% in 2025, 42.0% to 39.2% in 2024). `out/cells_all.csv` carries both readings per cell.
- **Cell-level placebo ranges are wide.** The median noise floor is 0.17, against 0.03 to 0.13 for the presets. About half of the readable cells sit within their own range.
- **Many readings, so some fall outside by chance.** With nine placebo years, about 22% of cells would fall outside with no clock effect at all. Read the map as a pattern, never one cell at a time.
- **Thin cells are masked, not zero.** 3,751 of 4,472 cells are `too_few_fires` in 2025. They hold 18% of Aqua's 2025 detections.
- **A 2-degree cell mixes land covers and countries.** It is not a biome, a state or a fire regime.
- **Detection is uneven.** MODIS leaves gaps between orbits near the equator, and detection probability is low in some equatorial areas. L is a ratio within one place, so part of this cancels. That is unverified outside the presets.
- **A hotspot is a detection, not a fire,** and night fires are not counted.
- **No 2026 data:** there are no 2026 yearly files yet.
- **Country archives only.** Detections outside every country outline (open ocean, Antarctica) are not in these files. 187 rows are listed twice with the same place, time and satellite; they are kept, as the preset counts keep them.

## Files

| Path | What it is |
|---|---|
| `analysis/global/global_grid.py` | `aggregate`, `compute` and `bench` |
| `analysis/global/out/benchmarks.json` | G1 to G7 with evidence, plus the context numbers above |
| `analysis/global/out/cells_all.csv` | One row per listed cell: counts, expected count, L, interval, half-width, placebo range, look-time shifts, both retained-days readings, share inside each preset |
| `analysis/global/out/interval_widths.csv` | The interval-width distribution behind the mask rule |
| `analysis/global/independent_audit/` | The separate recompute behind G6: its own script (`FIRMS_RAW=RAW python3 recompute.py all`) and the values it produced |
| `data/out/global/grid.json` | The map: 4,472 cells, `mask_rule`, method and sources |
| `data/out/global/cells/<id>.json` | 895 monthly calendars, one for each cell readable in 2024 or 2025 |

Cell ids are `g2_<lon0>_<lat0>`, the south-west corner in degrees.

## Run

```
# once, about 9.7 GB, outside the repo (46 files)
mkdir RAW && cd RAW
for y in $(seq 2002 2025); do curl -O https://firms.modaps.eosdis.nasa.gov/data/country/zips/modis_${y}_all_countries.zip; done
for y in $(seq 2012 2025); do curl -O https://firms.modaps.eosdis.nasa.gov/data/country/zips/viirs-snpp_${y}_all_countries.zip; done
for y in $(seq 2018 2025); do curl -O https://firms.modaps.eosdis.nasa.gov/data/country/zips/viirs-jpss1_${y}_all_countries.zip; done
cd ..

python3 analysis/global/global_grid.py aggregate RAW WORK      # about 20 min on one core; reads the zips in place
python3 analysis/global/global_grid.py compute WORK            # about 4 min
python3 analysis/global/global_grid.py bench WORK --work2 WORK2 --audit analysis/global/independent_audit/audit_values.json   # G1 to G7
# WORK2 is a second `aggregate` run into its own folder (G3); the audit file comes from independent_audit/recompute.py (G6)
```

- `WORK` holds one small file per archive (about 0.5 GB in all, never committed).
- L uses MODIS and S-NPP from 2012. MODIS 2002 to 2011 and NOAA-20 are read only for the calendars (Aqua before 2012, and S-NPP outage days).
- 546,469,853 rows were read, of which 420,813,691 are daytime.

## Sources and licenses

- **NASA FIRMS** yearly country archives, MODIS Collection 6.1 and VIIRS 375 m (S-NPP, NOAA-20): https://firms.modaps.eosdis.nasa.gov/download/ . NASA data, free and open; cite as NASA FIRMS.
- **Coastlines in the app's world map:** Natural Earth 1:110m land (public domain), already in the repo as `frontend/src/r2/globe-land.ts`.
- No new basemap, shapefile or library was added. The grid is plain latitude and longitude.

## Use of AI

This folder's code, outputs, checks and this README were written with AI assistance, directed and reviewed by the team. The independent audit (G6) was run by a separate AI session that was given only the method in words and the raw files. Output JSON carries `"ai_assisted": true`.
