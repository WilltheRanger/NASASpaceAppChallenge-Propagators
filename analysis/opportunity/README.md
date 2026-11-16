# Viewing-opportunity geometry (Aqua / Terra MODIS, S-NPP VIIRS) over the Amazon

Question: did Aqua's orbit drift make it *look* at the Amazon near nadir more often, which would
mechanically raise its near-nadir detection share and the audit number L?

## Method
1. `fetch_footprints.py` pulls every granule intersecting the Amazon bbox (-74.5,-18.5,-43.5,5.5) for
   Jul-Oct of 2016, 2018, 2020 (baseline) and 2023, 2024, 2025 from the public NASA CMR
   (`https://cmr.earthdata.nasa.gov/search/granules.json`, no login): MYD03 v6.1 (Aqua), MOD03 v6.1
   (Terra), VNP03IMG v2 (S-NPP VIIRS). Each granule carries a 4-corner `polygons` footprint.
   Cached to `/private/tmp/opportunity_cache` (outside the repo; override with `OPP_CACHE`).
2. `opportunities.py`: for every DAY granule, the two cross-track (east-west) edges are identified;
   the great circle through their midpoints is the nadir track. Each Amazon 0.25-deg cell (built from
   `analysis/brazil-data/out/biome_lookup_0p1deg.csv`, biome == amazon; 6018 cells) whose centre lies in
   the footprint is one opportunity; its cross-track distance is converted to scan angle on a spherical
   Earth. Altitude per granule is inferred from its own swath half-width assuming the corners sit at the
   max scan angle (55 deg MODIS, 56.06 deg VIIRS); `OPP_NOMINAL_H=1` uses 705/829 km instead.
3. FIRMS MODIS daytime Amazon detections (Jul-Oct) have their `scan` pixel size inverted to scan angle
   (MODIS 1 km at nadir, 705 km).
4. Geometry-only model: per-bin detection rate = baseline detections / baseline opportunities (pooled
   2016/18/20); predicted count for year y = sum_b rate_b * opportunities_b(y). Geometry-only L =
   Aqua factor / S-NPP factor (S-NPP by total opportunities), also detection-weighted by month.

## Outputs
`results.md` (all tables), `opportunities_by_bin.csv`, `opportunities_by_granule.csv`.

## Limits
- CMR footprints have only 4 corners: the nadir track is a straight great circle per 5/6-min granule
  (error of order 10 km vs a ~1150 km half-swath). Enough for 6 angle bins; not pixel-level.
- Opportunities = granule coverage. Cloud, sun-glint, scan-edge bow-tie overlap, the MODIS
  "scan gaps" NASA mentions, and pixel-level sampling are NOT represented.
- Baseline is 3 sample years, not 2012-2020; L here is a Jul-Oct season, not the team's annual L.
- FIRMS `scan` is rounded to 0.1 km, so bins below ~24 deg are approximate.
- Cells are equal-weighted (no area weighting).

## Findings (numbers from results.md)
- Near-nadir (<33 deg) opportunity share is flat: Aqua 0.399/0.399/0.402 (2016/18/20) vs 0.400/0.402/0.401
  (2023/24/25), so k is about 1.00. Terra is flat (0.399 to 0.401); VIIRS control is flat (0.362).
- Footprints show a narrower swath: Aqua half-width 1168 km to 1141 km (2025), implied altitude about
  706 to 693 km (Terra similar; VIIRS unchanged). This removes some coverage but not the angle mix.
- Aqua's observed near-nadir detection share (<33 deg from FIRMS scan) is 0.62-0.64 baseline, 0.677
  (2024) and 0.735 (2025); geometry alone predicts 0.630-0.632 every year, so it explains about 0% of the rise.
- Geometry-only L (angle mix only) is 1.003 (2024) and 1.001 (2025). With granule gaps, detection-weighted
  monthly L_geom is 1.037 / 1.026, which is inside the baseline-year spread (0.926-1.043). A notable gap:
  S-NPP VNP03IMG has 84 day granules in July 2024 vs about 125-138 in baseline Julys (g_viirs = 0.62),
  which inflates July 2024 Aqua/VIIRS ratios.
