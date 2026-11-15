"""Gate 1 drift chart (P1, P2): median local solar time of fire detections, per region, satellite and year.

Same method as analysis/drift-check/drift_check.py (file 10 sec 4.1-4.2), extended to:
  - Brazil biomes (Amazon, Cerrado, Pantanal) via a 0.1 deg cell -> IBGE biome lookup (D21);
  - Punjab + Haryana via the preset bbox in data/mock/regions.json;
  - VIIRS S-NPP as the fixed-clock reference.
Filters: daytime (daynight == D); vegetation fires (type == 0); MODIS confidence >= 30; VIIRS confidence n/h;
near-nadir scan <= 1.3 (applies to MODIS; every VIIRS 375 m pixel is < 1.3 km so VIIRS keeps all pixels).
Local solar time = UTC acq_time + longitude / 15.
AI-written (Claude, Nov 14 2026). Every output must be checked by a team member before use.

Usage: python3 drift_regions.py RAW_DIR IBGE_SHP OUT_DIR [--dry-run] [--punjab-only]
Note: brady/brazil-data has the Brazil biome drift (INPE-label lookup); use --punjab-only to avoid a second Brazil version.
RAW_DIR holds modis_YYYY_{Brazil,India}.csv and viirs-snpp_YYYY_{Brazil,India}.csv (FIRMS yearly country files).
"""
import sys, os, glob, json, datetime, subprocess
import numpy as np
import pandas as pd

RAW, SHP, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
DRY = "--dry-run" in sys.argv
COUNTRIES = ["India"] if "--punjab-only" in sys.argv else ["Brazil", "India"]
YEARS = range(2012, 2026)
CELL = 0.1
BIOMES = {"br-amazon": "Amazônia", "br-cerrado": "Cerrado", "br-pantanal": "Pantanal"}
PUNJAB_BBOX = (73.8, 27.6, 77.6, 32.6)  # [west, south, east, north], data/mock/regions.json

def biome_lookup(shp):
    import geopandas as gpd
    from shapely.geometry import Point
    b = gpd.read_file(shp).to_crs("EPSG:4326")
    w, s, e, n = b.total_bounds
    xs = np.arange(np.floor(w / CELL) * CELL, e, CELL) + CELL / 2
    ys = np.arange(np.floor(s / CELL) * CELL, n, CELL) + CELL / 2
    gx, gy = np.meshgrid(xs, ys)
    pts = gpd.GeoDataFrame(geometry=gpd.points_from_xy(gx.ravel(), gy.ravel()), crs="EPSG:4326")
    j = gpd.sjoin(pts, b[["Bioma", "geometry"]], predicate="within", how="inner")
    key = (np.floor(j.geometry.x / CELL).astype(int).astype(str) + "_" + np.floor(j.geometry.y / CELL).astype(int).astype(str))
    return dict(zip(key, j.Bioma))

def cell_key(df):
    return np.floor(df.longitude / CELL).astype(int).astype(str) + "_" + np.floor(df.latitude / CELL).astype(int).astype(str)

def load(path, sensor):
    cols = ["latitude", "longitude", "acq_time", "satellite", "daynight", "type", "scan", "confidence"]
    df = pd.read_csv(path, usecols=cols, low_memory=False)
    df = df[(df.daynight == "D") & (df.type == 0)]
    if sensor == "modis":
        df = df[pd.to_numeric(df.confidence, errors="coerce") >= 30]
    else:
        df = df[df.confidence.astype(str).isin(["n", "h", "nominal", "high"])]
        df = df.assign(satellite="VIIRS_SNPP")
    df = df[df.scan <= 1.3]
    t = (df.acq_time // 100) + (df.acq_time % 100) / 60.0
    return df.assign(lst=(t + df.longitude / 15.0) % 24)

def hhmm(x):
    if x is None or not np.isfinite(x):
        return None
    h = int(x); m = int(round((x - h) * 60))
    if m == 60: h, m = h + 1, 0
    return f"{h:02d}:{m:02d}"

lut = biome_lookup(SHP) if "Brazil" in COUNTRIES else {}
rows = []
for y in YEARS:
    for country in COUNTRIES:
        for sensor, pat in [("modis", f"modis_{y}_{country}.csv"), ("viirs", f"viirs-snpp_{y}_{country}.csv")]:
            p = os.path.join(RAW, pat)
            if not os.path.exists(p):
                continue
            df = load(p, sensor)
            if DRY:
                print("dry-run ok", pat, "columns", list(df.columns)); continue
            if country == "Brazil":
                df = df.assign(region=cell_key(df).map(lut))
                inv = {v: k for k, v in BIOMES.items()}
                df = df[df.region.isin(inv)].assign(region=lambda d: d.region.map(inv))
            else:
                w, s, e, n = PUNJAB_BBOX
                df = df[df.longitude.between(w, e) & df.latitude.between(s, n)].assign(region="in-punjab-haryana")
            for (reg, sat), g in df.groupby(["region", "satellite"]):
                q = np.percentile(g.lst, [25, 50, 75])
                rows.append(dict(region=reg, year=y, satellite=sat, n=len(g), p25=q[0], median=q[1], p75=q[2]))
    if DRY: break
if DRY:
    sys.exit(0)

res = pd.DataFrame(rows)
os.makedirs(os.path.join(OUT, "drift"), exist_ok=True)
res.to_csv(os.path.join(OUT, "drift", ("punjab_drift_long.csv" if COUNTRIES == ["India"] else "drift_regions_long.csv")), index=False)
try:
    commit = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=os.path.dirname(os.path.abspath(__file__))).decode().strip()
except Exception:
    commit = None
for reg in res.region.unique():
    r = res[res.region == reg]
    years = []
    for y in YEARS:
        def get(sat):
            v = r[(r.year == y) & (r.satellite == sat)]
            return (hhmm(float(v["median"].iloc[0])), int(v.n.iloc[0])) if len(v) else (None, 0)
        a, t, v = get("Aqua"), get("Terra"), get("VIIRS_SNPP")
        years.append(dict(year=y, aqua_lst=a[0], terra_lst=t[0], viirs_lst=v[0], n_aqua=a[1], n_terra=t[1], n_viirs=v[1]))
    out = dict(mock=False, region=reg, generated=datetime.datetime.utcnow().isoformat() + "Z",
               script="analysis/drift-regions/drift_regions.py", commit=commit,
               method="median local solar time, daytime type==0, MODIS conf>=30, VIIRS n/h, scan<=1.3",
               years=years)
    with open(os.path.join(OUT, "drift", f"{reg}.json"), "w") as f:
        json.dump(out, f, indent=1, ensure_ascii=False)
print("wrote", sorted(res.region.unique()))
