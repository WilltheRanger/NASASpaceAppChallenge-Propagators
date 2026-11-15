# Daylight left after the alert

Built Sat Nov 14 2026. Every number here needs a team member's check before it goes on a slide.
This replaces the response simulation in `analysis/simulation/` with a version that uses measured and cited inputs only: no fleets, bases, speeds or dispatch rules.

## Question

When a satellite's daytime pass detects a fire, how many hours of daylight are left after the alert, and how did Aqua's drift change that, compared with Terra and the fixed VIIRS (S-NPP) clock?

## Method

Everything is in **local mean solar time** (UTC + longitude / 15), the convention of `data/out/drift`.

$$D = t_{\text{sunset}} - \left(t_{\text{look}} + \text{latency}\right)$$

- **Sunset:** NOAA Solar Calculator equations (after Meeus, *Astronomical Algorithms*): the sun's declination and the equation of time (EoT), then the hour angle at which the sun's centre is 0.833 degrees below the horizon (refraction plus the sun's radius).

$$\cos H_0 = \frac{\cos(90.833^\circ) - \sin\varphi\,\sin\delta}{\cos\varphi\,\cos\delta} \qquad t_{\text{sunset}} = 12 + \frac{H_0}{15} - \frac{\text{EoT}}{60}$$

- **Latency:** three fixed cases, 0, 1.5 and 3 hours. NASA states FIRMS data are available within three hours of an overpass and that MODIS near-real-time latency averages 60 to 125 minutes.
- **Level 1 (a calculation):** look time = the yearly median in `data/out/drift/<region>.json`. Sunset = at the region box centre on the middle day of the region's fire season, where the fire season is the 3 consecutive calendar months with the highest summed `fixed` count over 2012 to 2020 in `data/out/calendar/<region>.json`.
- **Level 2a (what happened):** every real near-nadir daytime FIRMS detection, with its own local solar time, its own date and its own latitude. Per region, satellite and year: the median D, the share of detections with less than 2 hours of daylight left, and the share whose alert arrives after dark.
- **Level 2b (what if):** the same real Aqua detections, each moved back by the measured clock change for its region and year (that year's `aqua_lst` minus the 2012 to 2020 median `aqua_lst`). Only the clock changes. It assumes each fire would still be detected at the earlier time.
- If D is negative the alert arrives after dark: it is reported as 0 and counted.

Level 2 uses the same detections as the repo's look times and counts: daytime, `type == 0`, MODIS confidence >= 30 and `scan <= 1.3` km, VIIRS confidence n or h and `track <= 0.40` km; Brazil biomes by `analysis/brazil-data/out/biome_lookup_0p1deg.csv`, Argentina the whole country file, Punjab + Haryana the bbox `[73.8, 27.6, 77.6, 32.6]`, California the 10-vertex outline of `analysis/statistics/region_counts.py`. Benchmarks B4 and B5 confirm this against the committed files.

## Inputs, sources and licenses

| Input | Source | License / terms |
|---|---|---|
| Look times | `data/out/drift/<region>.json` (this repo) | derived from NASA FIRMS |
| Fire season | `data/out/calendar/<region>.json`, field `fixed` (this repo) | derived from NASA FIRMS |
| Region boxes | `data/out/regions.json` (this repo) | team file |
| Detections (Level 2) | NASA FIRMS yearly country files, MODIS C6.1 and VIIRS S-NPP 375 m, 2012 to 2025: https://firms.modaps.eosdis.nasa.gov/data/country/ | NASA open data; cite NASA FIRMS |
| Latency | NASA Earthdata, "NASA FIRMS Helps Fight Wildland Fires in Near Real-Time": https://www.earthdata.nasa.gov/news/feature-articles/nasa-firms-helps-fight-wildland-fires-near-real-time | NASA web content |
| Solar equations | NOAA Global Monitoring Laboratory, Solar Calculation Details: https://gml.noaa.gov/grad/solcalc/calcdetails.html | US Government work; NOAA notes it is for research and recreational use |
| Code libraries | numpy, pandas (BSD 3-Clause); matplotlib (Matplotlib license, BSD-compatible); for the benchmarks only: astropy, scipy (BSD 3-Clause) | open source |

## Run

```
# once, about 3.5 GB, outside the repo
B=https://firms.modaps.eosdis.nasa.gov/data/country
for c in Brazil Argentina India United_States; do mkdir -p RAW/$c
  for y in $(seq 2012 2025); do for s in modis viirs-snpp; do
    curl -f -C - -o RAW/$c/${s}_${y}_${c}.csv $B/$s/$y/${s}_${y}_${c}.csv
  done; done; done

python3 analysis/daylight/daylight.py                          # Level 1 only (about 1 s)
python3 analysis/daylight/daylight.py --level2 RAW             # Level 1 + 2a + 2b (about 30 s on 2 cores)
python3 analysis/daylight/daylight.py --level2 RAW --bench     # plus analysis/daylight/out/benchmarks.json
```

Deterministic: two runs with the same `--generated` stamp give byte-identical files (benchmark B15). Benchmarks B1 and B3 need `astropy` and `scipy`; B2 uses the NOAA web values stored in the script; B16 needs the auditor's file (`--audit FILE`).

## Outputs

- `data/out/daylight/<region>.json`: per year `sunset_lst`, the look times used, `<sat>_D0`, `<sat>_D15`, `<sat>_D3` (Level 1, hours, for latency 0, 1.5, 3 h), `<sat>_D_median`, `<sat>_share_under_2h`, `<sat>_share_after_dark`, `n_<sat>` (Level 2a, keyed by latency), and `aqua_cf_*` (Level 2b). `sat` is `aqua`, `terra` or `viirs`.
- `analysis/daylight/out/<region>.png`: one chart per region, drawn only from the JSON. Line = 1.5 h latency, band = 0 to 3 h.
- `analysis/daylight/out/benchmarks.json`: the table below with its evidence.

## Results (generated 2026-11-15T07:29:36Z)

**Level 1, fire season, alert 1.5 h after Aqua's pass**

| Region | Season | Latitude | Sunset 2025 | Aqua look 2012 to 2020 (median) | Aqua look 2025 | Daylight left 2012 to 2020 (h) | Daylight left 2025 (h) | Change (min) |
|---|---|---|---|---|---|---|---|---|
| Amazon (Brazil) | Aug to Oct | -5.7 | 17:57 | 13:37 | 14:57 | 2.84 | 1.50 | -79.9 |
| Cerrado (Brazil) | Aug to Oct | -13.5 | 17:56 | 13:41 | 14:58 | 2.74 | 1.47 | -76.5 |
| Pantanal (Brazil) | Aug to Oct | -18.65 | 17:55 | 13:47 | 15:07 | 2.63 | 1.30 | -80.2 |
| Argentina | Jul to Sep | -38.45 | 17:24 | 13:53 | 15:05 | 2.01 | 0.82 | -71.7 |
| Punjab + Haryana (India) | Oct to Dec | 30.1 | 17:04 | 13:16 | 14:33 | 2.29 | 1.01 | -77.0 |
| California (USA) | Aug to Oct | 37.25 | 18:07 | 13:10 | 14:18 | 3.47 | 2.32 | -69.5 |

**Level 2a and 2b, every near-nadir Aqua detection, 2025**

| Region | Aqua detections | Median daylight left at 1.5 h (h) | Under 2 h at 1.5 h, 2012 to 2020 mean | Under 2 h at 1.5 h, 2025 | Same fires on the old clock | After dark at 3 h, 2025 | Same fires on the old clock |
|---|---|---|---|---|---|---|---|
| Amazon (Brazil) | 27,575 | 1.47 | 0.0% | 94.8% | 0.0% | 56.3% | 0.0% |
| Cerrado (Brazil) | 31,093 | 1.45 | 0.1% | 96.6% | 0.0% | 59.3% | 0.0% |
| Pantanal (Brazil) | 405 | 1.41 | 0.1% | 90.6% | 0.0% | 60.7% | 0.0% |
| Argentina | 17,594 | 1.22 | 14.5% | 82.1% | 13.6% | 68.8% | 0.4% |
| Punjab + Haryana (India) | 3,838 | 1.23 | 0.1% | 65.6% | 3.4% | 62.1% | 0.0% |
| California (USA) | 1,598 | 2.62 | 3.6% | 30.5% | 8.0% | 20.8% | 1.7% |

## Benchmarks

| ID | Check | Threshold | Result | Status |
|---|---|---|---|---|
| B1 | Sunset vs astropy | <= 1.0 min, 144/144 | max 0.063 min, mean 0.024 min, 144/144 within 1 min | **PASS** |
| B2 | Sunset vs NOAA Solar Calculator web page | <= 1 min, 4/4 | 4/4 within 1 min | **PASS** |
| B3 | Declination and equation of time vs astropy | decl <= 0.02 deg, EoT <= 0.3 min | decl 0.0030 deg, EoT 0.058 min | **PASS** |
| B4 | Look-time reproduction | exact >= 98%, within 1 min 100% | exact 252/252 (100.0%), within 1 min 252/252 | **PASS** |
| B5 | Count reproduction | 100% exact | 252/252 exact; 6,468,069 detections in Level 2 | **PASS** |
| B6 | Season stability | 0 of 6 | 0 of 6 | **PASS** |
| B7 | Arithmetic identity (Level 1) | <= 1 min | 0.231 min | **PASS** |
| B8 | VIIRS flat | <= 1 min | 0.746 min | **PASS** |
| B9 | Terra opposite | 0 | 0 of 30 | **PASS** |
| B10 | Level 1 vs Level 2a | every gap <= 30 min; any larger gap explained with numbers | max |gap| 45.5 min; 49 of 54 within 30 min, 5 over | **ACCEPTED** |
| B11 | Level 2b identity | <= 1e-9 h | 3.55e-15 h | **PASS** |
| B12 | Prior-work cross-check (Para, 2 Sep 2024) | Aqua median equal at 2 decimals; file's sunset reproduced with its own formula; difference from ours explained | Aqua median ours 14.54 vs file 14.54; file's formula gives 17.999 vs file 17.999; ours 17.985 h, diff -0.84 min | **PASS** |
| B13 | No mock inputs | 13 of 13 | 13 of 13 | **PASS** |
| B14 | Schema | 0 | 0 | **PASS** |
| B15 | Determinism | 12 of 12 | 12 of 12 | **PASS** |
| B16 | Independent audit | 5 of 5 seeded, and every extra value (times within 1 min, shares within 0.001, counts exact) | 5 of 5 seeded, 5 of 5 extra non-zero, 12 of 12 headline values | **PASS** |

B2 detail (NOAA Solar Calculator web page, read 2026-11-14; the page shows whole minutes):
- Manaus 2025-09-15: NOAA 17:58 (UTC-4) = 17.9653 h LMST; ours 17.9627 h (17:58); diff -0.16 min
- Chino Hills 2025-06-21: NOAA 20:06 (UTC-7) = 19.2513 h LMST; ours 19.2434 h (19:15); diff -0.47 min
- Punjab + Haryana box centre 2025-11-01: NOAA 17:40 (UTC+5.5) = 17.2133 h LMST; ours 17.2134 h (17:13); diff +0.01 min
- Amazon box centre 2025-09-15: NOAA 17:51 (UTC-4) = 17.9500 h LMST; ours 17.9548 h (17:57); diff +0.29 min

B10 detail: Level 1 is one day at one latitude; the five region-years over 30 minutes split exactly into these causes:
- ar-argentina 2014: gap -30.9 min = look time +0.1 + fire dates -26.1 (median detection date 2014-08-22 vs season middle 2014-08-15; 50% of detections in the season months) + latitude -5.0 (median -27.9 vs box centre -38.5); sum -30.9
- ar-argentina 2017: gap -30.3 min = look time +0.1 + fire dates -24.8 (median detection date 2017-08-19 vs season middle 2017-08-15; 54% of detections in the season months) + latitude -5.5 (median -28.2 vs box centre -38.5); sum -30.3
- us-california 2012: gap -36.2 min = look time +0.1 + fire dates -32.4 (median detection date 2012-08-16 vs season middle 2012-09-15; 66% of detections in the season months) + latitude -3.8 (median 40.0 vs box centre 37.2); sum -36.2
- us-california 2015: gap -31.9 min = look time -0.3 + fire dates -29.3 (median detection date 2015-08-16 vs season middle 2015-09-15; 59% of detections in the season months) + latitude -2.3 (median 38.9 vs box centre 37.2); sum -31.9
- us-california 2018: gap -45.5 min = look time -0.2 + fire dates -42.4 (median detection date 2018-08-08 vs season middle 2018-09-15; 57% of detections in the season months) + latitude -2.9 (median 39.3 vs box centre 37.2); sum -45.5

B10 is **accepted, not passed**. It is a real limit of Level 1 for California and Argentina, not a code error. Team decision (Nov 14): keep Level 1 as specified and quote the Level 2a median for those two regions. Their JSON carries `headline.quote = "level2a"` with the values to use:

- Argentina: 2.44 h (2012 to 2020) to 1.22 h (2025), -73.1 min
- California (USA): 3.78 h (2012 to 2020) to 2.62 h (2025), -69.8 min

## Limits

- **The change equals the drift by construction.** With sunset fixed, the change in daylight left is minus the change in look time. The new information is the absolute daylight left and the threshold shares.
- **A later pass also sees more fire.** The audit finds Aqua counted more than the fixed clock predicts in 2025 (Amazon L = 1.30). Later look, less daylight, more fires seen: both are true.
- **This describes one satellite's alert timing, not a country's response capacity.** INPE monitors fire with many satellites, including geostationary ones; Aqua is its reference satellite for statistics.
- **Sunset is not the only limit on response.** Night operations and ground crews exist. The 2 hour threshold is an analysis choice from the brief, not an operational rule.
- **Latency varies.** 0, 1.5 and 3 h are cases, not a distribution. Shares that sit on a threshold are knife-edge: for the Amazon in 2025 at 3 h latency the median daylight left is about zero, and 2,036 of 27,575 detections lie within one minute of the after-dark line.
- **Near-nadir pixels only.** Level 2 keeps the centre of the swath, as the drift files do. Off-nadir pixels are seen earlier or later, so shares over the full swath are less step-like.
- **Level 2b assumes** each fire would still be detected at the earlier clock time.
- **Level 1** uses the box-centre latitude, one day per season and an all-year median look time. For California fires burn about a month before the season's middle day (benchmark B10). For Punjab + Haryana the window Oct to Dec beats Sep to Nov by under 1 percent; the earlier window would put sunset about 24 minutes later.
- **No 2026 data** (no yearly FIRMS file yet). Local solar time is mean time; longitude only sets the instant at which the sun is evaluated.

## AI assistance

This script, its outputs and this README were written with AI assistance and checked by the benchmarks above. A team member must review them before any number is used.
