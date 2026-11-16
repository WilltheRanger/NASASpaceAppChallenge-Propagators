"""Shared constants for the FIRMS cleaning pipeline.

Everything that describes a product, a column or a unit lives here so the
download script, the cleaner and the generated data dictionary never drift
apart.
"""

FIRMS_COUNTRY_BASE = "https://firms.modaps.eosdis.nasa.gov/data/country"

# Products available as public yearly-per-country CSVs (no MAP_KEY needed).
# NOAA-20 / NOAA-21 VIIRS are NOT published in this per-country archive
# (checked 2026-11-15: 404), only through the MAP_KEY API / archive request.
PRODUCTS = {
    "modis": {
        "label": "MODIS Collection 6.1 (Terra + Aqua) active fire, 1 km",
        "instrument": "MODIS",
        "nominal_resolution_m": 1000,
        "first_year": 2000,  # data starts 2000-11-01 (Terra); Aqua from 2002-07
        "in_country_archive": True,
        "doc_url": "https://earthdata.nasa.gov/data/tools/firms/active-fire-data-attributes-modis-viirs",
        # DOIs verified in NASA CMR 2026-11-15
        "doi_standard": "10.5067/MODIS/MOD14.061 (Terra), 10.5067/MODIS/MYD14.061 (Aqua)",
        "doi_nrt": "10.5067/FIRMS/MODIS/MCD14DL.NRT.0061",
    },
    "viirs-snpp": {
        "label": "VIIRS S-NPP 375 m Collection 2 active fire",
        "instrument": "VIIRS",
        "nominal_resolution_m": 375,
        "first_year": 2012,  # data starts 2012-01-20; new S-NPP data ceased 2026-11-02
        "in_country_archive": True,
        "doc_url": "https://earthdata.nasa.gov/data/instruments/viirs/viirs-i-band-375-m-active-fire-data",
        "doi_standard": "10.5067/VIIRS/VNP14IMG.002",
        "doi_nrt": "10.5067/FIRMS/VIIRS/VNP14IMGT_NRT.002",
    },
    "viirs-noaa20": {
        "label": "VIIRS NOAA-20 (JPSS-1) 375 m Collection 2 active fire",
        "instrument": "VIIRS",
        "nominal_resolution_m": 375,
        "first_year": 2018,
        "in_country_archive": False,  # only via MAP_KEY API or NRT feeds
        "doc_url": "https://earthdata.nasa.gov/data/instruments/viirs/viirs-i-band-375-m-active-fire-data",
        "doi_standard": "see FIRMS (VJ114IMG)",
        "doi_nrt": "10.5067/FIRMS/VIIRS/VJ114IMGT_NRT.002",
    },
    "viirs-noaa21": {
        "label": "VIIRS NOAA-21 (JPSS-2) 375 m Collection 2 active fire",
        "instrument": "VIIRS",
        "nominal_resolution_m": 375,
        "first_year": 2023,
        "in_country_archive": False,
        "doc_url": "https://earthdata.nasa.gov/data/instruments/viirs/viirs-i-band-375-m-active-fire-data",
        "doi_standard": "see FIRMS (VJ214IMG)",
        "doi_nrt": "10.5067/FIRMS/VIIRS/VJ214IMGT_NRT.002",
    },
}

# Source priority when the same product/date exists in several downloads:
# lower wins. Standard (science-quality) data always beats NRT.
SOURCE_PRIORITY = {"country_archive": 0, "api_sp": 1, "api_nrt": 2, "nrt_global_7d": 3}

# FIRMS uses short satellite codes in VIIRS files.
SATELLITE_NAMES = {
    "Terra": "Terra",
    "Aqua": "Aqua",
    "T": "Terra",
    "A": "Aqua",
    "N": "Suomi NPP",
    "1": "NOAA-20",
    "N20": "NOAA-20",
    "J1": "NOAA-20",
    "2": "NOAA-21",
    "N21": "NOAA-21",
}

HOTSPOT_TYPES = {
    0: "presumed vegetation fire",
    1: "active volcano",
    2: "other static land source",
    3: "offshore",
}

# MODIS confidence is a 0-100 percentage. Class cut-offs follow the MODIS
# C6/C6.1 Active Fire User Guide (Giglio et al.): low 0-29, nominal 30-79,
# high 80-100. FIRMS calls the field experimental; meaning varies by region.
MODIS_CONF_BINS = [(-0.1, 29.999, "low"), (30, 79.999, "nominal"), (80, 100, "high")]
VIIRS_CONF_CODES = {"l": "low", "n": "nominal", "h": "high", "low": "low", "nominal": "nominal", "high": "high"}

VIIRS_OVERLAP_START = "2012-01-20"

# Raw column name -> unified column name, per instrument.
RENAME = {
    "MODIS": {
        "brightness": "bright_primary_k",
        "bright_t31": "bright_secondary_k",
    },
    "VIIRS": {
        "bright_ti4": "bright_primary_k",
        "bright_ti5": "bright_secondary_k",
    },
}

# Unified output schema: column -> (dtype, unit, description).
# This is the single source for data/metadata/data-dictionary.md.
OUTPUT_COLUMNS = {
    "detection_id": ("string", "-", "Stable id: product + satellite + UTC timestamp + lat/lon. Unique within the processed file."),
    "product": ("category", "-", "FIRMS product key: modis, viirs-snpp, viirs-noaa20 or viirs-noaa21."),
    "instrument": ("category", "-", "MODIS or VIIRS."),
    "satellite": ("category", "-", "Platform: Terra, Aqua, Suomi NPP, NOAA-20 or NOAA-21 (decoded from FIRMS short codes)."),
    "nominal_resolution_m": ("int16", "m", "Nominal pixel size at nadir: 1000 (MODIS) or 375 (VIIRS I-band). Real footprint grows toward swath edge, see scan_km/track_km."),
    "latitude": ("float64", "degrees N (WGS84)", "Centre of the fire pixel, as published. Not the exact fire location."),
    "longitude": ("float64", "degrees E (WGS84)", "Centre of the fire pixel, as published."),
    "acq_date": ("date (string YYYY-MM-DD)", "UTC date", "Original acquisition date, preserved as published."),
    "acq_time": ("string HHMM", "UTC", "Original acquisition time, zero-padded to 4 digits, preserved as text."),
    "acq_datetime_utc": ("datetime64[ns, UTC]", "UTC", "acq_date + acq_time combined. Granule start time, not the exact pixel time."),
    "year": ("int16", "-", "UTC year of acquisition."),
    "month": ("int8", "-", "UTC month of acquisition."),
    "local_solar_hour": ("float32", "hours (0-24)", "Approximate local solar time = UTC hour + longitude/15. Explains Terra/Aqua/NPP overpass differences."),
    "daynight": ("category", "-", "D = daytime, N = nighttime observation (as published)."),
    "bright_primary_k": ("float32", "K", "Fire-pixel brightness temperature. MODIS channel 21/22 (~4 um); VIIRS I-4 (3.74 um). Not comparable across sensors."),
    "bright_secondary_k": ("float32", "K", "Background brightness temperature. MODIS channel 31 (11 um); VIIRS I-5 (11.45 um)."),
    "scan_km": ("float32", "km", "Actual pixel size along scan (grows toward swath edge)."),
    "track_km": ("float32", "km", "Actual pixel size along track."),
    "pixel_area_km2": ("float32", "km2", "scan_km * track_km. Use when normalising counts across sensors."),
    "frp_mw": ("float32", "MW", "Fire Radiative Power of the pixel. Pixel-integrated, so MODIS and VIIRS FRP per detection are not directly comparable."),
    "confidence_raw": ("string", "MODIS: % / VIIRS: code", "Confidence exactly as published (MODIS 0-100, VIIRS l/n/h)."),
    "confidence_pct": ("float32", "%", "MODIS only: numeric confidence 0-100. Null for VIIRS (VIIRS publishes no percentage)."),
    "confidence_class": ("category", "-", "Harmonised low/nominal/high. MODIS binned <30 / 30-79 / >=80. The classes come from different algorithms and are NOT equivalent across sensors."),
    "version": ("string", "-", "Product version string as published. Archive MODIS: 6.2 (2001-17), 6.03 (2018-22), 61.03 (2023+); VIIRS standard: 2; NRT: 6.1NRT / 2.0NRT."),
    "processing_level": ("category", "-", "'standard' (science quality) or 'NRT' (near real time, replaced by standard after ~2-6 months)."),
    "hotspot_type": ("Int8", "-", "FIRMS inferred type: 0 vegetation fire, 1 volcano, 2 other static land source, 3 offshore. Only in standard (archive) data; null for NRT."),
    "hotspot_type_label": ("category", "-", "Text label for hotspot_type."),
    "is_presumed_vegetation_fire": ("boolean", "-", "hotspot_type == 0. Still includes agricultural burning; it is not a wildfire flag."),
    "is_low_confidence": ("boolean", "-", "confidence_class == 'low'. Kept, not dropped; filter downstream if needed."),
    "in_sensor_overlap_period": ("boolean", "-", "Acquired on/after 2012-01-20, when both MODIS and VIIRS S-NPP exist. Use only these rows for direct MODIS-vs-VIIRS comparison."),
    "possible_duplicate_of": ("string", "-", "detection_id of an earlier detection by the same satellite, same UTC date, within 10 min and closer than half a pixel (overlapping granules). Null if none. Flagged, never deleted."),
    "grid_id_0p1": ("string", "-", "0.1 degree grid cell id 'lat_lon' (lower-left corner) for aggregation."),
    "grid_id_0p25": ("string", "-", "0.25 degree grid cell id for coarser aggregation."),
    "region": ("category", "-", "Region / country name used for the download."),
    "source_kind": ("category", "-", "country_archive (FIRMS yearly country file, FIRMS boundary), api_sp / api_nrt (MAP_KEY area API, clipped by us), nrt_global_7d (keyless 7-day feed, clipped by us)."),
    "source_file": ("string", "-", "Raw file this row came from (relative to data/raw)."),
    "source_url": ("string", "-", "Official URL the raw file was downloaded from."),
}
