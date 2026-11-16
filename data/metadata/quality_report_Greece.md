# Data quality report — Greece

Generated 2026-11-16T03:23:14+00:00 by `python -m pipeline.clean --country Greece`.

## Row accounting

- Raw rows read: **136,946**
- Rejected (unparseable / impossible values): **0** → `data/processed/firms_Greece_rejected.csv`
- Rows superseded by a better source for the same product/date (e.g. NRT replaced by standard): **0**
- Exact duplicate rows removed: **0**
- Same detection in two downloads (later kept): **0**
- Clean rows written: **136,946**
- Flagged as possible overlapping-granule duplicates (kept): **94**

Rejections by reason: {"latitude_invalid": 0, "longitude_invalid": 0, "acq_date_invalid": 0, "acq_time_invalid": 0, "instrument_mismatch": 0}

## Soft QA flags (rows kept)

- `satellite_code_unknown`: 0
- `frp_missing`: 0
- `frp_negative`: 0
- `brightness_out_of_range`: 0
- `pixel_size_out_of_range`: 0
- `confidence_invalid`: 0
- `hotspot_type_missing`: 246

## Coverage by product

| product | satellite | rows | first | last | pct_low_conf | pct_presumed_veg | frp_missing | versions | processing |
|---|---|---|---|---|---|---|---|---|---|
| modis | Aqua | 24798 | 2002-07-04 | 2026-11-13 | 4.4% | 98.8% | 0 | 6.03, 6.1NRT, 6.2, 61.03 | NRT, standard |
| modis | Terra | 21482 | 2001-01-06 | 2026-11-13 | 4.4% | 98.0% | 0 | 6.03, 6.1NRT, 6.2, 61.03 | NRT, standard |
| viirs-noaa20 | NOAA-20 | 101 | 2026-11-08 | 2026-11-15 | 1.0% | <NA> | 0 | 2.0NRT | NRT |
| viirs-noaa21 | NOAA-21 | 123 | 2026-11-08 | 2026-11-15 | 0.8% | <NA> | 0 | 2.0NRT | NRT |
| viirs-snpp | Suomi NPP | 90442 | 2012-01-20 | 2025-12-31 | 5.6% | 83.1% | 0 | 2 | standard |

## Hotspot type

| hotspot_type | count |
|---|---|
| presumed vegetation fire | 120678 |
| other static land source | 13934 |
| offshore | 2088 |
| nan | 246 |
