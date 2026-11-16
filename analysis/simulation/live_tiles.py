"""Worldwide live data for the response simulator: FIRMS global 7-day files cut into 10-degree tiles the site fetches.

Usage: python3 analysis/simulation/live_tiles.py OUT_DIR [PLACES_GEOJSON]
Inputs : FIRMS keyless global 7-day CSVs (MODIS C6.1, NOAA-20 and NOAA-21 VIIRS C2), fetched at run time;
         optional Natural Earth populated places (public domain) for illustrative bases
Outputs: OUT_DIR/index.json (tiles, counts, update time), OUT_DIR/tiles/<lat>_<lon>.json, OUT_DIR/places.json
Daytime detections only. Each row: [lat, lon, utc_date, utc_hhmm, satellite, frp]. S-NPP has been off since
2 November 2026, so VIIRS comes from NOAA-20 and NOAA-21.
"""
import sys, os, io, json, gzip, urllib.request
from datetime import datetime, timezone
import pandas as pd

out = sys.argv[1]
places_src = sys.argv[2] if len(sys.argv) > 2 else None
B = "https://firms.modaps.eosdis.nasa.gov/data/active_fire/"
FILES = {"modis-c6.1/csv/MODIS_C6_1_Global_7d.csv": None,
         "noaa-20-viirs-c2/csv/J1_VIIRS_C2_Global_7d.csv": "NOAA-20",
         "noaa-21-viirs-c2/csv/J2_VIIRS_C2_Global_7d.csv": "NOAA-21"}
MODIS = {"A": "Aqua", "T": "Terra"}
TILE = 10

def get(path):
    req = urllib.request.Request(B + path, headers={"User-Agent": "fire-response-sim"})
    with urllib.request.urlopen(req, timeout=120) as r:
        return pd.read_csv(io.BytesIO(r.read()), dtype={"satellite": str, "acq_time": int})

fr = []
for path, sat in FILES.items():
    d = get(path)
    d = d[d.daynight == "D"]
    d["sat"] = d.satellite.map(MODIS) if sat is None else sat
    fr.append(d[["latitude", "longitude", "acq_date", "acq_time", "sat", "frp"]])
d = pd.concat(fr, ignore_index=True).dropna()
d["ty"] = (d.latitude // TILE * TILE).astype(int)
d["tx"] = (d.longitude // TILE * TILE).astype(int)

os.makedirs(os.path.join(out, "tiles"), exist_ok=True)
index = []
for (ty, tx), g in d.groupby(["ty", "tx"]):
    rows = [[round(a, 4), round(o, 4), t, int(h), s, round(f, 1)]
            for a, o, t, h, s, f in zip(g.latitude, g.longitude, g.acq_date, g.acq_time, g.sat, g.frp)]
    name = f"{ty}_{tx}.json"
    with open(os.path.join(out, "tiles", name), "w") as f: json.dump(rows, f, separators=(",", ":"))
    index.append(dict(tile=name, south=int(ty), west=int(tx), n=len(rows), by_day=g.acq_date.value_counts().sort_index().to_dict()))

meta = dict(updated_utc=datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%MZ"), tile_deg=TILE,
            days=sorted(d.acq_date.unique().tolist()), satellites=sorted(d.sat.unique().tolist()),
            columns=["lat", "lon", "utc_date", "utc_hhmm", "satellite", "frp"],
            source="NASA FIRMS near-real-time global 7-day files (MODIS C6.1, VIIRS C2 NOAA-20 and NOAA-21), daytime only",
            tiles=index)
with open(os.path.join(out, "index.json"), "w") as f: json.dump(meta, f, separators=(",", ":"))

if places_src:
    gj = json.load(open(places_src, encoding="utf-8"))
    pl = [[p["properties"]["name"], round(p["geometry"]["coordinates"][1], 3), round(p["geometry"]["coordinates"][0], 3),
           int(p["properties"].get("pop_max") or 0)] for p in gj["features"]]
    with open(os.path.join(out, "places.json"), "w", encoding="utf-8") as f: json.dump(pl, f, separators=(",", ":"), ensure_ascii=False)

sizes = [os.path.getsize(os.path.join(out, "tiles", t["tile"])) for t in index]
print(f"{len(d):,} daytime detections, {len(index)} tiles, largest {max(sizes) / 1e6:.2f} MB, "
      f"median {sorted(sizes)[len(sizes) // 2] / 1e3:.0f} kB, total {sum(sizes) / 1e6:.1f} MB")
