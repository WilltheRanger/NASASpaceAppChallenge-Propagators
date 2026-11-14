# MOCK data for building the UI

**Everything in this folder is synthetic.** These are not real fire counts. The files exist so the app can be built before the real pipeline writes `data/out/`. Every file has `"mock": true`, and the UI must show a visible **MOCK** badge whenever it is reading mock data. Never put a mock number in a slide or screenshot.

Regenerate with `python3 data/mock/make_mock.py` (deterministic).

## Files (same layout the real pipeline will produce in `data/out/`)

| File | What it holds |
|---|---|
| `regions.json` | `regions[]`: `id`, `name`, `kind` (`biome`/`country`/`state`/`preset`), `bbox` `[west, south, east, north]`, `featured` (true for the hero region, the Amazon) |
| `calendar/<id>.json` | `months[]` from 2002-01 to 2026-10: `ym`; `fixed` (fixed-clock count, the number to color the calendar by) with `lo`/`hi` error range; raw `aqua`/`snpp`/`noaa20` (null before each satellite's data starts); `median_ref` (median of that calendar month); `anomaly_pct`; `flags` (`provisional` for 2026, `outage` for S-NPP July–Aug 2022) |
| `audit/<id>.json` | `baseline` (`years`, `ratio`, `noise_floor`) and `years[]` 2021–2025: `status` (`ok` or `insufficient_data`), `L` with `L_lo`/`L_hi`, `L_strat` (fire-size-adjusted), `aqua_count`, `fixed_count`, `gap_pct`. **California 2023 is deliberately `insufficient_data`**, so the empty state can be designed |
| `drift/<id>.json` | `years[]` 2012–2026: `aqua_lst`, `terra_lst`, `viirs_lst` as `"HH:MM"` local solar time |
| `proof_california.json` | `size_classes[]` and `years[]`: `year`, `size_class`, `aqua_pod`, `viirs_pod` (share of real recorded fires each satellite detected), `n` |
| `checks.json` | `checks[]`: `id` (the FINAL PLAN's pre-registered predictions **P1–P10**), `name`, `status` (`pass`/`pending`/`fail`), `detail`. Statuses here are placeholders |
| `twoclocks/<id>.json` | The "two clocks" test, per region. `years[]` 2012–2025, with fields: `aqua_lst`, `terra_lst` (look times); `A` (Aqua/VIIRS) and `T` (Terra/VIIRS), each vs. 2012–2020 so 1 = no change, with `_lo`/`_hi`; `clock_diff` = log A − log T (the clock effect with shared orbit sampling cancelled), with `clock_lo`/`clock_hi`; `sampling_est` (shared orbit-sampling effect, in log units) |
| `detection_limits_california.json` | California detection limits per satellite (`Aqua`, `Terra`, `S-NPP`): `rates_2012_2020[]` by size class (`n`, `detected`, `rate`, `ci95`), `a50_acres`/`a90_acres` (fire size each satellite catches 50%/90% of the time) with `_ci95`. The real file also has sensitivity-variant tables |
| `socal_seen_missed.json` | `center`, `radius_km`, and `fires[]`: `year`, `name`, `acres`, `lat`, `lon`, plus `aqua`/`terra`/`viirs` = whether that satellite detected the fire (null = no data). Mock fire names are "MOCK FIRE n" |

## UI notes
- **Calendar color:** `fixed`, or `anomaly_pct` with a diverging ramp. Hatch `provisional` cells and mark `outage` cells.
- **Audit:** plot `gap_pct` per year with the `L_lo`/`L_hi` range and a band for ±`noise_floor`. For `insufficient_data`, show "not enough fires to measure."
- **Missing values:** `null` means "no data" (satellite not flying yet), not zero.
