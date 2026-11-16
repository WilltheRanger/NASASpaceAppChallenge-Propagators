# Data dictionary — cleaned FIRMS hotspots

Generated from `pipeline/schema.py` by `pipeline.clean`. Do not edit by hand.

File: `data/processed/firms_<region>_hotspots.parquet` (one row = one satellite fire pixel, **not** one fire).

| Column | Type | Unit | Definition |
|---|---|---|---|
| `detection_id` | string | - | Stable id: product + satellite + UTC timestamp + lat/lon. Unique within the processed file. |
| `product` | category | - | FIRMS product key: modis, viirs-snpp, viirs-noaa20 or viirs-noaa21. |
| `instrument` | category | - | MODIS or VIIRS. |
| `satellite` | category | - | Platform: Terra, Aqua, Suomi NPP, NOAA-20 or NOAA-21 (decoded from FIRMS short codes). |
| `nominal_resolution_m` | int16 | m | Nominal pixel size at nadir: 1000 (MODIS) or 375 (VIIRS I-band). Real footprint grows toward swath edge, see scan_km/track_km. |
| `latitude` | float64 | degrees N (WGS84) | Centre of the fire pixel, as published. Not the exact fire location. |
| `longitude` | float64 | degrees E (WGS84) | Centre of the fire pixel, as published. |
| `acq_date` | date (string YYYY-MM-DD) | UTC date | Original acquisition date, preserved as published. |
| `acq_time` | string HHMM | UTC | Original acquisition time, zero-padded to 4 digits, preserved as text. |
| `acq_datetime_utc` | datetime64[ns, UTC] | UTC | acq_date + acq_time combined. Granule start time, not the exact pixel time. |
| `year` | int16 | - | UTC year of acquisition. |
| `month` | int8 | - | UTC month of acquisition. |
| `local_solar_hour` | float32 | hours (0-24) | Approximate local solar time = UTC hour + longitude/15. Explains Terra/Aqua/NPP overpass differences. |
| `daynight` | category | - | D = daytime, N = nighttime observation (as published). |
| `bright_primary_k` | float32 | K | Fire-pixel brightness temperature. MODIS channel 21/22 (~4 um); VIIRS I-4 (3.74 um). Not comparable across sensors. |
| `bright_secondary_k` | float32 | K | Background brightness temperature. MODIS channel 31 (11 um); VIIRS I-5 (11.45 um). |
| `scan_km` | float32 | km | Actual pixel size along scan (grows toward swath edge). |
| `track_km` | float32 | km | Actual pixel size along track. |
| `pixel_area_km2` | float32 | km2 | scan_km * track_km. Use when normalising counts across sensors. |
| `frp_mw` | float32 | MW | Fire Radiative Power of the pixel. Pixel-integrated, so MODIS and VIIRS FRP per detection are not directly comparable. |
| `confidence_raw` | string | MODIS: % / VIIRS: code | Confidence exactly as published (MODIS 0-100, VIIRS l/n/h). |
| `confidence_pct` | float32 | % | MODIS only: numeric confidence 0-100. Null for VIIRS (VIIRS publishes no percentage). |
| `confidence_class` | category | - | Harmonised low/nominal/high. MODIS binned <30 / 30-79 / >=80. The classes come from different algorithms and are NOT equivalent across sensors. |
| `version` | string | - | Product version string as published. Archive MODIS: 6.2 (2001-17), 6.03 (2018-22), 61.03 (2023+); VIIRS standard: 2; NRT: 6.1NRT / 2.0NRT. |
| `processing_level` | category | - | 'standard' (science quality) or 'NRT' (near real time, replaced by standard after ~2-6 months). |
| `hotspot_type` | Int8 | - | FIRMS inferred type: 0 vegetation fire, 1 volcano, 2 other static land source, 3 offshore. Only in standard (archive) data; null for NRT. |
| `hotspot_type_label` | category | - | Text label for hotspot_type. |
| `is_presumed_vegetation_fire` | boolean | - | hotspot_type == 0. Still includes agricultural burning; it is not a wildfire flag. |
| `is_low_confidence` | boolean | - | confidence_class == 'low'. Kept, not dropped; filter downstream if needed. |
| `in_sensor_overlap_period` | boolean | - | Acquired on/after 2012-01-20, when both MODIS and VIIRS S-NPP exist. Use only these rows for direct MODIS-vs-VIIRS comparison. |
| `possible_duplicate_of` | string | - | detection_id of an earlier detection by the same satellite, same UTC date, within 10 min and closer than half a pixel (overlapping granules). Null if none. Flagged, never deleted. |
| `grid_id_0p1` | string | - | 0.1 degree grid cell id 'lat_lon' (lower-left corner) for aggregation. |
| `grid_id_0p25` | string | - | 0.25 degree grid cell id for coarser aggregation. |
| `region` | category | - | Region / country name used for the download. |
| `source_kind` | category | - | country_archive (FIRMS yearly country file, FIRMS boundary), api_sp / api_nrt (MAP_KEY area API, clipped by us), nrt_global_7d (keyless 7-day feed, clipped by us). |
| `source_file` | string | - | Raw file this row came from (relative to data/raw). |
| `source_url` | string | - | Official URL the raw file was downloaded from. |
| `qa_flags` | string | - | Semicolon-separated soft QA flags (see data-limitations.md). Null = no issues. |
