"""Daily FIRMS fire counts per Brazil biome and satellite, plus yearly look-time (drift).

Usage: python3 firms_daily_counts.py FIRMS_DIR OUT_DIR
Inputs : FIRMS_DIR/{modis,viirs-snpp,viirs-jpss1}_YYYY_Brazil.csv  (NASA FIRMS yearly country files)
         OUT_DIR/biome_lookup_0p1deg.csv                          (from build_biome_lookup.py)
Outputs: OUT_DIR/firms_daily_by_biome.csv
           date (UTC acq_date), biome, satellite (Aqua|Terra|S-NPP|NOAA-20), near_nadir (0|1),
           count      = daytime vegetation fires passing the plan's filters,
           count_all  = every daytime detection (no type / confidence filter),
           frp_sum    = summed fire radiative power (MW) of the filtered detections
         OUT_DIR/firms_drift_by_biome.csv
           year, biome, satellite, n_near_nadir, lst_p25, lst_median, lst_p75, median_local_time

Filters (execution plan 4.A): daytime; type == 0; MODIS confidence >= 30; VIIRS confidence n or h.
near_nadir: MODIS scan <= 1.3 km (as in analysis/drift-check/drift_check.py);
            VIIRS track <= 0.40 km (VIIRS scan size is not monotonic with view angle; track is).
Local solar time = UTC + longitude / 15.
"""
import sys, glob, os
from multiprocessing import Pool
import numpy as np, pandas as pd

firms_dir, out_dir = sys.argv[1], sys.argv[2]
SAT = {"Aqua": "Aqua", "Terra": "Terra", "N": "S-NPP", "N20": "NOAA-20", "1": "NOAA-20", "N21": "NOAA-21"}
lk = pd.read_csv(os.path.join(out_dir, "biome_lookup_0p1deg.csv"), usecols=["cell_lat", "cell_lon", "biome"])

def one(f):
    viirs = "viirs" in os.path.basename(f)
    d = pd.read_csv(f, usecols=["latitude", "longitude", "scan", "track", "acq_date", "acq_time",
                                "satellite", "confidence", "frp", "daynight", "type"],
                    dtype={"satellite": str, "confidence": str})
    d = d[d.daynight == "D"]
    d["satellite"] = d.satellite.map(SAT)
    d["cell_lat"] = np.floor(d.latitude * 10).astype(int)
    d["cell_lon"] = np.floor(d.longitude * 10).astype(int)
    d = d.merge(lk, on=["cell_lat", "cell_lon"], how="left")
    d["biome"] = d.biome.fillna("unassigned")
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
    # look time: near-nadir, filtered
    n = d[ok & (d.near_nadir == 1)].copy()
    n["lst"] = ((n.acq_time // 100) + (n.acq_time % 100) / 60.0 + n.longitude / 15.0) % 24
    n["year"] = n.acq_date.str[:4].astype(int)
    lst = n[["year", "biome", "satellite", "lst"]]
    allb = lst.assign(biome="brazil")
    return g, pd.concat([lst, allb])

if __name__ == "__main__":
    files = sorted(glob.glob(os.path.join(firms_dir, "*_Brazil.csv")))
    with Pool(3) as p:
        res = p.map(one, files, chunksize=1)
    daily = pd.concat([r[0] for r in res]).rename(columns={"acq_date": "date"})
    daily["frp_sum"] = daily.frp_sum.round(1)
    daily = daily.sort_values(["date", "biome", "satellite", "near_nadir"])
    daily.to_csv(os.path.join(out_dir, "firms_daily_by_biome.csv"), index=False)
    lst = pd.concat([r[1] for r in res])
    q = lst.groupby(["year", "biome", "satellite"]).lst.agg(
        n_near_nadir="size", lst_p25=lambda s: s.quantile(.25), lst_median="median",
        lst_p75=lambda s: s.quantile(.75)).reset_index()
    def hhmm(x):
        h = int(x); m = int(round((x - h) * 60))
        if m == 60: h, m = h + 1, 0
        return f"{h:02d}:{m:02d}"
    q["median_local_time"] = q.lst_median.apply(hhmm)
    for c in ["lst_p25", "lst_median", "lst_p75"]: q[c] = q[c].round(3)
    q.to_csv(os.path.join(out_dir, "firms_drift_by_biome.csv"), index=False)
    print("files:", len(files), "daily rows:", len(daily))
    tot = daily.groupby("biome").count_all.sum()
    print((tot / tot.sum()).round(4).to_string())
