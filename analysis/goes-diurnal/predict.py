"""Predict the clock audit from a geostationary fire diurnal cycle, then compare it with what MODIS shows.

Question: how much should Aqua's count change because it now looks later, given how fire activity actually
varies through the afternoon? A geostationary imager answers that with one fixed view and no drift.

  G_{y,m}(t)   GOES-East ABI fire pixels over the region at local solar time t, month m of year y
               (built per day and per 0.5 deg longitude strip, interpolated in time, then summed).
  w_{s,y,m}(t) share of satellite s's daytime FIRMS detections at local solar time t (its look times).
  F_{s,y}      = sum_m N_{s,y,m} * [sum_t w_{s,y,m}(t) G_{y,m}(t) / sum_t w_{s,base,m}(t) G_{y,m}(t)] / sum_m N_{s,y,m}
               the factor by which s's count should change from its 2012-2020 look times to year y's,
               with year y's own fires and clouds (GOES sees the same afternoon clouds).

Compared with L_obs: the audit's L for the same months (July-October), same method as audit.py.
  timing explains the gap  <=>  F close to L_obs for Aqua (later) AND for Terra (earlier)
  residual L_obs / F       =   the part timing does not explain (viewing geometry, fire mix, anything else)

Precedent: Sofiev and Kouznetsov (2026, GMD 19, 10123) used SEVIRI's diurnal cycle to predict ~20% more Aqua FRP
from its later overpass, against a 23% observed MODIS-VIIRS gap. This does the same for fire counts over Brazil.

Usage: python3 analysis/goes-diurnal/predict.py GOES_DIR FIRMS_RAW_DIR
"""
import glob
import os
import re
import sys
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent / "out"
REGIONS = {"amazon": "br-amazon", "cerrado": "br-cerrado"}
MONTHS = [7, 8, 9, 10]
YEARS = [2023, 2024, 2025]
BASE = list(range(2012, 2021))
GRID = np.arange(8.5, 16.0 + 1e-9, 5 / 60)       # local solar time grid, 5-minute steps
STRIP = 0.5                                       # degrees of longitude per strip
MAIN_MASKS = {10, 11, 30, 31}
NB = 500
SEED = 20261114


def lookup():
    lk = pd.read_csv(ROOT / "analysis/brazil-data/out/biome_lookup_0p1deg.csv", usecols=["cell_lat", "cell_lon", "biome"])
    return lk


def add_biome(d, lk):
    d = d.assign(cell_lat=np.floor(d.lat * 10).astype(int), cell_lon=np.floor(d.lon * 10).astype(int))
    return d.merge(lk, on=["cell_lat", "cell_lon"], how="inner")


def goes_curves(goes_dir, lk, masks):
    """Per (year, month, region): array days x GRID of interpolated fire-pixel counts (for day bootstrap)."""
    # every scan we used, including scans with no fires in Brazil
    scans = sorted(os.path.basename(p) for p in glob.glob(os.path.join(goes_dir, "parts", "*.csv.gz")))
    st = []
    for s in scans:
        y, doy, hh, mm, ss = map(int, re.search(r"_s(\d{4})(\d{3})(\d{2})(\d{2})(\d{2})", s).groups())
        st.append(pd.Timestamp(f"{y}-01-01") + pd.Timedelta(days=doy - 1, hours=hh, minutes=mm, seconds=ss) + pd.Timedelta(minutes=5))
    st = pd.Series(sorted(set(st)))
    fires = pd.concat([pd.read_csv(p, parse_dates=["utc"]) for p in sorted(glob.glob(os.path.join(goes_dir, "goes_fires_*.csv.gz")))])
    fires = fires[fires["mask"].isin(masks)]
    fires = add_biome(fires, lk)
    fires["strip"] = np.floor(fires.lon / STRIP) * STRIP
    out = {}
    for biome in REGIONS:
        f = fires[fires.biome == biome]
        strips = np.sort(lk[lk.biome == biome].cell_lon.unique() / 10.0)
        strips = np.unique(np.floor(strips / STRIP) * STRIP)
        cnt = f.groupby([f.utc, "strip"]).size()
        for (y, m), days in st.groupby([st.dt.year, st.dt.month]):
            if y not in YEARS or m not in MONTHS:
                continue
            per_day = []
            for day, ts in days.groupby(days.dt.date):
                ts = ts.sort_values()
                tot = np.zeros(len(GRID))
                for s in strips:
                    lst = (ts.dt.hour + ts.dt.minute / 60 + ts.dt.second / 3600 + (s + STRIP / 2) / 15).values
                    c = np.array([cnt.get((t, s), 0) for t in ts])
                    ok = (GRID >= lst.min()) & (GRID <= lst.max())
                    tot[ok] += np.interp(GRID[ok], lst, c)
                per_day.append(tot)
            out[(biome, y, m)] = np.array(per_day)
    return out


def firms_weights(raw, lk):
    """Per (sat, biome, year, month): histogram of daytime detection local solar time on GRID; plus counts."""
    rows = []
    files = sorted(glob.glob(os.path.join(raw, "modis_20*_Brazil.csv")) + glob.glob(os.path.join(raw, "viirs-snpp_20*_Brazil.csv")))
    for fp in files:
        y = int(os.path.basename(fp).split("_")[1])
        if not (y in BASE or y in YEARS):
            continue
        d = pd.read_csv(fp, usecols=["latitude", "longitude", "acq_date", "acq_time", "satellite", "daynight"], dtype={"satellite": str})
        d = d[(d.daynight == "D")]
        d["month"] = d.acq_date.str[5:7].astype(int)
        d = d[d.month.isin(MONTHS)].rename(columns={"latitude": "lat", "longitude": "lon"})
        d = add_biome(d, lk)
        d = d[d.biome.isin(REGIONS)]
        d["sat"] = d.satellite.map({"Aqua": "Aqua", "Terra": "Terra", "N": "S-NPP"})
        d["lst"] = (d.acq_time // 100 + (d.acq_time % 100) / 60 + d.lon / 15) % 24
        d["year"] = y
        rows.append(d[["sat", "biome", "year", "month", "lst"]])
    d = pd.concat(rows)
    edges = np.append(GRID - 2.5 / 60, GRID[-1] + 2.5 / 60)
    W, N = {}, {}
    for (s, b, y, m), g in d.groupby(["sat", "biome", "year", "month"]):
        h, _ = np.histogram(g.lst, edges)
        W[(s, b, y, m)] = h.astype(float)
        N[(s, b, y, m)] = len(g)
    for s in ["Aqua", "Terra", "S-NPP"]:
        for b in REGIONS:
            for m in MONTHS:
                W[(s, b, "base", m)] = sum(W.get((s, b, y, m), 0) for y in BASE)
    return W, N


def predict_F(G, W, N, sat, biome, y, rng):
    num = den = 0.0
    reps = np.zeros(NB + 1)
    for m in MONTHS:
        g = G.get((biome, y, m))
        wy, wb, n = W.get((sat, biome, y, m)), W.get((sat, biome, "base", m)), N.get((sat, biome, y, m), 0)
        if g is None or wy is None or n == 0 or len(g) == 0:
            continue
        idx = np.vstack([np.arange(len(g))] + [rng.integers(0, len(g), len(g)) for _ in range(NB)])
        gs = g[idx].sum(1)                                   # (NB+1, GRID)
        r = (gs @ (wy / wy.sum())) / np.maximum(gs @ (wb / wb.sum()), 1e-9)
        reps += n * r
        num += n
    return reps / num if num else None


def observed_L(sat, region_id, col="count_all"):
    """The audit's L restricted to July-October (point estimate and 16-day block bootstrap), as in audit.py.
    col = count_all (every daytime detection) or a column of analysis/frp-audit/daily.csv:
    'n_ge80' (detections with FRP >= 80 MW, visible at any MODIS view angle) or 'frp' (summed FRP)."""
    d = pd.read_csv(ROOT / "analysis/brazil-data/out/firms_daily_by_biome.csv")
    dates = pd.date_range("2012-01-01", "2025-12-31").strftime("%Y-%m-%d")
    up = d[d.date >= "2012-01-01"].groupby(["date", "satellite"]).count_all.sum().unstack().reindex(dates).notna()
    mask = (up[sat] & up["S-NPP"]).values & np.isin(dates.str[5:7].astype(int), MONTHS)
    biome = {v: k for k, v in REGIONS.items()}[region_id]
    if col != "count_all":
        d = pd.read_csv(ROOT / "analysis/frp-audit/daily.csv.gz", usecols=["date", "biome", "satellite", col]).rename(columns={col: "count_all"})
    c = d[d.biome == biome].groupby(["date", "satellite"]).count_all.sum().unstack().reindex(dates).fillna(0)
    yr = dates.str[:4].astype(int).values
    mo = dates.str[5:7].astype(int).values - 1
    rng = np.random.default_rng(SEED)
    blk = np.arange(len(dates)) // 16
    Wt = np.vstack([np.ones(len(dates)), rng.poisson(1.0, (NB, blk[-1] + 1))[:, blk]])
    YM = np.zeros((len(dates), 14 * 12)); YM[np.arange(len(dates)), (yr - 2012) * 12 + mo] = 1
    A = (Wt @ (YM * (c[sat].values * mask)[:, None])).reshape(-1, 14, 12)
    V = (Wt @ (YM * (c["S-NPP"].values * mask)[:, None])).reshape(-1, 14, 12)
    bi = [b - 2012 for b in BASE]
    R = A[:, bi].sum(1) / np.maximum(V[:, bi].sum(1), 1e-9)
    return {y: A[:, y - 2012].sum(1) / (V[:, y - 2012] * R).sum(1) for y in YEARS}


def main(goes_dir, raw):
    lk = lookup()
    W, N = firms_weights(raw, lk)
    rows = []
    for label, masks in [("main", MAIN_MASKS), ("incl_high_prob", MAIN_MASKS | {13, 33})]:
        G = goes_curves(goes_dir, lk, masks)
        rng = np.random.default_rng(SEED)
        for biome, rid in REGIONS.items():
            for sat in ["Aqua", "Terra", "S-NPP"]:
                Lo = observed_L(sat, rid) if sat != "S-NPP" else None
                Lo80 = observed_L(sat, rid, "n_ge80") if sat != "S-NPP" else None
                LoF = observed_L(sat, rid, "frp") if sat != "S-NPP" else None
                for y in YEARS:
                    F = predict_F(G, W, N, sat, biome, y, rng)
                    if F is None:
                        continue
                    row = dict(goes_masks=label, region=rid, sat=sat, year=y, F=F[0], F_lo=np.percentile(F[1:], 2.5), F_hi=np.percentile(F[1:], 97.5),
                               days=sum(len(G.get((biome, y, m), [])) for m in MONTHS))
                    if Lo is not None:
                        for nm, LL in (("L_ge80", Lo80), ("L_frp", LoF)):
                            row[nm] = LL[y][0]; row[nm + "_lo"], row[nm + "_hi"] = np.percentile(LL[y][1:], [2.5, 97.5])
                        l = Lo[y]
                        res = l / F
                        row.update(L_obs=l[0], L_lo=np.percentile(l[1:], 2.5), L_hi=np.percentile(l[1:], 97.5),
                                   residual=res[0], res_lo=np.percentile(res[1:], 2.5), res_hi=np.percentile(res[1:], 97.5),
                                   share_explained=np.log(F[0]) / np.log(l[0]) if abs(np.log(l[0])) > 0.01 else np.nan)
                    # look-time shift (median LST), for reference
                    def med(w):
                        c = np.cumsum(w); return GRID[np.searchsorted(c, c[-1] / 2)]
                    wy = sum(W.get((sat, biome, y, m), 0) for m in MONTHS); wb = sum(W.get((sat, biome, "base", m), 0) for m in MONTHS)
                    row["lst_base"], row["lst_year"] = med(wb), med(wy)
                    rows.append(row)
        # the diurnal curve itself, for the write-up
        if label == "main":
            curve = []
            for (biome, y, m), g in G.items():
                s = g.sum(0)
                curve += [dict(region=REGIONS[biome], year=y, month=m, lst=round(t, 3), goes_fire_pixels=v) for t, v in zip(GRID, s)]
            OUT.mkdir(parents=True, exist_ok=True)
            pd.DataFrame(curve).to_csv(OUT / "goes_diurnal_curve.csv.gz", index=False)
    df = pd.DataFrame(rows)
    OUT.mkdir(parents=True, exist_ok=True)
    df.round(4).to_csv(OUT / "goes_prediction.csv", index=False)
    hm = lambda h: f"{int(h):02d}:{int(round((h % 1) * 60)) % 60:02d}"
    f2 = lambda v: "–" if pd.isna(v) else f"{v:.2f}"
    lines = ["# Geostationary prediction of the clock audit (July–October)", "",
             "Generated by `analysis/goes-diurnal/predict.py`. Method: [README](../README.md).", "",
             "F = how much each satellite's count should change from its 2012–2020 look times to that year's, predicted from "
             "GOES-East's diurnal fire cycle in the same year. L = observed (audit method, July–October). Residual = L / F.", ""]
    for label in ["main", "incl_high_prob"]:
        lines += [f"## GOES fire pixels: {'processed + saturated (10, 11, 30, 31)' if label == 'main' else 'also high-probability (13, 33)'}", "",
                  "| Region | Satellite | Year | Look time, 2012–20 → year | Predicted F (95%) | Observed L, all detections | Residual L/F | Share of log L explained | Observed L, FRP ≥ 80 MW | Observed L, summed FRP |",
                  "|---|---|---|---|---|---|---|---|---|---|"]
        for r in df[df.goes_masks == label].itertuples():
            lines.append(f"| {r.region} | {r.sat} | {r.year} | {hm(r.lst_base)} → {hm(r.lst_year)} | {f2(r.F)} ({f2(r.F_lo)}–{f2(r.F_hi)}) | "
                         f"{f2(getattr(r, 'L_obs', np.nan))} ({f2(getattr(r, 'L_lo', np.nan))}–{f2(getattr(r, 'L_hi', np.nan))}) | "
                         f"{f2(getattr(r, 'residual', np.nan))} ({f2(getattr(r, 'res_lo', np.nan))}–{f2(getattr(r, 'res_hi', np.nan))}) | "
                         f"{'–' if pd.isna(getattr(r, 'share_explained', np.nan)) else f'{r.share_explained:.0%}'} | "
                         f"{f2(getattr(r, 'L_ge80', np.nan))} ({f2(getattr(r, 'L_ge80_lo', np.nan))}–{f2(getattr(r, 'L_ge80_hi', np.nan))}) | "
                         f"{f2(getattr(r, 'L_frp', np.nan))} ({f2(getattr(r, 'L_frp_lo', np.nan))}–{f2(getattr(r, 'L_frp_hi', np.nan))}) |")
        lines.append("")
    (OUT / "results.md").write_text("\n".join(lines) + "\n")
    print("\n".join(lines))


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
