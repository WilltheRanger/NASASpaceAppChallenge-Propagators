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

From 2021 to 2024, Terra moved 44 minutes earlier and Aqua 34 minutes later over the US. This matches NASA's reports
that maneuvers ended in 2020 (Terra) and 2021 (Aqua). The Aqua/Terra ratio jump in 2024 is only *suggestive* of a
drift effect on counts. It is confounded by which regions burned each year; the ground-truth POD analysis is the proper test.
The 2025–2026 files were not retrievable during the outage. Use the FIRMS API (`MODIS_NRT`/`MODIS_SP`) to extend.

## Reproduce
```bash
bash chunked_get.sh "https://firms.modaps.eosdis.nasa.gov/data/country/modis/2024/modis_2024_United_States.csv" data/raw/firms/modis_2024_United_States.csv
python3 drift_check.py data/raw/firms
```
