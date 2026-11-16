#!/usr/bin/env bash
# Run from repository root. Raw inputs stay outside the repository.
set -euo pipefail
PYTHON=${PYTHON:-python3}
FIRMS=${1:?path to complete NASA FIRMS Brazil country files}
IBGE=${2:?path to official Biomas_250mil.zip}
OUT=analysis/ibge-validation/out
JSON=analysis/ibge-validation/data/out
STATS=analysis/ibge-validation/statistics
"$PYTHON" - "$FIRMS" <<'PY'
import pathlib,sys
p=pathlib.Path(sys.argv[1]);expected=[f'{s}_{y}_Brazil.csv' for s,start in [('modis',2001),('viirs-snpp',2012),('viirs-jpss1',2018)] for y in range(start,2026)]
missing=[s for s in expected if not (p/s).is_file() or (p/s).stat().st_size==0]
assert not missing, missing
PY
mkdir -p "$OUT" "$JSON" "$STATS"
"$PYTHON" analysis/brazil-data/scripts/build_ibge_lookup.py "$IBGE" "$OUT"
cp analysis/brazil-data/out/inpe_daily_by_biome.csv "$OUT/"
"$PYTHON" analysis/brazil-data/scripts/firms_daily_counts.py "$FIRMS" "$OUT"
"$PYTHON" analysis/brazil-data/scripts/inpe_reproduction.py "$OUT"
# Seed unchanged non-Brazil/P2/P8 inputs and metadata. Brazil data are rebuilt below.
cp -R data/out/. "$JSON/"
mkdir -p analysis/ibge-validation/data/mock
cp data/mock/regions.json analysis/ibge-validation/data/mock/regions.json
cp -R analysis/statistics/out/. "$STATS/"
"$PYTHON" analysis/brazil-data/scripts/make_json.py "$OUT" "$JSON"
"$PYTHON" analysis/statistics/audit.py "$OUT" "$JSON" "$STATS"
"$PYTHON" analysis/statistics/checks.py "$OUT" "$STATS" "$JSON"
