# regime-test

Falsification test: does the Amazon Aqua excess (L = 1.10 in 2024, 1.30 in 2025) split by fire regime the way a
fire diurnal-cycle explanation predicts (Giglio 2007: deforestation peaks ~15.6 h LST, rainforest ~13.9 h)?

Run: `.venv/bin/python analysis/regime-test/regime_test.py /Users/himatthew/spaceapps/raw/firms_brazil analysis/brazil-data/out/biome_lookup_0p1deg.csv analysis/regime-test [CACHE_DIR]`
(~35 s; CACHE_DIR holds a parquet cache of Amazon daytime detections, defaults to the output dir.)

Strata, both fixed from 2012-2020 data only, before any 2021-2025 numbers were looked at:
1. Diurnal index: each 0.5 deg Amazon cell with >= 200 Aqua+Terra daytime detections 2012-2020 gets A/T = Aqua/Terra
   count (days both up). High A/T means a steeper climb from 10:30 to 13:30, i.e. later-peaking. Terciles weighted by
   2012-2020 Aqua detections. Cells under the threshold form 'sparse'.
2. Geography: arc of deforestation = latitude < -5 or longitude > -48 (Rondonia, Acre, N Mato Grosso, S Para,
   S Amazonas, Maranhao, E Para); interior = rest (N Amazonas, Roraima, Amapa, N/W Para).

L uses each stratum's own 2012-2020 monthly sat/S-NPP ratio. Outputs: regime_L.csv, regime_reference.csv, results.md.
Result: the strata do not separate in the predicted direction and there is no dose-response (see results.md).
