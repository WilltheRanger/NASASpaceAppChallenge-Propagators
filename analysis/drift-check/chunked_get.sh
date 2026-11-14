#!/usr/bin/env bash
# Usage: chunked_get.sh URL OUTFILE  -- downloads in 4 MB ranged chunks with retry/backoff (FIRMS drops consecutive tunnels)
url="$1"; out="$2"; chunk=$((4*1024*1024))
total=$(curl -sS -m 60 -r 0-0 -D - -o /dev/null "$url" 2>/dev/null | tr -d '\r' | awk -F/ 'tolower($0) ~ /^content-range/ {print $2}')
for t in 1 2 3 4 5 6; do [ -n "$total" ] && break; sleep 6; total=$(curl -sS -m 60 -r 0-0 -D - -o /dev/null "$url" 2>/dev/null | tr -d '\r' | awk -F/ 'tolower($0) ~ /^content-range/ {print $2}'); done
[ -z "$total" ] && { echo "FAIL size $url"; exit 1; }
: > "$out.part"; start=0
while [ $start -lt $total ]; do
  end=$((start+chunk-1)); [ $end -ge $total ] && end=$((total-1))
  ok=0
  for t in 1 2 3 4 5 6 7 8; do
    if curl -sS -m 90 -r $start-$end -o chunk.tmp "$url" 2>/dev/null && [ $(stat -c %s chunk.tmp) -eq $((end-start+1)) ]; then cat chunk.tmp >> "$out.part"; ok=1; break; fi
    sleep $((t*4))
  done
  [ $ok -eq 0 ] && { echo "FAIL chunk $start $url"; exit 1; }
  start=$((end+1)); sleep 2
done
mv "$out.part" "$out"; rm -f chunk.tmp; echo "OK $out $total bytes"
