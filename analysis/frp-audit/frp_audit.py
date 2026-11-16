"""Stage 2: FRP-based and detection-limit-harmonized clock audit (run aggregate.py first).

Usage: python frp_audit.py
Reads  daily.csv, up.csv, hist.csv, hist_frp_bins.csv (this folder, from aggregate.py)
Writes threshold_ks.csv   KS distance of the FRP distribution above F, each MODIS scan bin vs nadir bin
                          (2012-2020 daytime, amazon+cerrado), plus S-NPP track bins
       audit_L.csv        L for every metric, biome, satellite, year 2021-2025 with 95% CI
       results.md         tables
L(metric) = sum_days MODIS metric / sum_days S-NPP metric x R_m, R_m = 2012-2020 MODIS/S-NPP ratio
of the same metric for that calendar month; days where either satellite had no daytime detection in
Brazil are dropped; 95% CI from a Poisson bootstrap over 16-day blocks (1000 replicates, shared by
baseline and target year, same weights for every metric).
"""
import os
import numpy as np, pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
NB, BLOCK, SEED = 1000, 16, 20261115
BASE = list(range(2012, 2021))
YEARS = list(range(2021, 2026))
KS_MAX = 0.05
np.seterr(divide="ignore", invalid="ignore")

# ---------- 1. threshold from the data: where per-scan-bin FRP distributions coincide ----------
h = pd.read_csv(os.path.join(HERE, "hist.csv"))
fb = pd.read_csv(os.path.join(HERE, "hist_frp_bins.csv"))
lo = fb.lo.values
MOD_BINS = ["1.0-1.1", "1.1-1.3", "1.3-1.6", "1.6-2.0", "2.0-2.6", "2.6-3.4", "3.4-5.0"]
VII_BINS = ["0.30-0.40", "0.40-0.50", "0.50-0.60", "0.60-0.90"]


def tail_ks(sat, period="base"):
    x = (h[(h.satellite == sat) & (h.period == period)].groupby(["pix_bin", "frp_bin"]).n.sum()
         .unstack(fill_value=0).reindex(columns=fb.frp_bin, fill_value=0))
    cc = x.values[:, ::-1].cumsum(1)[:, ::-1].astype(float)  # N(FRP >= lo)
    rows = []
    for i in range(np.searchsorted(lo, 2.0), np.searchsorted(lo, 300.0)):
        ref = cc[0, i:] / cc[0, i]
        for k in range(1, cc.shape[0]):
            rows.append(dict(satellite=sat, period=period, frp_min=round(lo[i], 2), pix_bin=k,
                             n_bin=int(cc[k, i]), n_nadir=int(cc[0, i]),
                             ks=np.abs(cc[k, i:] / cc[k, i] - ref).max()))
    return pd.DataFrame(rows)


ks = pd.concat([tail_ks(s, p) for s in ["Aqua", "Terra", "S-NPP"] for p in ["base", "2025"]])
ks["bin"] = [(VII_BINS if s == "S-NPP" else MOD_BINS)[b] for s, b in zip(ks.satellite, ks.pix_bin)]
ks.round(4).to_csv(os.path.join(HERE, "threshold_ks.csv"), index=False)


def t_star(sat, period="base", bins=None):
    # smallest F such that, for every F' >= F (up to 150 MW), every scan bin's FRP distribution above F'
    # is within KS_MAX of the nadir bin's
    k = ks[(ks.satellite == sat) & (ks.period == period) & (ks.frp_min <= 150)]
    if bins is not None:
        k = k[k.pix_bin.isin(bins)]
    # allow for sampling noise: 5% two-sample KS critical value on top of KS_MAX
    k = k.assign(excess=k.ks - 1.36 * np.sqrt((k.n_bin + k.n_nadir) / (k.n_bin * k.n_nadir)))
    worst = k.groupby("frp_min").excess.max().sort_index()
    bad = worst[worst > KS_MAX]
    return worst.index[worst.index > bad.index.max()].min() if len(bad) else worst.index.min()


TSTAR = {f"{s}/{p}": t_star(s, p) for s in ["Aqua", "Terra"] for p in ["base", "2025"]}
TSTAR_NN = {f"{s}/{p}": t_star(s, p, bins=[1]) for s in ["Aqua", "Terra"] for p in ["base", "2025"]}
TSTAR_VIIRS = t_star("S-NPP")
AREA_EDGE = 4.8 * 2.0  # MODIS edge pixel ~4.8 km along-scan x ~2.0 km along-track vs 1 km2 at nadir
T_AREA = 5.7 * AREA_EDGE

# ---------- 2. bootstrap audit ----------
daily = pd.read_csv(os.path.join(HERE, "daily.csv.gz"))
for T in [30, 80]:  # off-nadir (MODIS scan > 1.3 km) = all minus near-nadir
    daily[f"off_n_ge{T}"] = daily[f"n_ge{T}"] - daily[f"nn_n_ge{T}"]
    daily[f"off_frp_ge{T}"] = daily[f"frp_ge{T}"] - daily[f"nn_frp_ge{T}"]
up = pd.read_csv(os.path.join(HERE, "up.csv"))
dates = pd.date_range("2012-01-01", "2025-12-31").strftime("%Y-%m-%d")
yr = dates.str[:4].astype(int).values
mo = dates.str[5:7].astype(int).values - 1
ny = 2025 - 2012 + 1
upm = up.pivot(index="date", columns="satellite", values="brazil_day_detections").reindex(dates).notna()

rng = np.random.default_rng(SEED)
blk = np.arange(len(dates)) // BLOCK
W = np.vstack([np.ones(len(dates)), rng.poisson(1.0, (NB, blk[-1] + 1))[:, blk]]).astype(np.float64)
YM = np.zeros((len(dates), ny * 12))
YM[np.arange(len(dates)), (yr - 2012) * 12 + mo] = 1


def ymsum(x, mask):
    return (W @ (YM * (x * mask)[:, None])).reshape(-1, ny, 12)


def series(biome, sat, col):
    s = daily[(daily.biome == biome) & (daily.satellite == sat)].set_index("date")[col]
    return s.reindex(dates).fillna(0.0).values


def Lyear(A, V, target):
    ib = [y - 2012 for y in BASE]
    Ab, Vb = A[:, ib].sum(1), V[:, ib].sum(1)
    pooled = (Ab.sum(1) / Vb.sum(1))[:, None]
    R = np.where(Vb > 0, Ab / np.where(Vb > 0, Vb, 1), pooled)
    t = target - 2012
    return A[:, t].sum(1) / (V[:, t] * R).sum(1)


# metric name -> (MODIS column, S-NPP column, description)
METRICS = {"count": ("n", "n", "all daytime detections (reproduces the team's L)"),
           "frp": ("frp", "frp", "summed FRP, all detections"),
           "nn_count": ("nn_n", "n", "MODIS scan<=1.3 km detections vs all S-NPP detections")}
for T in [20, 30, 50, 60, 80, 100]:
    METRICS[f"count_ge{T}"] = (f"n_ge{T}", f"n_ge{T}", f"detections with FRP >= {T} MW, all view angles")
    METRICS[f"frp_ge{T}"] = (f"frp_ge{T}", f"frp_ge{T}", f"summed FRP of detections >= {T} MW, all view angles")
for T in [10, 20, 30, 50, 80]:
    METRICS[f"nn_count_ge{T}"] = (f"nn_n_ge{T}", f"n_ge{T}", f"MODIS scan<=1.3 km AND FRP >= {T} MW vs S-NPP FRP >= {T} MW (all angles)")
    METRICS[f"nn_frp_ge{T}"] = (f"nn_frp_ge{T}", f"frp_ge{T}", f"summed FRP, MODIS scan<=1.3 km AND >= {T} MW vs S-NPP >= {T} MW")

for T in [30, 80]:
    METRICS[f"off_count_ge{T}"] = (f"off_n_ge{T}", f"n_ge{T}", f"MODIS scan>1.3 km AND FRP >= {T} MW vs S-NPP FRP >= {T} MW (all angles)")
    METRICS[f"off_frp_ge{T}"] = (f"off_frp_ge{T}", f"frp_ge{T}", f"summed FRP, MODIS scan>1.3 km AND >= {T} MW vs S-NPP >= {T} MW")

rows = []
for biome in ["amazon", "cerrado"]:
    for sat in ["Aqua", "Terra"]:
        mask = (upm[sat] & upm["S-NPP"]).values.astype(float)
        for m, (cm, cv, desc) in METRICS.items():
            A = ymsum(series(biome, sat, cm), mask)
            V = ymsum(series(biome, "S-NPP", cv), mask)
            for y in YEARS:
                l = Lyear(A, V, y)
                b = l[1:][np.isfinite(l[1:])]
                rows.append(dict(biome=biome, satellite=sat, metric=m, year=y, L=l[0],
                                 lo=np.percentile(b, 2.5), hi=np.percentile(b, 97.5),
                                 modis_total=A[0, y - 2012].sum(), snpp_total=V[0, y - 2012].sum()))
res = pd.DataFrame(rows)
res.round(4).to_csv(os.path.join(HERE, "audit_L.csv"), index=False)

# share of each satellite's detections / FRP above thresholds (what the harmonized metric keeps)
share = []
for biome in ["amazon", "cerrado"]:
    for sat in ["Aqua", "Terra", "S-NPP"]:
        d = daily[(daily.biome == biome) & (daily.satellite == sat)]
        for per, dd in [("2012-2020", d[d.date < "2021"]), ("2025", d[d.date >= "2025"])]:
            r = dict(biome=biome, satellite=sat, period=per)
            for T in [30, 50, 80]:
                r[f"n_share_ge{T}"] = dd[f"n_ge{T}"].sum() / dd.n.sum()
                r[f"frp_share_ge{T}"] = dd[f"frp_ge{T}"].sum() / dd.frp.sum()
            r["mean_frp_per_det"] = dd.frp.sum() / dd.n.sum()
            share.append(r)
share = pd.DataFrame(share)


# ---------- 3. write results.md ----------
def f(r):
    return f"{r.L:.2f} [{r.lo:.2f}, {r.hi:.2f}]"


def get(b, s, m, y):
    return res[(res.biome == b) & (res.satellite == s) & (res.metric == m) & (res.year == y)].iloc[0]


TPRIM = 80  # grid threshold at/above the data-derived full-swath limit (see section 1)
out = ["# FRP and detection-limit harmonized clock audit", "",
       "All numbers produced by `frp_audit.py` (inputs from `aggregate.py`). L = MODIS / (S-NPP x 2012-2020 "
       "monthly ratio of the same quantity), matched up-days, 95% 16-day block bootstrap (1000).", "",
       "## 1. Detection-limit threshold from the data", "",
       f"Criterion: smallest per-pixel FRP F such that, for all F' >= F, the FRP distribution above F' in every "
       f"MODIS scan bin is within KS <= {KS_MAX} (plus the 5% two-sample KS sampling allowance) of the nadir bin "
       f"(scan 1.0-1.1 km); F scanned 2-150 MW. Amazon+Cerrado daytime.", "",
       "| sensor / period | full swath (all scan bins) | scan <= 1.3 km only |", "|---|---|---|"]
for k in TSTAR:
    out.append(f"| {k} | {TSTAR[k]:.1f} MW | {TSTAR_NN[k]:.1f} MW |")
out += ["", f"S-NPP (track bins vs track <= 0.40 km, 2012-2020): {TSTAR_VIIRS:.1f} MW "
        "(the lowest F tested is 2 MW).",
        f"Pixel-area scaling of the 5.7 MW nadir limit (Sofiev & Kouznetsov 2026) to a ~4.8 x 2.0 km edge pixel: "
        f"5.7 x {AREA_EDGE:.1f} = {T_AREA:.0f} MW.", "",
        "KS (worst scan bin vs nadir), Aqua 2012-2020, at selected F:", "", "| F (MW) | worst KS | worst bin |", "|---|---|---|"]
kb = ks[(ks.satellite == "Aqua") & (ks.period == "base")]
for F in [10.0, 20.0, 30.0, 40.0, 50.0, 60.0, 80.0, 100.0]:
    i = lo[np.searchsorted(lo, F)]
    kk = kb[np.isclose(kb.frp_min, round(i, 2))]
    w = kk.loc[kk.ks.idxmax()]
    out.append(f"| {i:.1f} | {w.ks:.3f} | scan {w.bin} km |")
out += ["", f"Primary harmonized threshold: **{TPRIM} MW** (first tested threshold at or above the data-derived "
        "full-swath limit); sensitivity 30, 50, 60, 100 MW. With scan <= 1.3 km the limit is much lower, so 10-80 MW are shown.", ""]

out += ["## 2. Headline table (2023-2025)", "",
        f"L_count = all detections; L_FRP = summed FRP; L_harm = detections with FRP >= {TPRIM} MW (all view angles, "
        f"same MW cut for S-NPP); L_harm_FRP = summed FRP of those; L_nn_harm = MODIS scan <= 1.3 km and FRP >= 30 MW; "
        f"L_off_harm = MODIS scan > 1.3 km and FRP >= {TPRIM} MW (S-NPP side: all angles, same cut).", "",
        "| biome | sat | year | L_count | L_FRP | L_harm (count >= 80) | L_harm_FRP (>= 80) | L_nn_harm (scan<=1.3, >= 30) | L_off_harm (scan>1.3, >= 80) |",
        "|---|---|---|---|---|---|---|---|---|"]
for b in ["amazon", "cerrado"]:
    for s in ["Aqua", "Terra"]:
        for y in [2023, 2024, 2025]:
            out.append(f"| {b} | {s} | {y} | " + " | ".join(
                f(get(b, s, m, y)) for m in ["count", "frp", f"count_ge{TPRIM}", f"frp_ge{TPRIM}", "nn_count_ge30", f"off_count_ge{TPRIM}"]) + " |")

out += ["", "## 3. Full results by metric, 2021-2025", ""]
for b in ["amazon", "cerrado"]:
    for s in ["Aqua", "Terra"]:
        out += [f"### {b} / {s}", "", "| metric | " + " | ".join(map(str, YEARS)) + " |",
                "|---|" + "---|" * len(YEARS)]
        for m in METRICS:
            out.append(f"| {m} | " + " | ".join(f(get(b, s, m, y)) for y in YEARS) + " |")
        out.append("")
out += ["Metric definitions:", ""] + [f"- `{m}`: {d[2]}" for m, d in METRICS.items()] + [""]

out += ["## 4. What the thresholds keep", "",
        "| biome | sat | period | mean FRP/det (MW) | det share >= 30 | >= 50 | >= 80 | FRP share >= 30 | >= 50 | >= 80 |",
        "|---|---|---|---|---|---|---|---|---|---|"]
for r in share.itertuples():
    out.append(f"| {r.biome} | {r.satellite} | {r.period} | {r.mean_frp_per_det:.1f} | {r.n_share_ge30:.3f} | "
               f"{r.n_share_ge50:.3f} | {r.n_share_ge80:.3f} | {r.frp_share_ge30:.3f} | {r.frp_share_ge50:.3f} | {r.frp_share_ge80:.3f} |")
d = daily.assign(y=daily.date.str[:4].astype(int))
g = d.groupby(["biome", "satellite", "y"])[["n", "nn_n", "n_ge80", "nn_n_ge80"]].sum()
g["all"], g["ge80"] = g.nn_n / g.n, g.nn_n_ge80 / g.n_ge80
out += ["", "## 5. Near-nadir share of detections (MODIS scan <= 1.3 km; S-NPP track <= 0.40 km)", "",
        "If detection limits were the only view-angle effect, the share among FRP >= 80 MW detections (complete at every "
        "angle) would not change with time.", "",
        "| biome | sat | 2012-2020 mean, all | 2012-2020 mean, >= 80 MW | 2023 all / >=80 | 2024 all / >=80 | 2025 all / >=80 |",
        "|---|---|---|---|---|---|---|"]
for (b, s_), gg in g.groupby(level=[0, 1]):
    gg = gg.droplevel([0, 1])
    bs = gg.loc[2012:2020]
    out.append(f"| {b} | {s_} | {bs['all'].mean():.3f} | {bs['ge80'].mean():.3f} | " + " | ".join(
        f"{gg.loc[y, 'all']:.3f} / {gg.loc[y, 'ge80']:.3f}" for y in [2023, 2024, 2025]) + " |")
open(os.path.join(HERE, "results.md"), "w").write("\n".join(out) + "\n")
print("\n".join(out))
