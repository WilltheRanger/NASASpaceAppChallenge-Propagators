#!/usr/bin/env bash
set -euo pipefail
PYTHON=${PYTHON:-python3}
D=analysis/check-methodology-fixes
mkdir -p "$D/data/mock" "$D/data/out" "$D/statistics"
cp -R analysis/ibge-exact-diagnosis/data/out/. "$D/data/out/"
cp -R analysis/ibge-exact-diagnosis/statistics/. "$D/statistics/"
cp data/mock/regions.json "$D/data/mock/regions.json"
"$PYTHON" "$D/audit.py" analysis/ibge-exact-diagnosis/historical "$D/data/out" "$D/statistics"
"$PYTHON" "$D/checks.py" analysis/ibge-exact-diagnosis/historical "$D/statistics" "$D/data/out"
"$PYTHON" "$D/diagnose.py"
"$PYTHON" -m unittest discover -s "$D/tests" -v
"$PYTHON" analysis/brazil-data/scripts/validate_handoff.py --data "$D/data/out" --csv analysis/ibge-exact-diagnosis/historical > "$D/validation_summary.json"
