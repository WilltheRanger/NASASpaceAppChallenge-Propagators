# Data limitations and quality notes

Read this before drawing any conclusion from the cleaned data. Numbers quoted
are from the Greece 2001–2025 run (`quality_report_Greece.md`).

## What one row is (and isn't)

- **One row = one satellite pixel flagged as containing a thermal anomaly.** It
  is not one fire. A single large fire produces hundreds of rows per overpass
  (Evros, Aug–Sep 2023: 1,304 MODIS and 4,325 VIIRS pixels).
- **Lat/lon is the pixel centre**, not the fire location. Error is up to half
  a pixel (≈500 m MODIS, ≈190 m VIIRS at nadir; more at swath edge).
- **No row ≠ no fire.** Clouds, thick smoke, overpass timing, small or short
  fires and canopy cover all cause misses. A month with zero rows means "nothing
  detected", not "nothing burned".
- **Not every row is a wildfire.** `hotspot_type` separates vegetation fires
  from volcanoes, static industrial sources and offshore flares, but
  "presumed vegetation fire" still includes agricultural and prescribed burns.
  Type 2 ("other static land source") means detected on 16+ days in a year or
  in an urban area (MODIS C6/C6.1 Fire User Guide, Table 10).
  In Greece 10% of rows are static land sources (refineries/industry near
  Aspropyrgos, Larymna, Volos) and 1.5% are offshore.

## MODIS vs VIIRS are not interchangeable

| | MODIS (Terra/Aqua) | VIIRS S-NPP |
|---|---|---|
| Nominal pixel | 1 km | 375 m |
| Record starts | Terra 2000-11, Aqua 2002-07 | 2012-01-20 |
| Confidence | 0–100 % | l / n / h code only |
| Day overpass (local solar) | Terra ≈10:30, Aqua ≈13:30, both drifting since ~2022 | ≈13:30 (S-NPP ended 2026-11) |
| Brightness channel | 21/22 (~4 µm) | I-4 (3.74 µm), saturates ≈367 K |

- VIIRS detects **≈3.1–4.0× more vegetation-fire pixels** than MODIS in Greece
  every year 2012–2025. Smaller pixels mean one fire covers more pixels, and
  VIIRS also catches smaller fires.
- **FRP is pixel-integrated**: median MODIS FRP per pixel is ~5× VIIRS (Evros
  2023: 46 vs 9 MW). Compare FRP **sums over an area/time**, never per pixel.
- **Confidence classes are not equivalent.** MODIS classes are our binning of a
  percentage (0 ≤ C < 30 low, 30 ≤ C < 80 nominal, ≥ 80 high, per the MODIS C6/C6.1 Fire User Guide §7);
  VIIRS classes come from a different algorithm. FIRMS calls MODIS confidence
  experimental and region-dependent.
- Use `in_sensor_overlap_period` for any direct comparison. Pre-2012 trends are
  MODIS-only and must not be stitched onto VIIRS counts without calibration.

## Satellite record changes (affect any trend analysis)

- **MODIS orbit drift.** Terra and Aqua are no longer held in their original
  orbits. Median daytime overpass over Greece moved Aqua 13:07 → 14:14 and Terra
  10:59 → 09:57 local solar time, mostly from 2022 on
  (`analysis/validation/overpass_drift_Greece.csv`). Burning peaks in the
  afternoon, so MODIS counts/FRP after ~2022 are not comparable to earlier years
  as-is. The VIIRS/MODIS FRP ratio already falls from ~0.8 to ~0.45 in 2024–25.
  `local_solar_hour` is in every row so this can be controlled for.
- **Suomi NPP has stopped.** NASA ended delivery of new S-NPP data on
  2026-11-02; the keyless S-NPP feed is now empty. VIIRS continuity from 2026
  onward is NOAA-20 + NOAA-21. They use the same VIIRS design but are separate
  instruments with different overpass times. Treat the S-NPP → NOAA-20/21
  hand-over like a sensor change, and calibrate it in the overlap years
  (NOAA-20 from 2018, NOAA-21 from 2023).
- **MODIS version strings change by year** in the country archive: `6.2`
  (2001–2017), `6.03` (2018–2022), `61.03` (2023–2025). **Tested:** using VIIRS
  S-NPP (one version throughout) as reference, the VIIRS/MODIS count ratio moves
  0.41–0.42 across the two boundaries vs up to 0.68 between ordinary years, so
  there is no detectable step change in Greece
  (`analysis/validation/modis_version_boundaries_Greece.md`).

## Sources, versions and processing status

| `source_kind` | What | Boundary | Processing |
|---|---|---|---|
| `country_archive` | FIRMS yearly country CSV (MODIS, S-NPP; NOAA-20 as `viirs-jpss1` from 2018), 2001–2025 | FIRMS' own | standard |
| `api_sp` / `api_nrt` | FIRMS area API with MAP_KEY, any date range, all 4 sensors | ours (below) | standard / NRT |
| `nrt_global_7d` | Keyless global last-7-days feeds (MODIS, NOAA-20, NOAA-21) | ours (below) | NRT |

- When two sources cover the same product and UTC date, only the best is kept
  (archive > API standard > API NRT > keyless NRT). NRT rows are replaced as soon
  as standard data for that date is downloaded.
- **NRT rows have no `hotspot_type`**, so `is_presumed_vegetation_fire` is null
  for them: industrial sources and flares can't be separated in NRT data.
- **Our clip boundary:** Natural Earth 1:50m country polygon, buffered 0.25°
  into the sea and excluding all other countries. It keeps 99.6% of FIRMS'
  own Greece archive detections; the 0.4% missed are along land borders where the
  two boundaries differ.
- The current year is not in the country archive (HTTP 404). The keyless feed
  only gives the last 7 days, so re-running `download_recent --mode keyless`
  daily builds a rolling NRT record. A free MAP_KEY
  (<https://firms.modaps.eosdis.nasa.gov/api/map_key/>) backfills 2026-to-date
  and the NOAA-20/21 standard archive.

## Cleaning decisions

| Issue | Action | Greece count |
|---|---|---|
| Unparseable/impossible lat, lon, date, time | Rejected → `*_rejected.csv` with reason | 0 |
| Same product+date in a better source | NRT/lower-priority rows dropped | 0 |
| Exact duplicate rows | Removed | 0 |
| Same detection in two downloads | Later download kept | 0 |
| Same satellite, ≤10 min apart, < ½ pixel apart, different granule | **Flagged** `possible_duplicate_of`, kept | 94 |
| Low confidence | **Flagged** `is_low_confidence`, kept | ~5 % |
| Negative FRP | Set to null, `qa_flags=frp_negative` | 0 |
| Brightness outside 200–600 K, pixel size outside 0.1–10 km | `qa_flags`, kept | 0 |
| Unknown satellite code / confidence | `qa_flags`, kept | 0 |
| Missing hotspot type (all NRT rows) | `qa_flags=hotspot_type_missing`, kept | 246 |

Adjacent pixels in the same granule are **never** treated as duplicates.

## Known unknowns (to investigate)

- Cloud-cover / missed-overpass masks are not in FIRMS hotspot files; we can't
  yet separate "not observed" from "observed, no fire". Candidate fix: MODIS
  MOD14/MYD14 fire-mask granules, or a coverage proxy from overpass counts.
- Burned-area products (MCD64A1) would let us check hotspot counts against
  area actually burned.
