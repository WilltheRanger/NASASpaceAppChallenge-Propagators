# Validation: is the clock audit L about time of day?

NASA's MODIS fire team reports that orbit drift changed how MODIS samples the ground: pixel size, scan gaps and view
angles, with effects that "abruptly increased in magnitude in late 2024" (Giglio, LANCE UWG, May 2025). If that
were behind Aqua's 2024–2025 excess over the fixed clock, L would be a viewing-geometry artifact rather than a
time-of-day effect. These checks test that.

## Results (Amazon 2025 unless stated)

| Check | Result | File |
|---|---|---|
| Reproduce the published audit | L matches `data/out/audit` to within 0.0005 (25 region-years) | `near_nadir_L.md` |
| Near- vs off-nadir Aqua (scan ≤ 1.3 km) | 1.53 (1.34–1.76) vs 0.99 (0.88–1.16); Cerrado and Argentina alike | `near_nadir_L.md` |
| L by view angle (6 bins, raw FIRMS) | 1.46, 1.60, 1.39 for 0–33°; 0.92, 0.92, 0.89 for 33–55° | `scan_angle_L.md` |
| Fire power per detection, inside each view bin | Aqua −24% at nadir, −15% at 33–43°, −6% at 50–55°; VIIRS (clock unchanged) −7 to −10% | `scan_angle_L.md`, `scan_angle_frp.csv` |
| Terra (drifted earlier) | L 0.45–0.71 in every view bin; fire power per detection also down | `scan_angle_L.md` |
| NOAA-20 instead of S-NPP as the reference | 1.34 (1.15–1.58) vs 1.30 (1.14–1.51) | `scan_angle_L.md` |

## Reading

- **Where the excess is:** within about 33° of nadir only.
- **Why fire power is the test:** inside one view bin the pixel size, and so the smallest detectable fire, is fixed.
  - If only the sampling had changed, the fires in a bin would be the same size as before.
  - Instead, Aqua's fire power per detection fell 14 to 17 points more than VIIRS's at nadir, a few points more out
    to 50°, and about the same in the outermost bin (50–55°), where only large fires are visible anyway.
- **What that means:** at its later look time Aqua sees more, smaller fires. MODIS detects small fires only near
  nadir, where its pixels are smallest. That is exactly where the excess sits.
- **Terra fits the same story:** it now looks earlier, and loses detections at every angle.
- **Conclusion:** the pattern points to a time-of-day effect working through fire size.
  - A sampling change is not needed to explain it, but cannot be ruled out: FIRMS hotspot files don't record how
    often each view angle was observed.
  - Changing the reference from S-NPP to NOAA-20 doesn't change the answer, so the audit can carry on after S-NPP's
    data stopped (2 Nov 2026).

## Limits

- **Coarse pixel sizes:** FIRMS gives the MODIS pixel size (`scan`) to 0.1 km, so the view-angle bins are approximate
  (705 km orbit assumed). The ~3% change in nadir pixel size that Giglio reports is below that resolution.
- **Median fire power** also moves with the fire season. VIIRS on the same days is the control for that, but VIIRS
  detects smaller fires than MODIS, so the control isn't exact.
- **Coverage:** Amazon and Cerrado only for the view-angle run (raw files needed). Near-nadir split for five regions.

## Run

```
python3 analysis/validation/near_nadir_L.py                    # from committed daily counts, ~2 s
python3 analysis/validation/scan_angle_L.py RAW_DIR            # FIRMS yearly Brazil files, ~3 GB, ~15 s
python3 analysis/validation/modis_version_boundaries.py        # Greece: MODIS version strings vs VIIRS, orbit drift table
```

`RAW_DIR` needs `modis_YYYY_Brazil.csv` and `viirs-snpp_YYYY_Brazil.csv` for 2012–2025, and
`viirs-jpss1_YYYY_Brazil.csv` (NOAA-20) for 2018–2025, from https://firms.modaps.eosdis.nasa.gov/data/country/.
`scan_angle_daily.csv.gz` keeps the daily counts by view bin, so the tables can be rebuilt without the raw files.
