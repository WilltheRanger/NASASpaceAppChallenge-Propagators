# Handover: NOAA-20 replaces S-NPP as the fixed clock

**Why:** the clock audit measures Aqua against S-NPP VIIRS, and NASA stopped delivering new S-NPP data on 2 November
2026. NOAA-20 carries the same VIIRS instrument in the same ~13:30 orbit and overlaps S-NPP from April 2018.

**Method:** the audit's 2012–2020 baseline is chained through the overlap, so it doesn't change.

- R_m = Aqua ÷ S-NPP, 2012–2020, calendar month *m*. This is the audit's exchange rate, unchanged.
- k_m = S-NPP ÷ NOAA-20 over the overlap, calendar month *m*.
- Fixed-clock count in year *y* = Σ_m NOAA-20_{m,y} × k_m × R_m, and L_NOAA-20 = Aqua ÷ that count.

Days, counts and the 16-day block bootstrap follow `analysis/statistics/audit.py`. Full tables:
[`out/results.md`](out/results.md).

## Results

1. **The S-NPP/NOAA-20 rate is stable.**
   - Each overlap year scored against k: Amazon 0.99–1.01, Cerrado 0.98–1.02, Argentina 0.98–1.01.
   - The small regions are noisier but have no trend: Pantanal 0.95–1.04, Punjab + Haryana 0.94–1.04, California
     0.97–1.08.
2. **Out of sample, it reproduces the published audit.** With k fitted on 2018–2020 only and tested on 2021–2025 on
   the same days:
   - Amazon L differs from the S-NPP-based L by −0.001 to +0.008, Cerrado by −0.011 to +0.014.
   - Every 95% interval for the difference, in all six regions and all five years, includes 0.
3. **No headline verdict changes.** Every 2024 and 2025 region-year with enough fires gets the same verdict with
   either clock. Examples: Amazon 2025 is 1.30 with S-NPP and 1.29 (1.13–1.50) with NOAA-20; Argentina 2024 is 1.17
   with both.
   - Four borderline cells flip: Cerrado 2021 and 2023, Pantanal 2023, Punjab + Haryana 2022. All are years where L
     sits within a few hundredths of the nine-year range's edge, and Cerrado's range is only ±2.7%.

**Reading:** NOAA-20 can carry the audit from 2026 on with no visible break. The audit outlives S-NPP, and MODIS for
as long as Aqua flies.

## 2026

- The repo has only the 7-day NRT window for 2026 (`analysis/nrt-2026`), which isn't enough for a yearly L.
- With a free FIRMS MAP_KEY:

  ```
  FIRMS_MAP_KEY=... python3 -m pipeline.download_recent --mode api --country Brazil --start 2026-01-01 --sensors modis viirs-noaa20
  ```

  Count those files with `analysis/brazil-data/scripts/firms_daily_counts.py`, then run
  `python3 analysis/handover/handover.py --extra <2026 daily counts>`. 2026 rows then appear with NOAA-20 as the clock.
- 2026 data is NRT until NASA reprocesses it. NRT has no hotspot type, which `count_all` doesn't need.

## Limits

- k assumes S-NPP and NOAA-20 detect the same way. The flat yearly ratio supports this for 2018–2025. It cannot
  cover a NOAA-20 change after S-NPP ends, because there is nothing left to compare against. NOAA-21 (from 2023) is
  the next cross-check, via the MAP_KEY API.
- The placebo range is the published audit's (S-NPP based). It isn't recomputed in NOAA-20 terms, because NOAA-20 has
  no 2012–2017 data.

Run: `python3 analysis/handover/handover.py` (about 3 s, from committed daily counts).
