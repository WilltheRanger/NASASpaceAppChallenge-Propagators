#!/usr/bin/env bash
# Runs every Python test suite in the repo, one directory at a time (several suites reuse module names such as
# test_outputs.py, so a single pytest run would collide). Exits non-zero if any suite fails.
# Usage: scripts/test_all.sh [python]   (default: .venv/bin/python if present, else python3)
set -u
cd "$(dirname "$0")/.."
PY=${1:-$( [ -x .venv/bin/python ] && echo .venv/bin/python || echo python3 )}
fail=0
for d in tests analysis/*/; do
  d=${d%/}
  ls "$d" 2>/dev/null | grep -qE '^(test_.*\.py|tests)$' || continue
  out=$("$PY" -m pytest -q -p no:cacheprovider "$d" 2>&1); rc=$?
  # rc 5 = no tests collected (e.g. all skipped at collection): not a failure
  if [ $rc -ne 0 ] && [ $rc -ne 5 ]; then fail=1; echo "FAIL $d"; echo "$out" | tail -20; else echo "ok   $d  $(echo "$out" | tail -1)"; fi
done
exit $fail
