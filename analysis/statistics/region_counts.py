"""Daily FIRMS counts and look times for the non-Brazil presets, in the same format as the Brazil biome files (analysis/brazil-data).

Usage: python3 analysis/statistics/region_counts.py RAW_DIR analysis/statistics/out
Inputs : RAW_DIR/<Country>/{modis,viirs-snpp,viirs-jpss1}_YYYY_<Country>.csv  (FIRMS yearly country files,
         fetched with COUNTRY=<Country> bash analysis/brazil-data/scripts/get_firms_brazil.sh RAW_DIR/<Country>)
Outputs: OUT_DIR/regions_daily.csv  (date, biome, satellite, near_nadir, count, count_all, frp_sum)
         OUT_DIR/regions_drift.csv  (year, biome, satellite, n_near_nadir, lst_p25, lst_median, lst_p75, median_local_time)
Filters and near-nadir rule copied from analysis/brazil-data/scripts/firms_daily_counts.py; `biome` holds the region key.
"""
import sys, glob, os
from multiprocessing import Pool
import numpy as np, pandas as pd

raw, out_dir = sys.argv[1], sys.argv[2]
SAT = {"Aqua": "Aqua", "Terra": "Terra", "N": "S-NPP", "N20": "NOAA-20", "1": "NOAA-20", "N21": "NOAA-21"}
# simplified California outline (lon, lat); coastline vertices sit offshore, where there are no land fires
CA = np.array([(-124.6, 42.0), (-120.0, 42.0), (-120.0, 39.0), (-114.63, 35.0), (-114.13, 34.27), (-114.72, 32.72),
               (-117.12, 32.53), (-118.6, 33.2), (-121.0, 34.4), (-124.6, 40.2)])
REGIONS = {"Argentina": ("argentina", None),
           "India": ("punjab_haryana", (73.8, 27.6, 77.6, 32.6)),  # preset bbox from data/mock/regions.json
           "United_States": ("california", CA)}

def inside(lon, lat, poly):
    # even-odd ray casting
    x, y, r = poly[:, 0], poly[:, 1], np.zeros(len(lon), bool)
    for i in range(len(poly)):
        x1, y1, x2, y2 = x[i - 1], y[i - 1], x[i], y[i]
        cross = ((y1 > lat) != (y2 > lat)) & (lon < (x2 - x1) * (lat - y1) / np.where(y2 != y1, y2 - y1, 1) + x1)
        r ^= cross
    return r

def one(args):
    f, country = args
    key, shape = REGIONS[country]
    viirs = "viirs" in os.path.basename(f)
    d = pd.read_csv(f, usecols=["latitude", "longitude", "scan", "track", "acq_date", "acq_time",
                                "satellite", "confidence", "frp", "daynight", "type"],
                    dtype={"satellite": str, "confidence": str})
    d = d[d.daynight == "D"]
    if isinstance(shape, tuple):
        w, s, e, n = shape
        d = d[(d.longitude >= w) & (d.longitude <= e) & (d.latitude >= s) & (d.latitude <= n)]
    elif shape is not None:
        d = d[inside(d.longitude.values, d.latitude.values, shape)]
    d = d.assign(satellite=d.satellite.map(SAT), biome=key)
    if viirs:
        ok = (d.type == 0) & d.confidence.isin(["n", "h"])
        d["near_nadir"] = (d.track <= 0.40).astype(int)
    else:
        ok = (d.type == 0) & (pd.to_numeric(d.confidence, errors="coerce") >= 30)
        d["near_nadir"] = (d.scan <= 1.3).astype(int)
    d["ok"] = ok.astype(int)
    d["frp_ok"] = d.frp.where(ok, 0.0)
    g = d.groupby(["acq_date", "biome", "satellite", "near_nadir"]).agg(
        count=("ok", "sum"), count_all=("ok", "size"), frp_sum=("frp_ok", "sum")).reset_index()
    n = d[ok & (d.near_nadir == 1)].copy()
    n["lst"] = ((n.acq_time // 100) + (n.acq_time % 100) / 60.0 + n.longitude / 15.0) % 24
    n["year"] = n.acq_date.str[:4].astype(int)
    return g, n[["year", "biome", "satellite", "lst"]]

if __name__ == "__main__":
    jobs = [(f, c) for c in REGIONS for f in sorted(glob.glob(os.path.join(raw, c, f"*_{c}.csv")))]
    with Pool(4) as p:
        res = p.map(one, jobs, chunksize=1)
    daily = pd.concat([r[0] for r in res]).rename(columns={"acq_date": "date"})
    daily["frp_sum"] = daily.frp_sum.round(1)
    daily.sort_values(["date", "biome", "satellite", "near_nadir"]).to_csv(
        os.path.join(out_dir, "regions_daily.csv"), index=False)
    lst = pd.concat([r[1] for r in res])
    q = lst.groupby(["year", "biome", "satellite"]).lst.agg(
        n_near_nadir="size", lst_p25=lambda s: s.quantile(.25), lst_median="median",
        lst_p75=lambda s: s.quantile(.75)).reset_index()
    q["median_local_time"] = q.lst_median.apply(lambda x: f"{int(round(x * 60)) // 60:02d}:{int(round(x * 60)) % 60:02d}")
    for c in ["lst_p25", "lst_median", "lst_p75"]: q[c] = q[c].round(3)
    q.to_csv(os.path.join(out_dir, "regions_drift.csv"), index=False)
    print("files:", len(jobs), "daily rows:", len(daily))
    print(daily.groupby(["biome", "satellite"])["count"].sum().unstack().to_string())
