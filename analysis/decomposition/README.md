# decomposition

This folder tests how much of the audit number L comes from timing (the satellite's look time drifting through the fire diurnal cycle) and how much from sampling geometry (a change in MODIS's near-nadir share of detections).

The design is a regression over (region, satellite, year) units for 2021–2025, plus a second design that computes L separately for each view-angle (scan) bin.

**Run** (about 80 s; the first run reads the raw MODIS files and caches `out/modis_daily_bins.csv`):

    .venv/bin/python analysis/decomposition/decompose.py

**Inputs:**
- `analysis/brazil-data/out/{firms_daily_by_biome,firms_drift_by_biome,biome_lookup_0p1deg}.csv`
- `analysis/statistics/out/{regions_daily,regions_drift}.csv`
- `raw/firms_brazil/modis_YYYY_Brazil.csv`, used for the scan bins

**Outputs:**
- `out/units.csv`: per unit, L, Δt and Δg
- `out/coefficients.csv`: unit models M0–M4 and M2i
- `out/decomposition_aqua_amazon.csv`: the Aqua Amazon breakdown
- `out/bins.csv`: L per view-angle bin
- `out/bin_coefficients.csv`: bin models B1–B4

Findings are in `results.md`.
