# FRP and detection-limit harmonized clock audit

Asks whether the Aqua audit excess (Amazon L = 1.10 in 2024, 1.30 in 2025) survives once view angle and
fire-size mix are taken out, following Sofiev & Kouznetsov (2026, GMD 19, 10123): compare FRP rather than
counts, and compare only fires above a detection limit both sensors meet.

## Run
```
.venv/bin/python analysis/frp-audit/aggregate.py   # raw FIRMS -> daily.csv, up.csv, hist.csv (~30 s)
.venv/bin/python analysis/frp-audit/frp_audit.py   # threshold, bootstrap, results.md (~5 s)
```
Input: `/Users/himatthew/spaceapps/raw/firms_brazil` (MODIS C6.1 and S-NPP VIIRS 375 m, 2012-2025),
`analysis/brazil-data/out/biome_lookup_0p1deg.csv`. All daytime detections, with no type or confidence filter
(the team's `count_all`).

## Method
- L(q) = sum of the MODIS quantity q / (sum of the S-NPP quantity q x R_m), where R_m is the 2012-2020
  MODIS/S-NPP ratio of the same q for that calendar month. Days are dropped when either satellite has no daytime
  detection anywhere in Brazil. The 95% CI comes from a Poisson bootstrap over 16-day blocks (1000 replicates,
  shared by the baseline and the target year). Aqua and Terra are each compared with S-NPP.
- q = count, summed FRP, count or FRP of detections with per-pixel FRP >= T, and the same split into near-nadir
  (MODIS scan <= 1.3 km) and off-nadir (scan > 1.3 km). The S-NPP side always uses all view angles with the
  same T in MW.
- Plain counts reproduce the team's numbers (Amazon Aqua 1.10 in 2024, 1.30 in 2025).

## Threshold and why
- From the data: for each MODIS scan bin, the FRP distribution above F was compared with the nadir bin's
  (KS distance, `threshold_ks.csv`). A bin that misses small fires has a distorted distribution. Aqua's worst
  (edge) bin comes within KS 0.05, plus a sampling allowance, of nadir from **63 MW** in both 2012-2020 and
  2025. Terra gets there from 40 MW in 2012-2020 and 36 MW in 2025. For scan <= 1.3 km only, the limit is
  about 6-8 MW.
- Physical check: scaling the 5.7 MW nadir limit by the edge pixel area (~4.8 x 2.0 km) gives about 55 MW.
- Primary T = **80 MW**, the first tested grid value above 63 MW. Sensitivity runs use 20, 30, 50, 60 and
  100 MW. With scan <= 1.3 km, T = 10-80 MW. S-NPP distributions agree across track bins from about 13 MW, so
  S-NPP is complete at all of these T.

## Limits
- Per-pixel FRP is not per-fire FRP. A VIIRS 375 m pixel splits a large fire into several pixels, and a large
  MODIS pixel merges several fires. A fixed MW cut therefore selects different fire populations on the two
  sensors: at >= 80 MW it keeps about 2% of S-NPP detections (20-25% of S-NPP FRP) but 11-20% of Aqua
  detections. The monthly baseline ratio absorbs any constant difference, but not a change in fire-size mix.
- Thresholded metrics are noisy in 2025, a low-fire year, and their CIs are wide.
- Only S-NPP is used as the reference. NOAA-20 is not used.
- The rise in Aqua's near-nadir share of >= 80 MW detections since 2023 (results.md, section 5) is not
  explained here. Candidate causes are a change in Aqua's sampling geometry or more cloud blocking oblique views
  in the afternoon. Neither was tested.

## Verdict (numbers in results.md, section 2)
- Amazon Aqua: the 2025 excess is about halved, from 1.30 to about 1.15, and the 2024 excess is unchanged.
  It does not vanish. L_FRP is 1.15 in both 2024 and 2025. L at >= 80 MW is 1.12 [1.03, 1.23] in 2024 and
  1.16 [0.94, 1.54] in 2025. In 2025 it stays at 1.15-1.18 for T = 20-100 MW.
- The remaining excess sits only in near-nadir pixels, even above the detection limit. At scan <= 1.3 km and
  >= 30 MW, L is 1.29 in 2024 and 1.46 in 2025. Off-nadir at >= 80 MW, L is 1.04 in 2024 and 1.01 in 2025. A
  pure look-time effect should raise every view angle equally, so part of the excess depends on view geometry,
  and that part is not explained by detection limits.
- Cerrado Aqua: L_FRP and the harmonized L are about 1.0 in 2025. The count excess there is small fires.
- Terra falls well below 1 on every metric and at every view angle: about 0.5 in 2025 in both biomes. That is
  consistent with its earlier look time catching less burning.
