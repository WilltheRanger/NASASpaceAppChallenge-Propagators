#!/usr/bin/env bash
# Download Anchor's reference ("ground truth") data and NASA FIRMS files.
# Usage: bash get_reference_data.sh [OUT_DIR]        (default: data/raw)
# Raw data stays out of git; see README.md in this folder for sizes and caveats.
set -euo pipefail
OUT="${1:-data/raw}"
HERE="$(cd "$(dirname "$0")" && pwd)"
CHUNKED="$HERE/../drift-check/chunked_get.sh"   # FIRMS drops long downloads; fetch in 4 MB ranges
mkdir -p "$OUT/fpa_fod" "$OUT/wfigs" "$OUT/cnfdb" "$OUT/firms"

echo "1/4 FPA-FOD 7th edition (USFS RDS-2013-0009.7): 1992-2024, 2.66M US wildfires, GeoPackage ~227 MB"
curl -L --retry 3 -o "$OUT/fpa_fod/RDS-2013-0009.7_GPKG.zip" \
  "https://www.fs.usda.gov/rds/archive/products/RDS-2013-0009.7/RDS-2013-0009.7_Data_Format3_GPKG.zip"
unzip -o -q "$OUT/fpa_fod/RDS-2013-0009.7_GPKG.zip" -d "$OUT/fpa_fod"   # -> Data/FPA_FOD_20260615.gpkg

echo "2/4 NIFC WFIGS 2025-26 wildfires (WF) + prescribed burns (RX)"
python3 "$HERE/get_wfigs.py" "$OUT/wfigs/wfigs_2025_2026.csv" --since 2025-01-01 --types WF,RX

echo "3/4 Canada CNFDB fire points, all sizes (transfer test), ~24 MB"
curl -L --retry 3 -o "$OUT/cnfdb/NFDB_point_txt.zip" \
  "https://cwfis.cfs.nrcan.gc.ca/downloads/nfdb/fire_pnt/current_version/NFDB_point_txt.zip"

echo "4/4 NASA FIRMS yearly US files (MODIS 2001-2024, S-NPP 2012-2024, NOAA-20 2018-2024)"
echo "    NOAA-21 has no yearly country file: use the FIRMS API (VIIRS_NOAA21_SP) or an archive request."
BASE="https://firms.modaps.eosdis.nasa.gov/data/country"
for y in $(seq 2001 2024); do
  bash "$CHUNKED" "$BASE/modis/$y/modis_${y}_United_States.csv" "$OUT/firms/modis_${y}_United_States.csv" || echo "retry later: modis $y"
done
for y in $(seq 2012 2024); do
  bash "$CHUNKED" "$BASE/viirs-snpp/$y/viirs-snpp_${y}_United_States.csv" "$OUT/firms/viirs-snpp_${y}_United_States.csv" || echo "retry later: snpp $y"
done
for y in $(seq 2018 2024); do
  bash "$CHUNKED" "$BASE/viirs-jpss1/$y/viirs-jpss1_${y}_United_States.csv" "$OUT/firms/viirs-jpss1_${y}_United_States.csv" || echo "retry later: noaa20 $y"
done
echo "done"
