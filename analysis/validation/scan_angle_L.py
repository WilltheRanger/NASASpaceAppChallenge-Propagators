"""Clock audit L by MODIS view angle, with fire power per detection and a NOAA-20 reference.

Follows near_nadir_L.py, which found Aqua's 2024-2025 excess in near-nadir pixels only. Two explanations fit that:

  (G) sampling: orbit drift changed how MODIS samples the ground, moving detections between view angles
      (Giglio, NASA LANCE UWG, May 2025);
  (T) time of day: a later look sees more small, new fires. MODIS detects a small fire only near nadir, where its
      pixel is smallest, so a real time effect would also concentrate the excess near nadir.

They differ on fire power. Inside a fixed view-angle bin the pixel size, and so the smallest detectable fire, is fixed.
Under (T) the fires Aqua sees get smaller, so FRP per detection falls *within* each bin. Under (G) the fire
population is the same, so FRP per detection within a bin stays where it was.

Method (same as analysis/statistics/audit.py where it overlaps):
  * every daytime detection (count_all), biome from analysis/brazil-data/out/biome_lookup_0p1deg.csv;
  * retained days = Aqua and the reference both returned a daytime detection anywhere in Brazil;
  * L_b,y = Aqua count in view bin b, year y / sum_m R_b,m x reference count in month m of year y,
    R_b,m = Aqua bin b / reference over 2012-2020 (S-NPP) or 2018-2020 (NOAA-20) for calendar month m;
  * view bins from MODIS along-scan pixel size `scan` (0.1 km resolution in FIRMS), with the nadir view angle each
    implies for a 705 km orbit;
  * FRP per detection: median and share below 10 MW, per bin and year;
  * 95% intervals: 16-day block Poisson bootstrap, 1000 replicates, seed 20261114.

Usage: python3 analysis/validation/scan_angle_L.py RAW_DIR
       RAW_DIR holds FIRMS yearly Brazil files: modis_YYYY_Brazil.csv (2012-2025),
       viirs-snpp_YYYY_Brazil.csv (2012-2025), viirs-jpss1_YYYY_Brazil.csv (2018-2025). About 3 GB, not in git.
"""
import glob
import os
import sys
from multiprocessing import Pool
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "analysis" / "validation"
BIOMES = ["amazon", "cerrado"]
SAT = {"Aqua": "Aqua", "Terra": "Terra", "N": "S-NPP", "N20": "NOAA-20", "1": "NOAA-20"}
# MODIS along-scan pixel size (km) -> view bin. Upper edges inclusive.
BINS = [(1.05, "1.0"), (1.25, "1.1-1.2"), (1.55, "1.3-1.5"), (2.25, "1.6-2.2"), (3.35, "2.3-3.3"), (99, "3.4+")]
BIN_NAMES = [b for _, b in BINS]
NB, SEED, BLOCK = 1000, 20261114, 16
H, RE = 705.0, 6371.0


def scan_to_angle(s):
    """Nadir view angle (deg) giving along-scan pixel size s (km) for a 1 km-at-nadir sensor at H km."""
    th = np.radians(np.linspace(0, 56, 5601))
    ifov = 1.0 / H
    size = RE * ifov * (np.cos(th) / np.sqrt((RE / (RE + H)) ** 2 - np.sin(th) ** 2) - 1)
    return float(np.degrees(np.interp(s, size, th)))


def one(f):
    lk = pd.read_csv(ROOT / "analysis/brazil-data/out/biome_lookup_0p1deg.csv", usecols=["cell_lat", "cell_lon", "biome"])
    d = pd.read_csv(f, usecols=["latitude", "longitude", "scan", "acq_date", "satellite", "frp", "daynight"],
                    dtype={"satellite": str})
    d = d[d.daynight == "D"]
    d["satellite"] = d.satellite.map(SAT)
    d["cell_lat"] = np.floor(d.latitude * 10).astype(int)
    d["cell_lon"] = np.floor(d.longitude * 10).astype(int)
    d = d.merge(lk, on=["cell_lat", "cell_lon"], how="left")
    # Brazil-wide availability (any daytime detection anywhere), as the audit uses
    avail = d.groupby(["acq_date", "satellite"]).size().rename("n_brazil").reset_index()
    d = d[d.biome.isin(BIOMES)]
    if "modis" in os.path.basename(f):
        d["bin"] = pd.cut(d.scan, [0] + [e for e, _ in BINS], labels=BIN_NAMES).astype(str)
    else:
        d["bin"] = "viirs"
    d["low"] = (d.frp < 10).astype(int)
    g = d.groupby(["acq_date", "biome", "satellite", "bin"]).agg(n=("frp", "size"), low=("low", "sum")).reset_index()
    # FRP medians need detection-level data: keep year x biome x sat x bin medians here
    d["year"] = d.acq_date.str[:4].astype(int)
    m = d.groupby(["year", "biome", "satellite", "bin"]).frp.agg(frp_median="median", frp_p25=lambda s: s.quantile(.25),
                                                                 n_det="size").reset_index()
    return g, avail, m


def main(raw):
    files = sorted(glob.glob(os.path.join(raw, "modis_20*_Brazil.csv")) + glob.glob(os.path.join(raw, "viirs-snpp_20*_Brazil.csv"))
                   + glob.glob(os.path.join(raw, "viirs-jpss1_20*_Brazil.csv")))
    files = [f for f in files if 2012 <= int(os.path.basename(f).split("_")[1]) <= 2025]
    print(f"{len(files)} files")
    with Pool(4) as p:
        res = p.map(one, files, chunksize=1)
    daily = pd.concat([r[0] for r in res])
    avail = pd.concat([r[1] for r in res])
    frp = pd.concat([r[2] for r in res])
    daily.to_csv(OUT / "scan_angle_daily.csv.gz", index=False)

    dates = pd.date_range("2012-01-01", "2025-12-31").strftime("%Y-%m-%d")
    yr = dates.str[:4].astype(int).values
    mo = dates.str[5:7].astype(int).values - 1
    years = list(range(2012, 2026)); ny = len(years)
    up = avail.pivot_table(index="acq_date", columns="satellite", values="n_brazil", aggfunc="sum").reindex(dates).notna()
    rng = np.random.default_rng(SEED)
    blk = np.arange(len(dates)) // BLOCK
    W = np.vstack([np.ones(len(dates)), rng.poisson(1.0, (NB, blk[-1] + 1))[:, blk]]).astype(np.float32)
    YM = np.zeros((len(dates), ny * 12), np.float32)
    YM[np.arange(len(dates)), (yr - 2012) * 12 + mo] = 1

    def ymsum(x, mask):
        return (W @ (YM * (x * mask)[:, None])).reshape(-1, ny, 12)

    def L(A, V, base, target):
        bi = [b - 2012 for b in base]
        Ab, Vb = A[:, bi].sum(1), V[:, bi].sum(1)
        pooled = (Ab.sum(1) / np.maximum(Vb.sum(1), 1))[:, None]
        R = np.where(Vb > 0, Ab / np.where(Vb > 0, Vb, 1), pooled)
        t = target - 2012
        return A[:, t].sum(1) / (V[:, t] * R).sum(1)

    def ser(d, sat, b=None):
        x = d[(d.satellite == sat) & ((d.bin == b) if b else True)]
        return x.groupby("acq_date").n.sum().reindex(dates).fillna(0).values

    rows = []
    for biome in BIOMES:
        d = daily[daily.biome == biome]
        for ref, base0 in [("S-NPP", list(range(2012, 2021))), ("NOAA-20", [2018, 2019, 2020])]:
            for sat in ["Aqua", "Terra"]:
                mask = (up[sat] & up[ref]).values
                if ref == "NOAA-20":
                    mask = mask & (yr >= 2018)
                V = ymsum(ser(d, ref), mask)
                for b in ["all"] + BIN_NAMES:
                    A = ymsum(ser(d, sat, None if b == "all" else b), mask)
                    for y in years:
                        if ref == "NOAA-20" and y < 2018:
                            continue
                        base = [x for x in base0 if x != y]
                        x = L(A, V, base, y)
                        lo, hi = np.nanpercentile(x[1:], [2.5, 97.5])
                        rows.append(dict(biome=biome, ref=ref, sat=sat, bin=b, year=y, L=x[0], lo=lo, hi=hi,
                                         count=float(A[0, y - 2012].sum())))
    Ldf = pd.DataFrame(rows)
    Ldf.round(4).to_csv(OUT / "scan_angle_L.csv", index=False)
    frp.round(3).to_csv(OUT / "scan_angle_frp.csv", index=False)

    # ---- report
    ang = {b: f"{scan_to_angle(lo_ + 0.0 if i else 1.0):.0f}–{scan_to_angle(min(e, 4.8)):.0f}°"
           for i, ((e, b), lo_) in enumerate(zip(BINS, [1.0] + [e for e, _ in BINS[:-1]]))}
    lines = ["# Clock audit by MODIS view angle, with fire power and a NOAA-20 reference", "",
             "Generated by `analysis/validation/scan_angle_L.py` from the FIRMS yearly Brazil files. "
             "L per view bin uses that bin's own 2012–2020 ratio to S-NPP (or 2018–2020 to NOAA-20). 95% intervals: "
             "16-day block bootstrap.", "",
             "View bins are MODIS along-scan pixel size; the view angle is approximate (705 km orbit).", ""]

    def cell(r):
        return f"{r.L:.2f} ({r.lo:.2f}–{r.hi:.2f})"

    for biome in BIOMES:
        for sat in ["Aqua", "Terra"]:
            lines += [f"## {biome.title()}: {sat}, L by view bin (reference S-NPP)", "",
                      "| Year | all | " + " | ".join(f"{b} km ({ang[b]})" for b in BIN_NAMES) + " |",
                      "|---" * (len(BIN_NAMES) + 2) + "|"]
            for y in [2016, 2018, 2020, 2021, 2022, 2023, 2024, 2025]:
                q = Ldf[(Ldf.biome == biome) & (Ldf.ref == "S-NPP") & (Ldf.sat == sat) & (Ldf.year == y)].set_index("bin")
                lines.append(f"| {y} | " + " | ".join(cell(q.loc[b]) for b in ["all"] + BIN_NAMES) + " |")
            # bin shares
            sh = Ldf[(Ldf.biome == biome) & (Ldf.ref == "S-NPP") & (Ldf.sat == sat) & (Ldf.bin != "all")]
            piv = sh.pivot_table(index="year", columns="bin", values="count")[BIN_NAMES]
            piv = piv.div(piv.sum(1), axis=0)
            lines += ["", f"Share of {sat}'s detections by view bin:", "",
                      "| Period | " + " | ".join(BIN_NAMES) + " |", "|---" * (len(BIN_NAMES) + 1) + "|",
                      "| 2012–2020 | " + " | ".join(f"{v:.1%}" for v in piv.loc[2012:2020].mean()) + " |"]
            for y in [2023, 2024, 2025]:
                lines.append(f"| {y} | " + " | ".join(f"{v:.1%}" for v in piv.loc[y]) + " |")
            # FRP per detection by bin
            fr = frp[(frp.biome == biome) & (frp.satellite == sat)]
            lines += ["", f"{sat} median FRP per detection (MW) by view bin:", "",
                      "| Period | " + " | ".join(BIN_NAMES) + " |", "|---" * (len(BIN_NAMES) + 1) + "|"]
            base = fr[fr.year.between(2012, 2020)].groupby("bin").frp_median.median()
            lines.append("| 2012–2020 (median of yearly medians) | " + " | ".join(f"{base.get(b, np.nan):.1f}" for b in BIN_NAMES) + " |")
            for y in [2023, 2024, 2025]:
                q = fr[fr.year == y].set_index("bin").frp_median
                lines.append(f"| {y} | " + " | ".join(f"{q.get(b, np.nan):.1f}" for b in BIN_NAMES) + " |")
            lines.append("")
        # reference check
        lines += [f"## {biome.title()}: Aqua L, S-NPP vs NOAA-20 reference (2018–2020 baseline for NOAA-20)", "",
                  "| Year | all, S-NPP | all, NOAA-20 | 1.0 km, S-NPP | 1.0 km, NOAA-20 | 1.6–2.2 km, S-NPP | 1.6–2.2 km, NOAA-20 |",
                  "|---|---|---|---|---|---|---|"]
        for y in range(2021, 2026):
            q = Ldf[(Ldf.biome == biome) & (Ldf.sat == "Aqua") & (Ldf.year == y)].set_index(["ref", "bin"])
            lines.append(f"| {y} | {cell(q.loc[('S-NPP', 'all')])} | {cell(q.loc[('NOAA-20', 'all')])} | "
                         f"{cell(q.loc[('S-NPP', '1.0')])} | {cell(q.loc[('NOAA-20', '1.0')])} | "
                         f"{cell(q.loc[('S-NPP', '1.6-2.2')])} | {cell(q.loc[('NOAA-20', '1.6-2.2')])} |")
        lines.append("")
    (OUT / "scan_angle_L.md").write_text("\n".join(lines) + "\n")
    print((OUT / "scan_angle_L.md").read_text())


if __name__ == "__main__":
    main(sys.argv[1])
