# MODIS version boundaries — Greece

Vegetation-fire pixels, 2012+ (VIIRS S-NPP v2 as constant reference).

## Per era

|   modis_version |   ('count_ratio_v_over_m', 'mean') |   ('count_ratio_v_over_m', 'std') |   ('count_ratio_v_over_m', 'count') |   ('frp_ratio_v_over_m', 'mean') |   ('frp_ratio_v_over_m', 'std') |   ('frp_ratio_v_over_m', 'count') |   ('modis_pct_low', 'mean') |   ('modis_pct_low', 'std') |   ('modis_pct_low', 'count') |   ('modis_conf_median', 'mean') |   ('modis_conf_median', 'std') |   ('modis_conf_median', 'count') |   ('modis_frp_median', 'mean') |   ('modis_frp_median', 'std') |   ('modis_frp_median', 'count') |
|----------------:|-----------------------------------:|----------------------------------:|------------------------------------:|---------------------------------:|--------------------------------:|----------------------------------:|----------------------------:|---------------------------:|-----------------------------:|--------------------------------:|-------------------------------:|---------------------------------:|-------------------------------:|------------------------------:|--------------------------------:|
|            6.03 |                               3.65 |                              0.27 |                                   5 |                             0.68 |                            0.14 |                                 5 |                        4.97 |                       0.52 |                            5 |                           70.8  |                           9.78 |                                5 |                          19.35 |                         15.33 |                               5 |
|            6.2  |                               3.46 |                              0.24 |                                   6 |                             0.8  |                            0.09 |                                 6 |                        4.76 |                       0.51 |                            6 |                           69.5  |                           1.38 |                                6 |                          14.98 |                          2.35 |                               6 |
|           61.03 |                               3.24 |                              0.13 |                                   3 |                             0.47 |                            0.05 |                                 3 |                        4.43 |                       0.52 |                            3 |                           80.67 |                           8.62 |                                3 |                          31.67 |                         11.51 |                               3 |

## Step test on VIIRS/MODIS count ratio

- Within-era year-to-year |change|: median 0.26, max 0.68
- Boundary 2017->2018 (6.2 -> 6.03): |change| 0.41 (within normal range)
- Boundary 2022->2023 (6.03 -> 61.03): |change| 0.42 (within normal range)

## Day overpass local solar time (median, hours) — orbit drift check

|   year |   Aqua |   NOAA-20 |   NOAA-21 |   Suomi NPP |   Terra |
|-------:|-------:|----------:|----------:|------------:|--------:|
|   2012 |  13.11 |    nan    |    nan    |       12.88 |   10.98 |
|   2013 |  13.09 |    nan    |    nan    |       12.93 |   10.98 |
|   2014 |  13.11 |    nan    |    nan    |       13.08 |   11.01 |
|   2015 |  13.15 |    nan    |    nan    |       12.97 |   10.97 |
|   2016 |  13.12 |    nan    |    nan    |       12.9  |   11.02 |
|   2017 |  13.09 |    nan    |    nan    |       12.87 |   10.99 |
|   2018 |  13.13 |    nan    |    nan    |       12.89 |   11.03 |
|   2019 |  13.11 |    nan    |    nan    |       12.96 |   10.99 |
|   2020 |  13.09 |    nan    |    nan    |       12.99 |   11.04 |
|   2021 |  13.24 |    nan    |    nan    |       13.02 |   10.99 |
|   2022 |  13.19 |    nan    |    nan    |       12.88 |   10.8  |
|   2023 |  13.39 |    nan    |    nan    |       12.97 |   10.62 |
|   2024 |  13.69 |    nan    |    nan    |       13.03 |   10.28 |
|   2025 |  14.23 |    nan    |    nan    |       12.93 |    9.95 |
|   2026 |  15.2  |     13.37 |     12.77 |      nan    |    9.32 |

Aqua drifts later and Terra earlier from ~2022. Because burning peaks in the afternoon, MODIS detections/FRP after 2022 are not comparable to earlier years without accounting for overpass time. VIIRS S-NPP stays stable (~13:00).
