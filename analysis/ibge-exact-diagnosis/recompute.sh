#!/usr/bin/env bash
set -euo pipefail
PYTHON=${PYTHON:-python3}
RAW=${1:?raw FIRMS dir}; OLD=${2:?historical IBGE archive}; MODERN=${3:?2019 IBGE archive}; INPE=${4:?INPE 2020 annual zip}
D=analysis/ibge-exact-diagnosis
mkdir -p "$D/out" "$D/historical" "$D/data/out" "$D/data/mock" "$D/statistics"
for VARIANT in out historical; do
  MAP=$MODERN; [ "$VARIANT" = historical ] && MAP=$OLD
  IBGE_ARCHIVE="$MAP" "$PYTHON" "$D/firms_exact.py" "$RAW" "$D/$VARIANT"
  cp analysis/brazil-data/out/inpe_daily_by_biome.csv "$D/$VARIANT/"
  "$PYTHON" analysis/brazil-data/scripts/inpe_reproduction.py "$D/$VARIANT"
done
cp -R data/out/. "$D/data/out/"
cp data/mock/regions.json "$D/data/mock/regions.json"
cp -R analysis/statistics/out/. "$D/statistics/"
"$PYTHON" analysis/brazil-data/scripts/make_json.py "$D/historical" "$D/data/out"
"$PYTHON" analysis/statistics/audit.py "$D/historical" "$D/data/out" "$D/statistics"
"$PYTHON" analysis/statistics/checks.py "$D/historical" "$D/statistics" "$D/data/out"
"$PYTHON" "$D/diagnose_labels.py" "$INPE" "$OLD" "$MODERN" "$D"
"$PYTHON" "$D/summarize.py"
"$PYTHON" analysis/brazil-data/scripts/validate_handoff.py --data "$D/data/out" --csv "$D/historical" > "$D/validation_summary.json"
IBGE_ARCHIVE="$OLD" "$PYTHON" -m unittest discover -s "$D/tests" -v
IBGE_ARCHIVE="$MODERN" "$PYTHON" -m unittest discover -s "$D/tests" -v
