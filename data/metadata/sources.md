# Data sources, licensing and citation

| Dataset | Used for | Official URL |
|---|---|---|
| FIRMS MODIS C6.1 active fire (MCD14ML), yearly country archive | Main 1 km hotspot record, 2000–present | https://firms.modaps.eosdis.nasa.gov/data/country/modis/ |
| FIRMS VIIRS S-NPP 375 m C2 active fire (VNP14IMGML), yearly country archive | 375 m hotspot record, 2012-01-20–present | https://firms.modaps.eosdis.nasa.gov/data/country/viirs-snpp/ |
| FIRMS attribute definitions | Column meanings, units, codes | https://earthdata.nasa.gov/data/tools/firms/active-fire-data-attributes-modis-viirs |
| FIRMS FAQ | Confidence, NRT vs standard, citation | https://www.earthdata.nasa.gov/data/tools/firms/faq |
| VIIRS 375 m product page | Sensor characteristics | https://earthdata.nasa.gov/data/instruments/viirs/viirs-i-band-375-m-active-fire-data |
| FIRMS archive download (custom regions, NOAA-20/21) | Larger/other requests | https://firms.modaps.eosdis.nasa.gov/download/ |
| FIRMS keyless 7-day NRT feeds | Latest week, MODIS + NOAA-20/21 | https://firms.modaps.eosdis.nasa.gov/data/active_fire/ |
| FIRMS API MAP_KEY (free) | Current-year data, NOAA-20/21 standard archive | https://firms.modaps.eosdis.nasa.gov/api/map_key/ |

Every downloaded file, its URL, HTTP status, byte size, SHA-256 and UTC
download time is recorded in `download_manifest.json`.

## Licensing

NASA promotes full and open sharing of FIRMS data; no specific licence
restriction is stated. Read the LANCE disclaimer before publishing.

## Required acknowledgement (FIRMS FAQ, paraphrased; copy exact text from the FAQ for the final submission)

The FAQ asks publications to acknowledge "the use of imagery from the NASA
LANCE FIRMS" (https://earthdata.nasa.gov/firms), part of NASA's Earth Science
Data and Information System (ESDIS), and image captions to credit "NASA FIRMS".

Dataset DOIs (verified in NASA CMR, 2026-11-15):

| Product | Standard (science quality) | Near real time |
|---|---|---|
| MODIS C6.1 | Terra `10.5067/MODIS/MOD14.061`, Aqua `10.5067/MODIS/MYD14.061` | `10.5067/FIRMS/MODIS/MCD14DL.NRT.0061` |
| VIIRS S-NPP C2 | `10.5067/VIIRS/VNP14IMG.002` | `10.5067/FIRMS/VIIRS/VNP14IMGT_NRT.002` |
| VIIRS NOAA-20 C2 | — | `10.5067/FIRMS/VIIRS/VJ114IMGT_NRT.002` |
| VIIRS NOAA-21 C2 | — | `10.5067/FIRMS/VIIRS/VJ214IMGT_NRT.002` |

Other inputs:

- Natural Earth 1:50m admin-0 countries (public domain), used to clip NRT/API data:
  https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson
- MODIS C6/C6.1 Active Fire User Guide (confidence classes, hotspot types):
  https://earthdata.nasa.gov/s3fs-public/2023-09/MODIS_C6_C6.1_Fire_User_Guide_1.0.pdf

Algorithm references:

- Giglio, L., Descloitres, J., Justice, C. O., Kaufman, Y. J. (2003). An enhanced contextual fire detection algorithm for MODIS. *Remote Sensing of Environment* 87, 273–282. doi:10.1016/S0034-4257(03)00184-6
- Schroeder, W., Oliva, P., Giglio, L., Csiszar, I. A. (2014). The New VIIRS 375 m active fire detection data product. *Remote Sensing of Environment* 143, 85–96. doi:10.1016/j.rse.2013.12.008
