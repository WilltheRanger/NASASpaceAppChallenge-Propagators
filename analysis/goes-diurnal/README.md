# Geostationary test: does the fire diurnal cycle predict the clock audit?

**Idea:** GOES-East sees the same fires every 10 minutes, from a fixed position and at a fixed geometry, and it doesn't
drift. Its daily fire cycle tells us how much each MODIS satellite's count *should* change when its look time moves.
If the change in look time alone explains L, then the predicted change F should equal the observed L. Sofiev and
Kouznetsov (2026, *GMD* 19, 10123) used the same approach with SEVIRI. They predicted ~20% more Aqua fire power from
Aqua's later overpass, against an observed 23% MODIS–VIIRS gap.

**Data:** NOAA GOES-16/19 ABI L2 fire product, full disk (`ABI-L2-FDCF`), from NOAA's public AWS archive (no key).
- Coverage: July–October 2023–2025, every 4th day, a scan every 20 minutes from 11:20 to 21:00 UTC (local solar time
  08:30–16:00 over Brazil).
- Pixels: mask codes 10, 11, 30, 31 (processed and saturated fire pixels, as NOAA recommends for few false alarms);
  13/33 added as a sensitivity check.
- Biomes from `analysis/brazil-data/out/biome_lookup_0p1deg.csv`.
- Raw data stays outside git.

**Method:** see the `predict.py` docstring.
- The cycle is built per day and per 0.5° longitude strip, so uneven scan coverage doesn't bias it.
- Each satellite's look-time weights come from its own daytime FIRMS detections, 2012–2020 against each year.
- Observed L uses the audit method for July–October: all detections, then detections with FRP ≥ 80 MW, then summed
  FRP (columns from `analysis/frp-audit/daily.csv`).

## Results

Full tables: [`out/results.md`](out/results.md). Values are July–October.

| | Predicted F (GOES) | Observed L, FRP ≥ 80 MW | Observed L, summed FRP | Observed L, all detections |
|---|---|---|---|---|
| Terra, Amazon 2025 | 0.41 (0.35–0.47) | 0.43 (0.27–0.61) | 0.47 (0.35–0.58) | 0.54 |
| Terra, Cerrado 2025 | 0.41 (0.37–0.44) | 0.46 (0.38–0.58) | 0.53 (0.45–0.63) | 0.72 |
| Aqua, Amazon 2024 | 1.03 (1.01–1.06) | 1.09 (0.99–1.19) | 1.14 (1.01–1.25) | 1.08 |
| Aqua, Amazon 2025 | 0.99 (0.93–1.06) | 0.97 (0.76–1.15) | 0.99 (0.89–1.10) | 1.12 |
| Aqua, Cerrado 2025 | 0.97 (0.90–1.03) | 0.93 (0.84–1.09) | 0.94 (0.87–1.01) | 1.06 |

## Reading

- **The method works where the populations match.** GOES's 2 km pixels see mainly larger fires (median pixel FRP
  ~110 MW). For large fires and for summed FRP, GOES predicts Terra's drop (0.41 vs 0.43–0.53) and Aqua's lack of
  change (0.99 vs 0.97–0.99).
- **For large fires, the clock explains everything.** Terra loses them because it now looks earlier, on the morning
  ramp. Aqua's later look (14:50) sits near the large-fire peak, so it neither gains nor loses them.
- **Aqua's July–October excess (1.12) is in small detections only.** That is where the near-nadir and view-angle tests
  put it too.
- **GOES can't settle the small-fire part.** It can't see small fires, so it can't say whether they peak later in the
  afternoon (a timing effect GOES misses) or are seen more often because of changed MODIS sampling. See
  `analysis/opportunity/` and the combined summary in `analysis/attribution/README.md`.
- **All detections over-predict Terra's drop** (0.41 vs 0.54 in the Amazon) for the same reason: the small fires
  Terra still sees in the morning are invisible to GOES.

## Run

```
python3 analysis/goes-diurnal/fetch_goes.py RAW/goes        # ~2,700 scans, ~5 GB streamed, ~40 min; keeps only Brazil fire pixels
python3 analysis/goes-diurnal/predict.py RAW/goes RAW/firms_brazil
```
