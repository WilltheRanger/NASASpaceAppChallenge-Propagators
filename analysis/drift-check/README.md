# Drift check: Terra/Aqua overpass time, measured from FIRMS hotspots

First working piece (Nov 14, 2026). It measures how far the drifting MODIS satellites have moved
in local time, using only the fire detections themselves.

## Data
NASA FIRMS yearly country files (MODIS C6.1, United States):
`https://firms.modaps.eosdis.nasa.gov/data/country/modis/YYYY/modis_YYYY_United_States.csv`
These raw files are not committed. Download them into `data/raw/firms/` with `chunked_get.sh`.
FIRMS dropped long downloads during the hackathon weekend, so the script fetches 4 MB byte ranges with retries.

## Method
- Keep daytime (`daynight == D`) vegetation-fire detections (`type == 0`) within the contiguous US.
- Local solar time = UTC `acq_time` + longitude / 15.
- Keep near-nadir pixels only (`scan <= 1.3` km), so local time approximates the overpass time.
- Report the median and quartiles per satellite per year.

## Result (`drift_check_result.csv`)
| Year | Aqua median local time | Terra median local time | Aqua/Terra daytime detections |
|---|---|---|---|
| 2013 | 13:10 | 10:55 | 1.30 |
| 2016 | 13:10 | 10:55 | 1.44 |
| 2019 | 13:10 | 10:55 | 1.27 |
| 2021 | 13:08 | 10:54 | 1.38 |
| 2022 | 13:13 | 10:43 | 1.43 |
| 2023 | 13:25 | 10:29 | 1.45 |
| 2024 | 13:44 | 10:11 | 1.69 |

From 2021 to 2024, Terra moved 44 minutes earlier and Aqua 34 minutes later over the US.

**Update, this week:** the FIRMS public 7-day files (Nov 7–14, 2026), with the same filters at 25–50°N, give:
- Aqua **15:29** and Terra **08:55**, i.e. about 2 h 20 min later and 2 h earlier than their 2013–2021 times;
- NOAA-20 VIIRS at **13:08**.

This matches NASA's reports. Inclination maneuvers stopped in Feb 2020 (Terra) and Mar 2021 (Aqua), and the drift accelerates after that.

The Aqua/Terra ratio jump in 2024 is only *suggestive* of a drift effect on counts. It is confounded by which regions burned each year; the ground-truth POD analysis is the proper test.
The 7-day files need no key: `…/data/active_fire/modis-c6.1/csv/MODIS_C6_1_Global_7d.csv`. The yearly 2025–2026 files timed out during the outage; use the FIRMS API (`MODIS_NRT`/`MODIS_SP`) to fill them in.

## Reproduce
```bash
bash chunked_get.sh "https://firms.modaps.eosdis.nasa.gov/data/country/modis/2024/modis_2024_United_States.csv" data/raw/firms/modis_2024_United_States.csv
python3 drift_check.py data/raw/firms
```
