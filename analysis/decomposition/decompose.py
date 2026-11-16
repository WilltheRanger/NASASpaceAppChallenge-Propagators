"""Timing vs sampling-geometry decomposition of the audit number L.

Usage: .venv/bin/python analysis/decomposition/decompose.py
L = MODIS daytime detections (count_all) / (S-NPP count_all x 2012-2020 MODIS/S-NPP ratio by calendar month),
on days both satellites returned data (a satellite is 'up' on a day with any daytime detection in Brazil).
Units = (region, satellite in {Aqua, Terra}, year 2021-2025). Writes out/*.csv and prints all numbers.
"""
import os, glob, json
import numpy as np, pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__)); AN = os.path.dirname(HERE)
RAW = "/Users/himatthew/spaceapps/raw/firms_brazil"
OUT = os.path.join(HERE, "out"); os.makedirs(OUT, exist_ok=True)
BASE, TGT = list(range(2012, 2021)), list(range(2021, 2026))
BRZ = ["amazon", "cerrado", "caatinga", "mata_atlantica", "pantanal"]
OTH = ["argentina", "california", "punjab_haryana"]
SATS = ["Aqua", "Terra"]
rng = np.random.default_rng(42); NB = 2000

d1 = pd.read_csv(os.path.join(AN, "brazil-data/out/firms_daily_by_biome.csv"))
d2 = pd.read_csv(os.path.join(AN, "statistics/out/regions_daily.csv"))
up = d1[d1.date >= "2012-01-01"].groupby(["date", "satellite"]).count_all.sum().unstack().notna()
dates = pd.date_range("2012-01-01", "2025-12-31").strftime("%Y-%m-%d")
up = up.reindex(dates).fillna(False).astype(bool)
daily = pd.concat([d1, d2]); daily = daily[(daily.date >= "2012-01-01") & daily.biome.isin(BRZ + OTH)]
drift = pd.concat([pd.read_csv(os.path.join(AN, "brazil-data/out/firms_drift_by_biome.csv")),
                   pd.read_csv(os.path.join(AN, "statistics/out/regions_drift.csv"))])
lst = drift.pivot_table(index=["biome", "year"], columns="satellite", values="lst_median")
yr = pd.Series(dates.str[:4].astype(int), index=dates); mo = pd.Series(dates.str[5:7].astype(int), index=dates)

def Lcalc(M, V):
    """M, V: daily Series on matched days (others zero). Returns {year: L}."""
    g = pd.DataFrame({"M": M, "V": V, "y": yr, "m": mo})
    b = g[g.y.isin(BASE)].groupby("m")[["M", "V"]].sum()
    pooled = b.M.sum() / b.V.sum()
    R = (b.M / b.V.where(b.V > 0)).fillna(pooled).reindex(range(1, 13)).fillna(pooled)
    g["E"] = g.V * g.m.map(R)
    s = g.groupby("y")[["M", "E"]].sum()
    return (s.M / s.E).to_dict()

# ---------------- Part A: unit-level L, dt, dg ----------------
rows = []
for reg in BRZ + OTH:
    d = daily[daily.biome == reg]
    c = d.groupby(["date", "satellite"]).count_all.sum().unstack().reindex(dates).fillna(0)
    cn = d[d.near_nadir == 1].groupby(["date", "satellite"]).count_all.sum().unstack().reindex(dates).fillna(0)
    for s in SATS:
        m = (up[s] & up["S-NPP"]).values
        L = Lcalc(c[s] * m, c["S-NPP"] * m)
        nn = (cn[s] * m).groupby(yr.values).sum(); al = (c[s] * m).groupby(yr.values).sum()
        sh0 = nn[BASE].sum() / al[BASE].sum()
        t0 = np.nanmean([lst.at[(reg, y), s] for y in BASE if (reg, y) in lst.index])
        for y in TGT:
            rows.append(dict(region=reg, sat=s, year=y, L=L[y], logL=np.log(L[y]),
                             lst=lst.at[(reg, y), s], lst0=t0, dt=lst.at[(reg, y), s] - t0,
                             share=nn[y] / al[y], share0=sh0, dg=np.log((nn[y] / al[y]) / sh0), n=al[y]))
U = pd.DataFrame(rows); U["A"] = (U.sat == "Aqua").astype(float); U["Te"] = 1 - U.A
U["q"] = U.lst ** 2 - U.lst0 ** 2   # one-curve quadratic term: log f(t) = a t^2 + b t
U.to_csv(os.path.join(OUT, "units.csv"), index=False)

def ols(X, y):
    b, *_ = np.linalg.lstsq(X, y, rcond=None); r = y - X @ b
    return b, 1 - (r @ r) / (((y - y.mean()) ** 2).sum()), r

MODELS = {
    "M0 geometry only":          lambda D: np.c_[D.dg],
    "M1 timing, sat slopes":     lambda D: np.c_[D.A * D.dt, D.Te * D.dt],
    "M2 timing + geometry":      lambda D: np.c_[D.A * D.dt, D.Te * D.dt, D.dg],
    "M3 one curve (quad)":       lambda D: np.c_[D.dt, D.q],
    "M4 one curve + geometry":   lambda D: np.c_[D.dt, D.q, D.dg],
    "M5 one linear slope + geom": lambda D: np.c_[D.dt, D.dg],
    "M2i M2 + sat intercepts":   lambda D: np.c_[D.A * D.dt, D.Te * D.dt, D.dg, D.A, D.Te],
}
NAMES = {"M0 geometry only": ["g"], "M1 timing, sat slopes": ["bA", "bT"], "M2 timing + geometry": ["bA", "bT", "g"],
         "M3 one curve (quad)": ["b_lin", "a_quad"], "M4 one curve + geometry": ["b_lin", "a_quad", "g"],
         "M5 one linear slope + geom": ["b", "g"], "M2i M2 + sat intercepts": ["bA", "bT", "g", "cA", "cT"]}
regs = U.region.unique()
idx_by_reg = {r: np.where(U.region.values == r)[0] for r in regs}
creps = [np.concatenate([idx_by_reg[r] for r in rng.choice(regs, len(regs))]) for _ in range(NB)]
ureps = [rng.integers(0, len(U), len(U)) for _ in range(NB)]
fit = {}; tab = []
for k, f in MODELS.items():
    X, y = f(U), U.logL.values
    b, r2, res = ols(X, y)
    n, p = len(y), X.shape[1]
    aic = n * np.log((res @ res) / n) + 2 * p
    bc = np.array([ols(f(U.iloc[i]), U.logL.values[i])[0] for i in creps])
    bu = np.array([ols(f(U.iloc[i]), U.logL.values[i])[0] for i in ureps])
    fit[k] = dict(b=b, bc=bc, bu=bu)
    for j, nm in enumerate(NAMES[k]):
        tab.append(dict(model=k, term=nm, coef=b[j], se_region=bc[:, j].std(), lo_region=np.percentile(bc[:, j], 2.5),
                        hi_region=np.percentile(bc[:, j], 97.5), se_unit=bu[:, j].std(), R2=r2, AIC=aic, n=n))
T = pd.DataFrame(tab); T.to_csv(os.path.join(OUT, "coefficients.csv"), index=False)
pd.set_option("display.width", 200); pd.set_option("display.max_columns", 20)
print(T.round(3).to_string(index=False))

# mediator path: dg on dt, by satellite (no intercept, both zero at baseline)
Xm = np.c_[U.A * U.dt, U.Te * U.dt]; pi, r2m, _ = ols(Xm, U.dg.values)
pic = np.array([ols(Xm[i], U.dg.values[i])[0] for i in creps])
print(f"\nmediator path dg ~ dt: piA={pi[0]:.3f} (se {pic[:,0].std():.3f}), piT={pi[1]:.3f} (se {pic[:,1].std():.3f}), R2={r2m:.3f}")
# does dg differ by satellite beyond dt?  (sat intercepts)
print("dg by sat (mean 2021-25):", U.groupby("sat").dg.mean().round(3).to_dict(),
      " dt by sat:", U.groupby("sat").dt.mean().round(3).to_dict())

# decomposition, Aqua Amazon 2024/2025
dec = []
for y in (2024, 2025):
    u = U[(U.region == "amazon") & (U.sat == "Aqua") & (U.year == y)].iloc[0]
    def parts(bb, pp):
        bA, g = bb[0], bb[2]
        conf_t, conf_g = bA * u["dt"], g * u.dg
        med_g_from_t = g * pp[0] * u["dt"]
        return conf_t, conf_g, conf_t + med_g_from_t, conf_g - med_g_from_t
    b2 = fit["M2 timing + geometry"]["b"]; bc = fit["M2 timing + geometry"]["bc"]
    pt = parts(b2, pi); bs = np.array([parts(bc[i], pic[i]) for i in range(NB)])
    b1 = fit["M1 timing, sat slopes"]["b"]
    for nm, j in [("confounder: timing", 0), ("confounder: geometry", 1), ("mediator: timing total", 2), ("mediator: geometry-only", 3)]:
        dec.append(dict(year=y, L=u.L, logL=u.logL, dt=u["dt"], dg=u.dg, reading=nm, logL_part=pt[j],
                        share_pct=100 * pt[j] / u.logL, lo=100 * np.percentile(bs[:, j], 2.5) / u.logL,
                        hi=100 * np.percentile(bs[:, j], 97.5) / u.logL))
    dec.append(dict(year=y, L=u.L, logL=u.logL, dt=u["dt"], dg=u.dg, reading="M1 timing alone (no dg)",
                    logL_part=b1[0] * u["dt"], share_pct=100 * b1[0] * u["dt"] / u.logL,
                    lo=100 * np.percentile(fit["M1 timing, sat slopes"]["bc"][:, 0], 2.5) * u["dt"] / u.logL,
                    hi=100 * np.percentile(fit["M1 timing, sat slopes"]["bc"][:, 0], 97.5) * u["dt"] / u.logL))
Dd = pd.DataFrame(dec); Dd.to_csv(os.path.join(OUT, "decomposition_aqua_amazon.csv"), index=False)
print("\n", Dd.round(3).to_string(index=False))

# one-curve implied peak
for k in ["M3 one curve (quad)", "M4 one curve + geometry"]:
    b = fit[k]["b"]; bc = fit[k]["bc"]
    pk = -b[0] / (2 * b[1]); pkb = -bc[:, 0] / (2 * bc[:, 1])
    print(f"{k}: a_quad={b[1]:.3f} -> peak {pk:.2f} h LST (region-boot 95% {np.nanpercentile(pkb,2.5):.2f}..{np.nanpercentile(pkb,97.5):.2f})")
# slope equality test bA = bT under M2 (one *linear* curve)
dd = fit["M2 timing + geometry"]["bc"][:, 0] - fit["M2 timing + geometry"]["bc"][:, 1]
b2 = fit["M2 timing + geometry"]["b"]
print(f"M2 bA-bT = {b2[0]-b2[1]:.3f}, region-boot 95% {np.percentile(dd,2.5):.3f}..{np.percentile(dd,97.5):.3f}")
dd1 = fit["M1 timing, sat slopes"]["bc"][:, 0] - fit["M1 timing, sat slopes"]["bc"][:, 1]
b1 = fit["M1 timing, sat slopes"]["b"]
print(f"M1 bA-bT = {b1[0]-b1[1]:.3f}, region-boot 95% {np.percentile(dd1,2.5):.3f}..{np.percentile(dd1,97.5):.3f}")

# ---------------- Part B: view-angle bins (Brazil biomes, raw FIRMS MODIS) ----------------
EDGES = [0, 1.05, 1.25, 1.55, 2.25, 3.35, 99]
BL = ["1.0", "1.1-1.2", "1.3-1.5", "1.6-2.2", "2.3-3.3", ">=3.4"]
cache = os.path.join(OUT, "modis_daily_bins.csv.gz")
if not os.path.exists(cache):
    lk = pd.read_csv(os.path.join(AN, "brazil-data/out/biome_lookup_0p1deg.csv"), usecols=["cell_lat", "cell_lon", "biome"])
    parts_ = []
    for f in sorted(glob.glob(os.path.join(RAW, "modis_*_Brazil.csv"))):
        y = int(os.path.basename(f).split("_")[1])
        if y < 2012: continue
        d = pd.read_csv(f, usecols=["latitude", "longitude", "scan", "acq_date", "satellite", "daynight"])
        d = d[d.daynight == "D"]
        d["cell_lat"] = np.floor(d.latitude * 10).astype(int); d["cell_lon"] = np.floor(d.longitude * 10).astype(int)
        d = d.merge(lk, on=["cell_lat", "cell_lon"], how="inner")
        d = d[d.biome.isin(BRZ)]
        d["bin"] = pd.cut(d.scan, EDGES, labels=BL)
        parts_.append(d.groupby(["acq_date", "biome", "satellite", "bin"], observed=True).size().rename("n").reset_index())
        print("read", f, flush=True)
    pd.concat(parts_).rename(columns={"acq_date": "date"}).to_csv(cache, index=False)
MB = pd.read_csv(cache)
brows = []
for reg in BRZ:
    d = daily[daily.biome == reg]
    V = d[d.satellite == "S-NPP"].groupby("date").count_all.sum().reindex(dates).fillna(0)
    for s in SATS:
        m = (up[s] & up["S-NPP"]).values
        t0 = np.nanmean([lst.at[(reg, y), s] for y in BASE])
        mb = MB[(MB.biome == reg) & (MB.satellite == s)]
        tot = mb.groupby("date").n.sum().reindex(dates).fillna(0)
        Ltot = Lcalc(tot * m, V * m)
        for bn in BL:
            Mx = mb[mb.bin == bn].groupby("date").n.sum().reindex(dates).fillna(0)
            L = Lcalc(Mx * m, V * m)
            for y in TGT:
                brows.append(dict(region=reg, sat=s, year=y, bin=bn, L=L[y], logL=np.log(L[y]), Ltot=Ltot[y],
                                  dt=lst.at[(reg, y), s] - t0, n=float((Mx * m)[yr.values == y].sum())))
B = pd.DataFrame(brows); B = B[np.isfinite(B.logL)].reset_index(drop=True)
B["A"] = (B.sat == "Aqua").astype(float); B["Te"] = 1 - B.A
B.to_csv(os.path.join(OUT, "bins.csv"), index=False)
# check: raw-file total L vs daily-file L
chk = B.drop_duplicates(["region", "sat", "year"]).merge(U[["region", "sat", "year", "L"]], on=["region", "sat", "year"], suffixes=("_raw", "_daily"))
print("\nraw vs daily-file L, max abs diff:", float((chk.Ltot - chk.L_daily).abs().max()).__round__(4))
print("\nmean log L by bin x sat (2021-25, Brazil biomes):")
print(B.pivot_table(index="bin", columns="sat", values="logL", aggfunc="mean").reindex(BL).round(3))
print("\nAmazon 2025 L by bin:"); print(B[(B.region == "amazon") & (B.year == 2025)].pivot_table(index="bin", columns="sat", values="L").reindex(BL).round(3))

def fe(D, cols):
    return pd.get_dummies(D[cols].astype(str).agg("|".join, axis=1)).values.astype(float)
def wls(X, y, w):
    sw = np.sqrt(w); b, *_ = np.linalg.lstsq(X * sw[:, None], y * sw, rcond=None); r = y - X @ b
    return b, 1 - (w * r * r).sum() / (w * (y - np.average(y, weights=w)) ** 2).sum(), (w * r * r).sum()
w = np.sqrt(B.n.values)  # down-weight tiny bins
BM = {
    "B1 sat slopes, no FE":            lambda D: np.c_[D.A * D.dt, D.Te * D.dt],
    "B2 common slope + bin x year FE": lambda D: np.c_[D.dt, fe(D, ["bin", "year"])],
    "B3 sat slopes + bin x year FE":   lambda D: np.c_[D.A * D.dt, D.Te * D.dt, fe(D, ["bin", "year"])],
    "B4 bin-specific slopes + binxyear FE": lambda D: np.c_[np.column_stack([(D.bin == bn) * D.dt for bn in BL]), fe(D, ["bin", "year"])],
}
BN = {"B1 sat slopes, no FE": ["bA", "bT"], "B2 common slope + bin x year FE": ["b"],
      "B3 sat slopes + bin x year FE": ["bA", "bT"], "B4 bin-specific slopes + binxyear FE": ["b_" + x for x in BL]}
bidx = {r: np.where(B.region.values == r)[0] for r in BRZ}
# Brazil has only 5 regions; bootstrap over (region, sat) units
ukeys = B.groupby(["region", "sat"]).indices; uk = list(ukeys)
breps = [np.concatenate([ukeys[uk[j]] for j in rng.integers(0, len(uk), len(uk))]) for _ in range(NB)]
btab = []; rss = {}
for k, f in BM.items():
    X = f(B); b, r2, rs = wls(X, B.logL.values, w); rss[k] = (rs, X.shape[1])
    bb = []
    for i in breps:
        Di = B.iloc[i]; Xi = f(Di)
        if Xi.shape[1] != X.shape[1]: continue
        bb.append(wls(Xi, Di.logL.values, w[i])[0][:len(BN[k])])
    bb = np.array(bb)
    for j, nm in enumerate(BN[k]):
        btab.append(dict(model=k, term=nm, coef=b[j], se_boot=bb[:, j].std(), lo=np.percentile(bb[:, j], 2.5),
                         hi=np.percentile(bb[:, j], 97.5), R2w=r2, n=len(B)))
BT = pd.DataFrame(btab); BT.to_csv(os.path.join(OUT, "bin_coefficients.csv"), index=False)
print("\n", BT.round(3).to_string(index=False))
from scipy import stats
for a, c in [("B2 common slope + bin x year FE", "B4 bin-specific slopes + binxyear FE"),
             ("B2 common slope + bin x year FE", "B3 sat slopes + bin x year FE")]:
    (r0, p0), (r1, p1) = rss[a], rss[c]; dfd = len(B) - p1
    F = ((r0 - r1) / (p1 - p0)) / (r1 / dfd)
    print(f"F-test {a} vs {c}: F={F:.2f}, df=({p1-p0},{dfd}), p={1-stats.f.cdf(F, p1-p0, dfd):.3g}")
