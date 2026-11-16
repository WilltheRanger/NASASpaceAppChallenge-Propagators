#!/usr/bin/env bash
# Download NASA FIRMS yearly country files for Brazil (MODIS, S-NPP, NOAA-20).
# Resumable: run again until it prints "all complete".
# Usage: bash get_firms_brazil.sh [OUT_DIR] [MAX_SECONDS_PER_FILE]
OUT="${1:-firms}"; MAXT="${2:-150}"; COUNTRY="${COUNTRY:-Brazil}"
B="https://firms.modaps.eosdis.nasa.gov/data/country"
mkdir -p "$OUT"; cd "$OUT"
list() {
  for y in $(seq 2001 2025); do echo "modis/$y/modis_${y}_${COUNTRY}.csv"; done
  for y in $(seq 2012 2025); do echo "viirs-snpp/$y/viirs-snpp_${y}_${COUNTRY}.csv"; done
  for y in $(seq 2018 2025); do echo "viirs-jpss1/$y/viirs-jpss1_${y}_${COUNTRY}.csv"; done
}
todo=()
for u in $(list); do f=$(basename "$u"); [ -f "$f.done" ] || todo+=("$u"); done
[ ${#todo[@]} -eq 0 ] && { echo "all complete"; exit 0; }
printf '%s\n' "${todo[@]}" | xargs -P 8 -I{} bash -c '
  u="{}"; f=$(basename "$u")
  curl -sS -f -m '"$MAXT"' -C - -o "$f" "'"$B"'/$u" 2>/dev/null
  want=$(curl -sS -m 20 -I "'"$B"'/$u" | tr -d "\r" | awk "tolower(\$1)==\"content-length:\"{print \$2}")
  have=$(stat -c %s "$f" 2>/dev/null || stat -f %z "$f" 2>/dev/null || echo 0)
  [ -n "$want" ] && [ "$want" = "$have" ] && touch "$f.done"
'
echo "done markers: $(ls *.done 2>/dev/null | wc -l) / $(list | wc -l)"
