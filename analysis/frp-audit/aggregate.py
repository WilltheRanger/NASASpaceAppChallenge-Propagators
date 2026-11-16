"""Stage 1: reduce raw FIRMS Brazil files to daily per-biome aggregates and FRP histograms.

Usage: python aggregate.py [FIRMS_DIR]   (default /Users/himatthew/spaceapps/raw/firms_brazil)
Inputs : FIRMS_DIR/modis_YYYY_Brazil.csv, viirs-snpp_YYYY_Brazil.csv (2012-2025)
         ../brazil-data/out/biome_lookup_0p1deg.csv
Outputs (this folder):
  daily.csv   date, biome (amazon|cerrado), satellite (Aqua|Terra|S-NPP), n, frp,
              n_ge{T}, frp_ge{T}           detections with per-pixel FRP >= T MW (all view angles)
              nn_n, nn_frp, nn_n_ge{T}, nn_frp_ge{T}   same, near-nadir only
                (MODIS scan <= 1.3 km; S-NPP track <= 0.40 km)
  up.csv      date, satellite, brazil_day_detections  (a satellite is "up" on a day with >= 1
              daytime detection anywhere in Brazil)
  hist.csv    satellite, biome, period (base 2012-2020 | 2021..2025), pix_bin, frp_bin, n
              per-detection FRP histogram (log bins) by pixel-size bin (MODIS scan, VIIRS track)
All daytime detections (daynight == 'D'), no type/confidence filter (same as the team's count_all).
"""
import sys, os, glob
from multiprocessing import Pool
import numpy as np, pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
FIRMS = sys.argv[1] if len(sys.argv) > 1 else "/Users/himatthew/spaceapps/raw/firms_brazil"
LOOKUP = os.path.join(HERE, "..", "brazil-data", "out", "biome_lookup_0p1deg.csv")
THR = [5, 10, 15, 20, 25, 30, 40, 50, 60, 80, 100]
SAT = {"Aqua": "Aqua", "Terra": "Terra", "N": "S-NPP"}
FRP_EDGES = np.r_[0, 10 ** np.linspace(-1, 4, 101), np.inf]           # 0.1 MW .. 10 GW, 20 bins/decade
MODIS_PIX = np.array([1.0, 1.1, 1.3, 1.6, 2.0, 2.6, 3.4, 5.0])         # scan (km) bin edges
VIIRS_PIX = np.array([0.30, 0.40, 0.50, 0.60, 0.90])                   # track (km) bin edges

lk = pd.read_csv(LOOKUP, usecols=["cell_lat", "cell_lon", "biome"])


def one(f):
    viirs = "viirs" in os.path.basename(f)
    d = pd.read_csv(f, usecols=["latitude", "longitude", "scan", "track", "acq_date", "satellite",
                                "frp", "daynight"], dtype={"satellite": str})
    d = d[d.daynight == "D"].drop(columns="daynight")
    d["satellite"] = d.satellite.map(SAT)
    d = d[d.satellite.notna()]
    up = d.groupby(["acq_date", "satellite"]).size().rename("brazil_day_detections").reset_index()
    d["cell_lat"] = np.floor(d.latitude * 10).astype(int)
    d["cell_lon"] = np.floor(d.longitude * 10).astype(int)
    d = d.merge(lk, on=["cell_lat", "cell_lon"], how="left")
    d = d[d.biome.isin(["amazon", "cerrado"])].copy()
    d["nn"] = (d.track <= 0.40) if viirs else (d.scan <= 1.3)
    cols = {"n": np.ones(len(d)), "frp": d.frp.values}
    for T in THR:
        m = (d.frp >= T).values
        cols[f"n_ge{T}"] = m * 1.0
        cols[f"frp_ge{T}"] = np.where(m, d.frp.values, 0.0)
    nn = d.nn.values
    for k in list(cols):
        cols["nn_" + k] = np.where(nn, cols[k], 0.0)
    a = pd.DataFrame(cols, index=d.index)
    a["date"], a["biome"], a["satellite"] = d.acq_date.values, d.biome.values, d.satellite.values
    daily = a.groupby(["date", "biome", "satellite"]).sum().reset_index()
    # histograms
    pix = d.track.values if viirs else d.scan.values
    pe = VIIRS_PIX if viirs else MODIS_PIX
    d["pix_bin"] = np.clip(np.searchsorted(pe, pix, side="right") - 1, 0, len(pe) - 2)
    d["frp_bin"] = np.searchsorted(FRP_EDGES, d.frp.values, side="right") - 1
    yr = d.acq_date.str[:4].astype(int)
    d["period"] = np.where(yr <= 2020, "base", yr.astype(str))
    hist = d.groupby(["satellite", "biome", "period", "pix_bin", "frp_bin"]).size().rename("n").reset_index()
    print("done", os.path.basename(f), len(d), flush=True)
    return daily, up, hist


if __name__ == "__main__":
    files = [f for y in range(2012, 2026) for f in
             (os.path.join(FIRMS, f"modis_{y}_Brazil.csv"), os.path.join(FIRMS, f"viirs-snpp_{y}_Brazil.csv"))]
    files = sorted(files, key=os.path.getsize, reverse=True)
    with Pool(5) as p:
        res = p.map(one, files, chunksize=1)
    daily = pd.concat([r[0] for r in res]).groupby(["date", "biome", "satellite"]).sum().reset_index()
    daily.round(2).sort_values(["date", "biome", "satellite"]).to_csv(os.path.join(HERE, "daily.csv.gz"), index=False)
    up = pd.concat([r[1] for r in res]).rename(columns={"acq_date": "date"})
    up = up.groupby(["date", "satellite"]).sum().reset_index()
    up.sort_values(["date", "satellite"]).to_csv(os.path.join(HERE, "up.csv"), index=False)
    hist = pd.concat([r[2] for r in res]).groupby(["satellite", "biome", "period", "pix_bin", "frp_bin"]).n.sum().reset_index()
    hist.to_csv(os.path.join(HERE, "hist.csv"), index=False)
    pd.DataFrame({"frp_bin": np.arange(len(FRP_EDGES) - 1), "lo": FRP_EDGES[:-1], "hi": FRP_EDGES[1:]}).to_csv(
        os.path.join(HERE, "hist_frp_bins.csv"), index=False)
    print("daily rows", len(daily))
