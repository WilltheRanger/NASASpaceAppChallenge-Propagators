# Attribution: is Aqua's excess caused by its later look time?

**The question:** the clock audit finds Aqua counting more fires than a fixed clock predicts (Amazon L = 1.30 in
2025) and Terra counting fewer (0.56). A teammate's objection was that the result changes with viewing angle and fire
mix, there's no cloud or coverage data, and so it doesn't prove timing caused the gap. Nine tests were run on 15 November
2026 to answer it. Each lives in its own folder with a script, results and README.

## Verdict

- **Terra:** the drop is caused by its earlier look time. Every test agrees.
- **Clouds:** ruled out for both satellites.
- **Viewing geometry:** ruled out as a direct cause. Aqua didn't look at the Amazon near nadir more often (test 9).
- **Aqua, large fires:** look time predicts no change, and none is observed (test 4).
- **Aqua's excess:** it sits in small detections near nadir. MODIS detects more small fires near nadir, where its
  pixels are smallest. Because Aqua's viewing angles didn't change, the extra near-nadir detections must come from
  more small fires at its later look time.
  - A regression across 80 region-years attributes about 90% (43–137%) of Aqua's 2025 Amazon log L to the look-time
    shift, and nothing measurable to the change in near-nadir share (test 8).
- **What remains open:**
  - Aqua's excess is the same size in every fire regime, where timing predicts it should differ (test 7). The regime
    proxy didn't match published peak times, so this test may be weak.
  - The annual excess (1.30) is bigger than the fire-season one (1.12), and the months outside the fire season haven't
    been tested.
  - Pixel-level effects (scan gaps, ~3% smaller pixels) aren't covered by the footprint test. Per-pixel MODIS fire
    masks (`MYD14`, which need an Earthdata login) would close this.

**Say it this way:** *Aqua no longer matches the fixed clock, and its later look time is the main cause. We
ruled out clouds (GOES cloud mask) and changed viewing geometry (NASA granule footprints). A geostationary satellite
predicts the change for large fires. A regression across 80 region-years attributes about 90% of the Amazon 2025
excess to the time shift. The excess appears as more small fires, which MODIS detects near nadir.*

## The tests

| # | Test | What it rules in or out | Key result | Folder |
|---|---|---|---|---|
| 1 | **Near-nadir split** | Pixel growth at the swath edge | Excess is near nadir only (Amazon 2025: 1.53 near vs 0.99 off) | `validation/near_nadir_L.md` |
| 2 | **View angle and fire power** | Sampling-only explanation | FRP per detection fell more for Aqua than for VIIRS inside fixed view-angle bins, so Aqua sees smaller fires | `validation/scan_angle_L.md` |
| 3 | **Cloud control** (GOES clear-sky mask) | Clouds | Cloud factor 0.97–1.05 for both satellites, 2024–25. Clouds can't explain +30% or −44% | `cloud-control/` |
| 4 | **GOES diurnal prediction** (geostationary, fixed geometry) | Timing, for fires GOES can see | Large fires: Terra 2025 predicted 0.41, observed 0.43–0.47; Aqua predicted 0.99, observed 0.97–0.99 | `goes-diurnal/` |
| 5 | **Three-clock diurnal fit** (Terra, Aqua, VIIRS) | Timing, for all detections | Assuming equal Terra/Aqua sensitivity, Terra's drift predicts Aqua (Amazon 2025: 1.32 vs 1.12) and Aqua's predicts Terra (0.50 vs 0.54) | `diurnal-fit/` |
| 6 | **Detection-limit FRP audit** | Small-fire mix and view angle | Fire power: Amazon 2025 1.15 (1.01–1.40). Cerrado 2025 ~1.00, so its count excess is small fires. Terra ~0.5 on every metric and angle | `frp-audit/` |
| 7 | **Fire-regime test** (arc vs interior, diurnal terciles) | A timing signature by regime | **Against timing:** the excess is similar in every stratum (arc 1.26, interior 1.33), with no dose-response | `regime-test/` |
| 8 | **Timing vs geometry regression** (80 units) | Separates the two | Timing slope significant (Aqua 0.18/h, Terra 0.31/h); geometry adds nothing (γ = −0.11, −0.66 to 0.59); timing ≈ 90% of Aqua 2025 Amazon | `decomposition/` |
| 9 | **Viewing opportunities** (NASA granule footprints, every daytime granule Jul–Oct) | Geometry, directly | **No change:** near-nadir share of Aqua's viewing opportunities is 0.399–0.402 every year 2016–2025 (Terra and VIIRS also flat). Geometry alone predicts L = 1.00 and no rise in near-nadir detection share (observed 0.63 → 0.74) | `opportunity/` |
| — | **NOAA-20 handover** | Reference stability | NOAA-20 reproduces L (Amazon 2025: 1.29 vs 1.30), so the audit outlives S-NPP | `handover/` |

All tests use the audit's method where it applies: `count_all`, the 2012–2020 monthly ratio, Brazil-wide outage
days, and a 16-day block bootstrap. Tests 4 and 5 cover July–October only, where Amazon L is 1.12 rather than the
annual 1.30.

## Literature

- **Sofiev & Kouznetsov (2026)**, *GMD* 19, 10123: attribute a 23% Aqua–VIIRS FRP gap to Aqua's later overpass, using
  SEVIRI diurnal cycles. This is the same approach as test 4.
- **Jethva et al. (2026)**, *Remote Sensing* 18, 1506: Aqua drift and geostationary timing in NW India.
- **Giglio (2007)**, *RSE* 108, 407: Brazil diurnal fire cycles from TRMM-VIRS. A Gaussian approximation of the
  "deforestation" cycle implies about 18% more fire activity at 14:57 than at 13:37. That's our own approximation,
  not a figure the paper reports.
- **Giglio (2025)**, NASA LANCE UWG: drift changes MODIS pixel size, scan gaps and view-angle sampling. No correction
  has been published.
- **MODIS coverage-corrected monthly fire product** (MYD14CMQ, UMD server): it would give a cloud- and
  coverage-corrected count, but the Collection 6 files stop in December 2018, so it cannot cover the drift years.

Side finding (test 9): S-NPP has only 84 daytime granules over the Amazon in July 2024, against 125–138 in baseline
Julys. That month's ratio is less reliable.

## Still to do (if time allows)

1. Per-pixel MODIS fire masks (`MYD14`) to get fires per clear observation by view angle. Needs a free NASA Earthdata
   account.
2. Extend tests 3–5 to January–June and November–December, where part of the annual excess sits.
