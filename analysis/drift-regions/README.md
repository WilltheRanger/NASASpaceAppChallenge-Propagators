# Drift by region: Punjab + Haryana (P2)

Run Sat Nov 14 2026, 5:32 PM. **Run after `research/predictions.md` was committed (5:31 PM), so P2 is clean.** Needs a team member's check before any slide.

## Data
NASA FIRMS yearly country files for India, 2012 to 2025: MODIS C6.1 (`modis_YYYY_India.csv`) and VIIRS S-NPP 375 m (`viirs-snpp_YYYY_India.csv`). Not committed (size). Download:
`https://firms.modaps.eosdis.nasa.gov/data/country/{modis,viirs-snpp}/YYYY/{modis,viirs-snpp}_YYYY_India.csv`

## Method (same as `analysis/drift-check/drift_check.py`)
- Daytime, `type == 0`, MODIS confidence ≥ 30, VIIRS confidence n/h, `scan ≤ 1.3` (every VIIRS pixel passes).
- Region: Punjab + Haryana preset bbox `[73.8, 27.6, 77.6, 32.6]` from `data/mock/regions.json`.
- Local solar time = UTC + longitude/15. Median per satellite and year. **All months**, not only the burning season.
- Run: `python3 drift_regions.py RAW_DIR IBGE_SHP data/out --punjab-only`
- Brazil biome drift is on branch `brady/brazil-data` (INPE-label biome lookup); this script's Brazil mode (IBGE polygons) was **not** run, to avoid two versions.

## Result (`data/out/drift/in-punjab-haryana.json`)
| Year | Aqua | Terra | VIIRS S-NPP | n Aqua |
|---|---|---|---|---|
| 2012 to 2020 | 13:13 to 13:17 | 10:47 to 10:52 | 13:07 to 13:17 | 9,295 to 14,523 |
| 2021 | 13:17 | 10:48 | 13:06 | 13,007 |
| 2022 | 13:20 | 10:41 | 13:11 | 9,575 |
| 2023 | 13:37 | 10:24 | 13:12 | 7,148 |
| 2024 | 13:56 | 10:08 | 13:08 | 5,499 |
| 2025 | 14:33 | 09:39 | 13:10 | 3,838 |

## P2 against its written rule
Rule: "Same direction each year; total rise 60 to 120 min" (Jethva 2026: 1:44 PM in 2021 to 3:12 PM in 2025).
- Direction: Aqua later every year 2021 → 2025. **Yes.**
- Total rise 2021 → 2025: 13:17 → 14:33 = **76 min**, inside 60 to 120. **Yes.**
- **By its written rule, P2 passes.**

## Caveat to resolve before a slide
Our absolute times are earlier than Jethva's: about 27 min in 2021 and 39 min in 2025. The rule tests direction and size, not level, but a judge will ask. Possible reasons (not checked):
1. Jethva may report Indian Standard Time; IST is about 28 min ahead of local solar time at ~75.5°E.
2. Jethva may use only the Oct to Nov burning season; we use all months.
3. Different pixel selection.
**Someone must open Jethva 2026 and confirm the time convention and season before we state agreement.**
