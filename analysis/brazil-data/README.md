# Propagators data work (Brady's lane)

Built Sat Nov 14, 2026 with AI assistance (Claude). Log this in the SI disclosure.
Raw data (`inpe/`, `firms/`) must NOT be committed. `scripts/` and `out/` can go in the repo
(`scripts/` -> `analysis/brazil-data/`, `out/` -> wherever the team agrees).

## Raw data
- `inpe/focos_br_ref_2003..2025.zip`: INPE reference-satellite detections (23 files, 140 MB).
  Source: https://dataserver-coids.inpe.br/queimadas/queimadas/focos/csv/anual/Brasil_sat_ref/
- `firms/{modis,viirs-snpp,viirs-jpss1}_YYYY_Brazil.csv`: NASA FIRMS yearly country files (47 files, 3.2 GB).
  MODIS 2001-2025, S-NPP 2012-2025, NOAA-20 2018-2025. No 2026 (no yearly file yet).

## Run order
    bash    scripts/get_firms_brazil.sh firms          # resumable; repeat until "all complete"
    python3 scripts/build_biome_lookup.py inpe out
    python3 scripts/firms_daily_counts.py firms out
    python3 scripts/inpe_reproduction.py out

## Outputs (`out/`)
| File | Columns |
|---|---|
| `biome_lookup_0p1deg.csv` | `cell_lat`, `cell_lon` (= floor(deg*10)), `biome`, `n_points`, `share`, `source` |
| `inpe_daily_by_biome.csv` | `date` (UTC), `biome`, `inpe_count` |
| `firms_daily_by_biome.csv` | `date` (UTC), `biome`, `satellite` (Aqua, Terra, S-NPP, NOAA-20), `near_nadir` (0/1), `count`, `count_all`, `frp_sum` |
| `firms_drift_by_biome.csv` | `year`, `biome` (incl. `brazil`), `satellite`, `n_near_nadir`, `lst_p25`, `lst_median`, `lst_p75`, `median_local_time` |
| `inpe_reproduction_{yearly,monthly,summary}.csv` | P3: FIRMS Aqua daytime vs. INPE |
| `preview_two_clocks_yearly.csv` | Quick look only, no error bars: `A_rel` = Aqua/S-NPP and `T_rel` = Terra/S-NPP vs. 2012-2020; `clock_diff` = ln A_rel - ln T_rel |

Biomes: `amazon`, `cerrado`, `caatinga`, `mata_atlantica`, `pantanal`, `pampa`.

## Choices to confirm with Matthew
- `count` filters: daytime, `type == 0`, MODIS confidence >= 30, VIIRS confidence n or h. `count_all` = every daytime detection.
- `near_nadir`: MODIS `scan <= 1.3` (same as `drift_check.py`); VIIRS `track <= 0.40` (my choice; VIIRS scan size is not monotonic with view angle).
- Biome lookup comes from INPE's own per-detection biome labels (majority per 0.1 deg cell, gaps filled from the nearest labelled cell within 0.3 deg), not from the IBGE polygons. 1,550 of 56,345 labelled cells have a majority share under 90% (biome borders).
- Dates are UTC (`acq_date`); afternoon passes over Brazil fall on the same UTC and local date.
