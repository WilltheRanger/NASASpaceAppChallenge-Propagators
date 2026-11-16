# Independent IBGE biome-boundary rerun

This branch-only sensitivity run completes the requested IBGE-derived 0.1° lookup without overwriting the team's integration data. It is **not merged** into the production app.

## Source and assignment

Official [IBGE 2019 1:250,000 biome polygons](https://geoftp.ibge.gov.br/informacoes_ambientais/estudos_ambientais/biomas/vetores/Biomas_250mil.zip), downloaded from IBGE. Archive SHA-256 and CRS are in `out/ibge_lookup_provenance.json`. The source uses SIRGAS 2000 (EPSG:4674), transformed to WGS84 (EPSG:4326).

Each 0.1° cell is assigned using its **center point** in the polygon map. This is a grid approximation, not exact classification of every fire coordinate. Boundary and coastal cells can contain detections from both sides. No nearest-neighbor filling is used. Centers outside all six polygons are left unassigned by the downstream aggregator. This is independent of INPE fire labels, unlike the original lookup.

The INPE reference counts remain the original independently supplied INPE labels. They are deliberately not reclassified to force agreement. FIRMS raw country files are reacquired directly from NASA, outside the repository. All other count filters/statistics remain unchanged from integration commit `9bb73c4`. No later simulator/statistics work is merged.

## Reproduce

Install `requirements.txt` in an isolated Python environment. From the repository root:

```
python analysis/ibge-validation/download_firms.py /path/outside/repo/firms
PYTHON=python bash analysis/ibge-validation/recompute.sh /path/outside/repo/firms /path/to/Biomas_250mil.zip
python analysis/ibge-validation/compare.py
python analysis/brazil-data/scripts/validate_handoff.py --data analysis/ibge-validation/data/out --csv analysis/ibge-validation/out
python -m unittest discover -s analysis/ibge-validation/tests -v
```

Raw files must not be committed. The downloader uses curl's resumable transfers and completion markers. `compare.py` checks every day/satellite/near-nadir total is conserved exactly against the original inputs, preventing a changed download from being mistaken for a boundary-only effect.

## Outputs

- `out/biome_lookup_0p1deg.csv`: independent IBGE-derived lookup.
- `out/lookup_comparison.csv`: label changes versus the prior INPE-derived grid.
- `out/firms_*`, `out/inpe_reproduction_*`: full Brazil aggregate rerun and unchanged INPE reference comparison.
- `statistics/`: recalculated derived tables, including non-Brazil presets using existing committed regional aggregates.
- `data/out/`: six-preset app contract, marked as an isolated validation variant.
- `out/biome_count_comparison.csv`, `out/audit_comparison.csv`, `out/check_comparison.json`: effects on counts and conclusions.

P3 is aggregate count agreement, not a fire-event matching rate. Neither a passing P3 nor a changed audit number establishes causation. P3 remains non-preregistered. No silent change to the team's approved data or scientific framing is intended.

## Verified result (2026-11-15 UTC)

All 47 raw country files downloaded and the entire aggregation → INPE reproduction → calendar/audit/two-clocks → P1–P10 scoring pipeline completed. Every per-day/satellite/near-nadir count and filtered count matches the original country totals exactly; only biome allocation changed. Five lookup tests pass. All six preset file families and calendar structures validate (288 months, 282 non-null fixed estimates each).

**P3 does not pass with this independent lookup:** 516/648 baseline biome-months are within 10% of the INPE labels (**79.63%**, versus 96.60% originally; threshold 90%). The validator deliberately exits 2 while printing its full report to signal this scientific gate failure, not a malformed JSON error. Per-biome rates: Amazon 97.22%, Cerrado 87.04%, Caatinga 43.52%, Mata Atlântica 83.33%, Pampa 88.89%, Pantanal 77.78%. Filtered-count overall agreement is 69.75%.

The Amazon 2025 audit ratio is almost unchanged: 1.29480 originally, 1.29510 with IBGE (95% interval 1.13760–1.50440). P3 changes from pass to fail; other P1–P10 status labels do not change, although supporting fractions do (P9 4/6 → 2/6; P10 14/23 → 13/23). This does **not** validate causal attribution or the failed two-clock tests.

The independent grid contains 71,049 cells: 67,026 agree with the original; 3,272 shared cells change biome; 751 exist only in the IBGE grid; 5,640 prior filled cells are absent. Across all satellites/years, 81,704 detections become unassigned versus 119 previously (about 0.29% of all counts). This may reflect coast/boundary discretization as well as differences between official polygon and INPE label definitions. The rerun does not separate those effects; exact-coordinate polygon classification would be a further sensitivity test.

**Decision for team review, not an automatic merge:** do not keep the old 96.6% reproduction claim while calling the lookup IBGE-derived. Either retain the original INPE-label method with that method clearly disclosed, or adopt this independent IBGE variant and disclose its failed cross-biome agreement gate. Nothing here changes the live app, submission, or teammates' active branches.
