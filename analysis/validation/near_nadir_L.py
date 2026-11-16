"""Is the clock-audit excess (L > 1) produced by MODIS viewing geometry?

Orbit drift changed how MODIS samples the ground: pixel size, scan gaps, view angles (Giglio, NASA LANCE UWG, May 2025).
Pixels far from nadir are the most affected. If the 2024-2025 excess came from that, it would sit in off-nadir pixels
and shrink or vanish near nadir.

This recomputes the audit's L exactly as analysis/statistics/audit.py does (point estimate: same retained days, same
2012-2020 calendar-month ratio R_m, count_all), then splits Aqua's count into near-nadir (scan <= 1.3 km) and
off-nadir pixels. S-NPP is split the same way (track <= 0.40 km) for the matched-geometry version.

Variants per region-year (all: L = Aqua / sum_m(R_m x S-NPP), R_m from 2012-2020; baseline years leave themselves out):
  L_all        all Aqua vs all S-NPP                (reproduces data/out/audit L)
  L_near_all   near-nadir Aqua vs all S-NPP         (VIIRS reference untouched)
  L_off_all    off-nadir Aqua vs all S-NPP
  L_near_near  near-nadir Aqua vs near-nadir S-NPP  (matched geometry)
  aqua_near_share   share of Aqua's detections that are near nadir; snpp_near_share likewise

95% intervals: the audit's 16-day block Poisson bootstrap (1000 replicates, seed 20261114).

Usage: python3 analysis/validation/near_nadir_L.py   (reads committed CSVs, about 30 s)
"""
import json
import os
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "analysis" / "validation"
BASE, YEARS = list(range(2012, 2021)), list(range(2012, 2026))
NB, SEED, BLOCK = 1000, 20261114, 16
REGIONS = {"br-amazon": "amazon", "br-cerrado": "cerrado", "br-pantanal": "pantanal",
           "ar-argentina": "argentina", "us-california": "california"}

daily = pd.concat([
    pd.read_csv(ROOT / "analysis/brazil-data/out/firms_daily_by_biome.csv"),
    pd.read_csv(ROOT / "analysis/statistics/out/regions_daily.csv"),
])
brazil = pd.read_csv(ROOT / "analysis/brazil-data/out/firms_daily_by_biome.csv")
dates = pd.date_range("2012-01-01", "2025-12-31").strftime("%Y-%m-%d")
yr = dates.str[:4].astype(int).values
mo = dates.str[5:7].astype(int).values - 1
ny = len(YEARS)

# same availability rule as audit.py: a satellite is down on a day with no daytime detection anywhere in Brazil
up = brazil[brazil.date >= "2012-01-01"].groupby(["date", "satellite"]).count_all.sum().unstack().reindex(dates).notna()
MASK = (up["Aqua"] & up["S-NPP"]).values
MASK_T = (up["Terra"] & up["S-NPP"]).values

rng = np.random.default_rng(SEED)
blk = np.arange(len(dates)) // BLOCK
W = np.vstack([np.ones(len(dates)), rng.poisson(1.0, (NB, blk[-1] + 1))[:, blk]]).astype(np.float32)
YM = np.zeros((len(dates), ny * 12), np.float32)
YM[np.arange(len(dates)), (yr - 2012) * 12 + mo] = 1


def ymsum(x, mask=None):
    return (W @ (YM * (x * (MASK if mask is None else mask))[:, None])).reshape(-1, ny, 12)


def iy(years):
    return [y - 2012 for y in years]


def L(A, V, base, target):
    Ab, Vb = A[:, iy(base)].sum(1), V[:, iy(base)].sum(1)
    pooled = (Ab.sum(1) / Vb.sum(1))[:, None]
    R = np.where(Vb > 0, Ab / np.where(Vb > 0, Vb, 1), pooled)
    t = iy([target])[0]
    return A[:, t].sum(1) / (V[:, t] * R).sum(1)


def series(d, sat, near=None):
    x = d[d.satellite == sat]
    if near is not None:
        x = x[x.near_nadir == near]
    return x.groupby("date").count_all.sum().reindex(dates).fillna(0).values


rows = []
for reg, key in REGIONS.items():
    d = daily[(daily.biome == key) & (daily.date >= "2012-01-01")]
    A_all, A_near, A_off = (ymsum(series(d, "Aqua", n)) for n in (None, 1, 0))
    V_all, V_near = ymsum(series(d, "S-NPP")), ymsum(series(d, "S-NPP", 1))
    # Terra drifted the other way (earlier, about -75 min by 2025) and was lowered about 6 km in 2022
    T_all, T_near, T_off = (ymsum(series(d, "Terra", n), MASK_T) for n in (None, 1, 0))
    VT_all = ymsum(series(d, "S-NPP"), MASK_T)
    for y in YEARS:
        base = [b for b in BASE if b != y]
        rec = {"region": reg, "year": y, "placebo": y in BASE}
        for name, (a, v) in {"L_all": (A_all, V_all), "L_near_all": (A_near, V_all),
                             "L_off_all": (A_off, V_all), "L_near_near": (A_near, V_near),
                             "T_all": (T_all, VT_all), "T_near_all": (T_near, VT_all), "T_off_all": (T_off, VT_all)}.items():
            x = L(a, v, base, y)
            rec[name] = float(x[0])
            rec[name + "_lo"], rec[name + "_hi"] = (float(q) for q in np.nanpercentile(x[1:], [2.5, 97.5]))
        t = y - 2012
        rec["aqua_near_share"] = float(A_near[0, t].sum() / max(A_all[0, t].sum(), 1))
        rec["terra_near_share"] = float(T_near[0, t].sum() / max(T_all[0, t].sum(), 1))
        rec["snpp_near_share"] = float(V_near[0, t].sum() / max(V_all[0, t].sum(), 1))
        rec["aqua_count"], rec["aqua_near"], rec["aqua_off"] = (float(z[0, t].sum()) for z in (A_all, A_near, A_off))
        rows.append(rec)

df = pd.DataFrame(rows)
df.round(4).to_csv(OUT / "near_nadir_L.csv", index=False)

# check against the published audit
check = []
for reg in REGIONS:
    pub = {r["year"]: r["L"] for r in json.load(open(ROOT / f"data/out/audit/{reg}.json"))["years"] if r.get("L") is not None}
    for y, l in pub.items():
        mine = df[(df.region == reg) & (df.year == y)].L_all.iloc[0]
        check.append(abs(mine - l))
print(f"reproduces published audit L: max |diff| = {max(check):.4f} over {len(check)} region-years")
assert max(check) < 0.001, "no longer reproduces data/out/audit: rerun after analysis/statistics/audit.py changes"


def fmt(r, k):
    return f"{r[k]:.2f} ({r[k + '_lo']:.2f}–{r[k + '_hi']:.2f})"


lines = ["# Near-nadir test of the clock audit", "",
         "Generated by `analysis/validation/near_nadir_L.py` from the committed daily counts. "
         f"Reproduces the published audit L to within {max(check):.4f}.", "",
         "Near nadir: MODIS scan ≤ 1.3 km, VIIRS track ≤ 0.40 km (the brazil-data definitions). "
         "95% intervals: 16-day block bootstrap, as in the audit.", ""]
for reg in REGIONS:
    lines += [f"## {reg}", "",
              "| Year | L all pixels | L near-nadir Aqua | L off-nadir Aqua | L near vs near | Aqua near-nadir share | S-NPP near-nadir share |",
              "|---|---|---|---|---|---|---|"]
    sub = df[(df.region == reg) & (df.year >= 2018)]
    base_share = df[(df.region == reg) & df.placebo].aqua_near_share.mean()
    for _, r in sub.iterrows():
        lines.append(f"| {r.year}{' (baseline)' if r.placebo else ''} | {fmt(r, 'L_all')} | {fmt(r, 'L_near_all')} | "
                     f"{fmt(r, 'L_off_all')} | {fmt(r, 'L_near_near')} | {r.aqua_near_share:.1%} | {r.snpp_near_share:.1%} |")
    tshare = df[(df.region == reg) & df.placebo].terra_near_share.mean()
    lines += ["", f"Aqua near-nadir share, 2012–2020 mean: {base_share:.1%}.", "",
              "Terra (drifted earlier; same method, Terra in place of Aqua):", "",
              "| Year | Terra all | Terra near-nadir | Terra off-nadir | Terra near-nadir share |", "|---|---|---|---|---|"]
    for _, r in sub.iterrows():
        lines.append(f"| {r.year} | {fmt(r, 'T_all')} | {fmt(r, 'T_near_all')} | {fmt(r, 'T_off_all')} | {r.terra_near_share:.1%} |")
    lines += ["", f"Terra near-nadir share, 2012–2020 mean: {tshare:.1%}.", ""]
(OUT / "near_nadir_L.md").write_text("\n".join(lines))
print((OUT / "near_nadir_L.md").read_text())
